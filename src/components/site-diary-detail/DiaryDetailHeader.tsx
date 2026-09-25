import Link from "next/link";

import { DIARY_STATUS_LABELS } from "@/components/site-diary/diary-labels";
import { diaryDayParts } from "@/components/site-diary/derive";
import { ArrowRightIcon, PadlockIcon, inlineSymbolProps } from "@/components/ui/icons";
import type { SiteDiaryEntryDetail } from "@/lib/api/hooks/useSiteDiary";

import { DiaryDetailDayNav } from "./DiaryDetailDayNav";
import {
  diaryDetailAuthor,
  diaryDetailLinkage,
  diaryDetailLock,
  type DiaryDetailLinkage,
  type DiaryDetailSection,
} from "./derive";

/**
 * DET-1.2 · Günlük kayıt detayı BAŞLIK KARTI — mockup 180-236 (kaynak D:54-96
 * bölüm başlık kartı + İ:112 tarih/gün adı + HÖ:89-93 gezinme kutusu).
 *
 * Bu alt görevde KPI ızgarası (D:69-95 uyarlaması) YOKTUR: değerleri EV
 * günü + satır toplamlarından gelir ve DET-1.3'te adaptörle eklenir.
 * Kilit bandı (hâl c) kartın HEMEN ALTINDA, tam genişliktir.
 */
export interface DiaryDetailHeaderProps {
  entry: SiteDiaryEntryDetail;
  /** Açık bölüm; bilinmiyorsa (bölüm okunamadı) Kural A iddiası kurulmaz. */
  currentSection: DiaryDetailSection | undefined;
  /** Kayıt kimliği → detay rotası (önceki/sonraki). */
  entryHref: (entryId: string) => string;
  /** "Günlük kayıtta aç →" hedefi; YALNIZ yazabilen + kilitsiz günde verilir. */
  openHref: string | undefined;
}

function MetaLine({ entry, linkage }: { entry: SiteDiaryEntryDetail; linkage: DiaryDetailLinkage }) {
  const place = [entry.site_name, entry.project_name].filter((part) => part.length > 0).join(" · ");
  if (linkage.kind === "lines") {
    // Liste-(b) kartı: "Başlık bölümü: <b>…</b> · bu bölüme (…) N miktar satırı".
    return (
      <div className="diary-detail__meta" data-testid="diary-detail-meta">
        Başlık bölümü: <b className="diary-detail__meta-strong">{linkage.headerSectionName}</b>
        {` · bu bölüme (${linkage.currentSectionName}) ${linkage.lineCount} miktar satırı`}
        {place.length > 0 && ` · ${place}`}
      </div>
    );
  }
  const parts = [entry.section_name ?? "", place].filter((part) => part.length > 0);
  return (
    <div className="diary-detail__meta" data-testid="diary-detail-meta">
      {parts.join(" · ")}
    </div>
  );
}

function AuthorLine({ entry }: { entry: SiteDiaryEntryDetail }) {
  const author = diaryDetailAuthor(entry);
  return (
    <div className="diary-detail__author" data-testid="diary-detail-author">
      Oluşturan: <b className="diary-detail__author-name">{author.createdBy}</b>
      {" · "}
      <span className="diary-detail__mono">{author.createdAt}</span>
      {author.submitted === null ? (
        " · Henüz gönderilmedi"
      ) : (
        <>
          {" · Gönderen: "}
          <b className="diary-detail__author-name">{author.submitted.by}</b>
          {author.submitted.at !== null && (
            <>
              {" · "}
              <span className="diary-detail__mono">{author.submitted.at}</span>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function DiaryDetailHeader({ entry, currentSection, entryHref, openHref }: DiaryDetailHeaderProps) {
  const { date, weekday } = diaryDayParts(entry.entry_date);
  const isSubmitted = entry.status === "submitted";
  const linkage = diaryDetailLinkage(entry, currentSection);
  const lock = diaryDetailLock(entry);

  return (
    <>
      <section className="diary-detail__head" aria-labelledby="diary-detail-title">
        <div className="diary-detail__head-main">
          <div className="diary-detail__pills">
            <span className="diary-detail__pill diary-detail__pill--kind">GÜNLÜK KAYIT</span>
            {/* S1 — taslak AMBER (İ:316), gönderildi yeşil (GK:362). */}
            <span
              className={
                isSubmitted
                  ? "diary-detail__pill diary-detail__pill--submitted"
                  : "diary-detail__pill diary-detail__pill--draft"
              }
            >
              {DIARY_STATUS_LABELS[entry.status]}
            </span>
            {lock !== null && (
              <span className="diary-detail__pill diary-detail__pill--lock">
                <PadlockIcon width={11} height={11} />
                {lock.pillLabel}
              </span>
            )}
            {linkage.kind === "lines" && (
              <span className="diary-detail__pill diary-detail__pill--neutral">Satırla bağlı</span>
            )}
          </div>
          <h1 className="diary-detail__title" id="diary-detail-title">
            <span className="diary-detail__date">{date}</span>
            {weekday !== "" && ` ${weekday}`}
          </h1>
          <MetaLine entry={entry} linkage={linkage} />
          <AuthorLine entry={entry} />
        </div>
        <div className="diary-detail__actions">
          <DiaryDetailDayNav entry={entry} entryHref={entryHref} />
          {openHref !== undefined && (
            <Link className="diary-detail__open" href={openHref}>
              Günlük kayıtta aç
              <ArrowRightIcon {...inlineSymbolProps} />
            </Link>
          )}
        </div>
      </section>
      {lock !== null && (
        <div className="diary-detail__lock-band" data-testid="diary-detail-lock-band">
          <PadlockIcon className="diary-detail__lock-icon" />
          <span>
            <b>{lock.bandTitle}</b> Kayıt değiştirilemez.
          </span>
        </div>
      )}
    </>
  );
}
