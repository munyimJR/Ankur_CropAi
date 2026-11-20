import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Leaf, Sprout, AlertCircle, MapPin } from "lucide-react";
import { useApp } from "../state";
import { BD_PATH, project, findDistrict } from "../lib/geo";
import type { Farm } from "../services/types";
import { buildSnapshots } from "../services/vegetation.service";
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Ankur — Growing with you.">
      <span className="brand-icon">
        <Sprout size={25} />
      </span>
      <span className="brand-title-wrap">
        <span className="brand-name">Ankur</span>
        <span className="brand-tagline">Growing with you.</span>
      </span>
    </Link>
  );
}
export function Demo({ children }: { children?: ReactNode }) {
  return (
    <span className="demo">
      <span />
      {children ?? "DEMO DATA"}
    </span>
  );
}
export function PageHead({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <Sprout size={38} />
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="btn primary" to="/app/fields">
        Add a field <ArrowUpRight size={18} />
      </Link>
    </div>
  );
}
export function LoadState({
  error,
  retry,
}: {
  error?: string;
  retry?: () => void;
}) {
  return error ? (
    <div className="error" role="alert">
      <AlertCircle />
      <p>{error}</p>
      <button className="btn" onClick={retry}>
        Retry
      </button>
    </div>
  ) : (
    <div className="skeleton" role="status" aria-label="Loading demo data">
      <div />
      <div />
      <div />
    </div>
  );
}
export function FarmSelect() {
  const { farm, farms, select, lang, t } = useApp();
  return (
    <label className="farm-select">
      <MapPin size={17} />
      <span className="sr-only">{t("Selected field", "নির্বাচিত জমি")}</span>
      <select value={farm?.id ?? ""} onChange={(e) => select(e.target.value)}>
        {!farms.length && (
          <option value="">{t("No fields yet", "এখনও জমি নেই")}</option>
        )}
        {farms.map((f) => (
          <option key={f.id} value={f.id}>
            {lang === "bn" ? (f.nameBn ?? f.name) : f.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function MapView({
  farms,
  selected,
  onSelect,
}: {
  farms: Farm[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const { lang } = useApp();
  return (
    <div className="map-view">
      <div className="map-label">
        <MapPin size={16} /> Bangladesh <Demo>SCHEMATIC</Demo>
      </div>
      <svg
        viewBox="-45 -15 500 620"
        role="img"
        aria-label="Bangladesh district locator with approximate demo farm locations"
      >
        <path d={BD_PATH} fill="#cddbc7" stroke="#91ae98" strokeWidth="1.5" />
        {farms.map((f) => {
          const p = project(f.lat, f.lng);
          return (
            <g
              key={f.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${f.name}`}
              onClick={() => onSelect(f.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(f.id);
                }
              }}
              className="map-marker"
            >
              <circle cx={p.x} cy={p.y} r="23" fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={selected === f.id ? 11 : 7}
                fill={selected === f.id ? "#103C30" : "#397D5C"}
                stroke="#f7f8f2"
                strokeWidth="3"
              />
              <text x={p.x + 17} y={p.y + 5} fontSize="14" fill="#103C30">
                {findDistrict(f.districtId)[lang]}
              </text>
            </g>
          );
        })}
      </svg>
      <small>Approximate locations • demonstration only</small>
    </div>
  );
}
export function Vegetation({
  farm,
  compact = false,
}: {
  farm: Farm;
  compact?: boolean;
}) {
  const { t } = useApp();
  const snapshot = buildSnapshots(farm).at(-1)!;
  return (
    <div className={"vegetation " + (compact ? "compact" : "")}>
      <div className="row between">
        <span className="row">
          <Leaf size={18} />
          {t("Vegetation overview", "গাছের স্বাস্থ্যের চিত্র")}
        </span>
        <Demo />
      </div>
      <div
        className="vegetation-grid"
        role="img"
        aria-label="Simulated vegetation index grid, not satellite imagery"
      >
        {snapshot.grid.flat().map((v, i) => (
          <span
            key={i}
            style={{
              background:
                v > 0.69
                  ? "#1e5c3b"
                  : v > 0.63
                    ? "#548442"
                    : v > 0.58
                      ? "#8ba750"
                      : v > 0.51
                        ? "#b2bc63"
                        : "#d2b45c",
            }}
          />
        ))}
      </div>
      <div className="row between small">
        <span>
          {t("Lower vigor", "দুর্বল")} <span className="legend-scale" />{" "}
          {t("Higher vigor", "সবল")}
        </span>
        <span>{t("Illustrative plot", "নমুনা জমি")}</span>
      </div>
    </div>
  );
}
