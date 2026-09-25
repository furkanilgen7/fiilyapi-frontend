import { cx } from "@/lib/cx";
import { formatPf, pfBand, type PfBandKind, type PfBandSettings } from "@/lib/earned-value";

export interface PfBadgeProps {
  value: string | null;
  bands: PfBandSettings;
  kind?: PfBandKind;
  className?: string;
}

/**
 * PF rozeti — İ:230 / İ:250 / İ:486 (`pfc`). Bant `pfBand()` ile GÖSTERİLEN
 * (2 ondalığa yuvarlanmış) değere uygulanır (K18: "0,95" yazıp kırmızı
 * boyamaz); günlük > üst eşik bilgi (mavi) tonudur (K19). Değer yoksa "—".
 */
export function PfBadge({ value, bands, kind = "daily", className }: PfBadgeProps) {
  const band = pfBand(value, bands, kind);
  return <span className={cx("ev-diary-pf", `ev-diary-pf--${band}`, className)}>{formatPf(value)}</span>;
}
