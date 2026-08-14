import { Field, Input, Select } from "@/components/ui";

import {
  BRAND_LABEL,
  BRAND_MODEL_SPLIT_NOTE,
  CATEGORY_OPTIONS,
  INFO_CARD_TITLE,
  MODEL_LABEL,
  PHOTO_LABEL,
  PHOTO_PENDING_REASON,
  SELECT_PLACEHOLDER,
} from "./constants";
import type { EquipmentFormValues } from "./form-state";
import type { EquipmentFormErrors } from "./validate";

interface EquipmentInfoCardProps {
  values: EquipmentFormValues;
  onChange: <K extends keyof EquipmentFormValues>(
    field: K,
    value: EquipmentFormValues[K],
  ) => void;
  errors?: EquipmentFormErrors;
}

/** Fotoğraf yükleme yer tutucusu (mockup 77-81) — `<input type="file">` YOK. */
function PhotoPlaceholder() {
  return (
    <div className="eqf-photo-col">
      <div className="eqf-photo" aria-disabled="true" title={PHOTO_PENDING_REASON}>
        {/* 79 — 26px kamera simgesi */}
        <span className="eqf-photo__emoji" aria-hidden="true">
          📷
        </span>
        {/* 80 */}
        <span className="eqf-photo__label">{PHOTO_LABEL}</span>
        <span className="pf-doc__badge">Yakında</span>
      </div>
    </div>
  );
}

/**
 * ⚙️ Ekipman Bilgileri (mockup satır 73-92) — solda fotoğraf kutusu (76-82),
 * sağda İKİ sütunlu ızgara (83).
 *
 * **K7 onaylı sapma:** mockup 86'da tek "Marka / Model" alanı çizilidir;
 * sunucuda ayrı `brand`/`model` kolonları olduğu için (MK-1 K1) iki input
 * basılır ve gerekçe ekranda GÖRÜNÜR yazar.
 */
export function EquipmentInfoCard({ values, onChange, errors }: EquipmentInfoCardProps) {
  return (
    <section className="pf-card">
      {/* 74 */}
      <h2 className="pf-card__title">{INFO_CARD_TITLE}</h2>

      {/* 75 — flex; solda fotoğraf, sağda ızgara */}
      <div className="eqf-info">
        <PhotoPlaceholder />

        {/* 83 — iki sütun */}
        <div className="pf-grid pf-grid--2">
          {/* 84 */}
          <Field label="Ekipman Adı" required error={errors?.name}>
            {(control) => (
              <Input
                {...control}
                value={values.name}
                placeholder="Tower Crane TC-48"
                status={errors?.name ? "error" : "default"}
                onChange={(event) => onChange("name", event.target.value)}
              />
            )}
          </Field>

          {/* 85 — bu seçicide "Seçiniz..." VARDIR (K5 kapısı dışı) */}
          <Field label="Kategori" required error={errors?.category}>
            {(control) => (
              <Select
                {...control}
                value={values.category}
                status={errors?.category ? "error" : "default"}
                onChange={(event) =>
                  onChange("category", event.target.value as EquipmentFormValues["category"])
                }
              >
                <option value="">{SELECT_PLACEHOLDER}</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {/* 86 — K7: tek alan İKİYE bölündü, gerekçe ipucunda GÖRÜNÜR */}
          <Field label={BRAND_LABEL} hint={BRAND_MODEL_SPLIT_NOTE}>
            {(control) => (
              <Input
                {...control}
                value={values.brand}
                placeholder="Liebherr"
                onChange={(event) => onChange("brand", event.target.value)}
              />
            )}
          </Field>

          <Field label={MODEL_LABEL}>
            {(control) => (
              <Input
                {...control}
                value={values.model}
                placeholder="154 EC-H"
                onChange={(event) => onChange("model", event.target.value)}
              />
            )}
          </Field>

          {/* 87 — monospace */}
          <Field label="Seri No / Şasi">
            {(control) => (
              <Input
                {...control}
                className="eqf-mono"
                value={values.serialNo}
                placeholder="LBH-2022-8842"
                onChange={(event) => onChange("serialNo", event.target.value)}
              />
            )}
          </Field>

          {/* 88 — monospace */}
          <Field label="Plaka">
            {(control) => (
              <Input
                {...control}
                className="eqf-mono"
                value={values.plateNo}
                placeholder="06 TC 4800"
                onChange={(event) => onChange("plateNo", event.target.value)}
              />
            )}
          </Field>

          {/* 89 — sayı, monospace */}
          <Field label="Model Yılı">
            {(control) => (
              <Input
                {...control}
                type="number"
                numeric
                className="eqf-mono"
                value={values.modelYear}
                placeholder="2022"
                onChange={(event) => onChange("modelYear", event.target.value)}
              />
            )}
          </Field>
        </div>
      </div>
    </section>
  );
}
