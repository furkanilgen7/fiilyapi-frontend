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
}

export function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="pif-summary__row">
      <span className="pif-summary__label">{label}</span>
      <span
        className={value ? "pif-summary__value pif-summary__value--filled" : "pif-summary__value"}
      >
        {value || SUMMARY_DASH}
      </span>
    </div>
  );
}
