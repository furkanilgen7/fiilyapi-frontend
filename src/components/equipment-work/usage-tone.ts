import type { WorkSummaryRow } from "@/lib/api/hooks/useEquipmentWorkSummary";

/** "—" — türev alan `null` iken basılan tek metin (spec K3). 0 BASILMAZ. */
export const EMPTY_VALUE = "—";

/**
 * `usage_reason` sunucu damgasının Türkçe karşılığı (MK-1 K16 fail-closed).
 * Bugün tek değer var; `Record` şeklinde tutulur ki uç yeni bir gerekçe
 * eklediğinde derleyici burayı göstersin.
 */
const USAGE_REASON_TEXT: Record<
  NonNullable<WorkSummaryRow["usage_reason"]>,
  string
> = {
  no_capacity_hours: "Aylık kapasite saati tanımlı değil — kullanım oranı hesaplanamıyor.",
};

/** `usage_pct === null` hücresinin `title` ipucu; gerekçe yoksa genel metin. */
export function usageReasonText(reason: WorkSummaryRow["usage_reason"]): string {
  return reason ? USAGE_REASON_TEXT[reason] : "Kullanım oranı sunucuda hesaplanamadı.";
}

/** Kullanım yüzdesi hücresinin renk tonu. */
export type UsageTone = "success" | "primary" | "danger" | "warning" | "neutral";

/**
 * 🔴 K2 — YÜZDE SUNUCUNUNDUR. Bu fonksiyon `hours / capacity` HESAPLAMAZ;
 * yalnız sunucunun verdiği `usage_pct`i RENKLENDİRİR. Eşik TEK YERDE (burada)
 * yaşar — F-P10 "rozet sunucu damgasıdır" kanonunun izin verdiği tek istemci
 * işi budur.
 *
 * ⚠️ ONAYLI SAPMA (mockup kendi içinde tutarsız): M3'ün satır renkleri
 * MONOTON DEĞİLDİR — %93 yeşil (131) ama %84 mavi (170), %76 mavi (144) iken
 * %72 YEŞİL (196). Aynı anda hem %72'yi yeşil hem %76'yı mavi yapan bir eşik
 * YOKTUR; mockup'ın renkleri o noktada dekoratiftir. Seçilen eşik altı satırın
 * BEŞİNİ birebir üretir, yalnız %72 mavi olur.
 */
export function usageTone(usagePct: string | null): UsageTone {
  if (usagePct === null) return "neutral"; // K3 — "—", renk iddiası yok
  const value = Number(usagePct);
  if (!Number.isFinite(value)) return "neutral";
  if (value <= 0) return "warning"; // 183 — "%0 — Bakım" amber satırı
  if (value < 25) return "danger"; // 157 — %21 kırmızı
  if (value >= 90) return "success"; // 131 — %93 yeşil
  return "primary"; // 144/170 — %76 · %84 mavi
}

/**
 * Yüzde çubuğunun genişliği (0-100 arası kırpılır, TAM SAYI); `null` ⇒ çubuk yok.
 *
 * 🔴 `Math.round` — F-P8 kanonu (WORKFLOW §4, görsel spec 4. parça). Sunucu
 * `usage_pct`i ondalıklı verebilir (`Numeric`); kesirli genişlik çubuğun sağ
 * kenarını yarım piksele oturtur ve kare turdan tura oynar. `/makine/yakit`ta
 * bu fiilen yaşandı (CI run 31788449253, 244 piksel) — aynı sınıf burada da
 * vardır, fikstürün tam sayı olması yalnız ŞANSTIR.
 */
export function usageBarWidth(usagePct: string | null): number | null {
  if (usagePct === null) return null;
  const value = Number(usagePct);
  if (!Number.isFinite(value)) return null;
  return Math.round(Math.min(100, Math.max(0, value)));
}
