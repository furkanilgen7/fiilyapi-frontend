import { cx } from "@/lib/cx";
import { EMPTY_CELL, formatDecimal } from "@/lib/format";

import type { DetailWorkerRow, DetailWorkerSummary } from "./cards-derive";

/**
 * DET-1.3 · "👷 Bugünkü İşçi Dağılımı" — mockup 460-486 (İ:344-372).
 *
 * S7: puantaj bölüm taşımaz → kart ŞANTİYENİN günün tümünü gösterir ve bunu
 * alt başlıkta söyler ("günün tümü (şantiye)"). Kişi/saat girdileri düz metin
 * (BÜT:485); satır kümesi günlük ekranıyla aynı mantıktan (`cards-derive`).
 */
const SOURCE_TONE: Record<DetailWorkerRow["source"], string> = {
  company: "company",
  subcontractor: "subcontractor",
  general: "general",
  freelance: "general",
  intern: "general",
};

function formatHours(value: string | null): string {
  return value === null ? EMPTY_CELL : formatDecimal(value, 1);
}

function WorkerRow({ row }: { row: DetailWorkerRow }) {
  return (
    <li className="diary-detail-workers__row">
      <span className="diary-detail-workers__who">
        <span className={cx("diary-detail-workers__src", `diary-detail-workers__src--${SOURCE_TONE[row.source]}`)}>
          {row.sourceLabel}
        </span>
        <span className="diary-detail-workers__name">{row.name}</span>
      </span>
      <span className="diary-detail-workers__count">{row.count}</span>
      <span className={row.isSubcontractor ? "diary-detail-workers__count diary-detail-workers__count--sm" : "diary-detail-workers__hours"}>
        {formatHours(row.hours)}
      </span>
      <span className={cx("diary-detail-workers__as", row.isSubcontractor && "diary-detail-workers__as--sub")}>
        {formatHours(row.manHours)}
      </span>
    </li>
  );
}

export function DiaryDetailWorkersCard({ summary }: { summary: DetailWorkerSummary }) {
  return (
    <section className="diary-detail-card diary-detail-card--workers" aria-labelledby="diary-detail-workers">
      <h2 className="diary-detail-card__title diary-detail-card__title--sm" id="diary-detail-workers">
        👷 Bugünkü İşçi Dağılımı
      </h2>
      <p className="diary-detail-workers__sub">Kendi ekip puantajdan · taşeron kişi × saat · günün tümü (şantiye)</p>
      <div className="diary-detail-workers__head" aria-hidden="true">
        <span>Meslek · kaynak</span>
        <span className="diary-detail-workers__center">Kişi</span>
        <span className="diary-detail-workers__center">Saat</span>
        <span className="diary-detail-workers__right">a-s</span>
      </div>
      {summary.rows.length === 0 ? (
        <p className="diary-detail-workers__empty">Bu gün işçi kaydı yok.</p>
      ) : (
        <ul className="diary-detail-workers__list">
          {summary.rows.map((row) => (
            <WorkerRow key={row.key} row={row} />
          ))}
        </ul>
      )}
      {summary.hasFirmRows && <p className="diary-detail-workers__note">Taşeron: kişi × saat = a-s</p>}
      <div className="diary-detail-workers__row diary-detail-workers__row--total">
        <span className="diary-detail-workers__total-label">Toplam</span>
        <span className="diary-detail-workers__total diary-detail-workers__center">{summary.totalPeople}</span>
        <span />
        <span className="diary-detail-workers__total diary-detail-workers__right">{formatHours(summary.totalManHours)}</span>
      </div>
    </section>
  );
}
