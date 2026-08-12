import { useId } from "react";

import type { StockEntryType } from "@/lib/api/hooks/useStockMutations";

import { STOCK_ENTRY_TYPE_OPTIONS } from "./constants";

interface StockEntryTypeCardsProps {
  value: StockEntryType;
  onChange: (value: StockEntryType) => void;
}

/**
 * Giriş Tipi kartları (SG 50-78). Gerçek radio grubu: radyolar görsel olarak
 * gizli, kart `<label>` — native ok-tuşu gezinmesi korunur, odak halkası karta
 * taşınır (`ProjectTypeCards` deseni, `role` uydurulmaz).
 *
 * ⚠️ Sınıflar `sgf-` önekiyle YERELDİR: proje formunun `pf-type-card`
 * kuralları MAVİ seçili durum çizer (`project-form.css`), SG ise YEŞİL
 * (55: `#16a34a`/`#f0fdf4`). Ortak kabuğa taşıyıp iki tema açmak, proje
 * formunun görsel baseline'larını riske atardı; iki kart görsel olarak AYNI
 * nesne değildir.
 */
export function StockEntryTypeCards({ value, onChange }: StockEntryTypeCardsProps) {
  const groupName = useId();
  return (
    <section className="pf-card">
      {/* 51 */}
      <h2 className="pf-card__title">
        📦 Giriş Tipi
        <span className="pf-card__req" aria-hidden="true">
          *
        </span>
      </h2>
      <div className="sgf-type__grid" role="radiogroup" aria-label="Giriş Tipi">
        {STOCK_ENTRY_TYPE_OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              className={`sgf-type-card${selected ? " sgf-type-card--selected" : ""}`}
              data-testid={`stok-giris-tip-${option.value}`}
            >
              <input
                className="sgf-type-card__input"
                type="radio"
                name={groupName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              <span className="sgf-type-card__emoji" aria-hidden="true">
                {option.emoji}
              </span>
              <span className="sgf-type-card__title">{option.title}</span>
              <span className="sgf-type-card__desc">{option.desc}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
