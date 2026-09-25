import type { DiarySectionOption } from "@/components/site-diary/DiaryBasicInfoCard";
import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";

/**
 * DET-1.1 · Kural A işareti — Bölüm Detay › Günlük Kayıt listesinin SAF türevi.
 *
 * Sunucu (`?section_id=`) iki kolu birlikte döner: başlığı bu bölüm olan gün
 * ∪ bu bölüme miktar satırı yazılmış gün. İkinci koldaki satır mockup'ta
 * (Detay 550-558) "Satırla bağlı" rozeti + "Başlık: {bölüm}" metasıyla ayrılır.
 *
 * 🔴 "bu bölüme N satır" PARÇASI BASILMAZ: liste öğesi
 * (`SiteDiaryEntryListItem`) satır sayısını TAŞIMIYOR (ölçüldü — backend
 * det-1 adc8226). Uydurulmaz; backend eksiği olarak raporlandı.
 */
export interface SectionDiaryRowLinkage {
  /** Günün BAŞLIK bölümünün adı (bu bölüm değil). */
  readonly headerSectionName: string;
}

/** `recent-entries.ts` ile AYNI cümle — başlık bölümü seçilmemiş gün. */
const NO_SECTION_LABEL = "Bölüm seçilmedi";
/** Ad çözülemezse (şantiye listesinde yok) — `DiaryEntryRowBody` yer tutucusuyla aynı. */
const UNKNOWN_SECTION_LABEL = "Bölüm adı yok";

/** Başlığı bu bölüm olan gün için `null` (işaret yok). */
export function sectionDiaryRowLinkage(
  item: Pick<SiteDiaryEntryListItem, "section_id">,
  sectionId: string,
  sections: readonly DiarySectionOption[],
): SectionDiaryRowLinkage | null {
  if (item.section_id === sectionId) return null;
  if (item.section_id === null) return { headerSectionName: NO_SECTION_LABEL };
  const name = sections.find((section) => section.id === item.section_id)?.name;
  return { headerSectionName: name ?? UNKNOWN_SECTION_LABEL };
}
