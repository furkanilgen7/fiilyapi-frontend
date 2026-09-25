import Link from "next/link";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { SiteDiaryEntryDetail } from "@/lib/api/hooks/useSiteDiary";
import { formatDateDots } from "@/lib/format";

import { formatDayMonthDots } from "./derive";

/**
 * DET-1.2 · Günler arası gezinme kutusu — mockup 197-203 (kaynak HÖ:89-93
 * "‹ ay ›" kutusu; glifler yerine SVG ok). Sıra = Bölüm Detay listesinin
 * sırası: `prev_id`/`next_id` sunucuda BÖLÜM bağlamında (`?section_id=`)
 * hesaplanır. Uçta (hâl j) bağlantı YOKTUR: pasif sözcük + `title` açıklaması.
 */
export interface DiaryDetailDayNavProps {
  entry: Pick<
    SiteDiaryEntryDetail,
    "entry_date" | "prev_id" | "prev_entry_date" | "next_id" | "next_entry_date"
  >;
  /** Kayıt kimliği → detay rotası (adres anahtarları çağırandan). */
  entryHref: (entryId: string) => string;
}

interface NeighbourProps {
  id: string | null;
  date: string | null;
  direction: "prev" | "next";
  entryHref: (entryId: string) => string;
}

const NEIGHBOUR_TEXT = {
  prev: { aria: "Önceki kayıt", idle: "Önceki", edge: "Bu bölümde daha eski kayıt yok" },
  next: { aria: "Sonraki kayıt", idle: "Sonraki", edge: "Bu bölümde daha yeni kayıt yok" },
} as const;

function Neighbour({ id, date, direction, entryHref }: NeighbourProps) {
  const text = NEIGHBOUR_TEXT[direction];
  const Arrow = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;
  const arrow = <Arrow className="diary-detail__nav-arrow" />;

  if (id === null) {
    // Hâl (j): tarih yerine sözcük, pasif renk, açıklama `title`da.
    return (
      <span className="diary-detail__nav-edge" aria-disabled="true" title={text.edge}>
        {direction === "prev" && arrow}
        {text.idle}
        {direction === "next" && arrow}
      </span>
    );
  }

  const label = date === null ? text.idle : formatDayMonthDots(date);
  return (
    <Link
      className="diary-detail__nav-link"
      href={entryHref(id)}
      aria-label={date === null ? text.aria : `${text.aria}: ${formatDateDots(date)}`}
    >
      {direction === "prev" && arrow}
      <span className="diary-detail__mono">{label}</span>
      {direction === "next" && arrow}
    </Link>
  );
}

export function DiaryDetailDayNav({ entry, entryHref }: DiaryDetailDayNavProps) {
  return (
    <nav className="diary-detail__nav" aria-label="Günler arası gezinme">
      <Neighbour id={entry.prev_id} date={entry.prev_entry_date} direction="prev" entryHref={entryHref} />
      <span className="diary-detail__nav-sep" aria-hidden="true" />
      <span className="diary-detail__nav-current diary-detail__mono">
        {formatDayMonthDots(entry.entry_date)}
      </span>
      <span className="diary-detail__nav-sep" aria-hidden="true" />
      <Neighbour id={entry.next_id} date={entry.next_entry_date} direction="next" entryHref={entryHref} />
    </nav>
  );
}
