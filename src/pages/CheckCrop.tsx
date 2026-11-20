import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  ImagePlus,
  ScanLine,
  Check,
  ArrowUpRight,
  ShieldCheck,
  Leaf,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { motion } from "motion/react";
import { useApp } from "../state";
import { PageHead, Demo, FarmSelect } from "../components/common";
import { CROPS } from "../lib/crops";
import {
  analyzeCropImage,
  validateImage,
  supportedClasses,
  submitScanFeedback,
  ANALYSIS_STAGES,
  type AnalysisStage,
} from "../services/analysis.service";
import { getServiceMode } from "../services/config";
import type { CropId, CropAnalysisResult } from "../services/types";
export function CheckCrop() {
  const { t, lang, farm, notify } = useApp();
  const [file, setFile] = useState<File>(),
    [preview, setPreview] = useState(""),
    [crop, setCrop] = useState<CropId>("rice"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [stage, setStage] = useState<AnalysisStage>("upload"),
    [result, setResult] = useState<CropAnalysisResult>(),
    [dragging, setDragging] = useState(false),
    [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const input = useRef<HTMLInputElement>(null),
    token = useRef(0);
  useEffect(
    () => () => {
      token.current++;
    },
    [],
  );
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function accept(f?: File) {
    setError("");
    setResult(undefined);
    const v = validateImage(f);
    if (!v.ok) {
      setError(
        t(
          "Choose a JPG, PNG or WebP image under 8 MB.",
          "৮ মেগাবাইটের কম JPG, PNG বা WebP ছবি দিন।",
        ),
      );
      return;
    }
    try {
      const image = await createImageBitmap(f!);
      image.close();
      setFile(f);
    } catch {
      setError(
        t(
          "This image cannot be opened. Please choose another file.",
          "এই ছবি খোলা যাচ্ছে না। অন্য একটি ছবি দিন।",
        ),
      );
    }
  }
  const stageLabels = {
    upload: t("Preparing your image", "ছবি প্রস্তুত হচ্ছে"),
    prepare: t("Checking the file", "ফাইল পরীক্ষা হচ্ছে"),
    inspect: t("Loading demo classes", "ডেমো শ্রেণি লোড হচ্ছে"),
    compare: t("Preparing a sample result", "নমুনা ফলাফল তৈরি হচ্ছে"),
    guidance: t("Gathering general guidance", "সাধারণ নির্দেশনা সংগ্রহ হচ্ছে"),
  };
  async function sample() {
    try {
      const r = await fetch("/photos/leaf.webp");
      if (!r.ok) throw Error();
      await accept(
        new File([await r.blob()], "sample-rice-leaf.webp", {
          type: "image/webp",
        }),
      );
    } catch {
      setError(
        t(
          "Sample image unavailable. Upload your own image to continue.",
          "নমুনা ছবি পাওয়া যায়নি। নিজের ছবি দিন।",
        ),
      );
    }
  }
  async function analyze() {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(undefined);
    const id = ++token.current;
    try {
      const data = await analyzeCropImage(
        { image: file, crop, farmId: farm?.id },
        (s) => {
          if (id === token.current) setStage(s);
        },
      );
      if (id === token.current) setResult(data);
    } catch {
      if (id === token.current)
        setError(
          t(
            "Analysis could not finish. Retry or turn off simulated errors in Settings.",
            "বিশ্লেষণ শেষ করা যায়নি। আবার চেষ্টা করুন বা সেটিংসে ডেমো ত্রুটি বন্ধ করুন।",
          ),
        );
    } finally {
      if (id === token.current) setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        title={t(
          "A closer look. A clearer next step.",
          "কাছে থেকে দেখুন। পরবর্তী পদক্ষেপ জানুন।",
        )}
        description={t(
          "Start with a leaf. Explore what a crop check could tell you.",
          "একটি পাতার ছবি দিয়ে ফসল যাচাইয়ের নমুনা দেখুন।",
        )}
      >
        <div className="flex items-center gap-2">
          <Demo>AI INFERENCE</Demo>
          <Link
            to="/app/models"
            className="btn outline"
            style={{ fontSize: "12px", padding: "5px 12px" }}
            title={t("Upload and manage pretrained models", "মডেল আপলোড ও নিয়ন্ত্রণ")}
          >
            {t("AI Models Admin ↗", "মডেল নিয়ন্ত্রণ ↗")}
          </Link>
        </div>
      </PageHead>
      <div className="scan-layout">
        <section className="panel scan-input">
          <div className="panel-heading">
            <h2>
              <ScanLine size={22} />
              {t("Check your crop", "আপনার ফসল যাচাই")}
            </h2>
            <span className="step-pill">1 / 2</span>
          </div>
          <label>
            {t("Which crop are you checking?", "কোন ফসল যাচাই করবেন?")}
            <select
              value={crop}
              disabled={busy}
              onChange={(e) => {
                setCrop(e.target.value as CropId);
                setResult(undefined);
              }}
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name[lang]}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={input}
            type="file"
            className="sr-only"
            tabIndex={-1}
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              void accept(e.target.files?.[0]);
              e.target.value = "";
            }}
            disabled={busy}
          />
          <button
            type="button"
            disabled={busy}
            className={
              "upload-zone " +
              (preview ? "has-image " : "") +
              (dragging ? "dragging" : "")
            }
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!busy) void accept(e.dataTransfer.files[0]);
            }}
            aria-label={t("Choose crop image", "ফসলের ছবি বেছে নিন")}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt={t("Your uploaded crop image", "আপনার দেওয়া ফসলের ছবি")}
                />
                <span className="image-change">
                  <ImagePlus size={16} />
                  {t("Change photo", "ছবি বদলান")}
                </span>
                {busy && (
                  <motion.span
                    className="scan-line"
                    animate={{ top: ["10%", "90%", "10%"] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                )}
              </>
            ) : (
              <>
                <span className="upload-icon">
                  <UploadCloud size={32} />
                </span>
                <h3>
                  {t(
                    "A little leaf. A lot to learn.",
                    "ছোট্ট পাতা, জানার অনেক কিছু।",
                  )}
                </h3>
                <p>
                  {t(
                    "Drop your crop photo here, or click to browse",
                    "ছবি এখানে দিন, বা বেছে নিতে ক্লিক করুন",
                  )}
                </p>
                <span className="small muted">
                  JPG, PNG, WebP · {t("Up to 8 MB", "সর্বোচ্চ ৮ মেগাবাইট")}
                </span>
              </>
            )}
          </button>
          {!preview && (
            <button className="sample-button" onClick={sample}>
              <img src="/photos/leaf.webp" alt="" />
              <span>
                {t(
                  "Just looking around? Try a sample leaf.",
                  "ঘুরে দেখছেন? নমুনা পাতা দিয়ে দেখুন।",
                )}
              </span>
              <ArrowUpRight size={17} />
            </button>
          )}
          {file && (
            <p className="file-caption">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}
          {error && (
            <div className="error-text" role="alert">
              {error}
            </div>
          )}
          <button
            className="btn primary full"
            onClick={analyze}
            disabled={!file || busy}
          >
            <ScanLine size={19} />
            {busy
              ? t("Preparing your demo…", "ডেমো প্রস্তুত হচ্ছে…")
              : t("Analyze Crop", "ফসল বিশ্লেষণ করুন")}
            <ArrowUpRight size={19} />
          </button>
          <p className="privacy-note">
            <ShieldCheck size={15} />
            {getServiceMode() === "api"
              ? t(
                  "Processed securely by self-hosted ONNX model. No paid external AI API.",
                  "নিজস্ব হোস্টেড ONNX মডেলে নিরাপদ বিশ্লেষণ। কোনো পেইড AI এপিআই নেই।",
                )
              : t(
                  "Your photo stays in your browser. No AI service is called.",
                  "ছবি আপনার ব্রাউজারেই থাকে। কোনো AI সেবা ব্যবহার হয় না।",
                )}
          </p>
        </section>
        <section className="scan-output" aria-live="polite">
          {busy ? (
            <div className="panel analysis-progress">
              <div className="large-leaf">
                <Leaf size={42} />
              </div>
              <h2>{t("Getting the picture.", "ছবির ধারণা নেওয়া হচ্ছে।")}</h2>
              <p>
                {t(
                  "Preparing a demonstration, not a diagnosis.",
                  "নমুনা তৈরি হচ্ছে, রোগনির্ণয় নয়।",
                )}
              </p>
              {ANALYSIS_STAGES.map((s, i) => (
                <div
                  className={
                    "analysis-stage " +
                    (i <= ANALYSIS_STAGES.indexOf(stage) ? "done" : "")
                  }
                  key={s}
                >
                  <span>
                    {i < ANALYSIS_STAGES.indexOf(stage) ? (
                      <Check size={15} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {stageLabels[s]}
                </div>
              ))}
            </div>
          ) : result ? (
            <div className="panel result-panel">
              <div className="row between">
                <h2>{result.isDemo ? t("Your sample result", "আপনার নমুনা ফলাফল") : t("Model Analysis Result", "মডেল বিশ্লেষণ ফলাফল")}</h2>
                {result.isDemo ? <Demo /> : <span className="demo" style={{ background: "#e8f5e9", color: "#1b5e20", borderColor: "#a5d6a7" }}>AI MODEL · {result.model.name}</span>}
              </div>
              <div className="result-condition">
                <span className="result-leaf">
                  <Leaf size={30} />
                </span>
                <span className="small muted">
                  {result.isDemo ? t("Illustrative condition", "উদাহরণ অবস্থা") : t("Detected plant condition", "সনাক্তকৃত উদ্ভিদের অবস্থা")}
                </span>
                <h2>{result.condition.name[lang]}</h2>
                <span className="confidence">
                  {Math.round(result.sampleConfidence * 100)}%{" "}
                  {result.isDemo ? t("sample confidence", "নমুনা কনফিডেন্স") : t("model confidence", "মডেল কনফিডেন্স")}
                </span>
              </div>
              {result.lowConfidence && (
                <div className="caution" style={{ borderColor: "#fbc02d", background: "#fffde7" }}>
                  <AlertTriangle size={20} />
                  <p>
                    {t(
                      "Low confidence detection (<40%). Visual symptoms may be unclassified, mixed, or affected by lighting. Inspect leaf in daylight.",
                      "কম কনফিডেন্স সনাক্তকরণ (<৪০%)। লক্ষণ স্পষ্ট নয় বা ছায়ার প্রভাব রয়েছে। দিনের আলোতে আবার পরীক্ষা করুন।",
                    )}
                  </p>
                </div>
              )}
              <div className="caution">
                <AlertTriangle size={20} />
                <p>
                  {result.safetyNotice
                    ? (lang === "bn"
                        ? "মডেলের ফলাফল প্রাথমিক ধারণা। এটি কোনো রাসায়নিক প্রেসক্রিপশন নয়। কীটনাশক বা সার ব্যবহারের পূর্বে স্থানীয় কৃষি কর্মকর্তার পরামর্শ নিন।"
                        : result.safetyNotice)
                    : t(
                        "Not a confirmed diagnosis. Confidence is illustrative, not measured model accuracy.",
                        "এটি নিশ্চিত রোগনির্ণয় নয়। কনফিডেন্স বাস্তব মডেলের নির্ভুলতা নয়।",
                      )}
                </p>
              </div>
              <h3>{t("What you can observe next", "পরবর্তী পর্যবেক্ষণ")}</h3>
              <ul className="guidance-list">
                {result.guidance.map((g, i) => (
                  <li key={i}>
                    <Check size={17} />
                    {g[lang]}
                  </li>
                ))}
              </ul>
              <div className="row" style={{ marginTop: "1rem", marginBottom: "0.5rem", gap: "0.5rem" }}>
                <span className="small muted">{t("Was this analysis helpful?", "এই ফলাফল কি উপযোগী ছিল?")}</span>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "4px 10px", fontSize: "12px", background: feedbackGiven === true ? "#c8e6c9" : undefined }}
                  onClick={() => {
                    void submitScanFeedback(result.id, true);
                    setFeedbackGiven(true);
                    notify(t("Thank you! Feedback saved.", "ধন্যবাদ! আপনার মতামত সংরক্ষিত হয়েছে।"));
                  }}
                >
                  👍 {t("Accurate", "সঠিক")}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "4px 10px", fontSize: "12px", background: feedbackGiven === false ? "#ffcdd2" : undefined }}
                  onClick={() => {
                    void submitScanFeedback(result.id, false);
                    setFeedbackGiven(false);
                    notify(t("Noted. Feedback saved for retraining.", "মতামত সংরক্ষিত হয়েছে।"));
                  }}
                >
                  👎 {t("Inaccurate", "ভুল")}
                </button>
              </div>
              <Link className="btn" to="/app/advisor">
                {t("Ask the farm advisor", "কৃষি পরামর্শককে জিজ্ঞাসা করুন")}
                <ArrowUpRight size={17} />
              </Link>
              <button
                className="text-button"
                onClick={() => {
                  setFile(undefined);
                  setResult(undefined);
                  setFeedbackGiven(null);
                }}
              >
                <RotateCcw size={15} />
                {t("Check another photo", "অন্য ছবি যাচাই করুন")}
              </button>
            </div>
          ) : (
            <div className="scan-guide">
              <img src="/photos/leaf.webp" alt="Rice leaves covered in dew" />
              <div>
                <h2>
                  {t("Small details.", "ছোট ছোট বিষয়।")}
                  <br />
                  {t("Better understanding.", "আরও ভালো বোঝাপড়া।")}
                </h2>
                <p>
                  {t(
                    "Photograph a single leaf in natural light. Keep it in focus and include both healthy and affected areas.",
                    "প্রাকৃতিক আলোতে একটি পাতার ছবি তুলুন। ছবি স্পষ্ট রাখুন এবং সুস্থ ও আক্রান্ত অংশ অন্তর্ভুক্ত করুন।",
                  )}
                </p>
                <div className="row">
                  <span>
                    <Check size={15} />
                    {t("Natural light", "প্রাকৃতিক আলো")}
                  </span>
                  <span>
                    <Check size={15} />
                    {t("Clear focus", "স্পষ্ট ছবি")}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="supported">
            <h3>{t("Demo classes for this crop", "এই ফসলের ডেমো শ্রেণি")}</h3>
            <div>
              {supportedClasses(crop).map((c) => (
                <span key={c.en}>{c[lang]}</span>
              ))}
            </div>
            <small>
              {t(
                "Planned model classes. No computer vision model is connected.",
                "পরিকল্পিত মডেলের শ্রেণি। কোনো কম্পিউটার ভিশন মডেল যুক্ত নেই।",
              )}
            </small>
          </div>
        </section>
      </div>
    </>
  );
}
