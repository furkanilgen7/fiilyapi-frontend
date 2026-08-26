/**
 * F-MKD · Ekranın DÖNEMİ.
 *
 * 🔴 `new Date()` KULLANILMAZ. "Bu ay" `GET /equipment/{id}/detail` yanıtının
 * `as_of` damgasından türer (SUNUCUNUN TR takvim günü). İstemci saatinden
 * türeseydi:
 *
 * * tarayıcı saat dilimi ay sınırında (31'i 23:30 UTC+3) ekranı BAŞKA bir aya
 *   düşürür ve KPI'lar bakım kartının `as_of`uyla ÇELİŞİRDİ;
 * * görsel kapı her koşuda başka bir kare üretirdi (F-HZ tarih determinizmi
 *   dersi).
 */
export interface DetailPeriod {
  year: number;
  month: number;
}

/** `YYYY-MM-DD` → `{year, month}`. Ayrıştırılamayan girdide `null`. */
export function periodFromIsoDate(iso: string): DetailPeriod | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  if (match === null) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

/**
 * `period`den geriye doğru `count` ay (İLK öğe `period`in KENDİSİ).
 * MD:212-229 üç aylık geçmiş şeridi bunu kullanır.
 */
export function recentPeriods(period: DetailPeriod, count: number): DetailPeriod[] {
  const out: DetailPeriod[] = [];
  for (let back = 0; back < count; back += 1) {
    // Ay indeksi 0 tabanlıdır; `Date.UTC` yıl taşmasını kendisi çözer.
    const shifted = new Date(Date.UTC(period.year, period.month - 1 - back, 1));
    out.push({ year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 });
  }
  return out;
}
