/**
 * PLN-F3.3 · KPI kartlarının SAF biçim yardımcıları (Panel:147-183).
 * Metin/karşılaştırma `lib/earned-value` biçimleyicilerinden geçer; `Number`
 * YALNIZ ilerleme çubuğunun CSS genişliği için (SVG'nin koordinat kuralıyla
 * AYNI gerekçe — görsel geometri, iş kararı DEĞİL).
 */
import { compareDecimalStrings } from "@/lib/earned-value";

/** Kazanılmış/Bütçe çubuğunun genişliği (%), 0–100 KIRPILIR. */
export function progressBarWidth(pct: string | null): number {
  if (pct === null) return 0;
  const clampedLow = compareDecimalStrings(pct, "0") < 0 ? "0" : pct;
  const clampedHigh = compareDecimalStrings(clampedLow, "100") > 0 ? "100" : clampedLow;
  return Math.round(Number(clampedHigh));
}
