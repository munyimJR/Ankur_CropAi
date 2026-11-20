import { z } from "zod";
import { readStored, writeStored } from "@/lib/storage";
import { findDistrict } from "@/lib/geo";
import { wait } from "@/lib/seeded";
import { getServiceMode } from "./config";
import { apiFetch, maybeSimulateFailure, newId, ServiceError } from "./http";
import { logActivity } from "./activity.service";
import type { Farm, NewFarmInput } from "./types";

const cropEnum = z.enum([
  "rice",
  "potato",
  "jute",
  "wheat",
  "maize",
  "mustard",
  "tomato",
  "tea",
]);

const farmSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameBn: z.string().optional(),
  crop: cropEnum,
  districtId: z.string(),
  lat: z.number(),
  lng: z.number(),
  areaAcres: z.number().positive(),
  plantingDate: z.string(),
  createdAt: z.string(),
  notes: z.string().optional(),
  sample: z.boolean().optional(),
});

export const newFarmSchema = z.object({
  name: z.string().trim().min(2).max(60),
  crop: cropEnum,
  districtId: z.string().min(1),
  areaAcres: z.number().positive().max(500),
  plantingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(280).optional(),
});

const KEY = "farms";

export function sampleFarms(): Farm[] {
  return [
    {
      id: "farm_sample_bogura",
      name: "Aman paddy — east plot",
      nameBn: "আমন ধান — পূর্বের জমি",
      crop: "rice",
      districtId: "bogura",
      lat: 24.86,
      lng: 89.36,
      areaAcres: 1.6,
      plantingDate: "2026-07-28",
      createdAt: "2026-07-20T08:00:00.000Z",
      sample: true,
    },
    {
      id: "farm_sample_munshiganj",
      name: "Potato — riverside field",
      nameBn: "আলু — নদীর পাড়ের জমি",
      crop: "potato",
      districtId: "munshiganj",
      lat: 23.53,
      lng: 90.52,
      areaAcres: 0.9,
      plantingDate: "2026-11-05",
      createdAt: "2026-10-30T08:00:00.000Z",
      sample: true,
    },
    {
      id: "farm_sample_tangail",
      name: "Mustard — north block",
      nameBn: "সরিষা — উত্তরের খণ্ড",
      crop: "mustard",
      districtId: "tangail",
      lat: 24.27,
      lng: 89.93,
      areaAcres: 1.2,
      plantingDate: "2026-10-22",
      createdAt: "2026-10-18T08:00:00.000Z",
      sample: true,
    },
  ];
}

function load(): Farm[] {
  return readStored<Farm[]>(KEY, z.array(farmSchema), sampleFarms());
}

export async function listFarms(): Promise<Farm[]> {
  if (getServiceMode() === "api") {
    try {
      const farms = await apiFetch<Farm[]>("/farms");
      writeStored(KEY, farms);
      return farms;
    } catch (err) {
      // Fallback gracefully to stored/sample if network is unavailable
      return load();
    }
  }
  await wait(350);
  maybeSimulateFailure();
  return load();
}

export async function createFarm(input: NewFarmInput): Promise<Farm> {
  const parsed = newFarmSchema.safeParse(input);
  if (!parsed.success)
    throw new ServiceError("invalid_input", parsed.error.issues[0]?.message);
  if (getServiceMode() === "api") {
    try {
      const farm = await apiFetch<Farm>("/farms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      writeStored(KEY, [farm, ...load().filter((f) => f.id !== farm.id)]);
      logActivity("farm", {
        en: `Added field “${farm.name}”`,
        bn: `নতুন জমি যোগ হয়েছে: “${farm.name}”`,
      });
      return farm;
    } catch (err) {
      if (err instanceof ServiceError && err.code === "invalid_input") throw err;
      // Fall back to local storage if API backend offline
    }
  }
  await wait(500);
  maybeSimulateFailure();
  const d = findDistrict(parsed.data.districtId);
  const farm: Farm = {
    id: newId("farm"),
    ...parsed.data,
    lat: d.lat + ((parsed.data.name.length % 7) - 3) * 0.02,
    lng: d.lng + ((parsed.data.name.length % 5) - 2) * 0.02,
    createdAt: new Date().toISOString(),
  };
  const ok = writeStored(KEY, [farm, ...load()]);
  if (!ok) throw new ServiceError("server", "Could not save on this device");
  logActivity("farm", {
    en: `Added field “${farm.name}”`,
    bn: `নতুন জমি যোগ হয়েছে: “${farm.name}”`,
  });
  return farm;
}

export async function deleteFarm(id: string): Promise<void> {
  if (getServiceMode() === "api") {
    try {
      await apiFetch(`/farms/${id}`, { method: "DELETE" });
      writeStored(
        KEY,
        load().filter((f) => f.id !== id),
      );
      return;
    } catch {
      // Fall back to local delete
    }
  }
  await wait(250);
  maybeSimulateFailure();
  writeStored(
    KEY,
    load().filter((f) => f.id !== id),
  );
}

export function resetFarms() {
  writeStored(KEY, sampleFarms());
}
