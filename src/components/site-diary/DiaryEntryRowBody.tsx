import { pendingModuleLabel } from "@/lib/pending-modules";

import type { DiaryRecentEntryRow } from "./recent-entries";

/**
 * GK360-364 · Bir günlük kayıt satırının İÇERİĞİ — kabuğundan (button/li)
 * AYRILMIŞ hâli.
 *
 * F-BLMSEK'te çıkarıldı: aynı satır iki yüzeyde basılıyor —
 *   - `DiaryRecentEntriesCard` (şantiye günlüğü sağ paneli): tıklanabilir
 *     `<button>` kabuğu, gün seçer;
 *   - `SectionDiaryPanel` (Bölüm Detay › Günlük Kayıt sekmesi): salt okunur
 *     `<li>` kabuğu, gün seçme davranışı yok.
 * İkinci bir kopya yazmak sunumun ZAMANLA AYRIŞMASI demekti (DRY). Kabuk
 * dışarıda bırakıldığı için şantiye kartının BASTIĞI DOM hiç değişmez —
 * o ekranın görsel tabanı vardır.
 *
 * BASILMAYAN veri (üst kural gereği SİLİNMEZ, gerekçesiyle devre dışı basılır):
 * GK363'ün "3 fotoğraf" parçası — fotoğraf modülü yok, `SiteDiaryEntryList
 * Item` şemasında sayı taşınmıyor.
 */
export function DiaryEntryRowBody({ row }: { row: DiaryRecentEntryRow }) {
  return (
    <>
      {/* GK360-362 */}
      <span className="diary-recent__top">
        <span className="diary-recent__date">{row.dateLabel}</span>
        <span className="diary-recent__badges">
          <span
            className={
              row.isSubmitted
                ? "diary-recent__badge diary-recent__badge--submitted"
                : "diary-recent__badge diary-recent__badge--draft"
            }
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
    </>
  );
}
