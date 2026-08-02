import { SECTION_STATUS_LABELS, SECTION_TYPE_LABELS } from "@/lib/section-labels";
import type { SectionStatus, SectionType } from "@/lib/section-labels";

/** Seçicilerin ilk (boş) seçeneği (site-form deseni). */
export const SELECT_PLACEHOLDER = "Seçiniz...";

/**
 * `SectionCreate`/`SectionUpdate`'in metin alanları için sunucu sözleşmesindeki
 * uzunluk sınırları (`openapi/openapi.json` → `components.schemas.SectionCreate`).
 * YALNIZ UZUNLUKTUR (site-form/constants.ts deseni) — biçim doğrulaması yok.
 */
export const SECTION_FIELD_MAX_LENGTH = {
  name: 150,
  code: 50,
} as const satisfies Record<string, number>;

/** Bölüm Tipi seçenekleri — F70 sırasıyla (`section-labels.ts` tek kaynak). */
export const SECTION_TYPE_OPTIONS: readonly { value: SectionType; label: string }[] = (
  Object.keys(SECTION_TYPE_LABELS) as SectionType[]
).map((value) => ({ value, label: SECTION_TYPE_LABELS[value] }));

/** Durum seçenekleri — F71 sırasıyla, `on_hold` DAHİL (`section-labels.ts` tek kaynak). */
export const SECTION_STATUS_OPTIONS: readonly { value: SectionStatus; label: string }[] = (
  Object.keys(SECTION_STATUS_LABELS) as SectionStatus[]
).map((value) => ({ value, label: SECTION_STATUS_LABELS[value] }));
