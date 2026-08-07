import { Badge } from "@/components/ui/badge/Badge";
import { formatDecimal } from "@/lib/format";

export interface TimesheetSummaryStripProps {
  /** ŞP 117 — seçili bölümün adı; "Tüm Bölümler"de şantiye/kapsam adı. */
  title: string;
  /** ŞP 118 — "48 işçi" */
  workerCount: number;
  /** ŞP 119 — "864 adam/gün" */
  totalManDays: number;
  /** ŞP 119 — "128 saat fazla mesai"; ondalık STRING (float aritmetiği yok). */
  totalOvertimeHours: string;
}

/**
 * Bölüm özet şeridi (ŞP 116-120) — matris kartının başlık satırı.
 *
 * Üç değer de GÖRÜNEN (bölüm filtresi uygulanmış) kümeden türer; backend'in
 * süzgeçli çıktısıyla birebir aynı sonucu verir (bkz. `derive.ts` K2 notu).
 */
export function TimesheetSummaryStrip({
  title,
  workerCount,
  totalManDays,
  totalOvertimeHours,
}: TimesheetSummaryStripProps) {
  return (
    <div className="ts-summary">
      {/* ŞP 117 */}
      <span className="ts-summary__title">{title}</span>
      {/* ŞP 118 */}
      <Badge variant="primary" className="ts-summary__count">
        {workerCount} işçi
      </Badge>
      {/* ŞP 119 */}
      <span className="ts-summary__metrics">
        {totalManDays} adam/gün · {formatDecimal(totalOvertimeHours, 2)} saat fazla mesai
      </span>
    </div>
  );
}
