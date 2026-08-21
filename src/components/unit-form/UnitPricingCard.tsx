import { Field, Input, Select } from "@/components/ui";

import {
  EMPTY_METRIC,
  OWNER_SIDE_OPTIONS,
  SALES_STATUS_OPTIONS,
  UNIT_APPRAISAL_HINT,
  UNIT_COST_HINT,
  UNIT_COST_LABEL,
  UNIT_COST_PENDING_REASON,
  UNIT_EXPECTED_PROFIT_FORMULA,
  UNIT_EXPECTED_PROFIT_LABEL,
  UNIT_EXPECTED_PROFIT_PENDING_REASON,
  UNIT_MIN_SALE_PRICE_HINT,
  UNIT_OWNER_SIDE_HINT,
  UNIT_PRICE_PER_M2_HINT,
  UNIT_PRICE_PER_M2_LABEL,
  UNIT_PRICING_CARD_TITLE,
  VAT_RATE_OPTIONS,
  type UnitOwnerSide,
  type UnitSalesStatus,
} from "./constants";
import { deriveUnitPricePerM2 } from "./derive";
import type { UnitFormValues } from "./form-state";

interface UnitPricingCardProps {
  values: UnitFormValues;
  onChangeField: <K extends keyof UnitFormValues>(field: K, value: UnitFormValues[K]) => void;
}

/**
 * "💰 Fiyatlandırma" kartı (UE 85-101, dört sütun) + "Beklenen Kâr" bandı
 * (UE 97-99).
 *
 * 🔴 İKİ PENDING YÜZEY — SİLİNMEZ, DEVRE DIŞI + GÖRÜNÜR GEREKÇE:
 *
 * 1. UE 91 "Maliyet (₺)" — KARAR 3: sunucuda maliyet SÜTUNU YOKTUR
 *    (`units/models.py`: *"Maliyet sutunu ACILMAZ"*); maliyet proje bütçe
 *    dağılımından hesaplanır ve `MetricPlaceholder` olarak döner. Kutu
 *    salt-okunur basılır ve `form-state.ts`te KARŞILIĞI OLMADIĞI için gövdeye
 *    sızması YAPISAL OLARAK İMKÂNSIZDIR.
 * 2. UE 97-99 "Beklenen Kâr" — girdisi maliyettir, maliyet yoktur ⇒ istemcide
 *    HESAPLANAMAZ. Mockup'ın "₺500.000 · %33,8 marj" satırı O ANKİ örnek
 *    veriden gelir; basmak uydurma bir kâr göstermek olurdu (`SalePriceCard`
 *    emsali: maliyet zarfı boşken "—", istemci maliyet UYDURMAZ).
 *
 * ⚠️ UE 89 "m² Birim Fiyat" SALT-OKUNUR TÜREVDİR ve sunucunun
 * `unit_price_per_m2` computed field'ıyla BİREBİR aynı kuralı kullanır (iki
 * ondalık, ROUND_HALF_UP, taban BRÜT m²).
 *
 * ⚠️ UE 94 "Durum" dokunma kapısına GİRMEZ: üretilmiş tipte anahtar
 * zorunludur, atlanamaz.
 */
export function UnitPricingCard({ values, onChangeField }: UnitPricingCardProps) {
  const pricePerM2 = deriveUnitPricePerM2(values);

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">💰 {UNIT_PRICING_CARD_TITLE}</h2>

      <div className="pf-grid pf-grid--4">
        {/* 88 */}
        <Field label="Liste Fiyatı (₺)" required>
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="decimal"
              data-testid="unite-form-liste-fiyat"
              value={values.listPrice}
              onChange={(event) => onChangeField("listPrice", event.target.value)}
            />
          )}
        </Field>

        {/* 89 — salt-okunur türev (sunucu pariteli) */}
        <Field label={UNIT_PRICE_PER_M2_LABEL} hint={UNIT_PRICE_PER_M2_HINT}>
          {(control) => (
            <Input
              {...control}
              className="uf-num ue-derived"
              data-testid="unite-form-m2-fiyat"
              readOnly
              value={pricePerM2.text}
              onChange={() => undefined}
            />
          )}
        </Field>

        {/* 90 */}
        <Field label="Rayiç Değer (₺)" hint={UNIT_APPRAISAL_HINT}>
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="decimal"
              data-testid="unite-form-rayic"
              value={values.appraisalValue}
              onChange={(event) => onChangeField("appraisalValue", event.target.value)}
            />
          )}
        </Field>

        {/* 91 — 🔴 PENDING: sunucuda maliyet sütunu YOK (KARAR 3) */}
        <Field label={UNIT_COST_LABEL} hint={UNIT_COST_HINT}>
          {(control) => (
            <>
              <Input
                {...control}
                className="uf-num ue-derived"
                data-testid="unite-form-maliyet"
                disabled
                readOnly
                title={UNIT_COST_PENDING_REASON}
                value={EMPTY_METRIC}
                onChange={() => undefined}
              />
              <span className="uf-pending-reason" data-testid="unite-form-maliyet-gerekce">
                {UNIT_COST_PENDING_REASON}
              </span>
            </>
          )}
        </Field>

        {/* 92 — KARAR 2: `min_sale_price <= list_price` HİÇBİR katmanda
            zorlanmaz; istemci de zorlamaz, yalnız bilgi basar. */}
        <Field label="Min. Satış Fiyatı (₺)" hint={UNIT_MIN_SALE_PRICE_HINT}>
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="decimal"
              data-testid="unite-form-min-satis"
              value={values.minSalePrice}
              onChange={(event) => onChangeField("minSalePrice", event.target.value)}
            />
          )}
        </Field>

        {/* 93 — küme KODDA sabit: {1, 10, 20} (karar 9); dokunma kapısı */}
        <Field label="KDV Oranı">
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-kdv"
              value={values.vatRate}
              onChange={(event) => onChangeField("vatRate", event.target.value)}
            >
              {VAT_RATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 94 — üretilmiş tipte ZORUNLU: kapıya girmez */}
        <Field label="Durum" required>
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-durum"
              value={values.salesStatus}
              onChange={(event) =>
                onChangeField("salesStatus", event.target.value as UnitSalesStatus)
              }
            >
              {SALES_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 95 — dokunma kapısı */}
        <Field label="Sahiplik" hint={UNIT_OWNER_SIDE_HINT}>
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-sahiplik"
              value={values.ownerSide}
              onChange={(event) =>
                onChangeField("ownerSide", event.target.value as UnitOwnerSide)
              }
            >
              {OWNER_SIDE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {/* 97-99 — 🔴 PENDING: sayı UYDURULMAZ, bant yerinde gerekçesiyle durur */}
      <div className="ue-profit" data-testid="unite-form-kar">
        <div>
          <div className="ue-profit__label">{UNIT_EXPECTED_PROFIT_LABEL}</div>
          <div className="ue-profit__formula">{UNIT_EXPECTED_PROFIT_FORMULA}</div>
        </div>
        <div>
          <div className="ue-profit__value">{EMPTY_METRIC}</div>
          <div className="ue-profit__reason" data-testid="unite-form-kar-gerekce">
            {UNIT_EXPECTED_PROFIT_PENDING_REASON}
          </div>
        </div>
      </div>
    </section>
  );
}
