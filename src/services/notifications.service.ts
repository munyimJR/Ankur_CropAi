import { z } from "zod";
import { readStored, writeStored } from "@/lib/storage";
import type { AppNotification } from "./types";

/** Demo notifications. Read state persists on this device. FastAPI target: GET /v1/notifications */
const READ_KEY = "notifications.read";

function seed(now = Date.now()): Omit<AppNotification, "read">[] {
  const h = (hrs: number) => new Date(now - hrs * 3600000).toISOString();
  return [
    {
      id: "n_rain_thu",
      kind: "weather",
      severity: "warning",
      title: {
        en: "Heavy rain likely in 3 days",
        bn: "৩ দিন পর ভারী বৃষ্টির সম্ভাবনা",
      },
      body: {
        en: "Demo forecast for Bogura. Clear drainage channels and avoid spraying before rain.",
        bn: "বগুড়ার ডেমো পূর্বাভাস। নালা পরিষ্কার রাখুন এবং বৃষ্টির আগে স্প্রে করবেন না।",
      },
      createdAt: h(1),
      href: "/app/climate",
    },
    {
      id: "n_patch_bogura",
      kind: "field",
      severity: "watch",
      title: {
        en: "Weaker patch in Aman paddy",
        bn: "আমন ধানের জমিতে দুর্বল অংশ",
      },
      body: {
        en: "Demo satellite view shows lower vegetation in one corner. Walk the field to check.",
        bn: "ডেমো স্যাটেলাইট চিত্রে এক কোণে গাছ দুর্বল দেখা যাচ্ছে। সরেজমিনে দেখে নিন।",
      },
      createdAt: h(6),
      href: "/app/fields",
    },
    {
      id: "n_blight_watch",
      kind: "crop",
      severity: "watch",
      title: {
        en: "Humid nights — watch potato leaves",
        bn: "আর্দ্র রাত — আলুর পাতা খেয়াল রাখুন",
      },
      body: {
        en: "Cool, humid weather can favour late blight. Check leaves and use Check Crop if unsure.",
        bn: "ঠান্ডা ও আর্দ্র আবহাওয়ায় নাবি ধসা রোগ বাড়তে পারে। পাতা দেখুন, সন্দেহ হলে 'ফসল যাচাই' ব্যবহার করুন।",
      },
      createdAt: h(20),
      href: "/app/check",
    },
    {
      id: "n_demo_mode",
      kind: "system",
      severity: "info",
      title: {
        en: "You’re exploring the Phase 1 demo",
        bn: "আপনি প্রথম ধাপের ডেমো দেখছেন",
      },
      body: {
        en: "Weather, satellite, yield and analysis results are sample data until models are connected.",
        bn: "মডেল যুক্ত না হওয়া পর্যন্ত আবহাওয়া, স্যাটেলাইট, ফলন ও বিশ্লেষণের ফলাফল নমুনা তথ্য।",
      },
      createdAt: h(48),
      href: "/app",
    },
  ];
}

function readIds(): string[] {
  return readStored(READ_KEY, z.array(z.string()), []);
}

export function listNotifications(): AppNotification[] {
  const read = new Set(readIds());
  return seed().map((n) => ({ ...n, read: read.has(n.id) }));
}

export function markRead(id: string) {
  const ids = new Set(readIds());
  ids.add(id);
  writeStored(READ_KEY, [...ids]);
}

export function markUnread(id: string) {
  writeStored(
    READ_KEY,
    readIds().filter((x) => x !== id),
  );
}

export function markAllRead() {
  writeStored(
    READ_KEY,
    seed().map((n) => n.id),
  );
}
