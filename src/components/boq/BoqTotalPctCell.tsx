import { cx } from "@/lib/cx";
import { formatPercent } from "@/lib/format";
import { metricCell } from "@/lib/placeholder-cell";
import type { BoqTotals } from "@/lib/api/hooks/useBoq";

import "./boq.css";

export interface BoqTotalPctCellProps {
  /** `BoqTotals.grand_progress_pct` — kapsamın gerçekleşme yüzdesi. */
  progress: BoqTotals["grand_progress_pct"];
  "data-testid": string;
}

/**
 * Toplam satırının yüzde hücresi (Ekran 13 · 177 `%75` · Bölüm Detay D200-205).
 *
 * ⚠️ ESKİ GEREKÇE BAYATLADI. İki dosyada da "veri hakediş modülünü bekliyor"
 * yazıyordu ve o gün doğruydu; ILR-1'de `grand_progress_pct` BAĞLANDI (backend
 * `boq/service.py:215`, kaynağı şantiye günlüğü). Bayat not yüzünden iki hücre
 * de `available` bayrağına HİÇ bakmıyor, koşulsuz "—" basıyordu — backend'in
 * gönderdiği gerçek yüzde ekrana hiç çıkmıyordu.
 *
 * İki ekranda BİREBİR aynı hücreydi (`BoqTable` + `SectionBoqCard`); kusur da
 * iki kopyada birden yaşıyordu. Tek kaynağa alındı, kopya çoğaltılmaz.
 *
 * Rozet değil düz metindir (mockup 177) ve sahte yüzde uydurulmaz.
 */
export function BoqTotalPctCell({ progress, "data-testid": testId }: BoqTotalPctCellProps) {
  const { text, hint } = metricCell(progress, formatPercent);
  return (
    <td
      className={cx(
        "boq-table__total-pct",
        // Soluk hâl YALNIZ boş zarfta; dolu zarfta mockup'ın mavi vurgusu döner.
        text === null && "boq-table__pct--pending",
        "boq-table__col--pct",
      )}
      data-testid={testId}
      // 3. hâl (`available:false` + `pending_module:null` = rolün izni yok)
      // `hint` taşımaz → ne `title` ne sr-only basılır, uydurma gerekçe yazılmaz.
      title={hint}
    >
      {text ?? "—"}
      {hint !== undefined && <span className="sr-only">{hint}</span>}
    </td>
  );
}
