import { useId } from "react";

import { Checkbox, Field, Input } from "@/components/ui";
import { SITE_FACILITIES, STORAGE_FACILITIES, type FacilityItem } from "./facility-items";
import type { FacilityKey, SiteFormValues } from "./form-state";

export interface FacilitiesCardProps {
  values: SiteFormValues;
  onChange: <K extends keyof SiteFormValues>(field: K, value: SiteFormValues[K]) => void;
}

interface FacilityGroupProps {
  label: string;
  items: readonly FacilityItem[];
  values: SiteFormValues["facilities"];
  onToggle: (key: FacilityKey, checked: boolean) => void;
}

/**
 * Kutucuk grubu (mockup satır 151–156). Grup etiketi bir `<label>` değil bir
 * başlıktır: tek bir kontrolü değil bir kümeyi adlandırır, bu yüzden
 * `role="group"` + `aria-labelledby` kullanılır.
 */
function FacilityGroup({ label, items, values, onToggle }: FacilityGroupProps) {
  const labelId = useId();
  return (
    <div>
      <span className="field__label facilities__group-label" id={labelId}>
        {label}
      </span>
      <div className="facilities__list" role="group" aria-labelledby={labelId}>
        {items.map((item) => (
          <Checkbox
            key={item.key}
            label={item.label}
            checked={values[item.key]}
            onChange={(e) => onToggle(item.key, e.target.checked)}
          />
        ))}
      </div>
    </div>
  );
}

/** 📦 Depo & Şantiye Altyapısı kartı (mockup satır 147–174, spec §4.5, §7). */
export function FacilitiesCard({ values, onChange }: FacilitiesCardProps) {
  // Sayaç, rozet, çip ve arama YOKTUR (spec §7) — düz kutucuk listesi.
  function toggle(key: FacilityKey, checked: boolean) {
    onChange("facilities", { ...values.facilities, [key]: checked });
  }

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📦 Depo &amp; Şantiye Altyapısı</h2>

      <div className="pf-grid pf-grid--2 facilities__groups">
        <FacilityGroup
          label="Depo Alanları"
          items={STORAGE_FACILITIES}
          values={values.facilities}
          onToggle={toggle}
        />
        <FacilityGroup
          label="Şantiye Tesisleri"
          items={SITE_FACILITIES}
          values={values.facilities}
          onToggle={toggle}
        />
      </div>

      <div className="pf-grid pf-grid--3">
        <Field label="Elektrik Aboneliği">
          {(control) => (
            <Input
              {...control}
              type="text"
              numeric
              value={values.electricitySubscriptionNo}
              placeholder="Abone no"
              onChange={(e) => onChange("electricitySubscriptionNo", e.target.value)}
            />
          )}
        </Field>

        <Field label="Su Aboneliği">
          {(control) => (
            <Input
              {...control}
              type="text"
              numeric
              value={values.waterSubscriptionNo}
              placeholder="Abone no"
              onChange={(e) => onChange("waterSubscriptionNo", e.target.value)}
            />
          )}
        </Field>

        <Field label="Planlanan İşçi Sayısı">
          {(control) => (
            <Input
              {...control}
              type="number"
              numeric
              value={values.plannedWorkerCount}
              placeholder="48"
              onChange={(e) => onChange("plannedWorkerCount", e.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}
