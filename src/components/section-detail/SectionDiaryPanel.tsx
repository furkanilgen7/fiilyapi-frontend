import Link from "next/link";

import type { DiarySectionOption } from "@/components/site-diary/DiaryBasicInfoCard";
import { DiaryEntryRowBody } from "@/components/site-diary/DiaryEntryRowBody";
import { buildRecentEntryRows } from "@/components/site-diary/recent-entries";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";
import { formatDateDots } from "@/lib/format";
import { buildListTruncation, listTruncationMessage } from "@/lib/list-truncation";
import "@/components/site-diary/site-diary.css";

import { sectionDiaryRowLinkage } from "./section-diary-linkage";

/**
 * F-BLMSEK · Bölüm Detay › "Günlük Kayıt" sekmesinin GÖVDESİ.
 *
 * 🔴 MOCKUP: `Bölüm Detay.dc.html` bu panel için çizim TAŞIMAZ; satır içeriği
 * şantiye günlüğünün "Son Kayıtlar" satırıdır (GK360-364, `DiaryEntryRowBody`
 * OLDUĞU GİBİ yeniden kullanılır — DRY). DET-1.2'den beri satırın KABUĞU
 * `Şantiye - Günlük Kayıt Detay (Salt Okunur).dc.html` 498-561'dir: satırın
 * TAMAMI detay sayfasına tek bağlantı, sağda dekoratif ok, hover/odak (içe
 * halka) o mockup'tan.
 *
 * 🔴 DET-1.1 · SÜZGEÇ SUNUCUDA: `items` `GET /sites/{id}/diary?section_id=`
 * yanıtıdır (Kural A: başlığı bu bölüm ∪ bu bölüme miktar satırı yazılmış
 * gün). Panel İKİNCİ KEZ SÜZMEZ — süzseydi satır kolu sessizce kaybolurdu.
 * Başlığı başka bölüm olan gün "Satırla bağlı" rozetiyle işaretlenir.
 *
 * 🔴 YÜKLEME/HATA dalları AYRI basılır; KABUK (başlık + "Şantiye günlüğü →")
 * her dalda KORUNUR (Kayıt 259).
 */
export interface SectionDiaryPanelProps {
  sectionId: string;
  /** Başlıkta basılır — BOŞ listede bile kartın kendi kapsamını söylemesi için. */
  sectionName: string;
  /** Bölüm adı çözümü için (`site.sections`) — satır alt metnini kurar. */
  sections: readonly DiarySectionOption[];
  /** `GET /sites/{site_id}/diary?section_id=` yanıtı — sunucuda süzülmüş. */
  items: readonly SiteDiaryEntryListItem[];
  /** Sunucunun bildirdiği toplam; listeden büyükse kırpılma GÖRÜNÜR basılır. */
  total?: number;
  isLoading: boolean;
  isError: boolean;
  /** Şantiye günlüğü ekranı — tüm günlerin görüldüğü yer. */
  diaryHref: string;
  /** DET-1.2 · kayıt kimliği → salt okunur detay rotası. */
  entryHref: (entryId: string) => string;
}

export function SectionDiaryPanel({
  sectionName,
  diaryHref,
  ...body
}: SectionDiaryPanelProps) {
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
      <SectionDiaryBody diaryHref={diaryHref} {...body} />
    </section>
  );
}

function SectionDiaryBody({
  sectionId,
  sections,
  items,
  total,
  isLoading,
  isError,
  diaryHref,
  entryHref,
}: Omit<SectionDiaryPanelProps, "sectionName">) {
  if (isError) {
    return (
      <p className="section-detail__message" data-testid="section-diary-error">
        Günlük kayıtlar yüklenemedi
      </p>
    );
  }
  if (isLoading) {
    return <p className="section-detail__message">Yükleniyor…</p>;
  }

  // 🔴 `DIARY_RECENT_ENTRY_LIMIT` (=3) BİLEREK KULLANILMAZ: o kırpma "Son
  // Kayıtlar" KARTININ yüksekliğine aittir. Bu sekme gelen TÜM kayıtları basar.
  const rows = buildRecentEntryRows(items, sections, items.length);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const truncation = buildListTruncation(items.length, total);

  return (
    <>
      {rows.length === 0 ? (
        <div className="section-diary__empty">
          <p className="section-diary__empty-title">Bu bölümde günlük kayıt yok</p>
          <p className="section-diary__empty-hint">Bu bölüme atanmış günlük kayıt bulunmuyor</p>
        </div>
      ) : (
        <ul className="section-diary__list">
          {rows.map((row) => {
            const item = itemById.get(row.id);
            const linkage = item === undefined ? null : sectionDiaryRowLinkage(item, sectionId, sections);
            const accessibleName =
              `${formatDateDots(row.entryDate)} günlük kaydını görüntüle · ${row.statusLabel}` +
              (linkage === null ? "" : ` — başlık bölümü ${linkage.headerSectionName}`);
            return (
              <li key={row.id} className="section-diary__row">
                <Link className="section-diary__entry-link" href={entryHref(row.id)} aria-label={accessibleName}>
                  <span className="section-diary__entry-body">
                    <DiaryEntryRowBody
                      row={row}
                      extraBadge={
                        linkage === null ? undefined : (
                          <span
                            className="diary-recent__badge section-diary__linkage-badge"
                            title={`Başlık bölümü ${linkage.headerSectionName}; bu bölüme miktar satırı yazılmış`}
                          >
                            Satırla bağlı
                          </span>
                        )
                      }
                      sectionSlot={linkage === null ? undefined : `Başlık: ${linkage.headerSectionName}`}
                    />
                  </span>
                  <ChevronRightIcon className="section-diary__entry-arrow" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* 🔴 SESSİZ KIRPMA = İHLAL (TB3/F-TH): sunucu toplamı listeden büyükse
          görünür basılır; tamamı şantiye günlüğündedir. */}
      {truncation.isTruncated && (
        <p className="section-diary__note" data-testid="section-diary-note">
          {listTruncationMessage(truncation)}{" "}
          <Link className="section-diary__note-link" href={diaryHref}>
            Şantiye günlüğünde
          </Link>{" "}
          tümü görünür
        </p>
      )}
    </>
  );
}
