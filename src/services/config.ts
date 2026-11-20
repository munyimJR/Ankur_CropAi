import type { ServiceMode } from "./types";

/**
 * Service configuration.
 * By default in production/integrated mode, services point to /api/v1 (FastAPI backend).
 * Users can also toggle Demo Mode in Settings to preview offline/sample states.
 */
export const API_BASE_URL: string =
  (import.meta.env["VITE_AGRIPILOT_API_URL"] as string | undefined) ||
  "/api/v1";

export function getServiceMode(): ServiceMode {
  if (typeof window === "undefined" || !window.localStorage) return "api";
  const stored = window.localStorage.getItem("agripilot_service_mode");
  if (stored === "demo") return "demo";
  return "api";
}

export function setServiceMode(mode: ServiceMode) {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem("agripilot_service_mode", mode);
  }
}

export const SERVICE_MODE: ServiceMode = getServiceMode();

export const UPLOAD_LIMITS = {
  maxBytes: 8 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
};
