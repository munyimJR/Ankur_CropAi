import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  CloudSun,
  CloudRain,
  Droplets,
  Wind,
  ArrowUpRight,
  Sprout,
  Send,
  MessagesSquare,
  Info,
  Leaf,
  Sun,
  Thermometer,
  BookOpen,
} from "lucide-react";
import { useApp, useResource } from "../state";
import {
  PageHead,
  Demo,
  FarmSelect,
  LoadState,
  Empty,
} from "../components/common";
import { getClimate } from "../services/climate.service";
import { getYieldOverview, estimateScenario } from "../services/yield.service";
import { askAdvisor, SUGGESTED_QUESTIONS } from "../services/advisor.service";
import { logActivity } from "../services/activity.service";
import { CROPS, getCrop, SEASONS } from "../lib/crops";
import { findDistrict } from "../lib/geo";
import type {
  CropId,
  SeasonId,
  ScenarioInput,
  AdvisorReply,
} from "../services/types";
const chartAxis = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "#69766d", fontSize: 11 },
};
function MissingField() {
  const { t } = useApp();
  return (
    <Empty
      title={t("Start with your field", "আপনার জমি দিয়ে শুরু করুন")}
      description={t(
        "Register a field to explore these insights.",
        "বিশ্লেষণ দেখতে জমি যোগ করুন।",
      )}
    />
  );
}
export function Climate() {
  const { t, lang, farm, profile } = useApp();
  const [period, setPeriod] = useState("forecast"),
    [metric, setMetric] = useState("temperature");
  const resource = useResource(
    () => (farm ? getClimate(farm) : Promise.resolve(null)),
    [farm?.id, profile.simulateErrors],
  );
  const data = resource.data;
  const rows = (period === "forecast" ? data?.forecast : data?.history)?.map(
    (d) => ({
      ...d,
      label: new Date(d.date + "T12:00:00").toLocaleDateString(
        lang === "bn" ? "bn-BD" : "en-GB",
        { day: "numeric", month: "short" },
      ),
    }),
  );
  return (
    <>
      <PageHead
        title={t(
          "Read the sky. Plan your day.",
          "আকাশের খবর নিন। দিনের পরিকল্পনা করুন।",
        )}
        description={t(
          "Weather patterns and growing conditions, together.",
          "আবহাওয়ার ধরন ও চাষের পরিবেশ একসাথে।",
        )}
      >
        <FarmSelect />
      </PageHead>
      {!farm ? (
        <MissingField />
      ) : resource.loading || resource.error ? (
        <LoadState error={resource.error} retry={resource.retry} />
      ) : (
        data && (
          <>
            <div className="climate-overview">
              <div className="climate-current">
                <div className="row between">
                  <span>{findDistrict(farm.districtId)[lang]}, Bangladesh</span>
                  <Demo />
                </div>
                <div className="big-weather">
                  <CloudSun size={96} strokeWidth={1} />
                  <div>
                    <strong>
                      {data.current.tempC}°<small>C</small>
                    </strong>
                    <p>{t("Sample conditions", "নমুনা আবহাওয়া")}</p>
                  </div>
                </div>
                <div className="row weather-metrics">
                  <span>
                    <Droplets />
                    {data.current.humidity}%
                    <small>{t("Humidity", "আর্দ্রতা")}</small>
                  </span>
                  <span>
                    <Wind />
                    {data.current.windKph} km/h
                    <small>{t("Wind speed", "বাতাসের গতি")}</small>
                  </span>
                  <span>
                    <CloudRain />
                    {data.current.rainMm24h} mm
                    <small>{t("Recent rain", "সাম্প্রতিক বৃষ্টি")}</small>
                  </span>
                </div>
              </div>
              <div className="panel forecast-panel">
                <div className="row between">
                  <h2>{t("The week ahead", "আগামী সপ্তাহ")}</h2>
                  <Demo />
                </div>
                <div className="forecast-days">
                  {data.forecast.map((d, i) => (
                    <div key={d.date}>
                      <span>
                        {i === 0
                          ? t("Today", "আজ")
                          : new Date(d.date + "T12:00:00").toLocaleDateString(
                              lang === "bn" ? "bn-BD" : "en-GB",
                              { weekday: "short" },
                            )}
                      </span>
                      {d.condition === "rain" || d.condition === "storm" ? (
                        <CloudRain />
                      ) : (
                        <CloudSun />
                      )}
                      <strong>{d.maxC}°</strong>
                      <small>{d.minC}°</small>
                      <span className="rain-chance">
                        <Droplets size={12} />
                        {d.rainChance}%
                      </span>
                    </div>
                  ))}
                </div>
                <p className="small muted">
                  {t(
                    "Example forecast. No live weather provider is connected.",
                    "নমুনা পূর্বাভাস। বাস্তব আবহাওয়া সেবা যুক্ত নেই।",
                  )}
                </p>
              </div>
            </div>
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>{t("Patterns worth watching", "নজর রাখার মতো ধরন")}</h2>
                  <p>
                    {t(
                      "Illustrative weather data for your selected district.",
                      "নির্বাচিত জেলার নমুনা আবহাওয়ার তথ্য।",
                    )}
                  </p>
                </div>
                <div className="chart-controls">
                  <select
                    aria-label="Weather period"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value="forecast">
                      {t("Next 7 days", "আগামী ৭ দিন")}
                    </option>
                    <option value="history">
                      {t("Past 30 days", "গত ৩০ দিন")}
                    </option>
                  </select>
                  <select
                    aria-label="Weather metric"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                  >
                    <option value="temperature">
                      {t("Temperature", "তাপমাত্রা")}
                    </option>
                    <option value="rainfall">{t("Rainfall", "বৃষ্টিপাত")}</option>
                  </select>
                </div>
              </div>
              <div
                className="chart"
                role="img"
                aria-label={`${metric} chart, ${period}, demo data`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={rows}
                    margin={{ top: 20, right: 16, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="weatherFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#8db666"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="#8db666"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e8ece4" />
                    <XAxis dataKey="label" {...chartAxis} minTickGap={30} />
                    <YAxis
                      {...chartAxis}
                      unit={metric === "temperature" ? "°" : "mm"}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey={metric === "temperature" ? "maxC" : "rainMm"}
                      name={
                        metric === "temperature"
                          ? t("Temperature °C", "তাপমাত্রা °C")
                          : t("Rainfall mm", "বৃষ্টিপাত mm")
                      }
                      stroke="#397D5C"
                      strokeWidth={2.5}
                      fill="url(#weatherFill)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <details>
                <summary>{t("View chart values", "চার্টের তথ্য দেখুন")}</summary>
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Date", "তারিখ")}</th>
                        <th>°C</th>
                        <th>mm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows?.map((r) => (
                        <tr key={r.date}>
                          <td>{r.label}</td>
                          <td>{r.maxC}</td>
                          <td>{r.rainMm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
            <div className="climate-bottom">
              <section className="panel">
                <div className="row between">
                  <h2>{t("Keep an eye on", "নজর রাখুন")}</h2>
                  <Demo>EXAMPLE RISKS</Demo>
                </div>
                <div className="risk-list">
                  {data.risks.map((r) => (
                    <div key={r.id}>
                      <span>
                        {
                          {
                            heavyRain: t("Heavy rainfall", "ভারী বৃষ্টি"),
                            heat: t("Heat stress", "তাপজনিত চাপ"),
                            fungal: t(
                              "Fungal conditions",
                              "ছত্রাকের অনুকূল পরিবেশ",
                            ),
                            dry: t("Dry spell", "শুষ্ক আবহাওয়া"),
                          }[r.id]
                        }
                      </span>
                      <span className={"risk-badge " + r.level}>
                        {r.level === "high"
                          ? t("High", "বেশি")
                          : r.level === "moderate"
                            ? t("Moderate", "মাঝারি")
                            : t("Low", "কম")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="guidance-card">
                <Sprout size={30} />
                <h2>
                  {t(
                    "A little preparation goes a long way.",
                    "আগাম প্রস্তুতি অনেক কাজে আসে।",
                  )}
                </h2>
                <p>
                  {t(
                    "Explore drainage, planting and monitoring questions with the demo advisor. Confirm local conditions before making field decisions.",
                    "ডেমো পরামর্শকের সাথে নিষ্কাশন, রোপণ ও পর্যবেক্ষণ নিয়ে জানুন। সিদ্ধান্তের আগে স্থানীয় অবস্থা নিশ্চিত করুন।",
                  )}
                </p>
                <Link to="/app/advisor" className="text-link">
                  {t("Explore general guidance", "সাধারণ নির্দেশনা দেখুন")}
                  <ArrowUpRight size={17} />
                </Link>
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}
export function YieldInsights() {
  const { t, lang, farm, profile } = useApp();
  const [crop, setCrop] = useState<CropId>("rice"),
    [season, setSeason] = useState<SeasonId>("aman");
  const [scenario, setScenario] = useState<ScenarioInput>({
    irrigation: "supplemental",
    fertilizer: "recommended",
    sowingShiftDays: 0,
  });
  const resource = useResource(
    () => getYieldOverview(crop, season, farm?.districtId ?? "bogura"),
    [crop, season, farm?.districtId, profile.simulateErrors],
  );
  const d = resource.data;
  const estimate = d ? estimateScenario(d.expected.mid, scenario) : 0;
  return (
    <>
      <PageHead
        title={t("Explore what could grow.", "ফলনের সম্ভাবনা দেখুন।")}
        description={t(
          "Compare seasons. Explore scenarios. See the bigger picture.",
          "মৌসুম তুলনা করুন। সম্ভাব্য পরিস্থিতি দেখুন।",
        )}
      >
        <Demo>DEMONSTRATION, NOT A PREDICTION</Demo>
      </PageHead>
      <div className="filter-row">
        <label>
          {t("Crop", "ফসল")}
          <select
            value={crop}
            onChange={(e) => {
              const c = e.target.value as CropId;
              setCrop(c);
              setSeason(getCrop(c).seasons[0]);
            }}
          >
            {CROPS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[lang]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Season", "মৌসুম")}
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as SeasonId)}
          >
            {getCrop(crop).seasons.map((s) => (
              <option key={s} value={s}>
                {SEASONS[s][lang]}
              </option>
            ))}
          </select>
        </label>
        <FarmSelect />
      </div>
      {resource.loading || resource.error ? (
        <LoadState error={resource.error} retry={resource.retry} />
      ) : (
        d && (
          <>
            <div className="yield-top">
              <section className="panel chart-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {t("A look through the seasons", "মৌসুমের দিকে ফিরে দেখা")}
                    </h2>
                    <p>
                      {t(
                        "Illustrative historical yields, in tonnes per hectare.",
                        "হেক্টরপ্রতি টনে নমুনা ঐতিহাসিক ফলন।",
                      )}
                    </p>
                  </div>
                  <Demo />
                </div>
                <div
                  className="chart"
                  role="img"
                  aria-label="Illustrative historical yield bar chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={d.history}
                      margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#e8ece4" />
                      <XAxis dataKey="label" {...chartAxis} />
                      <YAxis {...chartAxis} />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        name="Demo t/ha"
                        fill="#79a76b"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={36}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <details>
                  <summary>{t("View chart values", "চার্টের তথ্য দেখুন")}</summary>
                  <table>
                    <tbody>
                      {d.history.map((r) => (
                        <tr key={r.label}>
                          <th>{r.label}</th>
                          <td>{r.value} t/ha</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </section>
              <aside className="yield-estimate">
                <div className="row between">
                  <Sprout size={27} />
                  <Demo>ILLUSTRATIVE</Demo>
                </div>
                <h3>{t("Next-season example", "পরবর্তী মৌসুমের উদাহরণ")}</h3>
                <div className="yield-number">
                  {d.expected.mid}
                  <span>t/ha</span>
                </div>
                <p>
                  {t("Example range", "নমুনা পরিসর")}: {d.expected.low}–
                  {d.expected.high} t/ha
                </p>
                <div className="estimate-disclaimer">
                  <Info size={18} />
                  {t(
                    "No yield model is connected. These numbers demonstrate the interface only.",
                    "কোনো ফলন মডেল যুক্ত নেই। সংখ্যাগুলো শুধু ইন্টারফেসের নমুনা।",
                  )}
                </div>
              </aside>
            </div>
            <section className="panel scenario-panel">
              <div>
                <h2>
                  {t("What if things changed?", "পরিস্থিতি বদলালে কী হয়?")}
                </h2>
                <p>
                  {t(
                    "Move the controls to compare an illustrative scenario.",
                    "নমুনা পরিস্থিতি তুলনা করতে সেটিং বদলান।",
                  )}
                </p>
                <div className="scenario-controls">
                  <label>
                    {t("Water availability", "পানির প্রাপ্যতা")}
                    <select
                      value={scenario.irrigation}
                      onChange={(e) =>
                        setScenario({
                          ...scenario,
                          irrigation: e.target
                            .value as ScenarioInput["irrigation"],
                        })
                      }
                    >
                      <option value="rainfed">
                        {t("Rainfed", "বৃষ্টিনির্ভর")}
                      </option>
                      <option value="supplemental">
                        {t("Supplemental irrigation", "অতিরিক্ত সেচ")}
                      </option>
                      <option value="full">
                        {t("Full irrigation", "পর্যাপ্ত সেচ")}
                      </option>
                    </select>
                  </label>
                  <label>
                    {t("Fertilizer timing", "সার দেওয়ার সময়")}
                    <select
                      value={scenario.fertilizer}
                      onChange={(e) =>
                        setScenario({
                          ...scenario,
                          fertilizer: e.target
                            .value as ScenarioInput["fertilizer"],
                        })
                      }
                    >
                      <option value="recommended">
                        {t("On schedule", "সময়মতো")}
                      </option>
                      <option value="late">{t("Delayed", "দেরিতে")}</option>
                    </select>
                  </label>
                  <label className="range-label">
                    {t("Planting shift", "রোপণের পরিবর্তন")}
                    <strong>
                      {scenario.sowingShiftDays > 0 ? "+" : ""}
                      {scenario.sowingShiftDays} {t("days", "দিন")}
                    </strong>
                    <input
                      type="range"
                      min="-14"
                      max="14"
                      value={scenario.sowingShiftDays}
                      onChange={(e) =>
                        setScenario({
                          ...scenario,
                          sowingShiftDays: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="scenario-result">
                <Demo>SCENARIO EXAMPLE</Demo>
                <strong>
                  {estimate.toFixed(2)} <small>t/ha</small>
                </strong>
                <span>
                  {t("Compared with baseline", "মূল নমুনার সাথে তুলনা")}:{" "}
                  {d.expected.mid}
                </span>
                <p>
                  {((estimate / d.expected.mid - 1) * 100).toFixed(1)}%{" "}
                  {t("illustrative change", "নমুনা পরিবর্তন")}
                </p>
                <button
                  className="text-button"
                  onClick={() =>
                    setScenario({
                      irrigation: "supplemental",
                      fertilizer: "recommended",
                      sowingShiftDays: 0,
                    })
                  }
                >
                  {t("Reset scenario", "পরিস্থিতি রিসেট")}
                </button>
              </div>
            </section>
            <div className="model-notes">
              <Info size={23} />
              <div>
                <h3>
                  {t(
                    "The thinking behind the numbers",
                    "সংখ্যাগুলোর পেছনের ধারণা",
                  )}
                </h3>
                <p>
                  {t(
                    "Today: seeded sample values and simple multipliers. Planned model inputs: crop variety, soil tests, weather history, planting date, irrigation and satellite vegetation. No trained model or validated prediction is provided.",
                    "এখন: নমুনা সংখ্যা ও সরল গুণক। পরিকল্পিত তথ্য: ফসলের জাত, মাটি পরীক্ষা, আবহাওয়া, রোপণের তারিখ, সেচ ও স্যাটেলাইট তথ্য। প্রশিক্ষিত মডেল বা যাচাইকৃত পূর্বাভাস নেই।",
                  )}
                </p>
                <details>
                  <summary>
                    {t("See the demo calculation", "ডেমো হিসাব দেখুন")}
                  </summary>
                  <p>
                    Baseline × water factor (0.88 / 1.00 / 1.05) × fertilizer
                    factor (1.00 / 0.93) × timing factor (1 − |days| × 0.004
                    early or 0.007 late). These coefficients are illustrative,
                    not agronomic recommendations.
                  </p>
                </details>
              </div>
            </div>
          </>
        )
      )}
    </>
  );
}
type Message = {
  id: number;
  question: string;
  reply?: AdvisorReply;
  error?: boolean;
};
export function Advisor() {
  const { t, lang, farm } = useApp();
  const [messages, setMessages] = useState<Message[]>([]),
    [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [messages, busy]);
  async function send(q: string) {
    if (!q.trim() || busy) return;
    const id = Date.now();
    setQuestion("");
    setBusy(true);
    setMessages((m) => [...m, { id, question: q }]);
    try {
      const reply = await askAdvisor(q, { farm, lang });
      if (alive.current) {
        setMessages((m) => m.map((x) => (x.id === id ? { ...x, reply } : x)));
        logActivity("advisor", {
          en: "Explored a demo advisor question",
          bn: "ডেমো পরামর্শককে প্রশ্ন করা হয়েছে",
        });
      }
    } catch {
      if (alive.current)
        setMessages((m) =>
          m.map((x) => (x.id === id ? { ...x, error: true } : x)),
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <>
      <PageHead
        title={t(
          "A little guidance. In your language.",
          "আপনার ভাষায় কিছু নির্দেশনা।",
        )}
        description={t(
          "Ask, explore, and find a useful starting point.",
          "জিজ্ঞাসা করুন, জানুন, শুরুর ধারণা নিন।",
        )}
      >
        <Demo>LOCAL DEMO RESPONSES</Demo>
      </PageHead>
      <div className="advisor-layout">
        <section className="chat-panel">
          <div className="chat-header">
            <span className="advisor-avatar">
              <Sprout size={23} />
            </span>
            <div>
              <h3>{t("Your Farm Advisor", "আপনার কৃষি পরামর্শক")}</h3>
              <span>
                {t(
                  "General information · English & বাংলা",
                  "সাধারণ তথ্য · English ও বাংলা",
                )}
              </span>
            </div>
            <Leaf size={19} />
          </div>
          <div className="chat-messages">
            {!messages.length ? (
              <div className="chat-welcome">
                <span className="large-leaf">
                  <MessagesSquare size={33} />
                </span>
                <h2>{t("What’s on your mind?", "আপনি কী জানতে চান?")}</h2>
                <p>
                  {t(
                    "From soil to seasonal changes, start with a question. I use a small local library of demonstration responses.",
                    "মাটি থেকে মৌসুমের পরিবর্তন, একটি প্রশ্ন দিয়ে শুরু করুন। এখানে সীমিত স্থানীয় নমুনা উত্তর দেওয়া হয়।",
                  )}
                </p>
                <div className="suggestions">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q.en} onClick={() => void send(q[lang])}>
                      {q[lang]}
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="chat-turn">
                  <div className="user-bubble">{m.question}</div>
                  {m.reply && (
                    <div className="advisor-bubble">
                      <div className="row">
                        <Sprout size={18} />
                        <strong>{m.reply.title}</strong>
                        <Demo />
                      </div>
                      <p>{m.reply.body}</p>
                      <ul>
                        {m.reply.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                      <small>{m.reply.caution}</small>
                      <div className="followups">
                        {m.reply.followUps.map((q) => (
                          <button
                            key={q}
                            disabled={busy}
                            onClick={() => void send(q)}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {m.error && (
                    <div role="alert" className="error-text">
                      {t(
                        "Could not load a response. Turn off simulated errors in Settings and try again.",
                        "উত্তর লোড হয়নি। সেটিংসে ডেমো ত্রুটি বন্ধ করে আবার চেষ্টা করুন।",
                      )}
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => void send(m.question)}
                      >
                        {t("Retry", "আবার চেষ্টা")}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            {busy && (
              <div className="typing" role="status">
                <span />
                <span />
                <span />
                {t("Preparing a local response…", "নমুনা উত্তর তৈরি হচ্ছে…")}
              </div>
            )}
            <div ref={bottom} />
          </div>
          <form
            className="chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
              void send(question);
            }}
          >
            <label className="sr-only" htmlFor="question">
              {t("Your farming question", "আপনার কৃষি প্রশ্ন")}
            </label>
            <input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={700}
              placeholder={t("Ask a farming question…", "কৃষি সম্পর্কে প্রশ্ন করুন…")}
            />
            <button
              className="btn primary"
              type="submit"
              disabled={busy || !question.trim()}
              aria-label={t("Send question", "প্রশ্ন পাঠান")}
            >
              <Send size={20} />
            </button>
          </form>
          <p className="chat-caution">
            {t(
              "General information, not validated advice. Confirm with a local agriculture officer.",
              "সাধারণ তথ্য, যাচাইকৃত পরামর্শ নয়। স্থানীয় কৃষি কর্মকর্তার সাথে নিশ্চিত করুন।",
            )}
          </p>
        </section>
        <aside className="advisor-context">
          <div className="panel">
            <h3>{t("Your field context", "আপনার জমির তথ্য")}</h3>
            <FarmSelect />
            {farm && (
              <>
                <img src="/photos/field.webp" alt="Illustrative paddy field" />
                <strong>
                  {lang === "bn" ? (farm.nameBn ?? farm.name) : farm.name}
                </strong>
                <p>
                  {getCrop(farm.crop).name[lang]} ·{" "}
                  {findDistrict(farm.districtId)[lang]}
                </p>
                <span className="small muted">
                  {t("Planted", "রোপণ")}: {farm.plantingDate}
                </span>
              </>
            )}
          </div>
          <div className="advisor-sources">
            <BookOpen size={24} />
            <h3>
              {t(
                "Good questions need trusted answers.",
                "ভালো প্রশ্নের নির্ভরযোগ্য উত্তর চাই।",
              )}
            </h3>
            <p>
              {t(
                "Responses are authored demo content, not retrieved or reviewed by an agronomist. For authoritative information, visit:",
                "উত্তরগুলো পূর্বলিখিত ডেমো, কৃষিবিদ দ্বারা যাচাই করা নয়। নির্ভরযোগ্য তথ্যের জন্য দেখুন:",
              )}
            </p>
            <a href="https://dae.gov.bd" target="_blank" rel="noreferrer">
              Department of Agricultural Extension <ArrowUpRight size={15} />
            </a>
            <a href="https://brri.gov.bd" target="_blank" rel="noreferrer">
              Bangladesh Rice Research Institute <ArrowUpRight size={15} />
            </a>
            <small>
              {t(
                "Reference organizations, not citations for demo replies.",
                "প্রতিষ্ঠানের লিংক, ডেমো উত্তরের উদ্ধৃতি নয়।",
              )}
            </small>
          </div>
        </aside>
      </div>
    </>
  );
}
