import { Input } from "@/components/ui/input";
import { formatVariancePoints, varianceStatus, type VarianceStatus } from "@/lib/earned-value";
import { EMPTY_CELL } from "@/lib/format";
import { cx } from "@/lib/cx";

import { SettingsSection } from "./SettingsSection";
import { formatDecimalInput, parseDecimalInput } from "./settings-form";

/**
 * Durum toleransı kartı — Ek:153-168 (K6 varsayılan 2,0 puan).
 *
 * Önizleme durumu `varianceStatus()`tan gelir (K27: gösterilen değerle) —
 * burada eşik mantığı YAZILMAZ.
 *
 * ⚠️ Mockup "Bugün: sapma −2,6" basar (Ek:167). Bugünkü sapma bu uçta YOK
 * (Panel verisi, F3) → aynı değer "Örnek" etiketiyle önizleme olarak basılır.
 * ▼ ● ▲ glifleri yazı tipi alt kümesi DIŞINDA (symbol-subset-guard) → CSS işaret.
 */
const SAMPLE_VARIANCE = "-0.026";
const TOLERANCE_DIGITS = { int: 3, frac: 2 } as const;

const STATUS_LABEL: Record<VarianceStatus, string> = {
  late: "Geride",
  normal: "Normal",
  ahead: "İleride",
  none: EMPTY_CELL,
};

export interface ToleranceCardProps {
  tolerancePoints: string;
  invalid: boolean;
  disabled: boolean;
  onChange: (text: string) => void;
}

function StatusMark({ status }: { status: VarianceStatus }) {
  if (status === "none") return null;
  return <span aria-hidden="true" className={cx("ev-status-mark", `ev-status-mark--${status}`)} />;
}

export function ToleranceCard({ tolerancePoints, invalid, disabled, onChange }: ToleranceCardProps) {
  const parsed = invalid
    ? null
    : parseDecimalInput(tolerancePoints, TOLERANCE_DIGITS.int, TOLERANCE_DIGITS.frac);
  // Ek:460 `tolT` — geçersizken "?".
  const toleranceText = parsed === null ? "?" : formatDecimalInput(parsed, 1, TOLERANCE_DIGITS.frac);
  const sampleStatus: VarianceStatus =
    parsed === null ? "none" : varianceStatus(SAMPLE_VARIANCE, parsed);

  return (
    <SettingsSection title="Durum toleransı" icon="🎯" gap="sm">
      {/* Ek:156-160 */}
      <div className="ev-tolerance__input-row">
        <span aria-hidden="true" className="ev-tolerance__pm">
          ±
        </span>
        <Input
          size="row"
          numeric
          inputMode="decimal"
          aria-label="Durum toleransı (puan)"
          wrapperClassName="ev-settings__num-input ev-settings__num-input--tolerance"
          status={invalid ? "error" : "default"}
          value={tolerancePoints}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="ev-tolerance__unit">puan</span>
      </div>
      {/* Ek:161 */}
      <p className="ev-tolerance__text">
        Sapma bu aralıkta ise <b>Normal</b> sayılır. Üstü İleride, altı Geride.
      </p>
      {/* Ek:162-166 */}
      <div className="ev-tolerance__chips">
        <span className="ev-tolerance__chip ev-tolerance__chip--late">
          <StatusMark status="late" />
          Geride · &lt; −{toleranceText}
        </span>
        <span className="ev-tolerance__chip ev-tolerance__chip--normal">
          <StatusMark status="normal" />
          Normal · −{toleranceText} … +{toleranceText}
        </span>
        <span className="ev-tolerance__chip ev-tolerance__chip--ahead">
          <StatusMark status="ahead" />
          İleride · &gt; +{toleranceText}
        </span>
      </div>
      {/* Ek:167 */}
      <p className="ev-tolerance__preview" data-testid="tolerance-preview">
        Örnek: sapma <b className="ev-settings__mono">{formatVariancePoints(SAMPLE_VARIANCE)}</b> →{" "}
        <span className={cx("ev-tolerance__status", `ev-tolerance__status--${sampleStatus}`)}>
          <StatusMark status={sampleStatus} />
          {STATUS_LABEL[sampleStatus]}
        </span>
      </p>
    </SettingsSection>
  );
}
