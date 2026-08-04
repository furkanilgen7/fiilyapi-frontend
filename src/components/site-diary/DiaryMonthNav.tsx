import { Button } from "@/components/ui/button/Button";
import { formatPeriod } from "@/lib/format";

export interface DiaryMonthNavProps {
  year: number;
  month: number;
  onShift: (delta: number) => void;
}

/**
 * HÖ89-93 · "‹ Temmuz 2026 ›" ay gezinme kutusu.
 *
 * Mockup'taki AY SABİTİ kopyalanmaz (tarih artefaktı istisnası, spec başlığı) —
 * varsayılan içinde bulunulan gerçek aydır, kullanıcı oklarla gezinir.
 */
export function DiaryMonthNav({ year, month, onShift }: DiaryMonthNavProps) {
  const label = formatPeriod(year, month);
  return (
    <div className="diary-month-nav">
      {/* HÖ90 */}
      <Button
        variant="ghost"
        size="sm"
        className="diary-month-nav__arrow"
        aria-label="Önceki ay"
        onClick={() => onShift(-1)}
      >
        ‹
      </Button>
      {/* HÖ91 — okuyucuya hangi dönem olduğu açıkça söylenir */}
      <span className="diary-month-nav__label" aria-live="polite">
        {label}
      </span>
      {/* HÖ92 */}
      <Button
        variant="ghost"
        size="sm"
        className="diary-month-nav__arrow"
        aria-label="Sonraki ay"
        onClick={() => onShift(1)}
      >
        ›
      </Button>
    </div>
  );
}
