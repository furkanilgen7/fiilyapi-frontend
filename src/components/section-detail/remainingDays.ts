const MS_PER_DAY = 1000 * 60 * 60 * 24;

// "Kalan Gün" turevi (D91-93, spec §5 T2 brifing) — saf fonksiyon, ag/DOM
// bagimliligi yok, testi burada yasar. `end_date` null ise (bitis tarihi hic
// girilmemis) null doner — bu durumda cagiran taraf durust "—" basar (SiteHeroBar
// RemainingDaysCell deseniyle ayni, yer tutucu DEGIL, gercek eksiklik).
// Saat dilimi kaymalarindan kacinmak icin gun-duzeyinde (saat/dakika/saniye
// sifirlanmis) tarihler arasinda fark alinir; bugunle ayni gunse 0 doner.
export function remainingDays(endDate: string | null, today: Date = new Date()): number | null {
  if (!endDate) return null;

  const end = new Date(`${endDate}T00:00:00`);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const diffMs = startOfEnd.getTime() - startOfToday.getTime();
  return Math.round(diffMs / MS_PER_DAY);
}
