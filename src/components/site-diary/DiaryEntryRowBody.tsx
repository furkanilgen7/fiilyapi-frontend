import type { ReactNode } from "react";

import { pendingModuleLabel } from "@/lib/pending-modules";

import type { DiaryRecentEntryRow } from "./recent-entries";

/**
 * GK360-364 · Bir günlük kayıt satırının İÇERİĞİ — kabuğundan (button/li)
 * AYRILMIŞ hâli.
 *
 * F-BLMSEK'te çıkarıldı: aynı satır iki yüzeyde basılıyor —
 *   - `DiaryRecentEntriesCard` (şantiye günlüğü sağ paneli): tıklanabilir
 *     `<button>` kabuğu, gün seçer;
 *   - `SectionDiaryPanel` (Bölüm Detay › Günlük Kayıt sekmesi): DET-1.2'den
 *     beri `<li><a>` kabuğu — satır günlük kayıt DETAY sayfasına gider.
 * İkinci bir kopya yazmak sunumun ZAMANLA AYRIŞMASI demekti (DRY). Kabuk
 * dışarıda bırakıldığı için şantiye kartının BASTIĞI DOM hiç değişmez —
 * o ekranın görsel tabanı vardır.
 *
 * BASILMAYAN veri (üst kural gereği SİLİNMEZ, gerekçesiyle devre dışı basılır):
 * GK363'ün "3 fotoğraf" parçası — fotoğraf modülü yok, `SiteDiaryEntryList
 * Item` şemasında sayı taşınmıyor.
 */
export interface DiaryEntryRowBodyProps {
  row: DiaryRecentEntryRow;
  /**
   * DET-1.2 · Kural A yuvaları (yalnız Bölüm Detay listesi doldurur; şantiye
   * "Son Kayıtlar" kartı vermez → BASTIĞI DOM değişmez).
   *   - `extraBadge`: rozet satırının sonuna ("Satırla bağlı");
   *   - `sectionSlot`: meta satırındaki bölüm parçasının YERİNE ("Başlık: …").
   */
  extraBadge?: ReactNode;
  sectionSlot?: ReactNode;
}

export function DiaryEntryRowBody({ row, extraBadge, sectionSlot }: DiaryEntryRowBodyProps) {
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
          {extraBadge}
        </span>
      </span>
      {/* GK363 */}
      <span className="diary-recent__meta">
        {row.workerLabel}
        {" · "}
        {sectionSlot ?? row.sectionLabel ?? (
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
      {/* GK364 — İlerleme görünümünde (İ:313-327) ₺ satırı YOK. */}
      {row.amountLabel !== null && <span className="diary-recent__amount">{row.amountLabel}</span>}
    </>
  );
}
