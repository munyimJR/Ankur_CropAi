import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  Cpu,
  CheckCircle2,
  Trash2,
  Play,
  Layers,
  Info,
  AlertCircle,
  FileCode,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lock,
  ShieldCheck,
  LogIn,
  LogOut,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "../state";
import { PageHead, Demo } from "../components/common";
import {
  getModelsRegistry,
  uploadModel,
  activateModel,
  deleteModel,
  testModelInference,
  type RegisteredModel,
  type ModelTestResult,
} from "../services/models.service";

const SUPPORTED_CROPS = [
  "rice",
  "potato",
  "tomato",
  "maize",
  "wheat",
  "chili",
  "cotton",
  "jute",
  "general",
];

export function AdminModels() {
  const { t, lang, notify, user, login, logout } = useApp();
  const isAdmin = user?.role === "admin";
  const [models, setModels] = useState<RegisteredModel[]>([]);
  const [activeMappings, setActiveMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Admin Login Modal State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState("polash");
  const [adminPassword, setAdminPassword] = useState("2002");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginErrorMsg, setLoginErrorMsg] = useState("");

  // Upload Form State
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [labelsFile, setLabelsFile] = useState<File | null>(null);
  const [useLabelsFile, setUseLabelsFile] = useState(false);
  const [modelId, setModelId] = useState("");
  const [modelName, setModelName] = useState("");
  const [version, setVersion] = useState("1.0.0-onnx");
  const [cropType, setCropType] = useState("wheat");
  const [classesText, setClassesText] = useState("leaf_rust, powdery_mildew, tan_spot, healthy");
  const [license, setLicense] = useState("CC-BY 4.0");
  const [dataset, setDataset] = useState("BARI / Agricultural Research Benchmark Dataset");
  const [setActiveNow, setSetActiveNow] = useState(true);

  // Testing Drawer State
  const [testModel, setTestModel] = useState<RegisteredModel | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [testPreview, setTestPreview] = useState("");
  const [testingBusy, setTestingBusy] = useState(false);
  const [testResult, setTestResult] = useState<ModelTestResult | null>(null);
  const [testError, setTestError] = useState("");

  // Expanded Provenance Cards
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const testFileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getModelsRegistry();
      setModels(res.models);
      setActiveMappings(res.activeMappings);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load model registry";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      if (f.name.toLowerCase().endsWith(".onnx")) {
        setModelFile(f);
        if (!modelId) {
          const base = f.name.replace(/\.onnx$/i, "").toLowerCase().replace(/[^a-z0-9_]/g, "_");
          setModelId(base);
          setModelName(f.name.replace(/\.onnx$/i, "").replace(/[-_]/g, " "));
        }
      } else {
        notify(t("Only .onnx model files are supported.", "শুধুমাত্র .onnx ফাইল সমর্থিত।"));
      }
    }
  };

  const handleAdminAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoginSubmitting(true);
      setLoginErrorMsg("");
      const success = await login({
        email: adminUsername.trim(),
        password: adminPassword,
      });
      if (success) {
        setShowLoginModal(false);
        notify(
          t(
            "Logged in as Admin (Polash). Full editing access granted.",
            "অ্যাডমিন (পলাশ) হিসেবে সফলভাবে লগইন হয়েছে।"
          )
        );
        await loadData();
      } else {
        setLoginErrorMsg(
          t(
            "Invalid admin credentials. For testing, use username 'polash' and password '2002'.",
            "ভুল তথ্য। পরীক্ষার জন্য ইউজারনেম 'polash' এবং পাসওয়ার্ড '2002' ব্যবহার করুন।"
          )
        );
      }
    } catch (err: unknown) {
      setLoginErrorMsg(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setShowLoginModal(true);
      notify(t("Admin login required to upload models.", "মডেল আপলোডের জন্য অ্যাডমিন লগইন প্রয়োজন।"));
      return;
    }
    if (!modelFile) {
      setError(t("Please select an ONNX model file.", "অনুগ্রহ করে একটি .onnx মডেল ফাইল নির্বাচন করুন।"));
      return;
    }
    if (!modelId.trim() || !modelName.trim()) {
      setError(t("Model ID and name are required.", "মডেল আইডি এবং নাম আবশ্যক।"));
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccessMsg("");

      const fd = new FormData();
      fd.append("model_file", modelFile);
      if (useLabelsFile && labelsFile) {
        fd.append("labels_file", labelsFile);
      } else {
        fd.append("classes_text", classesText);
      }
      fd.append("model_id", modelId.trim().toLowerCase());
      fd.append("name", modelName.trim());
      fd.append("version", version.trim());
      fd.append("crop_type", cropType.trim().toLowerCase());
      fd.append("license", license.trim());
      fd.append("dataset", dataset.trim());
      fd.append("set_active", setActiveNow ? "true" : "false");

      await uploadModel(fd);

      setSuccessMsg(
        t(
          `Model "${modelName}" successfully uploaded and registered into ONNX runtime!`,
          `মডেল "${modelName}" সফলভাবে আপলোড ও কার্যকর করা হয়েছে!`
        )
      );

      // Reset form
      setModelFile(null);
      setLabelsFile(null);
      setModelId("");
      setModelName("");
      setShowUpload(false);

      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (mId: string, crop: string) => {
    if (!isAdmin) {
      setShowLoginModal(true);
      notify(t("Admin login required to change model routing.", "মডেল রাউটিং পরিবর্তনের জন্য অ্যাডমিন লগইন প্রয়োজন।"));
      return;
    }
    try {
      setError("");
      const res = await activateModel(mId, crop);
      setActiveMappings(res.activeMappings);
      notify(t(`Model active for ${crop}.`, `${crop}-এর জন্য মডেল সক্রিয় করা হয়েছে।`));
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Activation failed";
      setError(msg);
    }
  };

  const handleDelete = async (mId: string, name: string) => {
    if (!isAdmin) {
      setShowLoginModal(true);
      notify(t("Admin login required to delete models.", "মডেল মুছে ফেলার জন্য অ্যাডমিন লগইন প্রয়োজন।"));
      return;
    }
    if (!window.confirm(t(`Are you sure you want to delete "${name}"?`, `আপনি কি "${name}" মুছে ফেলতে চান?`))) {
      return;
    }
    try {
      setError("");
      await deleteModel(mId);
      notify(t(`Model "${name}" was removed.`, `মডেল "${name}" মুছে ফেলা হয়েছে।`));
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
    }
  };

  const handleRunTest = async () => {
    if (!testModel || !testFile) return;
    try {
      setTestingBusy(true);
      setTestError("");
      const res = await testModelInference(testModel.id, testFile);
      setTestResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Inference test failed";
      setTestError(msg);
    } finally {
      setTestingBusy(false);
    }
  };

  const onSelectTestFile = (f: File) => {
    setTestFile(f);
    setTestResult(null);
    setTestError("");
    const url = URL.createObjectURL(f);
    setTestPreview(url);
  };

  const activeCropsCount = Object.keys(activeMappings).length;

  return (
    <div className="admin-models space-y-8 pb-16">
      <PageHead
        title={t("AI Model Management", "মডেল ব্যবস্থাপনা ও নিয়ন্ত্রণ")}
        description={t(
          "Upload, benchmark, and deploy pretrained ONNX computer vision models to the inference engine.",
          "অনুকূলিত ONNX কম্পিউটার ভিশন মডেল আপলোড, পরীক্ষা ও পরিচালনা করুন।"
        )}
      >
        <div className="flex items-center gap-3">
          <Demo>{t("ONNX RUNTIME • CPU ACCELERATED", "ONNX রানটাইম • সিপিইউ এক্সিলারেটেড")}</Demo>
          <button
            onClick={() => {
              if (!isAdmin) {
                setShowLoginModal(true);
                return;
              }
              setShowUpload(!showUpload);
              setSuccessMsg("");
              setError("");
            }}
            className="btn lime flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <UploadCloud size={18} />
            {showUpload ? t("Close Upload Form", "ফর্ম বন্ধ করুন") : t("Deploy New Model", "নতুন মডেল আপলোড")}
          </button>
        </div>
      </PageHead>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="panel p-5 border border-border/60 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-forest/10 dark:bg-lime/10 text-forest dark:text-lime flex items-center justify-center">
            <Cpu size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-sans">{models.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("Registered Models", "নিবন্ধিত মডেল")}
            </div>
          </div>
        </div>

        <div className="panel p-5 border border-border/60 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-lime/20 text-forest flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-sans">{activeCropsCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("Active Mappings", "সক্রিয় ক্রপ ম্যাপিং")}
            </div>
          </div>
        </div>

        <div className="panel p-5 border border-border/60 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-leaf/15 text-leaf flex items-center justify-center">
            <Layers size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold font-sans">ONNX</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("Inference Engine", "ইনফারেন্স ইঞ্জিন")}
            </div>
          </div>
        </div>

        <div className="panel p-5 border border-border/60 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber/15 text-amber flex items-center justify-center">
            {isAdmin ? <ShieldCheck size={24} className="text-forest dark:text-lime" /> : <Sparkles size={24} />}
          </div>
          <div>
            <div className="text-2xl font-bold font-sans">
              {isAdmin ? "ADMIN" : "OPERATOR"}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <span>{t("Access Level", "অ্যাক্সেস স্তর")}</span>
              {isAdmin && (
                <button
                  onClick={() => {
                    logout();
                    setShowUpload(false);
                    notify(t("Logged out of admin mode.", "অ্যাডমিন মোড থেকে প্রস্থান করা হয়েছে।"));
                  }}
                  className="text-destructive hover:underline text-[10px] ml-1 font-semibold cursor-pointer"
                >
                  ({t("Exit", "প্রস্থান")})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-lime/20 border border-lime/40 text-forest rounded-xl flex items-center gap-3 text-sm font-medium">
          <CheckCircle2 size={20} className="shrink-0 text-leaf" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Upload Model Accordion / Panel */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="panel border-2 border-dashed border-lime/60 p-7 rounded-2xl bg-card shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <UploadCloud className="text-leaf" size={22} />
                    {t("Deploy Pretrained ONNX Model", "প্রি-ট্রেইন্ড ONNX মডেল স্থাপন করুন")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(
                      "Upload an exported .onnx model checkpoint with its disease classifications. Automatically loaded into memory without restarting.",
                      ".onnx মডেল ফাইল আপলোড করুন। সার্ভার রিস্টার্ট ছাড়াই তাৎক্ষণিকভাবে সক্রিয় হবে।"
                    )}
                  </p>
                </div>
                <span className="text-xs font-mono bg-muted px-2.5 py-1 rounded-md text-muted-foreground">
                  Format: ONNX v17+ · Input: [1, 3, 224, 224]
                </span>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-6">
                {/* Drag & Drop File Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    modelFile
                      ? "border-leaf bg-leaf/5"
                      : "border-border hover:border-lime hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".onnx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        setModelFile(f);
                        if (!modelId) {
                          const base = f.name
                            .replace(/\.onnx$/i, "")
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "_");
                          setModelId(base);
                          setModelName(f.name.replace(/\.onnx$/i, "").replace(/[-_]/g, " "));
                        }
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-forest/5 flex items-center justify-center text-forest dark:text-lime">
                      <UploadCloud size={24} />
                    </div>
                    {modelFile ? (
                      <div className="space-y-1">
                        <span className="font-semibold text-forest dark:text-lime">{modelFile.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {(modelFile.size / (1024 * 1024)).toFixed(2)} MB · {t("Ready to deploy", "আপলোডের জন্য প্রস্তুত")}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium">
                          {t("Click to choose or drag & drop .onnx file here", "ক্লিক করে বা টেনে এনে .onnx ফাইল যুক্ত করুন")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("Must be an ONNX model exported from PyTorch, TensorFlow, or Hugging Face", "PyTorch বা Hugging Face থেকে এক্সপোর্টকৃত ONNX ফাইল")}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("Model Identifier", "মডেল আইডি")} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. wheat_leaf_rust_v1"
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {t("Unique key used in API calls (lowercase, underscores)", "অনন্য সনাক্তকারী আইডি (ছোট হাতের অক্ষর)")}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("Display Name", "প্রদর্শনী নাম")} <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bangladesh Wheat Leaf Rust Net"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-lime"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("Target Crop Domain", "টার্গেট শস্য")}
                    </label>
                    <select
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-lime capitalize"
                    >
                      {SUPPORTED_CROPS.map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("Model Version", "মডেল সংস্করণ")}
                    </label>
                    <input
                      type="text"
                      placeholder="1.0.0-onnx"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime"
                    />
                  </div>
                </div>

                {/* Class Labels Configuration */}
                <div className="p-4 bg-muted/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileCode size={16} />
                      {t("Class Labels Configuration", "রোগ ও লক্ষণ লেবেল নির্ধারণ")}
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setUseLabelsFile(false)}
                        className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                          !useLabelsFile ? "bg-forest text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t("Comma-Separated Text", "টেক্সট তালিকা")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseLabelsFile(true)}
                        className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                          useLabelsFile ? "bg-forest text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t("Upload labels.json", "JSON ফাইল")}
                      </button>
                    </div>
                  </div>

                  {!useLabelsFile ? (
                    <div>
                      <input
                        type="text"
                        placeholder="leaf_rust, powdery_mildew, healthy, other"
                        value={classesText}
                        onChange={(e) => setClassesText(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {t(
                          "Enter the exact class names output by the model, separated by commas in order (index 0, 1, 2...).",
                          "মডেলের আউটপুট ক্লাসের নাম ক্রমানুসারে কমা দিয়ে লিখুন (০, ১, ২...)।"
                        )}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => setLabelsFile(e.target.files?.[0] || null)}
                        className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-forest file:text-white hover:file:bg-forest/90 cursor-pointer"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {t(
                          'Upload a JSON file containing {"classes": ["..."]} or {"id2label": {"0": "..."}}.',
                          '{"classes": [...]} সম্বলিত JSON ফাইল আপলোড করুন।'
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Provenance Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("License", "লাইসেন্স")}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CC-BY 4.0 or Apache-2.0"
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-lime"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("Training Dataset Citation", "প্রশিক্ষণ ডেটাসেট")}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kaggle Paddy Doctor / BARI Research"
                      value={dataset}
                      onChange={(e) => setDataset(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-lime"
                    />
                  </div>
                </div>

                {/* Active Checkbox & Submit */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border/60">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={setActiveNow}
                      onChange={(e) => setSetActiveNow(e.target.checked)}
                      className="w-4 h-4 accent-forest rounded"
                    />
                    <span>
                      {t(
                        `Set as active model for "${cropType}" immediately`,
                        `তাৎক্ষণিকভাবে "${cropType}"-এর জন্য এই মডেল সক্রিয় করুন`
                      )}
                    </span>
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowUpload(false)}
                      className="btn outline text-sm cursor-pointer"
                    >
                      {t("Cancel", "বাতিল")}
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || !modelFile}
                      className="btn lime text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <RotateCcw className="animate-spin" size={16} />
                          {t("Verifying & Deploying...", "যাচাই ও ইনস্টল হচ্ছে...")}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          {t("Upload & Deploy Model", "মডেল আপলোড ও সক্রিয় করুন")}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Models List Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-sans">
            {t("Registered Computer Vision Models", "নিবন্ধিত কম্পিউটার ভিশন মডেলসমূহ")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "Self-hosted ONNX models available for Crop Guardian disease diagnosis.",
              "ফসল রোগ নির্ণয়ের জন্য ব্যবহৃত স্ব-হোস্টেড অন-ডিভাইস মডেলসমূহ।"
            )}
          </p>
        </div>
        <button
          onClick={loadData}
          className="btn outline text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
          {t("Refresh", "রিফ্রেশ")}
        </button>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {models.map((m) => {
          const isExpanded = expandedId === m.id;
          const isSystemDefault =
            m.id === "rice_mobilenetv3" ||
            m.id === "plantvillage_mobilenetv2" ||
            m.id === "plantvillage_efficientnetv2";
          const activeFor = m.activeForCrops || [];

          return (
            <div
              key={m.id}
              className="panel border border-border/80 rounded-2xl p-6 bg-card flex flex-col justify-between space-y-5 hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base">{m.name}</h3>
                      {activeFor.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-lime text-forest">
                          <CheckCircle2 size={12} />
                          {t("ACTIVE", "সক্রিয়")}
                        </span>
                      )}
                      {m.provenance?.validationAccuracy && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          {t("Accuracy:", "নির্ভুলতা:")} {m.provenance.validationAccuracy}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {m.id}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{m.version}</span>
                    </div>
                  </div>

                  <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-forest/10 text-forest dark:bg-lime/10 dark:text-lime">
                    {m.framework.toUpperCase()}
                  </span>
                </div>

                {/* Target & Active Status */}
                <div className="text-xs space-y-1.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{t("Crop Domain:", "শস্য:")}</span>
                    <span className="font-medium capitalize">{m.cropType}</span>
                  </div>

                  {activeFor.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-muted-foreground">{t("Active For:", "সক্রিয় শস্য:")}</span>
                      {activeFor.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded bg-lime/30 text-forest font-semibold text-[11px] uppercase tracking-wide"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{t("Input Tensor:", "ইনপুট টেনসর:")}</span>
                    <span className="font-mono text-muted-foreground">{m.inputShape}</span>
                  </div>
                </div>

                {/* Supported Classes Badges */}
                <div className="pt-2">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                    {t(
                      `Supported Classes (${m.supportedClasses.length}):`,
                      `সমর্থিত ক্লাস (${m.supportedClasses.length}):`
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {m.supportedClasses.map((sc, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-muted px-2 py-0.5 rounded text-foreground/80"
                        title={sc.en}
                      >
                        {sc[lang] || sc.en}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Provenance Collapsible */}
                <div className="pt-2 border-t border-border/60">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground cursor-pointer py-1"
                  >
                    <span className="flex items-center gap-1 font-medium">
                      <Info size={14} />
                      {t("Dataset Provenance & Architecture", "প্রশিক্ষণ ডেটাসেট ও স্থাপত্য")}
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 p-3 bg-muted/40 rounded-xl text-xs space-y-1.5 font-sans"
                    >
                      {m.provenance.sourceRepository && (
                        <div>
                          <strong className="text-muted-foreground">Source:</strong>{" "}
                          <span>{m.provenance.sourceRepository}</span>
                        </div>
                      )}
                      {m.provenance.sourceUrl && (
                        <div>
                          <strong className="text-muted-foreground">Model Hub:</strong>{" "}
                          <a
                            href={m.provenance.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-leaf hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                          >
                            {m.provenance.sourceUrl} <ExternalLink size={11} />
                          </a>
                        </div>
                      )}
                      {m.provenance.validationAccuracy && (
                        <div>
                          <strong className="text-muted-foreground">Validation Accuracy:</strong>{" "}
                          <span className="font-semibold text-forest dark:text-lime">
                            {m.provenance.validationAccuracy}
                          </span>
                          {m.provenance.macroF1 && (
                            <span className="text-muted-foreground font-mono ml-2">
                              (Macro F1: {m.provenance.macroF1})
                            </span>
                          )}
                        </div>
                      )}
                      {m.provenance.license && (
                        <div>
                          <strong className="text-muted-foreground">License:</strong>{" "}
                          <span>{m.provenance.license}</span>
                        </div>
                      )}
                      {m.provenance.baseArchitecture && (
                        <div>
                          <strong className="text-muted-foreground">Architecture:</strong>{" "}
                          <span>{m.provenance.baseArchitecture}</span>
                        </div>
                      )}
                      {m.provenance.trainingDataset && (
                        <div>
                          <strong className="text-muted-foreground">Training Data:</strong>{" "}
                          <span>{m.provenance.trainingDataset}</span>
                        </div>
                      )}
                      {m.provenance.limitations && (
                        <div>
                          <strong className="text-muted-foreground">Limitations:</strong>{" "}
                          <span>{m.provenance.limitations}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative inline-flex items-center">
                    <select
                      defaultValue={m.cropType.split(" ")[0]}
                      onChange={(e) => {
                        if (!isAdmin) {
                          setShowLoginModal(true);
                          notify(
                            t(
                              "Admin login required to change model routing.",
                              "মডেল রাউটিং পরিবর্তনের জন্য অ্যাডমিন লগইন প্রয়োজন।"
                            )
                          );
                          return;
                        }
                        handleActivate(m.id, e.target.value);
                      }}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:ring-1 focus:ring-lime cursor-pointer capitalize"
                      title={!isAdmin ? t("Admin login required to change routing", "মডেল রাউটিং পরিবর্তনের জন্য অ্যাডমিন লগইন আবশ্যক") : undefined}
                    >
                      <option value="" disabled>
                        {!isAdmin ? `🔒 ${t("Activate for...", "এর জন্য সক্রিয়...")}` : t("Activate for...", "এর জন্য সক্রিয় করুন...")}
                      </option>
                      {SUPPORTED_CROPS.map((c) => (
                        <option key={c} value={c}>
                          {t(`Assign to ${c}`, `${c}-এ সেট করুন`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setTestModel(m);
                      setTestFile(null);
                      setTestPreview("");
                      setTestResult(null);
                      setTestError("");
                    }}
                    className="btn outline text-xs flex items-center gap-1.5 cursor-pointer py-1.5"
                  >
                    <Play size={13} className="text-leaf" />
                    {t("Test Inference", "পরীক্ষা করুন")}
                  </button>
                </div>

                {!isSystemDefault && (
                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        setShowLoginModal(true);
                        notify(
                          t(
                            "Admin login required to delete models.",
                            "মডেল মুছে ফেলার জন্য অ্যাডমিন লগইন প্রয়োজন।"
                          )
                        );
                        return;
                      }
                      handleDelete(m.id, m.name);
                    }}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                    title={isAdmin ? t("Delete Model", "মডেল মুছুন") : t("Admin login required to delete", "মডেল মুছতে অ্যাডমিন লগইন প্রয়োজন")}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Benchmark / Testing Modal */}
      <AnimatePresence>
        {testModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Play size={18} className="text-leaf" />
                    {t("Live Inference Benchmark", "ইনফারেন্স পরীক্ষা")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {testModel.name} · <span className="font-mono">{testModel.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => setTestModel(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {testError && (
                <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{testError}</span>
                </div>
              )}

              {/* Upload Test Image */}
              <div
                onClick={() => testFileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-lime rounded-xl p-5 text-center cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={testFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      onSelectTestFile(e.target.files[0]);
                    }
                  }}
                />
                {testPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={testPreview}
                      alt="Test leaf"
                      className="w-32 h-32 object-cover rounded-lg shadow-sm border border-border"
                    />
                    <span className="text-xs text-muted-foreground">
                      {testFile?.name} · {t("Click to choose another photo", "অন্য ছবি বাছুন")}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud size={24} className="mx-auto text-muted-foreground" />
                    <p className="text-xs font-medium">
                      {t("Select or drop a test leaf image", "পরীক্ষার জন্য একটি পাতার ছবি নির্বাচন করুন")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("JPG, PNG, WebP up to 8 MB", "৮ মেগাবাইট পর্যন্ত")}
                    </p>
                  </div>
                )}
              </div>

              {/* Test Results Display */}
              {testResult && (
                <div className="p-4 bg-muted/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                    <span className="text-muted-foreground font-medium">
                      {t("Inference Latency:", "ইনফারেন্স সময়:")}
                    </span>
                    <span className="font-mono font-bold text-forest dark:text-lime">
                      {testResult.latencyMs} ms
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold">{testResult.topClass}</span>
                      <span className="font-mono font-semibold">
                        {(testResult.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-border/50 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-leaf h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, testResult.confidence * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                      {t("Top Predicted Classes:", "শীর্ষ সম্ভাব্য ফলাফল:")}
                    </div>
                    {testResult.topPredictions.map((pred, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-0.5 border-b border-border/20 last:border-0"
                      >
                        <span className="truncate pr-2">{pred.className}</span>
                        <span className="font-mono text-muted-foreground">
                          {(pred.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModel(null)}
                  className="btn outline text-xs cursor-pointer"
                >
                  {t("Close", "বন্ধ করুন")}
                </button>
                <button
                  type="button"
                  disabled={!testFile || testingBusy}
                  onClick={handleRunTest}
                  className="btn lime text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {testingBusy ? (
                    <>
                      <RotateCcw className="animate-spin" size={14} />
                      {t("Evaluating...", "বিশ্লেষণ হচ্ছে...")}
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      {t("Run Benchmark", "ইনফারেন্স চালান")}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal (polash / 2002) */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-forest/10 dark:bg-lime/20 text-forest dark:text-lime flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">
                      {t("Admin Authentication", "অ্যাডমিন লগইন")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t("Log in as admin to upload, map, or delete AI models", "মডেল নিয়ন্ত্রণ ও সম্পাদনার জন্য প্রবেশ করুন")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {loginErrorMsg && (
                <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{loginErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAdminAuth} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("Admin Username / Email", "অ্যাডমিন ইউজারনেম")}
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("Admin Password", "অ্যাডমিন পাসওয়ার্ড")}
                  </label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime"
                  />
                </div>

                {/* Quick-fill helper box */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-muted-foreground">
                      {t("Configured Admin Credentials:", "নির্ধারিত অ্যাডমিন তথ্য:")}
                    </span>
                    <p className="font-mono text-foreground font-semibold">polash / 2002</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminUsername("polash");
                      setAdminPassword("2002");
                    }}
                    className="text-leaf hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <KeyRound size={13} />
                    {t("Quick Fill", "স্বয়ংক্রিয় পূরণ")}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="btn outline text-xs cursor-pointer"
                  >
                    {t("Cancel", "বাতিল")}
                  </button>
                  <button
                    type="submit"
                    disabled={loginSubmitting}
                    className="btn lime text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loginSubmitting ? (
                      <>
                        <RotateCcw className="animate-spin" size={14} />
                        {t("Authenticating...", "যাচাই হচ্ছে...")}
                      </>
                    ) : (
                      <>
                        <LogIn size={14} />
                        {t("Log In as Admin", "অ্যাডমিন হিসেবে প্রবেশ")}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Guidance Note */}
      <div className="panel p-5 border border-border/60 rounded-2xl flex items-start gap-4 text-xs text-muted-foreground bg-muted/20">
        <Info size={20} className="shrink-0 text-leaf mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            {t("Seamless Production Deployment", "উৎপাদনমুখী মডেল সংযোজন")}
          </p>
          <p>
            {t(
              "When you upload an ONNX model, the backend loads its weights directly into memory and updates active routing immediately. The Crop Guardian scanner on /app/check automatically begins using the new model for any assigned crop.",
              "ONNX মডেল আপলোড করার সাথে সাথে ব্যাকএন্ড মেমোরিতে লোড করে এবং ক্রপ রাউটিং আপডেট করে। /app/check পেজ স্বয়ংক্রিয়ভাবে নতুন মডেলটি ব্যবহার শুরু করবে।"
            )}
          </p>
          <div className="pt-1">
            <Link to="/app/check" className="text-leaf hover:underline inline-flex items-center gap-1 font-medium">
              {t("Go to Crop Guardian Scanner", "ক্রপ গার্ডিয়ানে যান")} <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
