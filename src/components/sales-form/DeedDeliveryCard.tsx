import { Checkbox, Field, Input, Select } from "@/components/ui";

import {
  CONDOMINIUM_LABEL,
  DEED_CONDITION_OPTIONS,
  LATE_FEE_LABEL,
  MORTGAGE_LABEL,
} from "./constants";
import type { SaleFormValues } from "./form-state";

interface DeedDeliveryCardProps {
  values: SaleFormValues;
  onChangeField: <K extends keyof SaleFormValues>(field: K, value: SaleFormValues[K]) => void;
  locked: boolean;
}

/**
 * "Tapu & Teslim" kartı (DS 152-165).
 *
 * ⚠️ Kat irtifakı (161) → `has_condominium_easement`, İpotek (162) →
 * `has_mortgage`: ikisi de gövdede DAİMA bulunur (üretilmiş tip; `build-body.ts`).
 * "Gecikme faizi" (163) BİLGİ alanıdır — işaretliyse `late_fee_monthly_pct`
 * gönderilir ama plan tutarını ŞİŞİRMEZ (P8 kararı).
 */
export function DeedDeliveryCard({ values, onChangeField, locked }: DeedDeliveryCardProps) {
  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📜 Tapu &amp; Teslim</h2>

      <div className="pf-grid pf-grid--3">
        {/* 156 */}
        <Field label="Tapu Devir Koşulu">
          {(control) => (
            <Select
              {...control}
              data-testid="satis-form-tapu-kosul"
              disabled={locked}
              value={values.deedCondition}
              onChange={(event) =>
                onChangeField("deedCondition", event.target.value as SaleFormValues["deedCondition"])
              }
            >
              {DEED_CONDITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 157 */}
        <Field label="Planlanan Tapu Tarihi">
          {(control) => (
            <Input
              {...control}
              type="date"
              data-testid="satis-form-tapu-tarih"
              readOnly={locked}
              value={values.plannedDeedDate}
              onChange={(event) => onChangeField("plannedDeedDate", event.target.value)}
            />
          )}
        </Field>

        {/* 158 */}
        <Field label="Teslim Tarihi" hint="Anahtar teslim">
          {(control) => (
            <Input
              {...control}
              type="date"
              data-testid="satis-form-teslim-tarih"
              readOnly={locked}
              value={values.deliveryDate}
              onChange={(event) => onChangeField("deliveryDate", event.target.value)}
            />
          )}
        </Field>
      </div>

      {/* 160-164 */}
      <div className="sf-checks">
        <Checkbox
          label={CONDOMINIUM_LABEL}
          data-testid="satis-form-kat-irtifaki"
          disabled={locked}
          checked={values.hasCondominiumEasement}
          onChange={(event) => onChangeField("hasCondominiumEasement", event.target.checked)}
        />
        <Checkbox
          label={MORTGAGE_LABEL}
          data-testid="satis-form-ipotek"
          disabled={locked}
          checked={values.hasMortgage}
          onChange={(event) => onChangeField("hasMortgage", event.target.checked)}
        />
        <Checkbox
          label={LATE_FEE_LABEL}
          data-testid="satis-form-gecikme-faizi"
          disabled={locked}
          checked={values.lateFeeEnabled}
          onChange={(event) => onChangeField("lateFeeEnabled", event.target.checked)}
        />
      </div>
    </section>
  );
}
