import { getCrop } from "@/lib/crops";
import { seeded, wait } from "@/lib/seeded";
import { getServiceMode } from "./config";
import { apiFetch, maybeSimulateFailure } from "./http";
import type { CropId, ScenarioInput, SeasonId, YieldOverview } from "./types";

/**
 * Yield insights — DEMO estimates for interface demonstration only.
 * No yield model is trained yet. FastAPI target:
 *   GET  /v1/yield/{crop}?season=&district=   → YieldOverview
 *   POST /v1/yield/scenario                     → { estimate: number }
 */
const SEASON_FACTOR: Partial<Record<SeasonId, number>> = {
  aman: 0.82,
  boro: 1.24,
  aus: 0.7,
};

export function seasonBase(crop: CropId, season: SeasonId) {
  return (
    getCrop(crop).demoBaseYield *
    (crop === "rice" ? (SEASON_FACTOR[season] ?? 1) : 1)
  );
}

export function buildYield(
  crop: CropId,
  season: SeasonId,
  districtId: string,
  startYear = 2018,
): YieldOverview {
  const base = seasonBase(crop, season);
  const r = seeded(`${crop}-${season}-${districtId}`);
  const history = Array.from({ length: 8 }, (_, i) => {
    const year = startYear + i;
    const trend = 1 + i * 0.012;
    const shock = i === 3 ? 0.9 : 1; // one weaker season to make the chart honest-looking
    const v = base * trend * shock * (0.95 + r() * 0.1);
    return { label: `${year}`, value: Number(v.toFixed(2)) };
  });
  const recent = history.slice(-3).reduce((a, p) => a + p.value, 0) / 3;
  const mid = Number((recent * 1.02).toFixed(2));
  return {
    crop,
    season,
    unit: "t/ha",
    history,
    expected: {
      low: Number((mid * 0.9).toFixed(2)),
      mid,
      high: Number((mid * 1.08).toFixed(2)),
    },
    isDemo: true,
  };
}

export async function getYieldOverview(
  crop: CropId,
  season: SeasonId,
  districtId: string,
): Promise<YieldOverview> {
  if (getServiceMode() === "api") {
    try {
      return await apiFetch<YieldOverview>(
        `/farms/general/yield?crop=${crop}&season=${season}`,
      );
    } catch {
      // Fallback to local baseline
    }
  }
  await wait(450);
  maybeSimulateFailure();
  return buildYield(crop, season, districtId);
}

/** Illustrative scenario multiplier — a transparent rule of thumb, not a trained model. */
export function estimateScenario(
  baseline: number,
  input: ScenarioInput,
): number {
  const irrigation = { rainfed: 0.88, supplemental: 1, full: 1.05 }[
    input.irrigation
  ];
  const fertilizer = input.fertilizer === "recommended" ? 1 : 0.93;
  const shift = input.sowingShiftDays;
  const timing = 1 - Math.abs(shift) * (shift > 0 ? 0.007 : 0.004);
  return Number((baseline * irrigation * fertilizer * timing).toFixed(2));
}
