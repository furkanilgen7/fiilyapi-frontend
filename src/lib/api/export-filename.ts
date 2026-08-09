/**
 * Content-Disposition'dan yalnızca güvenli bir dosya adı çıkarır (yol ayracı /
 * kontrol karakteri kabul edilmez); aksi halde çağıranın verdiği varsayılana
 * düşer.
 *
 * `audit-client.ts` içinde özeldi ve varsayılanı `denetim-gunlugu.xlsx`
 * sabitine gömülüydü; BOQ indirmesi ikinci çağıran olunca buraya taşındı ve
 * varsayılan ad parametreye çıkarıldı (spec §8.2, DRY).
 */
export function exportFilename(contentDisposition: string | null, fallbackName: string): string {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  const candidate = match?.[1]?.trim();
  if (!candidate) return fallbackName;
  if (!/^[\w.\- ]+\.xlsx$/i.test(candidate)) return fallbackName;
  return candidate;
}

/**
 * Belge arşivi indirmeleri için dosya adı (F-BC).
 *
 * `exportFilename`den TEK farkı uzantı şartıdır: dışa aktarımlarda uzantı
 * sabittir (`.xlsx`), arşivde ise kullanıcının yüklediği HERHANGİ bir uzantı
 * olabilir (pdf/dwg/zip/jpg…). Güvenlik kısıtı aynı kalır — yol ayracı,
 * kontrol karakteri ve uzantısız ad reddedilir; Türkçe harfler ve boşluk
 * kabul edilir (gerçek dosya adları böyle).
 */
const SAFE_ATTACHMENT_NAME = /^[\p{L}\p{N}._\-() ]+\.[\p{L}\p{N}]{1,12}$/u;

export function attachmentFilename(
  contentDisposition: string | null,
  fallbackName: string,
): string {
  const match = contentDisposition?.match(/filename="?([^";]*)"?/i);
  const candidate = match?.[1]?.trim();
  if (!candidate) return fallbackName;
  if (!SAFE_ATTACHMENT_NAME.test(candidate)) return fallbackName;
  return candidate;
}
