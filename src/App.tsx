import { useEffect, useState, lazy, Suspense } from "react";
import {
  Routes,
  Route,
  NavLink,
  Link,
  Outlet,
  useLocation,
} from "react-router-dom";
import {
  Home,
  Map,
  ScanLine,
  CloudSun,
  ChartNoAxesCombined,
  MessagesSquare,
  Bell,
  Settings,
  ArrowUpRight,
  Languages,
  PanelLeftClose,
  Menu,
  X,
  UserRound,
  CheckCheck,
  Cpu,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import { Brand, Demo, FarmSelect, PageHead } from "./components/common";
import { useApp } from "./state";
import { getServiceMode, setServiceMode } from "./services/config";
import * as notifications from "./services/notifications.service";
import { Landing } from "./pages/Landing";
import { Dashboard, Fields } from "./pages/Fields";
import { CheckCrop } from "./pages/CheckCrop";
const Climate = lazy(() =>
  import("./pages/Insights").then((m) => ({ default: m.Climate })),
);
const YieldInsights = lazy(() =>
  import("./pages/Insights").then((m) => ({ default: m.YieldInsights })),
);
const Advisor = lazy(() =>
  import("./pages/Insights").then((m) => ({ default: m.Advisor })),
);
const AdminModels = lazy(() =>
  import("./pages/AdminModels").then((m) => ({ default: m.AdminModels })),
);
const nav = [
  ["/app", "Home", "হোম", Home],
  ["/app/fields", "My Fields", "আমার জমি", Map],
  ["/app/check", "Check Crop", "ফসল যাচাই", ScanLine],
  ["/app/climate", "Climate", "আবহাওয়া", CloudSun],
  ["/app/yield", "Yield Insights", "ফলন বিশ্লেষণ", ChartNoAxesCombined],
  ["/app/advisor", "Farm Advisor", "কৃষি পরামর্শ", MessagesSquare],
  ["/app/models", "AI Models", "মডেল নিয়ন্ত্রণ", Cpu],
] as const;
function Shell() {
  const {
    t,
    lang,
    setLang,
    profile,
    updateProfile,
    notify,
    reload,
    user,
    isAuthenticated,
    login,
    register,
    logout,
    deleteAccount,
  } = useApp();
  const [more, setMore] = useState(false),
    [settings, setSettings] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [authTab, setAuthTab] = useState<"profile" | "login" | "register">("profile");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [serviceMode, setServiceModeState] = useState(getServiceMode());
  const loc = useLocation();
  const [alertCount, setAlertCount] = useState(0);
  useEffect(() => {
    setMore(false);
    window.scrollTo(0, 0);
    setAlertCount(
      notifications.listNotifications().filter((n) => !n.read).length,
    );
    document.title = `${nav.find((n) => n[0] === loc.pathname)?.[1] ?? "Alerts"} · Ankur · Growing with you.`;
  }, [loc.pathname]);
  function openSettings() {
    setDraft(profile);
    setAuthError("");
    setSettings(true);
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-caption">
          {t("YOUR FARM, CONNECTED", "আপনার খামার, আপনার হাতে")}
        </div>
        <nav aria-label="Main navigation">
          {nav.map(([to, en, bn, Icon]) => (
            <NavLink
              end
              key={to}
              to={to}
              className={({ isActive }) =>
                "nav-link " + (isActive ? "active" : "")
              }
            >
              <Icon size={20} />
              {t(en, bn)}
              {to === "/app/check" && (
                <span className="nav-new">{t("TRY", "দেখুন")}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Demo>PHASE 1 DEMO</Demo>
            <p>
              {t(
                "A little more clarity. A healthier tomorrow.",
                "আরও স্পষ্ট ধারণা। আরও সুন্দর আগামী।",
              )}
            </p>
            <Link to="/">
              {t("Discover Ankur", "অঙ্কুর সম্পর্কে")}{" "}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <button className="profile" onClick={openSettings}>
            <span className="avatar">
              {profile.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{profile.name}</strong>
              <small>
                {user
                  ? `${user.role.toUpperCase()} · ${user.email.split("@")[0]}`
                  : t("Demo farmer profile", "ডেমো কৃষকের প্রোফাইল")}
              </small>
            </span>
            <Settings size={17} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <span className="desktop-label">
            <PanelLeftClose size={18} />
            <span> {t("My workspace", "আমার কর্মক্ষেত্র")}</span>
          </span>
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="topbar-actions">
            <button
              className="language-btn"
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
            >
              <Languages size={17} />
              {lang === "en" ? "বাংলা" : "English"}
            </button>
            <Link
              className="icon-button notification-button"
              aria-label={t("Alerts", "সতর্কতা")}
              to="/app/alerts"
            >
              <Bell size={20} />
              {alertCount > 0 && <span />}
            </Link>
            <button
              className="icon-button settings-button"
              aria-label="Settings"
              onClick={openSettings}
            >
              <Settings size={19} />
            </button>
          </div>
        </header>
        <main id="main" className="app-main">
          <Suspense
            fallback={
              <div className="skeleton" role="status">
                Loading…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        <footer className="app-footer">
          <span>Ankur · Growing with you.</span>
          <span>
            {t(
              "Made for the fields of Bangladesh.",
              "বাংলাদেশের মাঠের জন্য তৈরি।",
            )}
          </span>
          <Demo>{t("ALL INSIGHTS ARE DEMONSTRATIONS", "সব বিশ্লেষণ ডেমো")}</Demo>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          ["/app", "Home", "হোম", Home],
          ["/app/fields", "Fields", "জমি", Map],
          ["/app/check", "Scan", "যাচাই", ScanLine],
          ["/app/alerts", "Alerts", "সতর্কতা", Bell],
        ].map(([to, en, bn, Icon]) => {
          const I = Icon as typeof Home;
          return (
            <NavLink end key={String(to)} to={String(to)}>
              <I size={21} />
              <span>{t(String(en), String(bn))}</span>
            </NavLink>
          );
        })}
        <button onClick={() => setMore(true)} aria-label="More navigation">
          <Menu size={21} />
          <span>{t("More", "আরও")}</span>
        </button>
      </nav>
      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent className="app-dialog">
          <DialogHeader>
            <DialogTitle>{t("More from Ankur", "অঙ্কুরের আরও সেবা")}</DialogTitle>
            <DialogDescription>
              {t("Explore your farming tools.", "আপনার কৃষি সেবাগুলো দেখুন।")}
            </DialogDescription>
          </DialogHeader>
          {nav.slice(3).map(([to, en, bn, I]) => (
            <Link
              className="more-link"
              key={to}
              to={to}
              onClick={() => setMore(false)}
            >
              <I />
              {t(en, bn)}
              <ArrowUpRight size={18} />
            </Link>
          ))}
          <button
            className="more-link"
            onClick={() => {
              setMore(false);
              openSettings();
            }}
          >
            <Settings />
            {t("Profile & settings", "প্রোফাইল ও সেটিংস")}
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="app-dialog">
          <DialogHeader>
            <DialogTitle>
              {t("Farmer Profile & Settings", "কৃষক প্রোফাইল ও সেটিংস")}
            </DialogTitle>
            <DialogDescription>
              {t("Manage your account, profile preferences, and backend mode.", "আপনার অ্যাকাউন্ট, তথ্য এবং ব্যাকএন্ড ইঞ্জিন পরিচালনা করুন।")}
            </DialogDescription>
          </DialogHeader>

          <div className="row" style={{ gap: "6px", marginBottom: "1rem", borderBottom: "1px solid #e0e4dd", paddingBottom: "8px" }}>
            <button
              type="button"
              className={"text-button " + (authTab === "profile" ? "active" : "")}
              style={{ fontWeight: authTab === "profile" ? 600 : 400, color: authTab === "profile" ? "#103C30" : "#69766d" }}
              onClick={() => setAuthTab("profile")}
            >
              {t("Profile", "প্রোফাইল")}
            </button>
            <span>·</span>
            <button
              type="button"
              className={"text-button " + (authTab === "login" || authTab === "register" ? "active" : "")}
              style={{ fontWeight: authTab !== "profile" ? 600 : 400, color: authTab !== "profile" ? "#103C30" : "#69766d" }}
              onClick={() => setAuthTab(isAuthenticated ? "profile" : "login")}
            >
              {isAuthenticated ? t("Account", "অ্যাকাউন্ট") : t("Sign In / Register", "লগইন / নিবন্ধন")}
            </button>
          </div>

          {authTab === "profile" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (updateProfile(draft)) {
                  setSettings(false);
                  notify(t("Settings saved", "সেটিংস সংরক্ষিত হয়েছে"));
                  void reload();
                } else
                  notify(
                    t(
                      "Could not save settings on this device.",
                      "এই ডিভাইসে সেটিংস সংরক্ষণ করা যায়নি।",
                    ),
                  );
              }}
            >
              <label>
                {t("Your name", "আপনার নাম")}
                <input
                  value={draft.name}
                  required
                  maxLength={60}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>

              <label>
                {t("Land measurement unit", "জমির পরিমাপের একক")}
                <select
                  value={draft.areaUnit}
                  onChange={(e) =>
                    setDraft({ ...draft, areaUnit: e.target.value as "acre" | "bigha" })
                  }
                >
                  <option value="acre">{t("Acre (একর)", "একর")}</option>
                  <option value="bigha">{t("Bigha (বিঘা)", "বিঘা")}</option>
                </select>
              </label>

              <label>
                {t("Engine Mode", "ইঞ্জিন মোড")}
                <select
                  value={serviceMode}
                  onChange={(e) => {
                    const m = e.target.value as "api" | "demo";
                    setServiceMode(m);
                    setServiceModeState(m);
                    void reload();
                    notify(
                      m === "api"
                        ? t("Connected to Live FastAPI Backend", "লাইভ ফাস্ট-এপিআই ব্যাকএন্ড সংযুক্ত")
                        : t("Switched to Offline Demo Mode", "অফলাইন ডেমো মোডে পরিবর্তিত"),
                    );
                  }}
                >
                  <option value="api">{t("Live Backend API (FastAPI + ONNX)", "লাইভ ব্যাকএন্ড এপিআই (ফাস্ট-এপিআই + ওএনএনএক্স)")}</option>
                  <option value="demo">{t("Offline Demo Mode (Sample Data)", "অফলাইন ডেমো মোড (নমুনা ডেটা)")}</option>
                </select>
              </label>

              <label className="check-label">
                <input
                  type="checkbox"
                  checked={draft.simulateErrors}
                  onChange={(e) =>
                    setDraft({ ...draft, simulateErrors: e.target.checked })
                  }
                />
                <span>
                  {t("Simulate connection problems", "সংযোগের সমস্যা দেখান")}
                  <small>
                    {t(
                      "Preview error states. Turn off to restore normal mode.",
                      "ত্রুটির অবস্থা দেখুন। স্বাভাবিক রাখতে বন্ধ করুন।",
                    )}
                  </small>
                </span>
              </label>

              <div className="row between" style={{ marginTop: "1rem" }}>
                <button className="btn primary" type="submit">
                  {t("Save settings", "সংরক্ষণ করুন")}
                </button>
                {isAuthenticated && (
                  <button
                    type="button"
                    className="text-button"
                    style={{ color: "#c62828" }}
                    onClick={() => {
                      logout();
                      notify(t("Logged out", "লগআউট করা হয়েছে"));
                      setSettings(false);
                    }}
                  >
                    {t("Sign out", "লগআউট")}
                  </button>
                )}
              </div>
            </form>
          )}

          {authTab === "login" && !isAuthenticated && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthLoading(true);
                setAuthError("");
                const ok = await login({ email: authEmail, password: authPassword });
                setAuthLoading(false);
                if (ok) {
                  setSettings(false);
                  notify(t("Welcome back, farmer!", "স্বাগতম!"));
                } else {
                  setAuthError(t("Invalid email or password", "ভুল ইমেল বা পাসওয়ার্ড"));
                }
              }}
            >
              <label>
                {t("Email address", "ইমেল ঠিকানা")}
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="farmer@example.com"
                />
              </label>
              <label>
                {t("Password", "পাসওয়ার্ড")}
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>

              {authError && <p className="error-text">{authError}</p>}

              <button className="btn primary full" type="submit" disabled={authLoading}>
                {authLoading ? t("Signing in…", "লগইন হচ্ছে…") : t("Sign In", "লগইন করুন")}
              </button>

              <div className="row center" style={{ marginTop: "1rem", flexDirection: "column", gap: "6px" }}>
                <button
                  type="button"
                  className="text-button"
                  style={{ fontSize: "12px", color: "var(--leaf)" }}
                  onClick={() => {
                    setAuthEmail("admin@ankur.ag");
                    setAuthPassword("admin123456");
                  }}
                >
                  ⚡ {t("Fill Admin Demo Credentials (admin@ankur.ag)", "অ্যাডমিন তথ্য পূরণ করুন")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setAuthTab("register");
                    setAuthError("");
                  }}
                >
                  {t("Need an account? Register here", "নতুন অ্যাকাউন্ট প্রয়োজন? নিবন্ধন করুন")}
                </button>
              </div>
            </form>
          )}

          {authTab === "register" && !isAuthenticated && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthLoading(true);
                setAuthError("");
                const ok = await register({
                  name: authName || "Farmer",
                  email: authEmail,
                  password: authPassword,
                  districtId: "bogura",
                  areaUnit: "acre",
                });
                setAuthLoading(false);
                if (ok) {
                  setSettings(false);
                  notify(t("Account created successfully!", "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!"));
                } else {
                  setAuthError(t("Registration failed. Email may already be in use.", "নিবন্ধন ব্যর্থ হয়েছে। ইমেলটি ইতোমধ্যে ব্যবহৃত হতে পারে।"));
                }
              }}
            >
              <label>
                {t("Full Name", "সম্পূর্ণ নাম")}
                <input
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. Rahim Mia"
                />
              </label>
              <label>
                {t("Email address", "ইমেল ঠিকানা")}
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="farmer@example.com"
                />
              </label>
              <label>
                {t("Password (min 6 characters)", "পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)")}
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>

              {authError && <p className="error-text">{authError}</p>}

              <button className="btn primary full" type="submit" disabled={authLoading}>
                {authLoading ? t("Creating account…", "অ্যাকাউন্ট তৈরি হচ্ছে…") : t("Register Account", "নিবন্ধন সম্পন্ন করুন")}
              </button>

              <div className="row center" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setAuthTab("login");
                    setAuthError("");
                  }}
                >
                  {t("Already have an account? Sign in", "ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন")}
                </button>
              </div>
            </form>
          )}

          {isAuthenticated && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid #f0f0f0", paddingTop: "0.75rem" }}>
              <div className="row between small muted" style={{ marginBottom: "0.5rem" }}>
                <span>{user?.email}</span>
                <span className="step-pill">{user?.role?.toUpperCase()}</span>
              </div>
              <button
                type="button"
                className="text-button"
                style={{ color: "#d32f2f", fontSize: "12px" }}
                onClick={async () => {
                  if (window.confirm(t("Are you sure you want to delete your account? All private farms and crop records will be permanently removed.", "আপনি কি নিশ্চিত যে আপনি আপনার অ্যাকাউন্ট মুছে ফেলতে চান? সমস্ত তথ্য চিরতরে মুছে যাবে।"))) {
                    await deleteAccount();
                    setSettings(false);
                    notify(t("Account deleted.", "অ্যাকাউন্ট মুছে ফেলা হয়েছে।"));
                  }
                }}
              >
                {t("Delete farmer account & all field data", "অ্যাকাউন্ট ও সমস্ত তথ্য মুছে ফেলুন")}
              </button>
            </div>
          )}

          <div style={{ marginTop: "1rem", borderTop: "1px solid #e0e0e0", paddingTop: "0.75rem" }}>
            <div className="row between" style={{ alignItems: "center" }}>
              <div>
                <strong>{t("AI Model Management", "মডেল নিয়ন্ত্রণ")}</strong>
                <p className="small muted" style={{ margin: "2px 0 0" }}>
                  {t("Upload, benchmark, and deploy ONNX models.", "ONNX মডেল আপলোড ও নিয়ন্ত্রণ।")}
                </p>
              </div>
              <Link
                to="/app/models"
                onClick={() => setSettings(false)}
                className="btn outline"
                style={{ fontSize: "12px", padding: "5px 12px" }}
              >
                {t("Open Panel ↗", "প্যানেল খুলুন ↗")}
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function Alerts() {
  const { t, lang, notify } = useApp();
  const [items, setItems] = useState(notifications.listNotifications);
  return (
    <>
      <PageHead
        title={t("Your farm, in the loop.", "আপনার জমির খবর।")}
        description={t(
          "A few things worth your attention. All alerts are examples.",
          "আপনার নজর দেওয়ার কিছু বিষয়। সব সতর্কতা নমুনা।",
        )}
      >
        <button
          className="btn"
          onClick={() => {
            notifications.markAllRead();
            setItems(notifications.listNotifications());
            notify(t("All alerts marked as read", "সব সতর্কতা পড়া হয়েছে"));
          }}
        >
          <CheckCheck size={18} />
          {t("Mark all read", "সব পড়া হয়েছে")}
        </button>
      </PageHead>
      <div className="panel alert-list">
        {items.map((n) => (
          <article key={n.id} className={n.read ? "read" : ""}>
            <div className="alert-icon">
              <Bell size={20} />
            </div>
            <div>
              <div className="row">
                <h3>{n.title[lang]}</h3>
                <Demo />
              </div>
              <p>{n.body[lang]}</p>
              <div className="row">
                <Link to={n.href} onClick={() => notifications.markRead(n.id)}>
                  {t("View details", "বিস্তারিত দেখুন")}{" "}
                  <ArrowUpRight size={15} />
                </Link>
                <button
                  className="text-button"
                  onClick={() => {
                    n.read
                      ? notifications.markUnread(n.id)
                      : notifications.markRead(n.id);
                    setItems(notifications.listNotifications());
                  }}
                >
                  {n.read
                    ? t("Mark unread", "না-পড়া করুন")
                    : t("Mark read", "পড়া হয়েছে")}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="fields" element={<Fields />} />
        <Route path="check" element={<CheckCrop />} />
        <Route path="climate" element={<Climate />} />
        <Route path="yield" element={<YieldInsights />} />
        <Route path="advisor" element={<Advisor />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="models" element={<AdminModels />} />
      </Route>
      <Route
        path="*"
        element={
          <div className="empty">
            <h1>This field is uncharted.</h1>
            <p>The page could not be found.</p>
            <Link to="/" className="btn primary">
              Back to Ankur
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
