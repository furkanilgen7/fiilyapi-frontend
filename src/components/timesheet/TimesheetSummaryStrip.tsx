import { Badge } from "@/components/ui/badge/Badge";
import { formatDecimal } from "@/lib/format";

export interface TimesheetSummaryStripProps {
  /** ŞP 117 — seçili bölümün adı + dönem. */
  title: string;
  /** ŞP 118 — "48 işçi" */
  workerCount: number;
  /** ŞP 119 — saat toplamı; ondalık STRING (float aritmetiği yok). */
  totalHours: string;
}

/**
 * Bölüm özet şeridi (ŞP 116-120) — aylık matris kartının başlık satırı.
 *
 * 🔴 ADAM-GÜN BASILMAZ: adam-gün artık TÜREVDİR (saat ÷ normal gün saati) ve
 * aylık uç bölen olan `normal_day_hours`u YAYINLAMAZ. Bölünecek sayıyı
 * uydurmak yerine ekranda ölçülen büyüklük (saat) basılır — mockup'ın
 * "864 adam/gün" değeri bu uçtan ÜRETİLEMEZ.
 *
 * İki değer de GÖRÜNEN (bölüm filtresi uygulanmış) kümeden türer.
 */
export function TimesheetSummaryStrip({
  title,
  workerCount,
  totalHours,
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
      <span className="ts-summary__metrics">{formatDecimal(totalHours, 1)} saat</span>
    </div>
  );
}
