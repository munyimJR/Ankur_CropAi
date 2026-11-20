import { hashString, wait } from "@/lib/seeded";
import { getServiceMode, UPLOAD_LIMITS } from "./config";
import { apiFetch, maybeSimulateFailure, newId, ServiceError } from "./http";
import { logActivity } from "./activity.service";
import type {
  CropAnalysisResult,
  CropCondition,
  CropId,
  LocalizedText,
} from "./types";

/**
 * Crop image analysis.
 * DEMO mode returns a deterministic sample result — it does NOT look at image content.
 * API mode: POST {API}/v1/vision/analyze  (multipart/form-data: image, crop, farm_id?)
 *           → CropAnalysisResult, served by a self-hosted computer-vision model.
 */

export type AnalysisStage =
  "upload" | "prepare" | "inspect" | "compare" | "guidance";
export const ANALYSIS_STAGES: AnalysisStage[] = [
  "upload",
  "prepare",
  "inspect",
  "compare",
  "guidance",
];

export type ImageValidation =
  { ok: true } | { ok: false; reason: "type" | "size" | "empty" };

export function validateImage(file: File | null | undefined): ImageValidation {
  if (!file || file.size === 0) return { ok: false, reason: "empty" };
  if (!(UPLOAD_LIMITS.acceptedTypes as readonly string[]).includes(file.type))
    return { ok: false, reason: "type" };
  if (file.size > UPLOAD_LIMITS.maxBytes) return { ok: false, reason: "size" };
  return { ok: true };
}

const C = (
  id: string,
  en: string,
  bn: string,
  category: CropCondition["category"],
): CropCondition => ({
  id,
  name: { en, bn },
  category,
});

const CLASSES: Record<CropId, CropCondition[]> = {
  rice: [
    C("rice_healthy", "Healthy leaf", "সুস্থ পাতা", "healthy"),
    C("rice_blast", "Leaf blast (possible)", "ব্লাস্ট রোগ (সম্ভাব্য)", "fungal"),
    C(
      "rice_brown_spot",
      "Brown spot (possible)",
      "বাদামি দাগ রোগ (সম্ভাব্য)",
      "fungal",
    ),
    C(
      "rice_blb",
      "Bacterial leaf blight (possible)",
      "পাতা পোড়া রোগ (সম্ভাব্য)",
      "bacterial",
    ),
    C(
      "rice_tungro",
      "Tungro-like yellowing (possible)",
      "টুংরো-সদৃশ হলুদভাব (সম্ভাব্য)",
      "pest",
    ),
  ],
  potato: [
    C("potato_healthy", "Healthy leaf", "সুস্থ পাতা", "healthy"),
    C(
      "potato_late_blight",
      "Late blight (possible)",
      "নাবি ধসা রোগ (সম্ভাব্য)",
      "fungal",
    ),
    C(
      "potato_early_blight",
      "Early blight (possible)",
      "আগাম ধসা রোগ (সম্ভাব্য)",
      "fungal",
    ),
  ],
  tomato: [
    C("tomato_healthy", "Healthy leaf", "সুস্থ পাতা", "healthy"),
    C(
      "tomato_leaf_curl",
      "Leaf curl (possible)",
      "পাতা কোঁকড়ানো (সম্ভাব্য)",
      "pest",
    ),
    C(
      "tomato_early_blight",
      "Early blight (possible)",
      "আগাম ধসা রোগ (সম্ভাব্য)",
      "fungal",
    ),
  ],
  wheat: [
    C("wheat_healthy", "Healthy leaf", "সুস্থ পাতা", "healthy"),
    C(
      "wheat_leaf_rust",
      "Leaf rust (possible)",
      "পাতার মরিচা রোগ (সম্ভাব্য)",
      "fungal",
    ),
    C("wheat_blast", "Wheat blast (possible)", "গমের ব্লাস্ট (সম্ভাব্য)", "fungal"),
  ],
  maize: [
    C("maize_healthy", "Healthy leaf", "সুস্থ পাতা", "healthy"),
    C(
      "maize_leaf_blight",
      "Leaf blight (possible)",
      "পাতা ঝলসানো (সম্ভাব্য)",
      "fungal",
    ),
    C(
      "maize_faw",
      "Fall armyworm feeding (possible)",
      "ফল আর্মিওয়ার্মের ক্ষতি (সম্ভাব্য)",
      "pest",
    ),
  ],
  jute: [
    C("jute_healthy", "Healthy leaf", "সুস্থ পাতা", "healthy"),
    C(
      "jute_stem_rot",
      "Stem rot signs (possible)",
      "কাণ্ড পচা লক্ষণ (সম্ভাব্য)",
      "fungal",
    ),
    C(
      "jute_nutrient",
      "Nutrient yellowing (possible)",
      "পুষ্টির অভাবে হলুদভাব (সম্ভাব্য)",
      "nutrient",
    ),
  ],
  mustard: [
    C("mustard_healthy", "Healthy leaf", "সুস্থ পাতা", "healthy"),
    C(
      "mustard_alternaria",
      "Alternaria leaf spot (possible)",
      "অল্টারনারিয়া পাতার দাগ (সম্ভাব্য)",
      "fungal",
    ),
    C(
      "mustard_aphid",
      "Aphid damage (possible)",
      "জাব পোকার ক্ষতি (সম্ভাব্য)",
      "pest",
    ),
  ],
  tea: [
    C("tea_healthy", "Healthy leaf", "সুস্থ পাতা", "healthy"),
    C("tea_red_rust", "Red rust (possible)", "লাল মরিচা (সম্ভাব্য)", "fungal"),
    C("tea_mite", "Red spider mite (possible)", "লাল মাকড় (সম্ভাব্য)", "pest"),
  ],
};

export function supportedClasses(crop: CropId): LocalizedText[] {
  return CLASSES[crop].map((c) => c.name);
}

const GUIDANCE: Record<CropCondition["category"], LocalizedText[]> = {
  healthy: [
    {
      en: "No action suggested from this sample. Keep observing weekly.",
      bn: "এই নমুনা থেকে কোনো পদক্ষেপের প্রয়োজন দেখা যাচ্ছে না। সপ্তাহে একবার পর্যবেক্ষণ চালিয়ে যান।",
    },
    {
      en: "Photograph a few more leaves from different corners of the field.",
      bn: "জমির বিভিন্ন কোণ থেকে আরও কয়েকটি পাতার ছবি তুলুন।",
    },
  ],
  fungal: [
    {
      en: "Walk the field and check whether spots appear on many plants or just a few.",
      bn: "জমি ঘুরে দেখুন — দাগ কি অনেক গাছে, নাকি অল্প কয়েকটিতে?",
    },
    {
      en: "Avoid excess nitrogen and improve drainage where water stands.",
      bn: "অতিরিক্ত ইউরিয়া এড়িয়ে চলুন এবং পানি জমে থাকলে নিষ্কাশন করুন।",
    },
    {
      en: "Before using any fungicide, confirm with your local agriculture officer (DAE) or call 16123.",
      bn: "যেকোনো ছত্রাকনাশক ব্যবহারের আগে উপজেলা কৃষি অফিসারের সাথে নিশ্চিত হোন বা ১৬১২৩ নম্বরে ফোন করুন।",
    },
  ],
  bacterial: [
    {
      en: "Check if leaf edges are drying from the tip — note how many plants are affected.",
      bn: "পাতার আগা থেকে কিনারা শুকাচ্ছে কিনা দেখুন — কতগুলো গাছ আক্রান্ত তা লিখে রাখুন।",
    },
    {
      en: "Pause extra urea and avoid moving water from affected plots to healthy ones.",
      bn: "অতিরিক্ত ইউরিয়া দেওয়া বন্ধ রাখুন এবং আক্রান্ত জমির পানি সুস্থ জমিতে যেতে দেবেন না।",
    },
    {
      en: "Ask your local agriculture officer to confirm before treatment.",
      bn: "চিকিৎসার আগে স্থানীয় কৃষি কর্মকর্তার মাধ্যমে নিশ্চিত হোন।",
    },
  ],
  pest: [
    {
      en: "Look under leaves and around stems for insects or eggs.",
      bn: "পাতার নিচে ও কাণ্ডের চারপাশে পোকা বা ডিম আছে কিনা দেখুন।",
    },
    {
      en: "Consider light or sticky traps to gauge pest pressure first.",
      bn: "প্রথমে আলোক ফাঁদ বা আঠালো ফাঁদ দিয়ে পোকার মাত্রা বুঝে নিন।",
    },
    {
      en: "Get a confirmed identification before choosing any pesticide.",
      bn: "কোনো কীটনাশক বেছে নেওয়ার আগে পোকা নিশ্চিতভাবে শনাক্ত করুন।",
    },
  ],
  nutrient: [
    {
      en: "Compare older and younger leaves — note where yellowing starts.",
      bn: "পুরোনো ও নতুন পাতা তুলনা করুন — হলুদভাব কোথা থেকে শুরু হচ্ছে দেখুন।",
    },
    {
      en: "A soil test helps decide the right fertilizer dose.",
      bn: "সঠিক সার মাত্রা ঠিক করতে মাটি পরীক্ষা সহায়ক।",
    },
  ],
};

export async function analyzeCropImage(
  params: { image: File; crop: CropId; farmId?: string },
  onStage?: (stage: AnalysisStage) => void,
): Promise<CropAnalysisResult> {
  const v = validateImage(params.image);
  if (!v.ok) throw new ServiceError("invalid_input", v.reason);

  if (getServiceMode() === "api") {
    onStage?.("upload");
    const form = new FormData();
    form.append("image", params.image);
    form.append("crop", params.crop);
    if (params.farmId) form.append("farm_id", params.farmId);
    try {
      onStage?.("prepare");
      const res = await apiFetch<CropAnalysisResult>(
        "/crop-scans",
        { method: "POST", body: form },
        60000,
      );
      onStage?.("guidance");
      logActivity("scan", {
        en: `Crop check (AI model): ${res.condition.name.en}`,
        bn: `ফসল যাচাই (AI মডেল): ${res.condition.name.bn}`,
      });
      return res;
    } catch (err) {
      // If server unreachable, continue to fallback demo mode below
      console.warn("API scan failed, using fallback demo inference:", err);
    }
  }

  for (const stage of ANALYSIS_STAGES) {
    onStage?.(stage);
    await wait(stage === "compare" ? 1100 : 700);
  }
  maybeSimulateFailure();

  const classes = CLASSES[params.crop];
  const h = hashString(
    `${params.image.name}-${params.image.size}-${params.crop}`,
  );
  const primary = classes[h % classes.length]!;
  const others = classes.filter((c) => c.id !== primary.id);
  const conf = 0.58 + ((h >>> 8) % 25) / 100; // 0.58–0.82 sample range
  const alt1 = Number(((1 - conf) * 0.62).toFixed(2));
  const alt2 = Number(((1 - conf) * 0.25).toFixed(2));
  const result: CropAnalysisResult = {
    id: newId("scan"),
    crop: params.crop,
    condition: primary,
    sampleConfidence: Number(conf.toFixed(2)),
    alternatives: [
      { condition: others[0]!, sampleConfidence: alt1 },
      ...(others[1] ? [{ condition: others[1], sampleConfidence: alt2 }] : []),
    ],
    severity:
      primary.category === "healthy"
        ? "none"
        : conf > 0.72
          ? "moderate"
          : "mild",
    guidance: GUIDANCE[primary.category],
    supportedClasses: supportedClasses(params.crop),
    model: { name: "Demo sample generator", version: "phase-1", mode: "demo" },
    analyzedAt: new Date().toISOString(),
    isDemo: true,
  };
  logActivity("scan", {
    en: `Crop check (demo): ${primary.name.en}`,
    bn: `ফসল যাচাই (ডেমো): ${primary.name.bn}`,
  });
  return result;
}

export async function submitScanFeedback(
  scanId: string,
  isAccurate: boolean,
  farmerNotes?: string,
): Promise<void> {
  if (getServiceMode() === "api") {
    try {
      await apiFetch(`/crop-scans/${scanId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAccurate, farmerNotes }),
      });
    } catch (e) {
      console.warn("Could not submit feedback to API:", e);
    }
  }
}
