// F-TH T5 · KULLANICI KARARI S2 (bağlayıcı) — backend'de çapraz-modül bir
// kâr ucu YOK. Frontend "Brüt Kar Marjı" KPI'ını İKİ ayrı toplamdan türetir:
//
//   marj% = (işveren brüt toplamı − taşeron brüt toplamı) / işveren brüt toplamı × 100
//
// Bu türetme BİLEREK tek bu saf fonksiyonda yaşar — bileşenlerin içine
// dağıtılmaz, testlidir (brief §Brüt Kar Marjı).
//
// Sınır durumları:
// - işveren toplamı `0` ya da sayıya çevrilemiyorsa → sıfıra bölme olurdu,
//   yüzde BASILMAZ (`null` döner).
// - taşeron toplamı KISMİ/hatalı ise (`isSubcontractorTotalComplete=false`,
//   ör. bazı sözleşme detayları yüklenemedi) → marj BASILMAZ — yanlış bir
//   sayı basmaktansa boş bas (brief §sınır durumları).
export function computeGrossMargin(
  employerGrossTotal: string,
  subcontractorGrossTotal: string,
  isSubcontractorTotalComplete: boolean,
): string | null {
  if (!isSubcontractorTotalComplete) return null;

  const employer = Number(employerGrossTotal);
  if (!Number.isFinite(employer) || employer === 0) return null;

  const subcontractor = Number(subcontractorGrossTotal);
  if (!Number.isFinite(subcontractor)) return null;

  const marginPct = ((employer - subcontractor) / employer) * 100;
  return marginPct.toFixed(2);
}
