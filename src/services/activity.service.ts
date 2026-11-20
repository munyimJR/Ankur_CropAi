import { z } from "zod";
import { readStored, writeStored } from "@/lib/storage";
import { newId } from "./http";
import type { ActivityItem, LocalizedText } from "./types";

const KEY = "activity";
const schema = z.array(
  z.object({
    id: z.string(),
    at: z.string(),
    kind: z.enum(["farm", "scan", "note", "alert", "advisor"]),
    text: z.object({ en: z.string(), bn: z.string() }),
  }),
);

function defaults(): ActivityItem[] {
  const now = Date.now();
  return [
    {
      id: "act_seed_1",
      at: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
      kind: "note",
      text: {
        en: "Satellite pass added for Aman paddy (demo)",
        bn: "আমন ধানের জমির স্যাটেলাইট চিত্র যোগ হয়েছে (ডেমো)",
      },
    },
    {
      id: "act_seed_2",
      at: new Date(now - 1000 * 60 * 60 * 26).toISOString(),
      kind: "alert",
      text: {
        en: "Rain advisory reviewed for Munshiganj",
        bn: "মুন্সিগঞ্জের বৃষ্টি সতর্কতা দেখা হয়েছে",
      },
    },
    {
      id: "act_seed_3",
      at: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
      kind: "farm",
      text: {
        en: "Mustard — north block registered",
        bn: "সরিষা — উত্তরের খণ্ড নিবন্ধিত হয়েছে",
      },
    },
  ];
}

export function listActivity(): ActivityItem[] {
  return readStored(KEY, schema, defaults());
}

export function logActivity(kind: ActivityItem["kind"], text: LocalizedText) {
  const items = [
    { id: newId("act"), at: new Date().toISOString(), kind, text },
    ...listActivity(),
  ].slice(0, 25);
  writeStored(KEY, items);
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("agripilot:activity"));
}
