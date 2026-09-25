import type { Weather } from "@/lib/api/hooks/useSiteDiary";

/**
 * PLN-F2.2 · Hava seçicisinin on ikonu — `Şantiye - Günlük Kayıt
 * (İlerleme).dc.html` İ:606-618 `wxDef()` yollarından BİREBİR (glif YOK,
 * inline SVG). Renkler mockup hex'lerinin token karşılıklarıdır (çıplak hex
 * yasak). Sıra mockup sırasıdır; anahtarlar backend `Weather` enum'u
 * (B2-1 eşlemesi: sun→sunny · partly→partly_cloudy · rain→rainy ·
 * heavy→heavy_rain · snow→snowy · wind→windy · dust→dusty · fog→foggy).
 */
export interface WeatherIconPart {
  d: string;
  /** CSS değeri — token (`var(--…)`) ya da `none`. */
  fill: string;
  stroke: string;
}

export interface WeatherIconDef {
  value: Weather;
  /** Seçili etiket (İ:180 "Hava durumu · <b>…</b>"). */
  label: string;
  /** Kutucuk altı kısa etiket. */
  short: string;
  parts: readonly WeatherIconPart[];
}

const CLOUD = "M4.6 12.5h6.9a2.6 2.6 0 0 0 .3-5.2A3.6 3.6 0 0 0 5 8.1a2.2 2.2 0 0 0-.4 4.4z";
const CLOUD_UP = "M4.6 10.5h6.9a2.6 2.6 0 0 0 .3-5.2A3.6 3.6 0 0 0 5 6.1a2.2 2.2 0 0 0-.4 4.4z";

const SUN_FILL = "var(--color-avatar-amber-end)";
const SUN_STROKE = "var(--color-warning-strong)";
const MUTED = "var(--color-text-muted)";
const WHITE = "var(--color-surface)";
const RAIN = "var(--color-primary)";
const NONE = "none";

export const WEATHER_ICONS: readonly WeatherIconDef[] = [
  {
    value: "sunny",
    label: "Güneşli",
    short: "Güneşli",
    parts: [
      { d: "M8 5.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 1 0 0-5.6z", fill: SUN_FILL, stroke: SUN_STROKE },
      {
        d: "M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9L13 13M3 13l1.1-1.1M11.9 4.1L13 3",
        fill: NONE,
        stroke: SUN_STROKE,
      },
    ],
  },
  {
    value: "partly_cloudy",
    label: "Parçalı bulutlu",
    short: "Parçalı",
    parts: [
      { d: "M6 2.8a2.2 2.2 0 1 0 0 4.4a2.2 2.2 0 1 0 0-4.4z", fill: SUN_FILL, stroke: SUN_STROKE },
      { d: "M6 .6v1M1.6 5H.8M2.9 1.9l.7.7M9.1 1.9l-.7.7", fill: NONE, stroke: SUN_STROKE },
      { d: CLOUD, fill: WHITE, stroke: MUTED },
    ],
  },
  { value: "cloudy", label: "Bulutlu", short: "Bulutlu", parts: [{ d: CLOUD, fill: "var(--color-border)", stroke: MUTED }] },
  {
    value: "rainy",
    label: "Yağmurlu",
    short: "Yağmurlu",
    parts: [
      { d: CLOUD_UP, fill: WHITE, stroke: MUTED },
      { d: "M5.5 12l-.7 1.8M8.5 12l-.7 1.8M11.5 12l-.7 1.8", fill: NONE, stroke: RAIN },
    ],
  },
  {
    value: "heavy_rain",
    label: "Sağanak",
    short: "Sağanak",
    parts: [
      { d: CLOUD_UP, fill: "var(--color-border-strong)", stroke: "var(--color-text-secondary)" },
      { d: "M4.8 11.6l-1 2.8M7.6 11.6l-1 2.8M10.4 11.6l-1 2.8M13 11.6l-1 2.8", fill: NONE, stroke: "var(--color-primary-hover)" },
    ],
  },
  {
    value: "drizzle",
    label: "Hafif yağmur",
    short: "Hafif yağ.",
    parts: [
      { d: CLOUD_UP, fill: WHITE, stroke: MUTED },
      { d: "M6 13h.1M10 13h.1M8 14.6h.1", fill: NONE, stroke: RAIN },
    ],
  },
  {
    value: "snowy",
    label: "Karlı",
    short: "Karlı",
    parts: [
      { d: CLOUD_UP, fill: WHITE, stroke: MUTED },
      { d: "M5.5 12.2v2M4.5 13.2h2M10.5 12.2v2M9.5 13.2h2", fill: NONE, stroke: "var(--color-avatar-blue-end)" },
    ],
  },
  {
    value: "windy",
    label: "Rüzgârlı",
    short: "Rüzgârlı",
    parts: [{ d: "M1.5 6h8.2a2 2 0 1 0-2-2M1.5 9h10.5a2 2 0 1 1-2 2M1.5 12h4.5", fill: NONE, stroke: MUTED }],
  },
  {
    value: "dusty",
    label: "Tozlu",
    short: "Tozlu",
    parts: [
      { d: "M1.5 7h9a2 2 0 1 0-2-2M1.5 10.5h6", fill: NONE, stroke: "var(--color-warning-body-text)" },
      { d: "M11 10.5h.1M13 12.5h.1M9.5 13h.1M12.5 8.8h.1", fill: NONE, stroke: "var(--color-warning-body-text)" },
    ],
  },
  {
    value: "foggy",
    label: "Sisli",
    short: "Sisli",
    parts: [{ d: "M2 5h12M1 8h14M3 11h10M5 14h6", fill: NONE, stroke: "var(--color-text-subtle)" }],
  },
];
