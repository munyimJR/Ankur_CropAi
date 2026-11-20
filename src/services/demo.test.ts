import { describe, it, expect, beforeEach, vi } from "vitest";
import { readStored, writeStored } from "../lib/storage";
import { z } from "zod";
import { validateImage } from "./analysis.service";
import { buildYield, estimateScenario } from "./yield.service";
import { buildClimate } from "./climate.service";
import { sampleFarms } from "./farms.service";
import { buildSnapshots } from "./vegetation.service";
import { matchTopic } from "./advisor.service";
describe("demo safety and data contracts", () => {
  const memory = new Map<string, string>();
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => memory.set(k, v),
      },
    });
  });
  it("recovers from corrupted and incorrectly shaped local data", () => {
    memory.set("agripilot.v1.fields", "{broken");
    expect(readStored("fields", z.array(z.string()), [])).toEqual([]);
    memory.set("agripilot.v1.fields", "123");
    expect(readStored("fields", z.array(z.string()), [])).toEqual([]);
  });
  it("persists valid local data", () => {
    expect(writeStored("language", "bn")).toBe(true);
    expect(readStored("language", z.string(), "en")).toBe("bn");
  });
  it("rejects empty, non-image and oversized uploads", () => {
    expect(
      validateImage(new File([], "empty.png", { type: "image/png" })).ok,
    ).toBe(false);
    expect(
      validateImage(new File(["x"], "bad.svg", { type: "image/svg+xml" })).ok,
    ).toBe(false);
    expect(
      validateImage(
        new File([new Uint8Array(8 * 1024 * 1024 + 1)], "large.png", {
          type: "image/png",
        }),
      ).ok,
    ).toBe(false);
    expect(
      validateImage(
        new File(["image bytes"], "leaf.webp", { type: "image/webp" }),
      ).ok,
    ).toBe(true);
  });
  it("makes crop and season filters change illustrative yields", () => {
    const aman = buildYield("rice", "aman", "bogura");
    const boro = buildYield("rice", "boro", "bogura");
    expect(aman.expected.mid).not.toBe(boro.expected.mid);
    expect(aman.isDemo).toBe(true);
    expect(aman.history).toHaveLength(8);
  });
  it("keeps baseline scenario stable and changes delayed scenarios", () => {
    expect(
      estimateScenario(4, {
        irrigation: "supplemental",
        fertilizer: "recommended",
        sowingShiftDays: 0,
      }),
    ).toBe(4);
    expect(
      estimateScenario(4, {
        irrigation: "rainfed",
        fertilizer: "late",
        sowingShiftDays: 14,
      }),
    ).toBeLessThan(4);
  });
  it("labels field, climate and vegetation outputs as demo", () => {
    const farm = sampleFarms()[0];
    expect(buildClimate(farm).isDemo).toBe(true);
    expect(buildClimate(farm).forecast).toHaveLength(7);
    const snaps = buildSnapshots(farm);
    expect(
      snaps.every((s) => s.isDemo && s.meanIndex >= 0 && s.meanIndex <= 1),
    ).toBe(true);
  });
  it("supports Bengali topics and unknown questions without fabricated answers", () => {
    expect(matchTopic("মাটি পরীক্ষা")).not.toMatchObject({ id: "general" });
    expect(matchTopic("zzzzzzzz")).toMatchObject({ id: "general" });
  });
});
