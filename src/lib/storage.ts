import type { z } from "zod";

/**
 * Safe localStorage helpers. Every read is validated with a zod schema so corrupted or
 * outdated values fall back to defaults instead of crashing the app.
 */
const PREFIX = "agripilot.v1.";

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readStored<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T): boolean {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string) {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function clearAllStored() {
  if (!hasStorage()) return;
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
