import type { DiarySectionOption } from "@/components/site-diary/DiaryBasicInfoCard";
import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";

/**
 * DET-1.1 · Kural A işareti — Bölüm Detay › Günlük Kayıt listesinin SAF türevi.
 *
 * Sunucu (`?section_id=`) iki kolu birlikte döner: başlığı bu bölüm olan gün
 * ∪ bu bölüme miktar satırı yazılmış gün. İkinci koldaki satır mockup'ta
 * (Detay 550-558) "Satırla bağlı" rozeti + "Başlık: {bölüm}" metasıyla ayrılır.
 *
 * Başlık adı ve "bu bölüme N satır" sayısı SUNUCUDAN gelir (backend#130 —
 * liste öğesi `section_name` + `section_line_count`, `?section_id=` bağlamında).
 * Sayı `null` ise (süzgeçsiz liste) "N satır" parçası UYDURULMAZ.
 */
export interface SectionDiaryRowLinkage {
  /** Günün BAŞLIK bölümünün adı (bu bölüm değil). */
  readonly headerSectionName: string;
  /** Bu bölüme düşen miktar satırı sayısı; bilinmiyorsa `null`. */
  readonly lineCount: number | null;
}

/** `recent-entries.ts` ile AYNI cümle — başlık bölümü seçilmemiş gün. */
const NO_SECTION_LABEL = "Bölüm seçilmedi";
/** Ad çözülemezse (şantiye listesinde yok) — `DiaryEntryRowBody` yer tutucusuyla aynı. */
const UNKNOWN_SECTION_LABEL = "Bölüm adı yok";

/** Başlığı bu bölüm olan gün için `null` (işaret yok). */
export function sectionDiaryRowLinkage(
  item: Pick<SiteDiaryEntryListItem, "section_id" | "section_name" | "section_line_count">,
  sectionId: string,
  sections: readonly DiarySectionOption[],
): SectionDiaryRowLinkage | null {
  if (item.section_id === sectionId) return null;
  const lineCount = item.section_line_count;
  if (item.section_id === null) return { headerSectionName: NO_SECTION_LABEL, lineCount };
  // Sunucunun ANLIK adı öncelikli; eski yanıtta yoksa şantiye bölümlerinden çözülür.
  const name = item.section_name ?? sections.find((section) => section.id === item.section_id)?.name;
  return { headerSectionName: name ?? UNKNOWN_SECTION_LABEL, lineCount };
}

/** Mockup Detay 571 — "Başlık: Kat 1–5 · bu bölüme 2 satır"; sayı yoksa yalnız başlık. */
export function sectionDiaryLinkageMeta(linkage: SectionDiaryRowLinkage): string {
  const head = `Başlık: ${linkage.headerSectionName}`;
  return linkage.lineCount === null ? head : `${head} · bu bölüme ${linkage.lineCount} satır`;
}
