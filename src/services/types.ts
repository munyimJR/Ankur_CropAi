/**
 * Shared contracts between the UI and the data-service layer.
 * These shapes are intentionally the same ones the future FastAPI backend should return,
 * so swapping demo services for HTTP calls does not touch components.
 */
export type Lang = "en" | "bn";
export type LocalizedText = { en: string; bn: string };

export type CropId =
  "rice" | "potato" | "jute" | "wheat" | "maize" | "mustard" | "tomato" | "tea";
export type SeasonId =
  "aus" | "aman" | "boro" | "rabi" | "kharif1" | "kharif2" | "yearRound";
export type ServiceMode = "demo" | "api";

export interface Farm {
  id: string;
  name: string;
  nameBn?: string | undefined;
  crop: CropId;
  districtId: string;
  lat: number;
  lng: number;
  areaAcres: number;
  plantingDate: string; // ISO yyyy-mm-dd
  createdAt: string;
  notes?: string | undefined;
  sample?: boolean | undefined;
}

export interface NewFarmInput {
  name: string;
  crop: CropId;
  districtId: string;
  areaAcres: number;
  plantingDate: string;
  notes?: string | undefined;
}

export type HealthStatus = "healthy" | "watch" | "stressed";

export interface VegetationSnapshot {
  farmId: string;
  date: string;
  /** Mean vegetation index, 0–1 scale (NDVI-like). Demo values only. */
  meanIndex: number;
  grid: number[][];
  status: HealthStatus;
  cloudCover: number;
  isDemo: boolean;
}

export interface FieldObservation {
  id: string;
  farmId: string;
  date: string;
  kind: "satellite" | "scan" | "note" | "weather" | "task";
  title: LocalizedText;
  detail?: LocalizedText;
}

export type WeatherCondition = "sunny" | "partly" | "cloudy" | "rain" | "storm";

export interface CurrentWeather {
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windKph: number;
  rainMm24h: number;
  condition: WeatherCondition;
  updatedAt: string;
  isDemo: boolean;
}

export interface DailyWeather {
  date: string;
  condition: WeatherCondition;
  maxC: number;
  minC: number;
  rainMm: number;
  rainChance: number;
  humidity: number;
}

export type RiskLevel = "low" | "moderate" | "high";

export interface ClimateRisk {
  id: "heavyRain" | "heat" | "fungal" | "dry";
  level: RiskLevel;
  score: number; // 0–100, demo
}

export interface ClimateOverview {
  farmId: string;
  current: CurrentWeather;
  forecast: DailyWeather[]; // next 7 days
  history: DailyWeather[]; // last 30 days
  risks: ClimateRisk[];
  isDemo: boolean;
}

export interface CropCondition {
  id: string;
  name: LocalizedText;
  category: "healthy" | "fungal" | "bacterial" | "pest" | "nutrient";
}

export interface CropAnalysisResult {
  id: string;
  crop: CropId;
  condition: CropCondition;
  sampleConfidence: number;
  alternatives: { condition: CropCondition; sampleConfidence: number }[];
  severity: "none" | "mild" | "moderate" | "high";
  guidance: LocalizedText[];
  supportedClasses: LocalizedText[];
  model: {
    name: string;
    version: string;
    mode: ServiceMode;
    license?: string;
    dataset?: string;
  };
  analyzedAt: string;
  isDemo: boolean;
  safetyNotice?: string;
  lowConfidence?: boolean;
}

export interface YieldPoint {
  label: string;
  value: number; // t/ha
}

export interface YieldOverview {
  crop: CropId;
  season: SeasonId;
  unit: "t/ha";
  history: YieldPoint[];
  expected: { low: number; mid: number; high: number };
  isDemo: boolean;
}

export interface ScenarioInput {
  irrigation: "rainfed" | "supplemental" | "full";
  fertilizer: "late" | "recommended";
  sowingShiftDays: number; // -14..14
}

export interface AdvisorContext {
  farm?: Farm;
  lang: Lang;
}

export interface AdvisorReply {
  id: string;
  topic: string;
  title: string;
  body: string;
  bullets: string[];
  caution: string;
  followUps: string[];
  kind: "general";
}

export type NotificationKind = "weather" | "crop" | "field" | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  severity: "info" | "watch" | "warning";
  title: LocalizedText;
  body: LocalizedText;
  createdAt: string;
  href:
    | "/app"
    | "/app/fields"
    | "/app/check"
    | "/app/climate"
    | "/app/yield"
    | "/app/advisor";
  read: boolean;
}

export interface ActivityItem {
  id: string;
  at: string;
  kind: "farm" | "scan" | "note" | "alert" | "advisor";
  text: LocalizedText;
}

export interface Profile {
  name: string;
  phone: string;
  districtId: string;
  areaUnit: "acre" | "bigha";
  weatherAlerts: boolean;
  simulateErrors: boolean;
}
