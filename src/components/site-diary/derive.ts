import type { BoqListResponse } from "@/lib/api/hooks/useBoq";

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
 * `boq_item_id` → sözleşme miktarı. GK220/229 "Kümülatif" sütunu
 * `900 / 1.200` biçimindedir: solu günlük kaydın `cumulative_quantity`si,
 * SAĞI sözleşme (BOQ) miktarıdır. `SiteDiaryLineRead` sözleşme miktarını
 * TAŞIMAZ — bu yüzden şantiyenin BOQ'u ayrıca okunur (GK226'nın "Sözleşme:
 * 1.200 m³" alt satırı da aynı kaynaktan gelir).
 */
export function boqQuantityById(boq: BoqListResponse | undefined): Record<string, string> {
  if (!boq) return {};
  const map: Record<string, string> = {};
  for (const group of boq.groups) {
    for (const item of group.items) {
      map[item.id] = item.quantity;
    }
  }
  return map;
}
