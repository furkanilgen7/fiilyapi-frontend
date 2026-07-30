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
