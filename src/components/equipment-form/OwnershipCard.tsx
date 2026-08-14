import { useId } from "react";

import { OWNERSHIP_CARD_TITLE, OWNERSHIP_OPTIONS } from "./constants";
import type { EquipmentFormValues } from "./form-state";

interface OwnershipCardProps {
  value: EquipmentFormValues["ownership"];
  onChange: (value: EquipmentFormValues["ownership"]) => void;
}

/**
 * 🏗 Sahiplik Tipi (mockup satır 50-70) — iki büyük seçim kartı.
 *
 * `StockEntryTypeCards` (SG 50-78) deseniyle AYNI: radyolar görsel olarak
 * gizli, kart `<label>`dır — native ok-tuşu gezinmesi korunur, odak halkası
 * karta taşınır. Sınıflar `eqf-` önekiyle YERELDİR (M2 seçili durumu YEŞİL
 * çizer, satır 55; proje formunun mavi kartı ortak kabukta kalır).
 *
 * Bu alan **K8'in anahtarıdır**: `owned` seçiliyken "Alış Bedeli" zorunlu
 * olur, `rented`ta düşer (`validate.ts` + mockup'ın `*` işareti).
 */
export function OwnershipCard({ value, onChange }: OwnershipCardProps) {
  const groupName = useId();
  return (
    <section className="pf-card">
      {/* 51 */}
      <h2 className="pf-card__title">
        {OWNERSHIP_CARD_TITLE}
        <span className="pf-card__req" aria-hidden="true">
          *
        </span>
      </h2>

      {/* 52 — iki eşit sütun, 12px boşluk */}
      <div className="eqf-own__grid" role="radiogroup" aria-label="Sahiplik Tipi">
        {OWNERSHIP_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={`eqf-own-card${selected ? " eqf-own-card--selected" : ""}`}
              data-testid={`makine-sahiplik-${option.value}`}
            >
              <input
                className="eqf-own-card__input"
                type="radio"
                name={groupName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              {/* 56 / 64 */}
              <span className="eqf-own-card__emoji" aria-hidden="true">
                {option.emoji}
              </span>
              {/* 57 / 65 */}
              <span className="eqf-own-card__title">{option.title}</span>
              {/* 58 / 66 */}
              <span className="eqf-own-card__desc">{option.description}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
