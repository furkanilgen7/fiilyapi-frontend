import { Field, Input, Select } from "@/components/ui";

import {
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  NAME_PART_MAX_LENGTH,
  NATIONAL_ID_MAX_LENGTH,
  PENDING_DOCUMENTS,
  PENDING_NO_CONTRACT_FIELD,
  PHOTO_HINT,
  PHOTO_LABEL,
  SELECT_PLACEHOLDER,
} from "./constants";
import type { PersonnelFormValues } from "./form-state";
import type { PersonnelFormErrors } from "./validate";

interface IdentityCardProps {
  values: PersonnelFormValues;
  onChange: <K extends keyof PersonnelFormValues>(
    field: K,
    value: PersonnelFormValues[K],
  ) => void;
  errors?: PersonnelFormErrors;
}

/** Fotoğraf yükleme yer tutucusu (mockup 54–61) — `<input type="file">` YOK. */
function PhotoPlaceholder() {
  return (
    <div className="pnf-photo-col">
      <div className="pnf-photo" aria-disabled="true" title={PENDING_DOCUMENTS}>
        {/* 57 — 28×28 kişi ikonu, çizgi rengi CSS'ten (çıplak hex yok) */}
        <svg
          className="pnf-photo__icon"
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="14" cy="10" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 25c0-4.5 4-8 9-8s9 3.5 9 8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        {/* 58 */}
        <span className="pnf-photo__label">{PHOTO_LABEL}</span>
        <span className="pf-doc__badge">Yakında</span>
      </div>
      {/* 60 */}
      <p className="pnf-photo__hint">{PHOTO_HINT}</p>
    </div>
  );
}

/**
 * 👤 Kimlik Bilgileri (mockup satır 51–71).
 *
 * ETKİN: Ad (63) · Soyad (64) — ikisi tek `full_name` alanına birleşir.
 * PENDING: fotoğraf (55–59) · TC Kimlik No (65) · Doğum Tarihi (66) ·
 * Cinsiyet (67) · Medeni Durum (68).
 */
export function IdentityCard({ values, onChange, errors }: IdentityCardProps) {
  return (
    <section className="pf-card">
      {/* 52 */}
      <h2 className="pf-card__title">👤 Kimlik Bilgileri</h2>

      <div className="pnf-identity">
        <PhotoPlaceholder />

        {/* 62 — iki sütunlu alan ızgarası */}
        <div className="pf-grid pf-grid--2">
          {/* 63 */}
          <Field label="Ad" required error={errors?.firstName}>
            {(control) => (
              <Input
                {...control}
                maxLength={NAME_PART_MAX_LENGTH}
                value={values.firstName}
                placeholder="Mehmet"
                status={errors?.firstName ? "error" : "default"}
                onChange={(event) => onChange("firstName", event.target.value)}
              />
            )}
          </Field>

          {/* 64 */}
          <Field label="Soyad" required error={errors?.lastName}>
            {(control) => (
              <Input
                {...control}
                maxLength={NAME_PART_MAX_LENGTH}
                value={values.lastName}
                placeholder="Yılmaz"
                status={errors?.lastName ? "error" : "default"}
                onChange={(event) => onChange("lastName", event.target.value)}
              />
            )}
          </Field>

          {/* 65 — mockup `maxlength="11"` + monospace + ipucu KORUNUR */}
          <Field
            label="TC Kimlik No"
            required
            hint="11 haneli · Kimlik doğrulama yapılır"
          >
            {(control) => (
              <Input
                {...control}
                numeric
                disabled
                value=""
                readOnly
                maxLength={NATIONAL_ID_MAX_LENGTH}
                placeholder="12345678901"
                title={PENDING_NO_CONTRACT_FIELD}
              />
            )}
          </Field>

          {/* 66 */}
          <Field label="Doğum Tarihi" required>
            {(control) => (
              <Input
                {...control}
                type="date"
                disabled
                value=""
                readOnly
                title={PENDING_NO_CONTRACT_FIELD}
              />
            )}
          </Field>

          {/* 67 */}
          <Field label="Cinsiyet">
            {(control) => (
              <Select {...control} disabled value="" title={PENDING_NO_CONTRACT_FIELD}>
                <option value="">{SELECT_PLACEHOLDER}</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {/* 68 */}
          <Field label="Medeni Durum">
            {(control) => (
              <Select {...control} disabled value="" title={PENDING_NO_CONTRACT_FIELD}>
                <option value="">{SELECT_PLACEHOLDER}</option>
                {MARITAL_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </div>
    </section>
  );
}
