import { getCrop, growthStage } from "@/lib/crops";
import { wait } from "@/lib/seeded";
import { getServiceMode } from "./config";
import { apiFetch, maybeSimulateFailure, newId } from "./http";
import type {
  AdvisorContext,
  AdvisorReply,
  Lang,
  LocalizedText,
} from "./types";

/**
 * Farm Advisor — LOCAL demonstration responses only (no AI model, no paid API).
 * Responses are general information written for the demo, not externally reviewed.
 * A future self-hosted model would implement: POST /v1/advisor/ask → AdvisorReply
 */
interface Topic {
  id: string;
  keywords: string[];
  title: LocalizedText;
  body: LocalizedText;
  bullets: LocalizedText[];
  followUps: LocalizedText[];
}

const TOPICS: Topic[] = [
  {
    id: "water",
    keywords: ["water", "irrigat", "awd", "drain", "পানি", "সেচ", "নিষ্কাশন"],
    title: { en: "Water management basics", bn: "পানি ব্যবস্থাপনার মৌলিক কথা" },
    body: {
      en: "Crops need steady moisture, but standing water at the wrong stage can encourage disease and waste irrigation.",
      bn: "ফসলের নিয়মিত আর্দ্রতা দরকার, তবে ভুল সময়ে জমিতে পানি জমে থাকলে রোগ বাড়তে পারে এবং সেচের অপচয় হয়।",
    },
    bullets: [
      {
        en: "For paddy, many farmers use alternate wetting and drying (AWD) to save water — ask your local extension office if it suits your field.",
        bn: "ধানের জন্য অনেক কৃষক পানি সাশ্রয়ে পর্যায়ক্রমে ভেজানো ও শুকানো (AWD) পদ্ধতি ব্যবহার করেন — আপনার জমিতে উপযোগী কিনা স্থানীয় কৃষি অফিসে জিজ্ঞাসা করুন।",
      },
      {
        en: "Keep drainage channels open before heavy rain.",
        bn: "ভারী বৃষ্টির আগে নালা খোলা রাখুন।",
      },
      {
        en: "Check soil by hand: if it crumbles dry a few cm down, plants may need water.",
        bn: "হাত দিয়ে মাটি দেখুন: কয়েক সেমি নিচে মাটি শুকনো ঝুরঝুরে হলে গাছের পানি লাগতে পারে।",
      },
    ],
    followUps: [
      {
        en: "When should I stop irrigating before harvest?",
        bn: "ফসল কাটার কত আগে সেচ বন্ধ করব?",
      },
      {
        en: "How do I prepare for heavy rain?",
        bn: "ভারী বৃষ্টির জন্য কীভাবে প্রস্তুতি নেব?",
      },
    ],
  },
  {
    id: "fertilizer",
    keywords: [
      "fertili",
      "urea",
      "npk",
      "nitrogen",
      "manure",
      "compost",
      "সার",
      "ইউরিয়া",
      "জৈব",
      "কম্পোস্ট",
    ],
    title: { en: "Fertilizer — general guidance", bn: "সার — সাধারণ নির্দেশনা" },
    body: {
      en: "The right fertilizer dose depends on your soil, crop variety and season. Splitting doses usually works better than applying everything at once.",
      bn: "সঠিক সারের মাত্রা নির্ভর করে মাটি, জাত ও মৌসুমের উপর। একবারে সব না দিয়ে কয়েক কিস্তিতে দেওয়া সাধারণত বেশি কার্যকর।",
    },
    bullets: [
      {
        en: "A soil test is the most reliable way to decide doses.",
        bn: "সারের মাত্রা ঠিক করতে মাটি পরীক্ষাই সবচেয়ে নির্ভরযোগ্য উপায়।",
      },
      {
        en: "Too much urea can make plants soft and more prone to pests and disease.",
        bn: "অতিরিক্ত ইউরিয়া গাছকে নরম করে, ফলে পোকা ও রোগের ঝুঁকি বাড়ে।",
      },
      {
        en: "Organic matter (compost, cow dung) improves soil over time.",
        bn: "জৈব পদার্থ (কম্পোস্ট, গোবর) ধীরে ধীরে মাটির উর্বরতা বাড়ায়।",
      },
    ],
    followUps: [
      {
        en: "Where can I get my soil tested?",
        bn: "মাটি পরীক্ষা কোথায় করাতে পারি?",
      },
      { en: "Signs of nitrogen shortage?", bn: "নাইট্রোজেন ঘাটতির লক্ষণ কী?" },
    ],
  },
  {
    id: "pest",
    keywords: [
      "pest",
      "insect",
      "worm",
      "aphid",
      "hopper",
      "bug",
      "পোকা",
      "কীট",
      "মাজরা",
      "জাব",
    ],
    title: { en: "Dealing with pests", bn: "পোকামাকড় দমন" },
    body: {
      en: "Start by observing: identify the pest and how widespread it is before choosing any control method.",
      bn: "প্রথমে পর্যবেক্ষণ করুন: কোন পোকা এবং কতটা ছড়িয়েছে তা বুঝে তারপর দমন পদ্ধতি বেছে নিন।",
    },
    bullets: [
      {
        en: "Integrated pest management (IPM) combines traps, natural enemies and careful spraying only when needed.",
        bn: "সমন্বিত বালাই ব্যবস্থাপনা (IPM) ফাঁদ, উপকারী পোকা এবং প্রয়োজন হলে সতর্ক স্প্রে — সব মিলিয়ে কাজ করে।",
      },
      {
        en: "Perching sticks for birds and light traps help monitor pressure.",
        bn: "পাখি বসার ডাল (পার্চিং) ও আলোক ফাঁদ পোকার মাত্রা বুঝতে সাহায্য করে।",
      },
      {
        en: "Never mix pesticides without guidance; always follow label safety.",
        bn: "নির্দেশনা ছাড়া কীটনাশক মেশাবেন না; সবসময় লেবেলের নিরাপত্তা নির্দেশ মানুন।",
      },
    ],
    followUps: [
      { en: "How do I set up a light trap?", bn: "আলোক ফাঁদ কীভাবে বসাব?" },
      {
        en: "Can I check a leaf photo?",
        bn: "পাতার ছবি দিয়ে কি যাচাই করা যায়?",
      },
    ],
  },
  {
    id: "disease",
    keywords: [
      "disease",
      "spot",
      "blight",
      "blast",
      "rot",
      "yellow",
      "fung",
      "রোগ",
      "দাগ",
      "ধসা",
      "পচা",
      "হলুদ",
      "ব্লাস্ট",
    ],
    title: { en: "Spots, yellowing or blight", bn: "দাগ, হলুদভাব বা ধসা" },
    body: {
      en: "Many problems look similar in early stages. A clear photo and a field walk help narrow it down; confirmation should come from an expert.",
      bn: "শুরুর দিকে অনেক সমস্যা দেখতে একই রকম। পরিষ্কার ছবি ও জমি ঘুরে দেখা সমস্যা চিহ্নিত করতে সাহায্য করে; নিশ্চিত করবেন একজন বিশেষজ্ঞ।",
    },
    bullets: [
      {
        en: "Note whether symptoms are on old or new leaves, and on few or many plants.",
        bn: "লক্ষণ পুরোনো না নতুন পাতায়, অল্প না অনেক গাছে — তা লক্ষ্য করুন।",
      },
      {
        en: "Humid, warm weather favours many fungal diseases.",
        bn: "আর্দ্র ও উষ্ণ আবহাওয়ায় অনেক ছত্রাকজনিত রোগ বাড়ে।",
      },
      {
        en: "Use Check Crop to keep a photo record for your extension officer.",
        bn: "কৃষি কর্মকর্তাকে দেখানোর জন্য 'ফসল যাচাই' দিয়ে ছবির রেকর্ড রাখুন।",
      },
    ],
    followUps: [
      {
        en: "What weather increases disease risk?",
        bn: "কোন আবহাওয়ায় রোগের ঝুঁকি বাড়ে?",
      },
      {
        en: "How do I take a good leaf photo?",
        bn: "ভালো পাতার ছবি কীভাবে তুলব?",
      },
    ],
  },
  {
    id: "weather",
    keywords: [
      "rain",
      "weather",
      "storm",
      "flood",
      "heat",
      "cyclone",
      "বৃষ্টি",
      "আবহাওয়া",
      "ঝড়",
      "বন্যা",
      "গরম",
      "ঘূর্ণিঝড়",
    ],
    title: { en: "Preparing for weather", bn: "আবহাওয়ার জন্য প্রস্তুতি" },
    body: {
      en: "Plan field work around the forecast: spraying, fertilizing and harvesting all depend on dry windows.",
      bn: "পূর্বাভাস দেখে মাঠের কাজ পরিকল্পনা করুন: স্প্রে, সার প্রয়োগ ও ফসল কাটা — সবই শুকনো সময়ের উপর নির্ভর করে।",
    },
    bullets: [
      {
        en: "Avoid spraying or top-dressing right before rain — it can wash off.",
        bn: "বৃষ্টির ঠিক আগে স্প্রে বা উপরি সার দেবেন না — ধুয়ে যেতে পারে।",
      },
      {
        en: "Follow official Bangladesh Meteorological Department warnings for storms.",
        bn: "ঝড়ের জন্য বাংলাদেশ আবহাওয়া অধিদপ্তরের অফিসিয়াল সতর্কতা অনুসরণ করুন।",
      },
      {
        en: "Harvest mature crops early if a storm warning is issued.",
        bn: "ঝড়ের সতর্কতা থাকলে পাকা ফসল আগেভাগে কেটে নিন।",
      },
    ],
    followUps: [
      {
        en: "Is this week good for spraying?",
        bn: "এই সপ্তাহ কি স্প্রে করার জন্য ভালো?",
      },
      {
        en: "How do I protect seedlings from heavy rain?",
        bn: "ভারী বৃষ্টি থেকে চারা কীভাবে রক্ষা করব?",
      },
    ],
  },
  {
    id: "harvest",
    keywords: [
      "harvest",
      "cut",
      "mature",
      "ripe",
      "store",
      "storage",
      "কাটা",
      "পাকা",
      "সংরক্ষণ",
      "ফসল তোলা",
      "মাড়াই",
    ],
    title: { en: "Harvest timing and storage", bn: "ফসল কাটার সময় ও সংরক্ষণ" },
    body: {
      en: "Harvesting at the right maturity and drying properly reduces losses more than almost anything else after the season.",
      bn: "সঠিক পরিপক্বতায় ফসল কাটা ও ভালোভাবে শুকানো মৌসুম শেষে ক্ষতি কমানোর সবচেয়ে কার্যকর উপায়।",
    },
    bullets: [
      {
        en: "For paddy, many farmers harvest when most grains in the panicle have turned golden.",
        bn: "ধানের ক্ষেত্রে, শীষের বেশিরভাগ দানা সোনালি হলে অনেক কৃষক ফসল কাটেন।",
      },
      {
        en: "Dry grain well before storing in clean, dry containers.",
        bn: "পরিষ্কার ও শুকনো পাত্রে রাখার আগে দানা ভালোভাবে শুকিয়ে নিন।",
      },
    ],
    followUps: [
      {
        en: "How do I prepare for heavy rain?",
        bn: "ভারী বৃষ্টির জন্য কীভাবে প্রস্তুতি নেব?",
      },
      { en: "How do I reduce storage pests?", bn: "গুদামের পোকা কীভাবে কমাব?" },
    ],
  },
  {
    id: "soil",
    keywords: ["soil", "ph", "salin", "sand", "clay", "মাটি", "লবণ", "অম্ল"],
    title: { en: "Understanding your soil", bn: "আপনার মাটিকে বোঝা" },
    body: {
      en: "Soil type and health shape what grows well. Coastal areas may face salinity; some northern soils are acidic.",
      bn: "মাটির ধরন ও স্বাস্থ্য ঠিক করে কোন ফসল ভালো হবে। উপকূলে লবণাক্ততা এবং উত্তরের কিছু এলাকায় অম্লীয় মাটি দেখা যায়।",
    },
    bullets: [
      {
        en: "Soil Resource Development Institute (SRDI) offices offer soil testing in many districts.",
        bn: "অনেক জেলায় মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI) অফিসে মাটি পরীক্ষা করা যায়।",
      },
      {
        en: "Adding organic matter improves structure and water holding.",
        bn: "জৈব পদার্থ যোগ করলে মাটির গঠন ও পানি ধারণক্ষমতা বাড়ে।",
      },
    ],
    followUps: [
      { en: "Fertilizer guidance?", bn: "সার সম্পর্কে নির্দেশনা?" },
      {
        en: "Which crops suit sandy soil?",
        bn: "বেলে মাটিতে কোন ফসল ভালো হয়?",
      },
    ],
  },
];

const FALLBACK: Topic = {
  id: "general",
  keywords: [],
  title: { en: "Let’s narrow it down", bn: "চলুন বিষয়টি স্পষ্ট করি" },
  body: {
    en: "This demo advisor has a small set of general topics: water, fertilizer, pests, diseases, weather, harvest and soil. Try asking about one of them.",
    bn: "এই ডেমো পরামর্শকের কাছে কিছু সাধারণ বিষয় আছে: পানি, সার, পোকা, রোগ, আবহাওয়া, ফসল কাটা ও মাটি। এগুলোর যেকোনো একটি নিয়ে জিজ্ঞাসা করুন।",
  },
  bullets: [
    {
      en: "For urgent field problems call the Krishi Call Centre at 16123.",
      bn: "জরুরি সমস্যায় কৃষি কল সেন্টারে ১৬১২৩ নম্বরে ফোন করুন।",
    },
  ],
  followUps: [
    { en: "How much should I irrigate?", bn: "কতটুকু সেচ দেব?" },
    { en: "My leaves have brown spots", bn: "পাতায় বাদামি দাগ দেখা যাচ্ছে" },
  ],
};

export const SUGGESTED_QUESTIONS: LocalizedText[] = [
  {
    en: "My rice leaves have brown spots — what should I check?",
    bn: "ধানের পাতায় বাদামি দাগ — কী দেখব?",
  },
  {
    en: "How should I prepare for heavy rain this week?",
    bn: "এই সপ্তাহের ভারী বৃষ্টির জন্য কীভাবে প্রস্তুতি নেব?",
  },
  {
    en: "How can I save irrigation water?",
    bn: "কীভাবে সেচের পানি সাশ্রয় করব?",
  },
  { en: "When is the right time to harvest?", bn: "ফসল কাটার সঠিক সময় কখন?" },
];

export function matchTopic(question: string): Topic {
  const q = question.toLowerCase();
  let best: Topic = FALLBACK;
  let bestScore = 0;
  for (const t of TOPICS) {
    const score = t.keywords.reduce((s, k) => (q.includes(k) ? s + 1 : s), 0);
    if (score > bestScore) {
      best = t;
      bestScore = score;
    }
  }
  return best;
}

const CAUTION: LocalizedText = {
  en: "General information from Ankur’s agronomic knowledge base — not a certified diagnosis. Confirm with your Upazila Agriculture Officer or the Krishi Call Centre (16123) before acting.",
  bn: "এটি অঙ্কুর-এর কৃষি তথ্যভান্ডারের সাধারণ তথ্য — সার্টিফায়েড রোগনির্ণয় নয়। পদক্ষেপ নেওয়ার আগে উপজেলা কৃষি অফিসার বা কৃষি কল সেন্টারে (১৬১২৩) নিশ্চিত হোন।",
};

function contextLine(ctx: AdvisorContext, lang: Lang): string | null {
  if (!ctx.farm) return null;
  const crop = getCrop(ctx.farm.crop).name[lang];
  const g = growthStage(ctx.farm.plantingDate, ctx.farm.crop);
  return lang === "bn"
    ? `আপনার নির্বাচিত জমি: ${crop}, রোপণের ${g.days} দিন পর।`
    : `For your selected field: ${crop}, ${g.days} days after planting.`;
}

export async function askAdvisor(
  question: string,
  ctx: AdvisorContext,
): Promise<AdvisorReply> {
  if (getServiceMode() === "api") {
    try {
      return await apiFetch<AdvisorReply>("/advisor/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: question,
          lang: ctx.lang,
          crop: ctx.farm?.crop || "rice",
          farmId: ctx.farm?.id,
        }),
      });
    } catch {
      // Fallback to local curated knowledge base
    }
  }

  await wait(900 + Math.min(900, question.length * 12));
  maybeSimulateFailure();
  const lang = ctx.lang;
  const topic = matchTopic(question);
  const line = contextLine(ctx, lang);
  return {
    id: newId("msg"),
    topic: topic.id,
    kind: "general",
    title: topic.title[lang],
    body: line ? `${line} ${topic.body[lang]}` : topic.body[lang],
    bullets: topic.bullets.map((b) => b[lang]),
    caution: CAUTION[lang],
    followUps: topic.followUps.map((f) => f[lang]),
  };
}
