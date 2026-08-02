import { Field, Input, Select } from "@/components/ui";
import { durationDays } from "@/lib/form/derive";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { SectionFormValues } from "./form-state";
import type { SectionFormErrors } from "./validate";

export interface ScheduleBudgetCardProps {
  values: SectionFormValues;
  onChange: <K extends keyof SectionFormValues>(field: K, value: SectionFormValues[K]) => void;
  errors?: SectionFormErrors;
}

/**
 * 📅 Takvim & Bütçe kartı (mockup F104–128).
 *
 * Bağımlılık (F115-118) ve Milestone (F119-123) devre dışı basılır — Gantt
 * modülü henüz yok (→P11, kalıcı karar). Kontroller doldurulabilir GÖRÜNMEZ:
 * `disabled` primitive prop'uyla, gövdeye hiçbir alan girmez.
 */
export function ScheduleBudgetCard({ values, onChange, errors }: ScheduleBudgetCardProps) {
  // Türev alan — gövdede GÖNDERİLMEZ (F109).
  const duration = durationDays(values.startDate, values.endDate);
  const ganttNote = pendingModuleLabel("gantt");

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📅 Takvim &amp; Bütçe</h2>
      <div className="pf-grid pf-grid--4">
        <Field label="Başlangıç Tarihi" required error={errors?.startDate}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={values.startDate}
              status={errors?.startDate ? "error" : "default"}
              onChange={(e) => onChange("startDate", e.target.value)}
            />
          )}
        </Field>

        <Field label="Planlanan Bitiş" required error={errors?.endDate}>
          {(control) => (
            <Input
              {...control}
              type="date"
              value={values.endDate}
              status={errors?.endDate ? "error" : "default"}
              onChange={(e) => onChange("endDate", e.target.value)}
            />
          )}
        </Field>

        <Field label="Süre (Gün)" hint="Otomatik hesaplanır">
          {(control) => (
            <Input {...control} readOnly numeric value={duration === null ? "" : String(duration)} placeholder="181" />
          )}
        </Field>

        <Field label="Bölüm Bedeli (₺)" required error={errors?.budgetAmount}>
          {(control) => (
            <Input
              {...control}
              type="number"
              numeric
              value={values.budgetAmount}
              placeholder="2840000"
              status={errors?.budgetAmount ? "error" : "default"}
              onChange={(e) => onChange("budgetAmount", e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="sf-divider" />

      <div className="pf-grid pf-grid--2">
        <Field
          label="Bağımlılık (Önce Bitmesi Gereken Bölüm)"
          hint="Gantt'ta bağlantı çizgisi olarak görünür"
        >
          {(control) => (
            <Select {...control} disabled title={ganttNote}>
              <option>— Bağımsız başlar</option>
            </Select>
          )}
        </Field>

        <Field label="Milestone Ekle" hint="Takvimde elmas işaret olarak görünür">
          {(control) => (
            <div className="sf-milestone-row">
              <Input
                {...control}
                disabled
                title={ganttNote}
                placeholder="Kat 14 döşeme tamamlanması"
                className="sf-milestone-row__text"
              />
              <Input type="date" disabled title={ganttNote} className="sf-milestone-row__date" />
            </div>
          )}
        </Field>
      </div>
    </section>
  );
}
