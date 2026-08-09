import type { BadgeVariant } from "@/components/ui/badge/Badge";

/**
 * TL 57/67/77/87/97 · kategori rozetinin RENK HARİTASI.
 *
 * `SubcontractorResponse.category` SERBEST METİNDİR (openapi: `string`,
 * `maxLength: 100`) — sabit bir enum yoktur. Mockup'ın kendi içindeki seçenek
 * tutarsızlığı (30'daki süzgeç "Betonarme / Elektrik / Tesisat" derken tabloda
 * "Mekanik / Doğrama / Sıhhi" satırları var) TARİH ARTEFAKTIDIR; süzgecin
 * seçenekleri gerçek veriden üretilir, renkler ise burada eşlenir.
 *
 * Haritada OLMAYAN kategori NÖTR tona düşer — renk İCAT EDİLMEZ.
 * Tüm tonlar token'lıdır (çıplak hex yasak); mor `Badge` primitive'inde
 * varyant olarak yoktur, `tl-badge--purple` sınıfı `--color-accent-purple*`
 * token çiftini kullanır.
 */
export type CategoryTone = "primary" | "warning" | "purple" | "success" | "neutral";

const CATEGORY_TONES: Record<string, CategoryTone> = {
  // 57 · #dbeafe / #2563eb → --color-primary-soft / --color-primary
  betonarme: "primary",
  // 67 · #fef3c7 / #d97706 → --color-warning-soft / --color-warning-strong
  elektrik: "warning",
  // 77 · #ede9fe / #7c3aed → --color-accent-purple-soft / --color-accent-purple
  mekanik: "purple",
  // 87 · #f0fdf4 / #16a34a → --color-success-tint / --color-success
  doğrama: "success",
  // 97 · mockup'ta "Sıhhi" 77 ile AYNI mor tonu taşır.
  sıhhi: "purple",
};

export function categoryTone(category: string | null | undefined): CategoryTone {
  const key = (category ?? "").trim().toLocaleLowerCase("tr");
  return CATEGORY_TONES[key] ?? "neutral";
}

/** Mor `Badge` varyantı olmadığı için taban nötr alınır, sınıf üzerine biner. */
export function categoryBadgeVariant(tone: CategoryTone): BadgeVariant {
  return tone === "purple" ? "neutral" : tone;
}
