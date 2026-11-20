import type { CropId, LocalizedText, SeasonId } from "@/services/types";

export interface CropInfo {
  id: CropId;
  name: LocalizedText;
  seasons: SeasonId[];
  /** Days from planting to typical harvest — rough guide used for growth-stage display only. */
  durationDays: number;
  /** Illustrative baseline yield (t/ha) used only to shape demo charts. Not official statistics. */
  demoBaseYield: number;
}

export const CROPS: CropInfo[] = [
  {
    id: "rice",
    name: { en: "Rice (paddy)", bn: "ধান" },
    seasons: ["aman", "boro", "aus"],
    durationDays: 135,
    demoBaseYield: 4.6,
  },
  {
    id: "potato",
    name: { en: "Potato", bn: "আলু" },
    seasons: ["rabi"],
    durationDays: 95,
    demoBaseYield: 20,
  },
  {
    id: "jute",
    name: { en: "Jute", bn: "পাট" },
    seasons: ["kharif1"],
    durationDays: 120,
    demoBaseYield: 2.6,
  },
  {
    id: "wheat",
    name: { en: "Wheat", bn: "গম" },
    seasons: ["rabi"],
    durationDays: 110,
    demoBaseYield: 3.3,
  },
  {
    id: "maize",
    name: { en: "Maize", bn: "ভুট্টা" },
    seasons: ["rabi", "kharif1"],
    durationDays: 120,
    demoBaseYield: 7.2,
  },
  {
    id: "mustard",
    name: { en: "Mustard", bn: "সরিষা" },
    seasons: ["rabi"],
    durationDays: 90,
    demoBaseYield: 1.4,
  },
  {
    id: "tomato",
    name: { en: "Tomato", bn: "টমেটো" },
    seasons: ["rabi"],
    durationDays: 110,
    demoBaseYield: 28,
  },
  {
    id: "tea",
    name: { en: "Tea", bn: "চা" },
    seasons: ["yearRound"],
    durationDays: 365,
    demoBaseYield: 1.7,
  },
];

export const SEASONS: Record<SeasonId, LocalizedText> = {
  aus: { en: "Aus", bn: "আউশ" },
  aman: { en: "Aman", bn: "আমন" },
  boro: { en: "Boro", bn: "বোরো" },
  rabi: { en: "Rabi (winter)", bn: "রবি (শীত)" },
  kharif1: { en: "Kharif-1", bn: "খরিফ-১" },
  kharif2: { en: "Kharif-2", bn: "খরিফ-২" },
  yearRound: { en: "Year-round", bn: "সারা বছর" },
};

export function getCrop(id: CropId): CropInfo {
  return CROPS.find((c) => c.id === id) ?? CROPS[0]!;
}

export type GrowthStage =
  "establishment" | "vegetative" | "reproductive" | "maturity" | "harvestReady";

export function growthStage(
  plantingDate: string,
  crop: CropId,
  now = new Date(),
) {
  const start = new Date(plantingDate + "T00:00:00");
  const days = Math.max(
    0,
    Math.floor((now.getTime() - start.getTime()) / 86400000),
  );
  const total = getCrop(crop).durationDays;
  const progress = Math.min(1, days / total);
  let stage: GrowthStage = "establishment";
  if (progress >= 1) stage = "harvestReady";
  else if (progress > 0.78) stage = "maturity";
  else if (progress > 0.5) stage = "reproductive";
  else if (progress > 0.15) stage = "vegetative";
  return { days, progress, stage, daysLeft: Math.max(0, total - days) };
}
