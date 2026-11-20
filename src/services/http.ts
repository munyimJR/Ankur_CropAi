import { API_BASE_URL } from "./config";
import { readStored } from "@/lib/storage";
import { z } from "zod";

export type ServiceErrorCode =
  | "network"
  | "timeout"
  | "invalid_input"
  | "server"
  | "not_found"
  | "unauthorized";

export class ServiceError extends Error {
  code: ServiceErrorCode;
  constructor(code: ServiceErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ServiceError";
    this.code = code;
  }
}

const TOKEN_KEY = "agripilot_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken() {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

/** Typed fetch wrapper for the FastAPI backend. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 30000,
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const cleanBase = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const fullUrl = `${cleanBase}${cleanPath}`;

  try {
    const res = await fetch(fullUrl, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (res.status === 401) {
      clearAuthToken();
      throw new ServiceError("unauthorized", "Authentication session expired");
    }
    if (res.status === 404) throw new ServiceError("not_found", "Resource not found");
    if (res.status === 422) {
      const errJson = await res.json().catch(() => null);
      const detail = errJson?.detail?.[0]?.msg || "Validation error";
      throw new ServiceError("invalid_input", detail);
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new ServiceError("server", `HTTP ${res.status}: ${errText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    if (err instanceof DOMException && err.name === "AbortError")
      throw new ServiceError("timeout", "Network request timed out");
    throw new ServiceError("network", "Failed to reach backend API");
  } finally {
    clearTimeout(timer);
  }
}

/** Demo-only switch (Settings → "Simulate connection problems") to preview error states. */
export function maybeSimulateFailure() {
  const simulate = readStored(
    "profile",
    z.object({ simulateErrors: z.boolean() }).passthrough(),
    {
      simulateErrors: false,
    },
  ).simulateErrors;
  if (simulate)
    throw new ServiceError(
      "network",
      "Simulated connection problem (demo setting)",
    );
}

export function newId(prefix: string) {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}
