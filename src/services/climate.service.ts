import { seeded, wait } from "@/lib/seeded";
import { getServiceMode } from "./config";
import { apiFetch, maybeSimulateFailure } from "./http";
import type {
  ClimateOverview,
  ClimateRisk,
  DailyWeather,
  Farm,
  RiskLevel,
  WeatherCondition,
} from "./types";

/**
 * Weather & climate risk — DEMO generator (no live weather source connected).
 * FastAPI target: GET /v1/fields/{farmId}/climate → ClimateOverview
 */
function conditionFor(rain: number, cloud: number): WeatherCondition {
  if (rain > 30) return "storm";
  if (rain > 4) return "rain";
  if (cloud > 0.7) return "cloudy";
  if (cloud > 0.35) return "partly";
  return "sunny";
}

function day(
  seedKey: string,
  date: Date,
  i: number,
  wetness: number,
): DailyWeather {
  const r = seeded(`${seedKey}-${date.toISOString().slice(0, 10)}`);
  const cloud = r();
  const rainRoll = r();
  const rain =
    rainRoll > 1 - wetness
      ? Math.round((rainRoll - (1 - wetness)) * 220)
      : rainRoll > 0.6
        ? Math.round(r() * 3)
        : 0;
  const maxC = Math.round(27 + r() * 4 - (rain > 10 ? 2 : 0) - i * 0.04);
  const minC = Math.round(maxC - 7 - r() * 3);
  return {
    date: date.toISOString().slice(0, 10),
    condition: conditionFor(rain, cloud),
    maxC,
    minC,
    rainMm: rain,
    rainChance: Math.min(
      95,
      Math.round(rain > 0 ? 45 + rain * 1.5 : cloud * 30),
    ),
    humidity: Math.round(66 + cloud * 18 + (rain > 0 ? 8 : 0)),
  };
}

function level(score: number): RiskLevel {
  return score >= 66 ? "high" : score >= 36 ? "moderate" : "low";
}

export function buildClimate(farm: Farm, now = new Date()): ClimateOverview {
  const key = farm.districtId;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const forecast = Array.from({ length: 7 }, (_, i) =>
    day(
      key,
      new Date(today.getTime() + i * 86400000),
      i,
      i === 3 ? 0.55 : 0.12,
    ),
  );
  const history = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getTime() - (30 - i) * 86400000);
    return day(key + "-h", d, 0, i < 10 ? 0.35 : 0.12);
  });
  const t = forecast[0]!;
  const r = seeded(`${key}-now-${today.toISOString().slice(0, 10)}`);
  const maxRain = Math.max(...forecast.map((f) => f.rainMm));
  const avgHum = forecast.reduce((a, f) => a + f.humidity, 0) / forecast.length;
  const maxT = Math.max(...forecast.map((f) => f.maxC));
  const weekRain = forecast.reduce((a, f) => a + f.rainMm, 0);
  const scores: Record<ClimateRisk["id"], number> = {
    heavyRain: Math.min(100, Math.round(maxRain * 1.6)),
    heat: Math.max(5, Math.min(100, Math.round((maxT - 28) * 14))),
    fungal: Math.min(100, Math.round((avgHum - 60) * 2.6)),
    dry: Math.max(5, Math.min(100, Math.round(70 - weekRain * 2))),
  };
  const risks = (Object.keys(scores) as ClimateRisk["id"][]).map((id) => ({
    id,
    score: scores[id],
    level: level(scores[id]),
  }));
  return {
    farmId: farm.id,
    isDemo: true,
    forecast,
    history,
    risks,
    current: {
      tempC: Math.round(t.minC + (t.maxC - t.minC) * 0.75),
      feelsLikeC: Math.round(t.maxC + 1),
      humidity: t.humidity,
      windKph: Math.round(6 + r() * 10),
      rainMm24h: history[history.length - 1]!.rainMm,
      condition: t.condition,
      updatedAt: new Date().toISOString(),
      isDemo: true,
    },
  };
}

export async function getClimate(farm: Farm): Promise<ClimateOverview> {
  if (getServiceMode() === "api") {
    try {
      return await apiFetch<ClimateOverview>(`/farms/${farm.id}/weather`);
    } catch {
      // Fallback gracefully to calculated climate if network is offline
    }
  }
  await wait(400);
  maybeSimulateFailure();
  return buildClimate(farm);
}
