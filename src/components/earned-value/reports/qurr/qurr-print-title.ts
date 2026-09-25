/**
 * PLN-F3.5 · Yazdırma başlığının SAF birleştirici fonksiyonu (LİDER madde 2).
 * Mockup "FİİL Yapı · Güneşkent Konut · A-Blok Şantiyesi" = firma · proje ·
 * şantiye (Q:210); boş parça (alan bilinmiyorsa `""`, `ReportScreenProps`
 * sözleşmesi) atlanır, ayraç yalnız DOLU parçalar arasına girer — iki ayraç
 * üst üste binmez ("· ·" YOK).
 */
export function joinNonEmpty(parts: readonly string[], separator = " · "): string {
  return parts.filter((part) => part.length > 0).join(separator);
}
