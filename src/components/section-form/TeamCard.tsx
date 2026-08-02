import { Field, Input, Select } from "@/components/ui";
import { useUserOptions } from "@/lib/api/hooks/useUserOptions";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { SectionFormValues } from "./form-state";
import type { SectionFormErrors } from "./validate";
import {
  UserPickerOptions,
  isUserListUnavailable,
  isUserPickerDisabled,
  userPickerNote,
} from "@/components/site-form/user-picker";

export interface TeamCardProps {
  values: SectionFormValues;
  onChange: <K extends keyof SectionFormValues>(field: K, value: SectionFormValues[K]) => void;
  errors?: SectionFormErrors;
}

/**
 * Devre dışı panel — Görevli Taşeronlar / Kullanılacak Makineler (F88-98).
 * Backend bu iki listeyi henüz üretmiyor: mockup'taki örnek isimler (Akın
 * İnşaat, Tower Crane TC-48 …) UYDURULMAZ — kart görsel olarak basılır ama
 * içeriği dürüst bir "beklemede" notudur, gövdeye hiçbir alan girmez.
 */
function DisabledTeamPanel({ title, pendingModule }: { title: string; pendingModule: string }) {
  return (
    <div className="sf-team-panel" aria-disabled="true" title={pendingModuleLabel(pendingModule)}>
      <div className="sf-team-panel__title">{title}</div>
      <p className="sf-team-panel__note">{pendingModuleLabel(pendingModule)}</p>
    </div>
  );
}

/** 👷 Sorumlu & Ekip kartı (mockup F79–101). */
export function TeamCard({ values, onChange, errors }: TeamCardProps) {
  const users = useUserOptions();
  const pickerDisabled = isUserPickerDisabled(users);
  const isManagerRequired = !isUserListUnavailable(users);

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">👷 Sorumlu &amp; Ekip</h2>
      <div className="pf-grid pf-grid--3">
        {/* F83: manager_user_id — izinli personel seçicisi (site-form/user-picker
            deseni). Serbest metin karşılığı (`manager_name`) formda YOKTUR;
            liste yüklenemediğinde zorunluluk kalkar (aynı desen, `validate.ts`). */}
        <Field label="Bölüm Sorumlusu" required={isManagerRequired} error={errors?.managerUserId}>
          {(control) => (
            <Select
              {...control}
              disabled={pickerDisabled}
              value={values.managerUserId}
              status={errors?.managerUserId ? "error" : "default"}
              onChange={(e) => onChange("managerUserId", e.target.value)}
            >
              <UserPickerOptions state={users} />
            </Select>
          )}
        </Field>

        {/* F84: deputy_manager_user_id — aynı desen, zorunlu DEĞİL. */}
        <Field label="Yardımcı Sorumlu">
          {(control) => (
            <Select
              {...control}
              disabled={pickerDisabled}
              value={values.deputyManagerUserId}
              onChange={(e) => onChange("deputyManagerUserId", e.target.value)}
            >
              <UserPickerOptions state={users} />
            </Select>
          )}
        </Field>

        <Field label="Planlanan İşçi Sayısı" error={errors?.plannedWorkerCount}>
          {(control) => (
            <Input
              {...control}
              type="number"
              numeric
              value={values.plannedWorkerCount}
              status={errors?.plannedWorkerCount ? "error" : "default"}
              onChange={(e) => onChange("plannedWorkerCount", e.target.value)}
            />
          )}
        </Field>
      </div>

      <p className="sf-picker-note">{userPickerNote(users)}</p>

      <div className="sf-divider" />

      <div className="sf-team-panels">
        <DisabledTeamPanel title="Görevli Taşeronlar" pendingModule="subcontracts" />
        <DisabledTeamPanel title="Kullanılacak Makineler" pendingModule="equipment" />
      </div>
    </section>
  );
}
