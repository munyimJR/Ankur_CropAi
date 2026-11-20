import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Plus,
  MapPin,
  CloudSun,
  Droplets,
  Wind,
  ScanLine,
  Map,
  MessagesSquare,
  ChartNoAxesCombined,
  Leaf,
  ChevronRight,
  Bell,
  CalendarDays,
  NotebookPen,
} from "lucide-react";
import { z } from "zod";
import { useApp, useResource } from "../state";
import {
  Demo,
  PageHead,
  FarmSelect,
  Vegetation,
  MapView,
  LoadState,
  Empty,
} from "../components/common";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { getClimate } from "../services/climate.service";
import { createFarm } from "../services/farms.service";
import { listActivity, logActivity } from "../services/activity.service";
import { getObservations } from "../services/vegetation.service";
import { CROPS, getCrop } from "../lib/crops";
import { DISTRICTS, findDistrict } from "../lib/geo";
import { readStored, writeStored } from "../lib/storage";
import type { CropId, Farm } from "../services/types";
export function Dashboard() {
  const { t, lang, profile, farm, farms, loading, error, reload } = useApp();
  const weather = useResource(
    () => (farm ? getClimate(farm) : Promise.resolve(null)),
    [farm?.id, profile.simulateErrors],
  );
  const activity = listActivity();
  return (
    <>
      <PageHead
        title={t(
          `Good morning, ${profile.name.split(" ")[0]}.`,
          `সুপ্রভাত, ${profile.name.split(" ")[0]}।`,
        )}
        description={t(
          "A little clarity for a good day of growing.",
          "ফসলের ভালো দিনের জন্য কিছু স্পষ্ট ধারণা।",
        )}
      >
        <FarmSelect />
      </PageHead>
      {loading || error ? (
        <LoadState error={error} retry={reload} />
      ) : !farm ? (
        <Empty
          title={t("Your first field starts here", "আপনার প্রথম জমি এখানেই")}
          description={t(
            "Add a field to start exploring.",
            "শুরু করতে একটি জমি যোগ করুন।",
          )}
        />
      ) : (
        <>
          <div className="dashboard-top">
            <div className="welcome-field">
              <img src="/photos/field.webp" alt="Green paddy fields" />
              <div className="welcome-field-shade" />
              <div className="welcome-field-content">
                <span className="row small">
                  <MapPin size={15} />
                  {findDistrict(farm.districtId)[lang]}, Bangladesh
                </span>
                <h2>
                  {t("Good things", "ভালো কিছু")}
                  <br />
                  {t("are growing.", "বেড়ে উঠছে।")}
                </h2>
                <p>
                  {t(
                    "Stay close to your field, wherever you are.",
                    "যেখানেই থাকুন, জমির সাথে থাকুন।",
                  )}
                </p>
                <Link className="btn white" to="/app/fields">
                  {t("View my fields", "আমার জমি দেখুন")}
                  <ArrowUpRight size={18} />
                </Link>
              </div>
              <Demo>DEMO FIELD OVERVIEW</Demo>
            </div>
            <div className="weather-card">
              <div className="row between">
                <h3>{t("Your weather", "আপনার আবহাওয়া")}</h3>
                <Demo />
              </div>
              {weather.loading || weather.error ? (
                <LoadState error={weather.error} retry={weather.retry} />
              ) : (
                weather.data && (
                  <>
                    <div className="weather-current">
                      <CloudSun size={64} strokeWidth={1.2} />
                      <div>
                        <strong>
                          {weather.data.current.tempC}°<span>C</span>
                        </strong>
                        <p>{t("Sample conditions", "নমুনা আবহাওয়া")}</p>
                      </div>
                    </div>
                    <span className="small muted">
                      {findDistrict(farm.districtId)[lang]}
                    </span>
                    <div className="weather-details">
                      <span>
                        <Droplets size={17} />
                        {weather.data.current.humidity}%{" "}
                        <small>{t("Humidity", "আর্দ্রতা")}</small>
                      </span>
                      <span>
                        <Wind size={17} />
                        {weather.data.current.windKph} km/h{" "}
                        <small>{t("Wind", "বাতাস")}</small>
                      </span>
                    </div>
                    <Link className="text-link" to="/app/climate">
                      {t("Explore the forecast", "পূর্বাভাস দেখুন")}
                      <ArrowUpRight size={17} />
                    </Link>
                  </>
                )
              )}
            </div>
          </div>
          <div className="section-row">
            <h2>{t("What would you like to do?", "আপনি কী করতে চান?")}</h2>
            <span>
              {t("Your everyday farming tools", "আপনার দৈনন্দিন কৃষি সেবা")}
            </span>
          </div>
          <div className="quick-actions">
            {[
              [
                ScanLine,
                "Check a crop",
                "ফসল যাচাই",
                "A closer look at a leaf",
                "পাতার দিকে নজর",
                "/app/check",
              ],
              [
                Map,
                "Explore fields",
                "জমি দেখুন",
                "Your land at a glance",
                "একনজরে আপনার জমি",
                "/app/fields",
              ],
              [
                ChartNoAxesCombined,
                "Explore yield",
                "ফলন দেখুন",
                "See the possibilities",
                "সম্ভাবনা দেখুন",
                "/app/yield",
              ],
              [
                MessagesSquare,
                "Ask an advisor",
                "পরামর্শ নিন",
                "A little guidance helps",
                "কিছু নির্দেশনা নিন",
                "/app/advisor",
              ],
            ].map(([Icon, en, bn, desc, bdesc, to], i) => {
              const I = Icon as typeof ScanLine;
              return (
                <Link
                  key={String(to)}
                  to={String(to)}
                  className={"quick-action quick-" + i}
                >
                  <div className="row between">
                    <I size={25} />
                    <ArrowUpRight size={19} />
                  </div>
                  <h3>{t(String(en), String(bn))}</h3>
                  <p>{t(String(desc), String(bdesc))}</p>
                </Link>
              );
            })}
          </div>
          <div className="dashboard-bottom">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{t("A view from above", "ওপর থেকে এক নজর")}</h2>
                  <p>
                    {t(
                      "A simulated view of your selected plot.",
                      "নির্বাচিত জমির একটি নমুনা চিত্র।",
                    )}
                  </p>
                </div>
                <Link to="/app/fields" aria-label="View field details">
                  <ArrowUpRight />
                </Link>
              </div>
              <Vegetation farm={farm} />
              <div className="field-summary">
                <div>
                  <span className="small muted">
                    {t("Selected field", "নির্বাচিত জমি")}
                  </span>
                  <strong>
                    {lang === "bn" ? (farm.nameBn ?? farm.name) : farm.name}
                  </strong>
                </div>
                <div>
                  <span className="small muted">
                    {t("Registered area", "নিবন্ধিত আয়তন")}
                  </span>
                  <strong>
                    {farm.areaAcres} {t("acres", "একর")}
                  </strong>
                </div>
                <div>
                  <span className="small muted">
                    {t("Sample health", "নমুনা স্বাস্থ্য")}
                  </span>
                  <strong className="healthy">
                    <Leaf size={15} />
                    {t("Growing steadily", "বৃদ্ধি স্বাভাবিক")}
                  </strong>
                </div>
              </div>
            </section>
            <section className="activity-panel">
              <div className="row between">
                <h2>{t("Worth a moment", "খেয়াল রাখুন")}</h2>
                <Demo />
              </div>
              <Link className="advisory" to="/app/climate">
                <span className="alert-icon">
                  <CloudSun />
                </span>
                <div>
                  <h3>{t("A change in the weather", "আবহাওয়ার পরিবর্তন")}</h3>
                  <p>
                    {t(
                      "Explore the sample forecast before planning your next field visit.",
                      "পরবর্তী জমি পরিদর্শনের আগে নমুনা পূর্বাভাস দেখুন।",
                    )}
                  </p>
                  <span>
                    {t("View climate insights", "আবহাওয়া বিশ্লেষণ")}{" "}
                    <ArrowUpRight size={14} />
                  </span>
                </div>
              </Link>
              <h3 className="activity-title">
                {t("Recent activity", "সাম্প্রতিক কার্যক্রম")}
              </h3>
              {activity.slice(0, 3).map((a) => (
                <div className="activity-item" key={a.id}>
                  <span className="activity-dot" />
                  <div>
                    <p>{a.text[lang]}</p>
                    <small>
                      {new Date(a.at).toLocaleDateString(
                        lang === "bn" ? "bn-BD" : "en-GB",
                        { day: "numeric", month: "short" },
                      )}
                    </small>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </>
  );
}
function AddFarm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang, reload, select, notify } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="app-dialog">
        <DialogHeader>
          <DialogTitle>{t("A new place to grow", "নতুন একটি জমি")}</DialogTitle>
          <DialogDescription>
            {t(
              "Add your field. Details stay on this device.",
              "জমি যোগ করুন। তথ্য এই ডিভাইসে থাকবে।",
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            setError("");
            setBusy(true);
            try {
              const f = await createFarm({
                name: String(d.get("name")),
                crop: d.get("crop") as CropId,
                districtId: String(d.get("location")),
                areaAcres: Number(d.get("area")),
                plantingDate: String(d.get("date")),
              });
              await reload();
              select(f.id);
              notify(
                t("Your field is ready to explore.", "আপনার জমি যোগ হয়েছে।"),
              );
              onClose();
            } catch {
              setError(
                t(
                  "Could not save. Check the details and your demo error setting.",
                  "সংরক্ষণ করা যায়নি। তথ্য ও ডেমো সেটিং পরীক্ষা করুন।",
                ),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t("Field name", "জমির নাম")}
            <input
              name="name"
              placeholder={t("e.g. East paddy field", "যেমন: পূর্বের ধানক্ষেত")}
              minLength={2}
              maxLength={60}
              required
            />
          </label>
          <div className="form-grid">
            <label>
              {t("Crop", "ফসল")}
              <select name="crop">
                {CROPS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name[lang]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("District", "জেলা")}
              <select name="location">
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d[lang]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Area (acres)", "আয়তন (একর)")}
              <input
                name="area"
                type="number"
                min="0.01"
                max="500"
                step="0.01"
                placeholder="1.5"
                required
              />
            </label>
            <label>
              {t("Planting date", "রোপণের তারিখ")}
              <input name="date" type="date" max="2099-12-31" required />
            </label>
          </div>
          <p className="small muted">
            {t(
              "Map pins use approximate district locations, not surveyed boundaries.",
              "মানচিত্রে জেলার আনুমানিক অবস্থান দেখানো হয়, প্রকৃত জমির সীমানা নয়।",
            )}
          </p>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn primary full" type="submit">
            <Plus size={18} />
            {busy
              ? t("Saving…", "সংরক্ষণ হচ্ছে…")
              : t("Add my field", "আমার জমি যোগ করুন")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
const notesSchema = z.record(
  z.string(),
  z.array(z.object({ text: z.string(), date: z.string() })),
);
function FieldDetail({ farm }: { farm: Farm }) {
  const { lang, t, notify } = useApp();
  const history = useResource(() => getObservations(farm), [farm.id]);
  const [tab, setTab] = useState("overview"),
    [note, setNote] = useState("");
  const [notes, setNotes] = useState(() =>
    readStored("fieldNotes", notesSchema, {}),
  );
  return (
    <section className="panel detail-panel">
      <div className="panel-heading">
        <div>
          <h2>{lang === "bn" ? (farm.nameBn ?? farm.name) : farm.name}</h2>
          <p>
            <MapPin size={14} />
            {findDistrict(farm.districtId)[lang]} ·{" "}
            {getCrop(farm.crop).name[lang]} · {farm.areaAcres}{" "}
            {t("acres", "একর")}
          </p>
        </div>
        <Demo />
      </div>
      <div className="tabs" role="tablist" aria-label="Field view">
        {[
          ["overview", "Overview", "সারাংশ"],
          ["history", "History & notes", "ইতিহাস ও নোট"],
        ].map(([id, en, bn]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {t(en, bn)}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <>
          <Vegetation farm={farm} />
          <div className="info-inline">
            <CalendarDays size={19} />
            <span>
              {t("Planted", "রোপণ")}: {farm.plantingDate}
            </span>
            <Leaf size={19} />
            <span>
              {t(
                "Simulated vegetation, not satellite imagery",
                "নমুনা চিত্র, বাস্তব স্যাটেলাইট ছবি নয়",
              )}
            </span>
          </div>
        </>
      ) : (
        <>
          <form
            className="note-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              const next = {
                ...notes,
                [farm.id]: [
                  {
                    text: note.trim(),
                    date: new Date().toISOString().slice(0, 10),
                  },
                  ...(notes[farm.id] ?? []),
                ],
              };
              if (writeStored("fieldNotes", next)) {
                setNotes(next);
                setNote("");
                logActivity("note", {
                  en: `Observation added to ${farm.name}`,
                  bn: `${farm.name}-এ পর্যবেক্ষণ যোগ হয়েছে`,
                });
                notify(t("Observation saved", "পর্যবেক্ষণ সংরক্ষিত"));
              } else
                notify(
                  t(
                    "Could not save this observation.",
                    "পর্যবেক্ষণ সংরক্ষণ করা যায়নি।",
                  ),
                );
            }}
          >
            <label>
              {t("What did you notice?", "আপনি কী লক্ষ্য করেছেন?")}
              <textarea
                value={note}
                maxLength={500}
                required
                onChange={(e) => setNote(e.target.value)}
                placeholder={t(
                  "Write a field observation…",
                  "জমির পর্যবেক্ষণ লিখুন…",
                )}
              />
            </label>
            <button className="btn primary" type="submit">
              <NotebookPen size={17} />
              {t("Save observation", "পর্যবেক্ষণ সংরক্ষণ")}
            </button>
          </form>
          {(notes[farm.id] ?? []).map((n, i) => (
            <div className="history-row" key={i}>
              <NotebookPen size={18} />
              <div>
                <strong>{n.text}</strong>
                <small>{n.date}</small>
              </div>
            </div>
          ))}
          {history.loading || history.error ? (
            <LoadState error={history.error} retry={history.retry} />
          ) : (
            history.data?.map((h) => (
              <div className="history-row" key={h.id}>
                <Leaf size={18} />
                <div>
                  <strong>{h.title[lang]}</strong>
                  <p>{h.detail?.[lang]}</p>
                  <small>{h.date}</small>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </section>
  );
}
export function Fields() {
  const { t, lang, farms, farm, select, loading, error, reload } = useApp();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHead
        title={t("Every field has a story.", "প্রতিটি জমির একটি গল্প আছে।")}
        description={t(
          "Keep your land, crops and observations together.",
          "আপনার জমি, ফসল ও পর্যবেক্ষণ একসাথে রাখুন।",
        )}
      >
        <button className="btn primary" onClick={() => setAdding(true)}>
          <Plus size={18} />
          {t("Add a field", "জমি যোগ করুন")}
        </button>
      </PageHead>
      {loading || error ? (
        <LoadState error={error} retry={reload} />
      ) : (
        <>
          <div className="fields-layout">
            <section className="field-list">
              <div className="row between">
                <h2>{t("My fields", "আমার জমি")}</h2>
                <span className="count">{farms.length}</span>
              </div>
              {!farms.length && (
                <p>
                  {t(
                    "No fields yet. Add your first field above.",
                    "এখনও জমি নেই। ওপরে প্রথম জমি যোগ করুন।",
                  )}
                </p>
              )}
              {farms.map((f, i) => (
                <button
                  key={f.id}
                  className={
                    "field-card " + (farm?.id === f.id ? "selected" : "")
                  }
                  onClick={() => select(f.id)}
                >
                  <img
                    src={i % 2 ? "/photos/village.webp" : "/photos/field.webp"}
                    alt=""
                  />
                  <span>
                    <strong>
                      {lang === "bn" ? (f.nameBn ?? f.name) : f.name}
                    </strong>
                    <small>
                      <MapPin size={13} />
                      {findDistrict(f.districtId)[lang]}
                    </small>
                    <span className="field-meta">
                      {getCrop(f.crop).name[lang]}{" "}
                      <span>
                        {f.areaAcres} {t("acres", "একর")}
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
              <p className="small muted">
                {t(
                  "Your fields are saved in this browser. Photos are illustrative.",
                  "এই ব্রাউজারে জমি সংরক্ষিত। ছবিগুলো উদাহরণ।",
                )}
              </p>
            </section>
            <MapView farms={farms} selected={farm?.id} onSelect={select} />
          </div>
          {farm && <FieldDetail key={farm.id} farm={farm} />}
        </>
      )}
      <AddFarm open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
