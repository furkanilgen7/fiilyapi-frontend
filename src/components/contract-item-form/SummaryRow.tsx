import { SUMMARY_DASH } from "./constants";
import "./contract-item-form.css";

/**
 * Özet rayının tek satırı (TAŞ 165-167 · İŞV 208-211). İki formda da AYNI
 * yapı çizilmiştir; boş değer mockup'ta `—` olarak durur (gri), dolu değer
 * koyulaşır.
 */
export interface SummaryRowProps {
  label: string;
  value: string;
  /**
   * Değer mono yazı tipiyle mi basılsın. Varsayılan `true`: özet raylarının
   * çoğu değeri mockup'ta `class="mono"` taşır (TAŞ 166-167 · İŞV 209-211).
   * İŞV'nin "Grup" satırı (208) TEK istisnadır — orada mono YOKTUR, çünkü
   * değer bir kod değil serbest metindir ("B — Betonarme").
   */
  mono?: boolean;
}

export function SummaryRow({ label, value, mono = true }: SummaryRowProps) {
  const classNames = ["pif-summary__value"];
  if (!mono) classNames.push("pif-summary__value--text");
  if (value) classNames.push("pif-summary__value--filled");

  return (
    <div className="pif-summary__row">
      <span className="pif-summary__label">{label}</span>
      <span className={classNames.join(" ")}>{value || SUMMARY_DASH}</span>
    </div>
  );
}
