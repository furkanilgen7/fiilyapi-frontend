/**
 * Kart ızgarasının tek satırlık durum metni — İKİ EKRAN da (ŞB, E12) aynı
 * dili konuşsun diye tek kaynak. Boş-durum metni uydurma satır BASMAZ
 * (spec §3): mockup'taki örnek dosyalar VERİDİR, sabit içerik değil.
 */
export function documentGridMessage(options: {
  isLoading: boolean;
  isError: boolean;
  hasQuery: boolean;
  isEmpty: boolean;
}): string | undefined {
  if (options.isLoading) return "Belgeler yükleniyor…";
  if (options.isError) return "Belgeler yüklenemedi.";
  if (!options.isEmpty) return undefined;
  return options.hasQuery ? "Aramanızla eşleşen belge bulunamadı." : "Bu klasörde henüz belge yok.";
}
