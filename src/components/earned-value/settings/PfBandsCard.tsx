import { Input } from "@/components/ui/input";
import { WarningTriangleIcon } from "@/components/ui/icons";
import { formatPf, pfBand, type PfBand, type PfBandSettings } from "@/lib/earned-value";
import { EMPTY_CELL } from "@/lib/format";
import { cx } from "@/lib/cx";

import { SettingsSection } from "./SettingsSection";
import { parseDecimalInput, type DraftValidation, type SettingsDraft } from "./settings-form";

/**
 * PF bantları kartı — Ek:170-208 (M8: günlük kutuda üçüncü eşik "şüpheli yüksek").
 *
 * Rozet rengi `pfBand()`tan gelir (K18: gösterilen 2 ondalık değere) — burada
 * eşik mantığı YAZILMAZ. Renk çubuğu 0,80–1,20 ölçeğinde yalnız GÖRSEL konum
 * hesaplar (Ek:431 `pos`), karar vermez.
 *
 * ⚠️ Mockup önizleme değeri canlı veridir ("bugün (24.09) PF 1,04", "Hafta 21
 * PF 1,03" — Ek:464-465). Bu uçta PF YOK → aynı değerler "örnek" etiketiyle.
 */
const SCALE_MIN = 0.8;
const SCALE_SPAN = 0.4;
const PERCENT = 100;
const BAND_DIGITS = { int: 2, frac: 3 } as const;
const DAILY_SAMPLE = "1.04";
const WEEKLY_SAMPLE = "1.03";

const BAND_LABEL: Record<PfBand, string> = {
  red: "Kırmızı",
  amber: "Sarı",
  green: "Yeşil",
  high: "Şüpheli yüksek",
  none: EMPTY_CELL,
};

/** Ek:431 — değeri 0,80–1,20 çubuğunda yüzde konuma çevirir (yalnız çizim). */
function scalePosition(value: number): number {
  return Math.max(0, Math.min(PERCENT, ((value - SCALE_MIN) / SCALE_SPAN) * PERCENT));
}

function numberOf(text: string): number | null {
  const parsed = parseDecimalInput(text, BAND_DIGITS.int, BAND_DIGITS.frac);
  return parsed === null ? null : Number(parsed);
}

interface BarWidths {
  red: number;
  amber: number;
  green: number;
}

/** Ek:432 — bölge genişlikleri; eşik boşsa bir önceki sınıra yaslanır. */
function barWidths(red: number | null, green: number | null, high: number | null, hasHigh: boolean): BarWidths {
  const redEnd = red !== null ? scalePosition(red) : 0;
  const greenStart = green !== null ? scalePosition(Math.max(green, red ?? 0)) : redEnd;
  const greenEnd = hasHigh
    ? high !== null
      ? scalePosition(Math.max(high, green ?? 0, red ?? 0))
      : greenStart
    : PERCENT;
  return {
    red: redEnd,
    amber: Math.max(0, greenStart - redEnd),
    green: Math.max(0, greenEnd - greenStart),
  };
}

interface ThresholdInputProps {
  label: string;
  value: string;
  invalid: boolean;
  disabled: boolean;
  onChange: (text: string) => void;
}

function ThresholdInput({ label, value, invalid, disabled, onChange }: ThresholdInputProps) {
  return (
    <Input
      size="row"
      numeric
      inputMode="decimal"
      aria-label={label}
      wrapperClassName="ev-settings__num-input ev-settings__num-input--band"
      status={invalid ? "error" : "default"}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

interface PfBandBoxProps {
  label: "Günlük" | "Haftalık";
  red: string;
  green: string;
  /** Yalnız günlük kutuda (K19 üçüncü eşik). */
  high?: string;
  redInvalid: boolean;
  greenInvalid: boolean;
  highInvalid: boolean;
  greenBelowRed: boolean;
  highBelowGreen: boolean;
  sample: string;
  band: PfBand;
  disabled: boolean;
  onChange: (field: "redBelow" | "greenFrom" | "highAbove", text: string) => void;
}

function PfBandBox({
  label,
  red,
  green,
  high,
  redInvalid,
  greenInvalid,
  highInvalid,
  greenBelowRed,
  highBelowGreen,
  sample,
  band,
  disabled,
  onChange,
}: PfBandBoxProps) {
  const hasHigh = high !== undefined;
  const redValue = numberOf(red);
  const greenValue = numberOf(green);
  const highValue = hasHigh ? numberOf(high) : null;
  const widths = barWidths(redValue, greenValue, highValue, hasHigh);
  const isBad = redInvalid || greenInvalid || highInvalid || greenBelowRed || highBelowGreen;
  // Ek:430 `yelNote` — sarı bölge yalnız yeşil eşiği kırmızının ÜSTÜNDEYSE vardır (F0-1).
  const hasAmberZone = redValue !== null && greenValue !== null && greenValue > redValue;
  const markerLeft = scalePosition(Number(sample));

  return (
    // Ek:175 — bant kutusu; hatada kırmızı zemin
    <div role="group" aria-label={`${label} PF bandı`} className={cx("ev-pf-box", isBad && "ev-pf-box--bad")}>
      {/* Ek:177-189 — eşik satırı */}
      <div className="ev-pf-box__thresholds">
        <span className="ev-pf-box__label">{label}</span>
        <span className="ev-pf-box__cap ev-pf-box__cap--red">Kırmızı &lt;</span>
        <ThresholdInput
          label={`${label} kırmızı eşiği`}
          value={red}
          invalid={redInvalid || greenBelowRed}
          disabled={disabled}
          onChange={(text) => onChange("redBelow", text)}
        />
        {/* "≥" alt küme dışı (symbol-subset-guard) → sözcük; sapma raporda. */}
        <span className="ev-pf-box__cap ev-pf-box__cap--green">Yeşil en az</span>
        <ThresholdInput
          label={`${label} yeşil eşiği`}
          value={green}
          invalid={greenInvalid || greenBelowRed || highBelowGreen}
          disabled={disabled}
          onChange={(text) => onChange("greenFrom", text)}
        />
        {hasHigh && (
          // Ek:185-186 — etiket + giriş çifti birlikte alt satıra kayar
          <span className="ev-pf-box__pair">
            <span className="ev-pf-box__cap ev-pf-box__cap--high">Şüpheli yüksek &gt;</span>
            <ThresholdInput
              label={`${label} şüpheli yüksek eşiği`}
              value={high}
              invalid={highInvalid || highBelowGreen}
              disabled={disabled}
              onChange={(text) => onChange("highAbove", text)}
            />
          </span>
        )}
        {hasAmberZone && <span className="ev-pf-box__amber-note">sarı arada</span>}
      </div>
      {/* Ek:191-200 — renk çubuğu 0,80–1,20 */}
      <div className="ev-pf-bar" aria-hidden="true">
        <div className="ev-pf-bar__track">
          <div className="ev-pf-bar__zone ev-pf-bar__zone--red" style={{ width: `${widths.red}%` }} />
          <div className="ev-pf-bar__zone ev-pf-bar__zone--amber" style={{ width: `${widths.amber}%` }} />
          <div className="ev-pf-bar__zone ev-pf-bar__zone--green" style={{ width: `${widths.green}%` }} />
          <div className="ev-pf-bar__zone ev-pf-bar__zone--high" />
        </div>
        <div className="ev-pf-bar__marker" style={{ left: `${markerLeft}%` }} />
        <span className="ev-pf-bar__scale ev-pf-bar__scale--min">0,80</span>
        <span className="ev-pf-bar__scale ev-pf-bar__scale--max">1,20</span>
      </div>
      {/* Ek:202 — önizleme */}
      <p className="ev-pf-box__preview">
        Önizleme: örnek PF <b className="ev-settings__mono">{formatPf(sample)}</b> →{" "}
        <span data-testid="pf-preview-badge" className={cx("ev-pf-badge", `ev-pf-badge--${band}`)}>
          {BAND_LABEL[band]}
        </span>
      </p>
      {greenBelowRed && (
        // Ek:203
        <p className="ev-pf-box__error">
          <WarningTriangleIcon aria-hidden="true" />
          Sarı eşiği (yeşil alt sınırı) kırmızı sınırından küçük olamaz.
        </p>
      )}
      {highBelowGreen && (
        // Ek:204
        <p className="ev-pf-box__error">
          <WarningTriangleIcon aria-hidden="true" />
          Şüpheli yüksek eşiği yeşil alt sınırından küçük olamaz.
        </p>
      )}
      {/* Ek:205 — K19 */}
      {!hasHigh && <p className="ev-settings__hint">Kümülatif PF de haftalık bantları kullanır.</p>}
    </div>
  );
}

export interface PfBandsCardProps {
  bands: SettingsDraft["bands"];
  validation: Pick<DraftValidation, "daily" | "weekly">;
  /** Kutu başına geçerli eşikler (`pfBandSettingsFromDraft`); hatalı kutu `null` → rozet "—". */
  dailySettings: PfBandSettings | null;
  weeklySettings: PfBandSettings | null;
  disabled: boolean;
  onDailyChange: (field: "redBelow" | "greenFrom" | "highAbove", text: string) => void;
  onWeeklyChange: (field: "redBelow" | "greenFrom", text: string) => void;
}

export function PfBandsCard({
  bands,
  validation,
  dailySettings,
  weeklySettings,
  disabled,
  onDailyChange,
  onWeeklyChange,
}: PfBandsCardProps) {
  const dailyBand: PfBand = dailySettings ? pfBand(DAILY_SAMPLE, dailySettings, "daily") : "none";
  const weeklyBand: PfBand = weeklySettings
    ? pfBand(WEEKLY_SAMPLE, weeklySettings, "weekly")
    : "none";
  return (
    <SettingsSection title="PF bantları" icon="📊" gap="md">
      <PfBandBox
        label="Günlük"
        red={bands.daily.redBelow}
        green={bands.daily.greenFrom}
        high={bands.daily.highAbove}
        redInvalid={validation.daily.redBelow}
        greenInvalid={validation.daily.greenFrom}
        highInvalid={validation.daily.highAbove}
        greenBelowRed={validation.daily.greenBelowRed}
        highBelowGreen={validation.daily.highBelowGreen}
        sample={DAILY_SAMPLE}
        band={dailyBand}
        disabled={disabled}
        onChange={onDailyChange}
      />
      <PfBandBox
        label="Haftalık"
        red={bands.weekly.redBelow}
        green={bands.weekly.greenFrom}
        redInvalid={validation.weekly.redBelow}
        greenInvalid={validation.weekly.greenFrom}
        highInvalid={false}
        greenBelowRed={validation.weekly.greenBelowRed}
        highBelowGreen={false}
        sample={WEEKLY_SAMPLE}
        band={weeklyBand}
        disabled={disabled}
        onChange={(field, text) => {
          if (field !== "highAbove") onWeeklyChange(field, text);
        }}
      />
    </SettingsSection>
  );
}
