import { useId } from "react";

import { Field, Input, Select } from "@/components/ui";
import type { SubcontractorListItem } from "@/lib/api/hooks/useSubcontractors";

import {
  ASSIGNED_PROJECT_OPTIONS,
  ASSIGNED_SECTION_OPTIONS,
  EMPLOYEE_TYPE_OPTIONS,
  NO_SUBCONTRACTOR_LABEL,
  PAYMENT_METHOD_OPTIONS,
  PENDING_EMPLOYEE_TYPE,
  PENDING_GENERAL_SOURCE,
  PENDING_NO_CONTRACT_FIELD,
  SELECT_PLACEHOLDER,
  TRADE_OPTIONS,
  WAGE_TYPE_OPTIONS,
} from "./constants";
import type { PersonnelFormValues } from "./form-state";
import type { PersonnelFormErrors } from "./validate";

export interface SubcontractorPickerState {
  items: readonly SubcontractorListItem[];
  isLoading: boolean;
  isError: boolean;
}

interface JobCardProps {
  values: PersonnelFormValues;
  onChange: <K extends keyof PersonnelFormValues>(
    field: K,
    value: PersonnelFormValues[K],
  ) => void;
  subcontractors: SubcontractorPickerState;
  errors?: PersonnelFormErrors;
}

/** "Bağlı Taşeron" seçicisinin altındaki GÖRÜNÜR not — sessiz boş liste yasak. */
export function subcontractorNote(
  state: SubcontractorPickerState,
  isEnabled: boolean,
): string {
  if (!isEnabled) {
    return "Bağlı taşeron yalnız “Taşeron İşçisi” seçildiğinde girilir — şirket kadrosunda boş kalır.";
  }
  if (state.isLoading) return "Yükleniyor…";
  if (state.isError) {
    return "Taşeron listesi yüklenemedi — personeli taşeron bağlamadan da kaydedebilirsiniz.";
  }
  if (state.items.length === 0) {
    return "Kayıtlı aktif taşeron yok — personeli taşeron bağlamadan kaydedebilirsiniz.";
  }
  return "Listede aradığınız taşeron yoksa taşeron kartı henüz açılmamış olabilir.";
}

/**
 * 💼 İş Bilgileri (mockup satır 86–119).
 *
 * ETKİN ÜÇLÜ: Çalışan Tipi (91) → `source` · Bağlı Taşeron (95) →
 * `subcontractor_id` · Meslek / Görev (99) → `trade`.
 *
 * PENDING: İşe Giriş Tarihi (101) · Atandığı Proje (104) · Bölüm (108) ·
 * Ücret Tipi (113) · Ücret Tutarı (114) · Ödeme Şekli (115) · IBAN (116) ·
 * SGK Sicil No (117).
 */
export function JobCard({ values, onChange, subcontractors, errors }: JobCardProps) {
  const noteId = useId();
  const isSubcontractorEnabled = values.source === "subcontractor";

  return (
    <section className="pf-card">
      {/* 87 */}
      <h2 className="pf-card__title">💼 İş Bilgileri</h2>

      {/* 88 — üç sütun */}
      <div className="pf-grid pf-grid--3">
        {/* 90-91 */}
        <Field label="Çalışan Tipi" required error={errors?.source}>
          {(control) => (
            <Select
              {...control}
              value={values.source}
              status={errors?.source ? "error" : "default"}
              onChange={(event) => {
                const nextSource = event.target.value as PersonnelFormValues["source"];
                onChange("source", nextSource);
                // Taşerondan çıkıldığında seçim TEMİZLENİR: aksi hâlde
                // "Taşeron İşçisi → firma seç → Şirket Kadrosu" akışında
                // gövdeye ölü bir taşeron kimliği taşınırdı.
                if (nextSource !== "subcontractor") onChange("subcontractorId", "");
              }}
            >
              <option value="">{SELECT_PLACEHOLDER}</option>
              {EMPLOYEE_TYPE_OPTIONS.map((option) => (
                <option
                  key={option.label}
                  value={option.source ?? ""}
                  // Karşılıksız seçenek (Serbest Meslek · Stajyer) SİLİNMEZ,
                  // devre-dışı basılır — sessizce `general`'a EŞLENMEZ.
                  disabled={option.source === null}
                  title={option.source === null ? PENDING_EMPLOYEE_TYPE : undefined}
                >
                  {option.label}
                </option>
              ))}
              {/* Düzenleme kipinde SEED edilmiş eski "genel işçi" kaydı —
                  mockup'ta karşılığı yok, formdan yeniden SEÇİLEMEZ ama
                  dokunulmadan bırakılabilir (K2, "general" backend'de GERÇEK). */}
              {values.source === "general" && (
                <option value="general" disabled title={PENDING_GENERAL_SOURCE}>
                  Genel İşçi (mevcut kayıt)
                </option>
              )}
            </Select>
          )}
        </Field>

        {/* 94-95 — mockup'ın SABİT taşeron adları yerine GERÇEK veri */}
        <Field label="Bağlı Taşeron">
          {(control) => (
            <Select
              {...control}
              aria-describedby={
                [control["aria-describedby"], noteId].filter(Boolean).join(" ") || undefined
              }
              disabled={!isSubcontractorEnabled}
              value={values.subcontractorId}
              onChange={(event) => onChange("subcontractorId", event.target.value)}
            >
              <option value="">{NO_SUBCONTRACTOR_LABEL}</option>
              {subcontractors.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 98-99 */}
        <Field label="Meslek / Görev" required error={errors?.trade}>
          {(control) => (
            <Select
              {...control}
              value={values.trade}
              status={errors?.trade ? "error" : "default"}
              onChange={(event) => onChange("trade", event.target.value)}
            >
              <option value="">{SELECT_PLACEHOLDER}</option>
              {/* Düzenleme kipinde sunucudaki meslek sekiz seçenek DIŞINDA
                  olabilir — sessizce KIRPILMASIN diye kendi değeri eklenir. */}
              {values.trade && !TRADE_OPTIONS.includes(values.trade) && (
                <option value={values.trade}>{values.trade}</option>
              )}
              {TRADE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 101 */}
        <Field label="İşe Giriş Tarihi" required>
          {(control) => (
            <Input
              {...control}
              type="date"
              disabled
              readOnly
              value=""
              title={PENDING_NO_CONTRACT_FIELD}
            />
          )}
        </Field>

        {/* 103-104 */}
        <Field label="Atandığı Proje" required>
          {(control) => (
            <Select {...control} disabled value="" title={PENDING_NO_CONTRACT_FIELD}>
              <option value="">{SELECT_PLACEHOLDER}</option>
              {ASSIGNED_PROJECT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 107-108 */}
        <Field label="Bölüm">
          {(control) => (
            <Select {...control} disabled value="" title={PENDING_NO_CONTRACT_FIELD}>
              <option value="">{SELECT_PLACEHOLDER}</option>
              {ASSIGNED_SECTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {/* Sessiz boş açılır liste YASAK: seçici hangi durumda olursa olsun
          görünür açıklama basılır ve `aria-describedby` ile bağlanır. */}
      <p className="pnf-picker-note" id={noteId}>
        {subcontractorNote(subcontractors, isSubcontractorEnabled)}
      </p>

      {/* 111 — ince ayraç */}
      <div className="pnf-divider" />

      {/* 112 — ücret bloğu; TAMAMI PENDING */}
      <p className="pnf-block-note">
        Ücret ve ödeme alanları devre dışı — {PENDING_NO_CONTRACT_FIELD.toLocaleLowerCase("tr")}.
      </p>
      <div className="pf-grid pf-grid--3">
        {/* 113 — mockup'ta "Seçiniz..." YOKTUR, ilk seçenek "Günlük" */}
        <Field label="Ücret Tipi" required>
          {(control) => (
            <Select
              {...control}
              disabled
              value={WAGE_TYPE_OPTIONS[0]}
              title={PENDING_NO_CONTRACT_FIELD}
            >
              {WAGE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 114 */}
        <Field label="Ücret Tutarı (₺)" required>
          {(control) => (
            <Input
              {...control}
              type="number"
              numeric
              disabled
              readOnly
              value=""
              placeholder="1200"
              className="pnf-amount"
              title={PENDING_NO_CONTRACT_FIELD}
            />
          )}
        </Field>

        {/* 115 */}
        <Field label="Ödeme Şekli">
          {(control) => (
            <Select
              {...control}
              disabled
              value={PAYMENT_METHOD_OPTIONS[0]}
              title={PENDING_NO_CONTRACT_FIELD}
            >
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 116 — iki sütun genişliğinde */}
        <Field label="IBAN" className="pf-col-span-2">
          {(control) => (
            <Input
              {...control}
              numeric
              disabled
              readOnly
              value=""
              placeholder="TR12 0001 0093 0012 3456 7890"
              title={PENDING_NO_CONTRACT_FIELD}
            />
          )}
        </Field>

        {/* 117 */}
        <Field label="SGK Sicil No" hint="Boş bırakılırsa otomatik sorgulanır">
          {(control) => (
            <Input
              {...control}
              numeric
              disabled
              readOnly
              value=""
              placeholder="123 456 789 00"
              title={PENDING_NO_CONTRACT_FIELD}
            />
          )}
        </Field>
      </div>
    </section>
  );
}
