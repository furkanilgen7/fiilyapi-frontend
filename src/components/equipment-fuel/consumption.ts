import type { EquipmentNormUnit } from "@/lib/api/hooks/useEquipment";
import type { FuelSummaryRow } from "@/lib/api/hooks/useEquipmentFuelSummary";

/** "—" — türev alan `null` iken basılan tek metin (spec K3). 0 BASILMAZ. */
export const EMPTY_VALUE = "—";

/**
 * `deviation_reason` sunucu damgasının Türkçe karşılığı (MK-1 K16 fail-closed,
 * spec K3). 🔴 `no_distance_data` — `lt_km` normlu ekipmanda (M4'teki
 * Damperli Kamyon) hiçbir ekranda kilometre girilmiyor; sapma HESAPLANMAZ.
 * `Record` ile tutulur ki uç yeni bir gerekçe eklediğinde derleyici burayı
 * göstersin.
 */
const DEVIATION_REASON_TEXT: Record<
  NonNullable<FuelSummaryRow["deviation_reason"]>,
  string
> = {
  no_distance_data: "Kilometre verisi girilmediği için sapma hesaplanamıyor.",
  no_norm_consumption: "Norm tüketim tanımlı değil.",
  no_work_hours: "Çalışma saati kaydı yok.",
};

/** `deviation_pct === null` hücresinin `title` ipucu; gerekçe yoksa genel metin. */
export function deviationReasonText(reason: FuelSummaryRow["deviation_reason"]): string {
  return reason ? DEVIATION_REASON_TEXT[reason] : "Sapma sunucuda hesaplanamadı.";
}

/** Rozet/ton türü. */
export type ConsumptionTone = "success" | "warning" | "danger" | "neutral";

/**
 * 🔴 K2 — ROZET SUNUCUDANDIR. Bu fonksiyon eşik HESAPLAMAZ; yalnız sunucunun
 * `consumption_status` damgasını bir ton adına ÇEVİRİR. MK-1 K17'nin eşiği
 * (`%10`) yalnız backend `consumption.py`de yaşar — burada TEKRARLANMAZ.
 */
export function consumptionTone(status: FuelSummaryRow["consumption_status"]): ConsumptionTone {
  if (status === "normal") return "success";
  if (status === "warning") return "warning";
  if (status === "critical") return "danger";
  return "neutral"; // K3 — status null ⇒ rozet yok/nötr
}

/** `norm_unit` enum'unun Türkçe birim etiketi (M4:52,62 "Lt/saat" · "Lt/km"). */
export function normUnitLabel(unit: EquipmentNormUnit | null | undefined): string {
  if (unit === "lt_km") return "Lt/km";
  if (unit === "lt_hour") return "Lt/saat";
  return "";
}
