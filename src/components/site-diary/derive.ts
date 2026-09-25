import type { BoqListResponse } from "@/lib/api/hooks/useBoq";
import { formatDateDots, TR_WEEKDAYS_LONG } from "@/lib/format";

/**
 * Yerel takvime göre `YYYY-MM-DD`. `toISOString()` KULLANILMAZ — UTC'ye
 * çevirdiği için TR saatinde gece yarısından önce bir GÜN GERİ tarih üretir
 * (kayıt yanlış güne açılırdı).
 */
export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** ISO tarihin yıl/ay bileşenleri — liste sorgusunun `year`/`month` süzmesi. */
export function isoPeriod(iso: string): { year: number; month: number } {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) };
}

/**
 * `YYYY-MM-DD` biçimi VE takvimde GERÇEKTEN var olan bir gün mü?
 * (`2026-02-30` biçimen doğru ama takvimde yoktur — girdi UTC'de kurulup
 * bileşenler GERİ OKUNUR: `Date` taşan günleri SESSİZCE bir sonraki aya
 * kaydırırdı, bu karşılaştırma o kaymayı yakalar.)
 */
export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * PLN-F3.0 · `?tarih=` (`routes.DIARY_DATE_PARAM`) okuma — Günlük Kayıt'ın
 * açık GÜNÜNÜN başlangıç değeri. Eksik/geçersiz/takvimde yok → BUGÜN (adres
 * çürükse ekran sessizce çökmez, en son bilinen iyi hâle düşer —
 * `GeneralSiteDiaryView`in `?site=` için yazdığı "ADRES ile EKRAN ÇELİŞMEZ"
 * ilkesinin aynısı).
 */
export function parseDiaryDateParam(raw: string | null): string {
  if (raw !== null && isValidIsoDate(raw)) return raw;
  return isoDate(new Date());
}

/**
 * `YYYY-MM-DD` → "24.09.2026 Perşembe" (PLN-F2.5e · karar 1, İ:113 başlık alt
 * satırı). Tarih kısmı `formatDateDots` tek kaynağından.
 *
 * Gün adı ISO bileşenlerinden UTC'de kurulan tarihle bulunur (`formatWeekdayShort`
 * ile aynı gerekçe): `new Date(iso)` UTC gece yarısı olarak ayrıştırılıp YEREL
 * gün okunsaydı UTC'nin batısında bir gün GERİ, yerel gece yarısı + UTC günü
 * okunsaydı TR saatinde bir gün geri kayardı. Ayrıştırılamayan girdi aynen döner.
 */
export function formatDiaryDayLabel(iso: string): string {
  const { date, weekday } = diaryDayParts(iso);
  return weekday === "" ? date : `${date} ${weekday}`;
}

/**
 * `formatDiaryDayLabel`in parçaları — başlık tarihi mono, gün adını düz basar
 * (İ:113 `<span JetBrains Mono>24.09.2026</span> Perşembe`).
 */
export function diaryDayParts(iso: string): { date: string; weekday: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match === null) return { date: iso, weekday: "" };
  const utcDay = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).getUTCDay();
  return { date: formatDateDots(iso), weekday: TR_WEEKDAYS_LONG[utcDay] ?? "" };
}

/**
 * Ay gezinmesi (F-SD T4, HÖ90/92 "‹ Temmuz 2026 ›"): dönem `delta` ay kaydırılır.
 * `Date` aritmetiği KULLANILMAZ — yerel saat/DST'ye bağımlı olurdu; `isoDate`in
 * aynı gerekçesi. Aralık→Ocak taşması elle yürütülür.
 */
export function shiftPeriod(
  period: { year: number; month: number },
  delta: number,
): { year: number; month: number } {
  const zeroBased = period.year * 12 + (period.month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

/**
 * `boq_item_id` → sözleşme miktarı. GK220/229 "Kümülatif" sütunu
 * `900 / 1.200` biçimindedir: solu günlük kaydın `cumulative_quantity`si,
 * SAĞI sözleşme (BOQ) miktarıdır. `SiteDiaryLineRead` sözleşme miktarını
 * TAŞIMAZ — bu yüzden şantiyenin BOQ'u ayrıca okunur (GK226'nın "Sözleşme:
 * 1.200 m³" alt satırı da aynı kaynaktan gelir).
 */
export function boqQuantityById(
  boq: BoqListResponse | undefined,
): Record<string, string | null> {
  if (!boq) return {};
  // Maskeli metraj (`finance` kapsamı) `null` taşınır — "0" yazmak
  // günlükte sahte bir kota gösterirdi.
  const map: Record<string, string | null> = {};
  for (const group of boq.groups) {
    for (const item of group.items) {
      map[item.id] = item.quantity;
    }
  }
  return map;
}
