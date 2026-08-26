import type { EquipmentNormUnit } from "@/lib/api/hooks/useEquipment";
import type { components } from "@/lib/api/schema";

type EquipmentFuelType = components["schemas"]["EquipmentFuelType"];
type EquipmentMaintenancePeriod = components["schemas"]["EquipmentMaintenancePeriod"];
type EquipmentRatePeriod = components["schemas"]["EquipmentRatePeriod"];

/**
 * F-MKD · `Makine - Ekipman Detay.dc.html` sözlüğü.
 *
 * Burada EŞİK/YÜZDE HESAPLAYAN TEK SATIR YOKTUR (F-P10/F-ST kanonu): enum
 * dizelerinin GÖRÜNÜME çevrilmesidir. Türev sayılar sunucudan gelir.
 */

/** Değer basılamıyorken ortak yer tutucu — asla "0" değil (M1 ile aynı). */
export { EQUIPMENT_EMPTY_VALUE } from "@/components/equipment/equipment-labels";

/** MD:145 `Bakım Periyodu` — `500 saat`. `monthly` saat cinsinden DEĞİLDİR. */
export const MAINTENANCE_PERIOD_LABELS: Record<EquipmentMaintenancePeriod, string> = {
  hours_250: "250 saat",
  hours_500: "500 saat",
  hours_1000: "1.000 saat",
  monthly: "Aylık",
};

/** MD:130 `Saatlik Kira Bedeli` başlığı dönemden TÜRER — mockup yalnız
 *  `hourly` hâlini çiziyor, öteki ikisi sunucuda vardır (K21). */
export const RATE_PERIOD_ROW_LABELS: Record<EquipmentRatePeriod, string> = {
  hourly: "Saatlik Kira Bedeli",
  daily: "Günlük Kira Bedeli",
  monthly: "Aylık Kira Bedeli",
};

export const FUEL_TYPE_LABELS: Record<EquipmentFuelType, string> = {
  diesel: "Dizel",
  gasoline: "Benzin",
  electric: "Elektrik",
  none: "Yakıtsız",
};

/** MD:120 `4,2 Lt/saat` — norm biriminin görünen eki. */
export const NORM_UNIT_SUFFIX: Record<EquipmentNormUnit, string> = {
  lt_hour: "Lt/saat",
  lt_km: "Lt/km",
};

/**
 * 🔴 MOCKUP SAPMASI (rapora yazıldı, UYDURULMADI).
 *
 * MD:207 üçüncü sayaç `%97`yi **`Kullanılabilirlik`** diye etiketliyor. Sunucu
 * böyle bir büyüklük ÜRETMEZ: `WorkSummaryRow.usage_pct`
 * (`consumption.compute_usage`) `hours / monthly_capacity_hours × 100`tür,
 * yani KAPASİTE KULLANIMIDIR. Mockup'ın kendi sayıları da bunu söylüyor —
 * arıza saati `0` iken kullanılabilirlik %100 olurdu, %97 değil.
 *
 * Depoda bu alanın YERLEŞİK etiketi zaten "Kullanım"dır
 * (`EquipmentWorkSummaryTable.tsx:69` "Kullanım %",
 * `EquipmentWorkKpiStrip.tsx:66` "Kullanım Oranı"). Aynı sayının iki ekranda
 * iki farklı ADI olamaz; ekran yerleşik adı basar.
 */
export const USAGE_PCT_TILE_LABEL = "Kullanım Oranı";
