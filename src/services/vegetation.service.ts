import { seeded, wait } from "@/lib/seeded";
import { SERVICE_MODE } from "./config";
import { apiFetch, maybeSimulateFailure } from "./http";
import type {
  Farm,
  FieldObservation,
  HealthStatus,
  VegetationSnapshot,
} from "./types";

/**
 * Satellite vegetation index (NDVI-like) — DEMO generator.
 * FastAPI target: GET /v1/fields/{farmId}/vegetation?limit=6 → VegetationSnapshot[]
 */
const COLS = 14;
const ROWS = 9;

function statusFor(mean: number): HealthStatus {
  if (mean >= 0.6) return "healthy";
  if (mean >= 0.45) return "watch";
  return "stressed";
}

export function buildSnapshots(
  farm: Farm,
  count = 6,
  now = new Date(),
): VegetationSnapshot[] {
  const rand = seeded(farm.id);
  // A stress patch somewhere in the field, which evolves over time
  const px = 2 + rand() * (COLS - 4);
  const py = 1 + rand() * (ROWS - 2);
  const base = 0.58 + rand() * 0.14;
  const snaps: VegetationSnapshot[] = [];
  for (let s = count - 1; s >= 0; s--) {
    const date = new Date(now.getTime() - s * 5 * 86400000);
    const r = seeded(`${farm.id}-${s}`);
    const growth = (count - 1 - s) * 0.018;
    const patchStrength = 0.08 + (count - 1 - s) * 0.025;
    const grid: number[][] = [];
    let sum = 0;
    for (let y = 0; y < ROWS; y++) {
      const row: number[] = [];
      for (let x = 0; x < COLS; x++) {
        const d = Math.hypot(x - px, (y - py) * 1.3);
        const patch = Math.max(0, 1 - d / 3.4) * patchStrength;
        const edge =
          x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? 0.05 : 0;
        const v = Math.min(
          0.92,
          Math.max(0.12, base + growth - patch - edge + (r() - 0.5) * 0.08),
        );
        row.push(Number(v.toFixed(3)));
        sum += v;
      }
      grid.push(row);
    }
    const mean = Number((sum / (COLS * ROWS)).toFixed(3));
    snaps.push({
      farmId: farm.id,
      date: date.toISOString().slice(0, 10),
      meanIndex: mean,
      grid,
      status: statusFor(mean),
      cloudCover: Math.round(r() * 30),
      isDemo: true,
    });
  }
  return snaps;
}

export async function getVegetation(farm: Farm): Promise<VegetationSnapshot[]> {
  if (SERVICE_MODE === "api")
    return apiFetch(`/v1/fields/${farm.id}/vegetation?limit=6`);
  await wait(450);
  maybeSimulateFailure();
  return buildSnapshots(farm);
}

export function buildObservations(
  farm: Farm,
  snaps: VegetationSnapshot[],
): FieldObservation[] {
  const obs: FieldObservation[] = snaps
    .slice()
    .reverse()
    .slice(0, 4)
    .map((s, i) => ({
      id: `${farm.id}-sat-${i}`,
      farmId: farm.id,
      date: s.date,
      kind: "satellite" as const,
      title: {
        en: `Vegetation index ${s.meanIndex.toFixed(2)} (demo)`,
        bn: `উদ্ভিদ সূচক ${s.meanIndex.toFixed(2)} (ডেমো)`,
      },
      detail:
        s.status === "healthy"
          ? {
              en: "Even canopy across most of the field.",
              bn: "জমির বেশিরভাগ অংশে গাছের বৃদ্ধি সমান।",
            }
          : {
              en: "A patch looks weaker than the rest — worth a walk-through.",
              bn: "একটি অংশ বাকি জমির চেয়ে দুর্বল দেখাচ্ছে — সরেজমিনে দেখে নিন।",
            },
    }));
  obs.push({
    id: `${farm.id}-plant`,
    farmId: farm.id,
    date: farm.plantingDate,
    kind: "task",
    title: { en: "Planting recorded", bn: "রোপণ/বপন নথিভুক্ত" },
  });
  return obs;
}

export async function getObservations(farm: Farm): Promise<FieldObservation[]> {
  if (SERVICE_MODE === "api")
    return apiFetch(`/v1/fields/${farm.id}/observations`);
  await wait(300);
  return buildObservations(farm, buildSnapshots(farm));
}
