import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAuthToken, setAuthToken, clearAuthToken, ServiceError } from "./http";
import { getServiceMode, setServiceMode } from "./config";
import { newFarmSchema } from "./farms.service";

describe("API services and authentication utilities", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => memory.set(k, v),
        removeItem: (k: string) => memory.delete(k),
      },
    });
  });

  it("manages JWT auth token persistence", () => {
    expect(getAuthToken()).toBeNull();
    setAuthToken("test_jwt_token_123");
    expect(getAuthToken()).toBe("test_jwt_token_123");
    clearAuthToken();
    expect(getAuthToken()).toBeNull();
  });

  it("manages ServiceMode toggle between api and demo", () => {
    expect(getServiceMode()).toBe("api");
    setServiceMode("demo");
    expect(getServiceMode()).toBe("demo");
    setServiceMode("api");
    expect(getServiceMode()).toBe("api");
  });

  it("validates farm registration with newFarmSchema", () => {
    const valid = newFarmSchema.safeParse({
      name: "North Aman Paddy",
      crop: "rice",
      districtId: "bogura",
      areaAcres: 1.5,
      plantingDate: "2026-07-28",
      notes: "BRRI dhan49",
    });
    expect(valid.success).toBe(true);

    const invalid = newFarmSchema.safeParse({
      name: "",
      crop: "rice",
      districtId: "",
      areaAcres: -5,
      plantingDate: "bad-date",
    });
    expect(invalid.success).toBe(false);
  });

  it("creates custom ServiceError with appropriate error codes", () => {
    const err = new ServiceError("unauthorized", "Session expired");
    expect(err.code).toBe("unauthorized");
    expect(err.message).toBe("Session expired");
    expect(err.name).toBe("ServiceError");
  });
});
