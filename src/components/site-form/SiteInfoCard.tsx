import { useId } from "react";

import { Field, Input, Select } from "@/components/ui";
import { useUserOptions } from "@/lib/api/hooks/useUserOptions";
import {
  LINKED_PROJECT_TITLE,
  OUTSOURCED_SAFETY_OFFICER,
  SITE_FIELD_MAX_LENGTH,
  SITE_STATUS_OPTIONS,
  type SiteStatusOption,
} from "./constants";
import type { SiteFormValues } from "./form-state";
import {
  UserPickerOptions,
  isUserListUnavailable,
  isUserPickerDisabled,
  userPickerNote,
  withDescribedBy,
} from "./user-picker";

type FieldErrors = Partial<Record<keyof SiteFormValues, string>>;

export interface SiteInfoCardProps {
  values: SiteFormValues;
  onChange: <K extends keyof SiteFormValues>(field: K, value: SiteFormValues[K]) => void;
  /** Bağlamdaki projenin adı; henüz yüklenmediyse boş dize. */
  projectName: string;
  errors?: FieldErrors;
}

/** 📍 Şantiye Bilgileri kartı (mockup satır 63–73, spec §4.1). */
export function SiteInfoCard({ values, onChange, projectName, errors }: SiteInfoCardProps) {
  const users = useUserOptions();
  const noteId = useId();

  const pickersDisabled = isUserPickerDisabled(users);
  // Liste yoksa şef zorunluluğu KALKAR (spec §10.1.1, kullanıcı kararı 2026-07-30).
  const isChiefRequired = !isUserListUnavailable(users);

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📍 Şantiye Bilgileri</h2>
      <div className="pf-grid pf-grid--2-1-1">
        <Field label="Şantiye Adı" required error={errors?.name}>
          {(control) => (
            <Input
              {...control}
              maxLength={SITE_FIELD_MAX_LENGTH.name}
              value={values.name}
              placeholder="C-Blok Şantiyesi"
              status={errors?.name ? "error" : "default"}
              onChange={(e) => onChange("name", e.target.value)}
            />
          )}
        </Field>

        <Field label="Şantiye Kodu" hint="Boş bırakılırsa otomatik" error={errors?.code}>
          {(control) => (
            <Input
              {...control}
              numeric
              maxLength={SITE_FIELD_MAX_LENGTH.code}
              value={values.code}
              placeholder="SNT-2026-003"
              status={errors?.code ? "error" : "default"}
              onChange={(e) => onChange("code", e.target.value)}
            />
          )}
        </Field>

        {/* Kilitli (spec §4.1.1): rota projectId taşır, `SiteCreate`'te
            `project_id` yoktur, şantiye başka projeye taşınamaz. */}
        <Field label="Bağlı Proje" required>
          {(control) => (
            <Select {...control} disabled value={projectName} title={LINKED_PROJECT_TITLE}>
              <option value={projectName}>{projectName}</option>
            </Select>
          )}
        </Field>

        <Field label="Şantiye Şefi" required={isChiefRequired} error={errors?.siteManagerUserId}>
          {(control) => (
            <Select
              {...withDescribedBy(control, noteId)}
              disabled={pickersDisabled}
              value={values.siteManagerUserId}
              status={errors?.siteManagerUserId ? "error" : "default"}
              onChange={(e) => onChange("siteManagerUserId", e.target.value)}
            >
              <UserPickerOptions state={users} />
            </Select>
          )}
        </Field>

        {/* Zorunlu DEĞİL (kullanıcı kararı 4): ipucu mevzuata atıf yapar ama
            form kuralı üretmez (spec §4.1.2). */}
        <Field label="İSG Uzmanı" hint="İSG mevzuatı gereği zorunlu">
          {(control) => (
            <Select
              {...withDescribedBy(control, noteId)}
              disabled={pickersDisabled}
              value={values.safetyOfficer}
              onChange={(e) => onChange("safetyOfficer", e.target.value)}
            >
              <UserPickerOptions state={users} />
              {!users.isLoading && (
                <option value={OUTSOURCED_SAFETY_OFFICER}>Dış Kaynak — OSGB</option>
              )}
            </Select>
          )}
        </Field>

        <Field label="Durum">
          {(control) => (
            <Select
              {...control}
              value={values.status}
              onChange={(e) => onChange("status", e.target.value as SiteStatusOption)}
            >
              {SITE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {/* Sessiz boş açılır liste YASAK: durum ne olursa olsun görünür açıklama
          basılır ve iki seçiciye de aria-describedby ile bağlanır (TZ-4b). */}
      <p className="site-form__picker-note" id={noteId}>
        {userPickerNote(users)}
      </p>
    </section>
  );
}
