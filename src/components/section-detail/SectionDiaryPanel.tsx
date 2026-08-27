import Link from "next/link";

import type { DiarySectionOption } from "@/components/site-diary/DiaryBasicInfoCard";
import { DiaryEntryRowBody } from "@/components/site-diary/DiaryEntryRowBody";
import { buildRecentEntryRows } from "@/components/site-diary/recent-entries";
import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";
import "@/components/site-diary/site-diary.css";

import { partitionSectionDiaryEntries } from "./section-diary";

/**
 * F-BLMSEK · Bölüm Detay › "Günlük Kayıt" sekmesinin GÖVDESİ.
 *
 * 🔴 MOCKUP BU SEKME İÇİN PANEL ÇİZMEZ: `Bölüm Detay.dc.html` 102-104 yalnız
 * sekme DÜĞMELERİNİ çizer, panel çizimi DOSYADA YOKTUR. F-BLMPUAN'ın aynı
 * durumda verdiği kanonik cevap uygulanır — yeni bir görsel dil İCAT EDİLMEZ,
 * şantiye günlüğünün "Son Kayıtlar" satırı (GK360-364) `DiaryEntryRowBody` ile
 * OLDUĞU GİBİ yeniden kullanılır (DRY: listenin ikinci bir kopyası zamanla
 * ayrışırdı).
 *
 * 🔴 SALT OKUNURDUR: satırlar tıklanabilir DEĞİL. "Son Kayıtlar" satırı gün
 * SEÇER; burada seçilecek bir gün formu yok. Yazma/gezinme yolu tektir ve
 * başlıktaki "Şantiye günlüğü →" bağlantısındadır.
 *
 * 🔴 YÜKLEME/HATA dalları AYRI basılır (emsal: `SectionTimesheetPanel`,
 * `SectionBoqCard`). Veri yüklenmemişken boş listeyi basmak kullanıcıya
 * *"bu bölümde hiç günlük tutulmamış"* YALANINI söylerdi.
 */
export interface SectionDiaryPanelProps {
  sectionId: string;
  /** Başlıkta basılır — BOŞ listede bile kartın kendi kapsamını söylemesi için. */
  sectionName: string;
  /** Bölüm adı çözümü için (`site.sections`) — satır alt metnini kurar. */
  sections: readonly DiarySectionOption[];
  /** `GET /sites/{site_id}/diary` HAM listesi; süzgeç burada uygulanır. */
  items: readonly SiteDiaryEntryListItem[];
  isLoading: boolean;
  isError: boolean;
  /** Şantiye günlüğü ekranı — dışarıda kalan kayıtların GÖRÜLEBİLDİĞİ yer. */
  diaryHref: string;
}

export function SectionDiaryPanel({
  sectionId,
  sectionName,
  sections,
  items,
  isLoading,
  isError,
  diaryHref,
}: SectionDiaryPanelProps) {
  if (isError) {
    return <p className="section-detail__message">Günlük kayıtlar yüklenemedi</p>;
  }
  if (isLoading) {
    return <p className="section-detail__message">Yükleniyor…</p>;
  }

  const partition = partitionSectionDiaryEntries(items, sectionId);
  // 🔴 `DIARY_RECENT_ENTRY_LIMIT` (=3) BİLEREK KULLANILMAZ: o kırpma "Son
  // Kayıtlar" KARTININ yüksekliğine aittir (mockup GK359-384 üç satır çizer).
  // Bu sekme bölümün TÜM kayıtlarını basar; sessizce miras alınsaydı dördüncü
  // kayıt gerekçesiz kaybolurdu. Limit AÇIKÇA küme boyu verilir.
  const rows = buildRecentEntryRows(partition.entries, sections, partition.entries.length);
  const excluded = partition.unassignedCount + partition.otherSectionCount;

  return (
    <section className="section-diary" data-testid="section-diary" aria-labelledby="section-diary-title">
      <div className="section-diary__head">
        <h2 className="section-diary__title" id="section-diary-title">
          {sectionName} · Günlük Kayıtlar
        </h2>
        <Link className="section-diary__link" href={diaryHref}>
          Şantiye günlüğü →
        </Link>
      </div>

      {rows.length === 0 ? (
        // 🔴 "Veri YOK" ≠ "modül bu bölüme KIRILMIYOR". Bağ AÇIK; eksik olan
        // kayıttır. `CardEmptyState` + `pendingModule` burada YANLIŞ bilgi olurdu.
        <div className="section-diary__empty">
          <p className="section-diary__empty-title">Bu bölümde günlük kayıt yok</p>
          <p className="section-diary__empty-hint">Bu bölüme atanmış günlük kayıt bulunmuyor</p>
        </div>
      ) : (
        <ul className="section-diary__list diary-recent__list">
          {rows.map((row) => (
            <li key={row.id} className="section-diary__row diary-recent__row">
              <DiaryEntryRowBody row={row} />
            </li>
          ))}
        </ul>
      )}

      {/* 🔴 SESSİZ ATLAMA = İHLAL (F-TH kanonu): süzgecin dışarıda bıraktığı
          kayıtların SAYISI da NEREDE görüldükleri de GÖRÜNÜR basılır — `title`
          içinde saklanmaz. */}
      {excluded > 0 && (
        <p className="section-diary__note" data-testid="section-diary-note">
          {partition.unassignedCount > 0 && (
            <>Bölüme atanmamış {partition.unassignedCount} kayıt bu listede yok</>
          )}
          {partition.unassignedCount > 0 && partition.otherSectionCount > 0 && <> · </>}
          {partition.otherSectionCount > 0 && (
            <>başka bölüme atanmış {partition.otherSectionCount} kayıt bu listede yok</>
          )}
          {" — "}
          <Link className="section-diary__note-link" href={diaryHref}>
            şantiye günlüğünde
          </Link>{" "}
          görünür
        </p>
      )}
    </section>
  );
}
