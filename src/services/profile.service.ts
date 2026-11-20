import { z } from "zod";
import { readStored, writeStored } from "@/lib/storage";
import type { Profile } from "./types";

const KEY = "profile";

export const DEFAULT_PROFILE: Profile = {
  name: "Rahima Khatun",
  phone: "",
  districtId: "bogura",
  areaUnit: "acre",
  weatherAlerts: true,
  simulateErrors: false,
};

const schema = z.object({
  name: z.string().min(1).max(60),
  phone: z.string().max(20),
  districtId: z.string(),
  areaUnit: z.enum(["acre", "bigha"]),
  weatherAlerts: z.boolean(),
  simulateErrors: z.boolean(),
});

export function getProfile(): Profile {
  return readStored(KEY, schema, DEFAULT_PROFILE);
}

export function saveProfile(p: Profile): boolean {
  const parsed = schema.safeParse(p);
  if (!parsed.success) return false;
  return writeStored(KEY, parsed.data);
}
