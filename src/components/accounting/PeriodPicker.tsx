"use client";

import { formatPeriod } from "@/lib/format";

import { shiftPeriod, type Period } from "./accounting-labels";

interface PeriodPickerProps {
  period: Period;
  onChange: (period: Period) => void;
}

/**
 * E8:73-77 — `‹ Temmuz 2026 ›`. Ay adları `formatPeriod` TEK KAYNAĞINDAN
 * gelir (`Intl.DateTimeFormat` kullanılmaz: jsdom/CI'da ICU eksik olabilir).
 *
 * Oklar `‹`/`›` (U+2039/U+203A) — mockup'ın kendi karakterleri; sembol
 * bekçisinin yasak sınıfında (`⚠ ✓ ✗`) DEĞİLLER, ama okuyucuya anlamlarını
 * `aria-label` söyler.
 */
export function PeriodPicker({ period, onChange }: PeriodPickerProps) {
  const label = formatPeriod(period.year, period.month);
  return (
    <div className="mu-period" data-testid="mu-period">
      <button
        type="button"
        className="mu-period__nav"
        aria-label="Önceki ay"
        data-testid="mu-period-prev"
        onClick={() => onChange(shiftPeriod(period, -1))}
      >
        &lsaquo;
      </button>
      <span className="mu-period__label" data-testid="mu-period-label">
        {label}
      </span>
      <button
        type="button"
        className="mu-period__nav"
        aria-label="Sonraki ay"
        data-testid="mu-period-next"
        onClick={() => onChange(shiftPeriod(period, 1))}
      >
        &rsaquo;
      </button>
    </div>
  );
}
