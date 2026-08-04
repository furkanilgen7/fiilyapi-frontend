import { cx } from "@/lib/cx";
import { pendingModuleLabel } from "@/lib/pending-modules";

import type { DiaryRecentEntryRow } from "./recent-entries";

export interface DiaryRecentEntriesCardProps {
  rows: readonly DiaryRecentEntryRow[];
  isLoading: boolean;
  isError: boolean;
  /** Ekranda açık olan gün — o satır işaretlenir. */
  activeDate: string;
  /** Satıra tıklanınca O GÜNÜN kaydı açılır (GK359: satır `cursor:pointer`). */
  onSelectDate: (entryDate: string) => void;
  /** Kaydedilmemiş değişiklik var — gün değiştirmek onları kaybettirir. */
  hasUnsavedChanges: boolean;
}

/**
 * GK356-386 · "Son Kayıtlar" kartı. Üç satırın hepsi GERÇEK veriden gelir
 * (`GET /sites/{site_id}/diary` — ekranın zaten çektiği ay listesi; ikinci bir
 * istek atılmaz).
 *
 * BASILMAYAN veri (üst kural gereği SİLİNMEZ, gerekçesiyle devre dışı basılır):
 * GK363'ün "3 fotoğraf" parçası — fotoğraf modülü yok, `SiteDiaryEntryList
 * Item` şemasında sayı taşınmıyor.
 */
export function DiaryRecentEntriesCard({
  rows,
  isLoading,
  isError,
  activeDate,
  onSelectDate,
  hasUnsavedChanges,
}: DiaryRecentEntriesCardProps) {
  return (
    <section className="diary-card diary-card--flush" aria-labelledby="diary-recent-title">
      {/* GK357 */}
      <h2 className="diary-recent__head" id="diary-recent-title">
        Son Kayıtlar
      </h2>
      <div className="diary-recent__list">
        {isLoading && <p className="diary-recent__message">Kayıtlar yükleniyor…</p>}
        {!isLoading && isError && (
          <p className="diary-recent__message">Son kayıtlar yüklenemedi.</p>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <p className="diary-recent__message">Bu ayda henüz günlük kayıt yok.</p>
        )}
        {!isLoading &&
          !isError &&
          rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={cx(
                "diary-recent__row",
                row.entryDate === activeDate && "diary-recent__row--active",
              )}
              aria-current={row.entryDate === activeDate ? "true" : undefined}
              onClick={() => onSelectDate(row.entryDate)}
            >
              {/* GK360-362 */}
              <span className="diary-recent__top">
                <span className="diary-recent__date">{row.dateLabel}</span>
                <span className="diary-recent__badges">
                  <span
                    className={cx(
                      "diary-recent__badge",
                      row.isSubmitted
                        ? "diary-recent__badge--submitted"
                        : "diary-recent__badge--draft",
                    )}
                  >
                    {row.statusLabel}
                  </span>
                  {/* GK372 — hava `rainy` günde kırmızı rozet (frontend türevi) */}
                  {row.isRainy && (
                    <span className="diary-recent__badge diary-recent__badge--rain">Yağışlı</span>
                  )}
                </span>
              </span>
              {/* GK363 */}
              <span className="diary-recent__meta">
                {row.workerLabel}
                {" · "}
                {row.sectionLabel ?? (
                  <span className="diary-recent__pending" title={pendingModuleLabel("section_name")}>
                    Bölüm adı yok
                  </span>
                )}
                {" · "}
                <span
                  className="diary-recent__pending"
                  title="Fotoğraf modülü henüz yok — sayı gösterilemiyor"
                >
                  — fotoğraf
                </span>
              </span>
              {/* GK364 */}
              <span className="diary-recent__amount">{row.amountLabel}</span>
            </button>
          ))}
      </div>
      {hasUnsavedChanges && (
        <p className="diary-recent__warning">
          Kaydedilmemiş değişiklikleriniz var — başka bir güne geçerseniz kaybolur.
        </p>
      )}
    </section>
  );
}
