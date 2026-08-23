import { DateInput, Field, Input } from "@/components/ui";
import { durationDays } from "@/lib/form/derive";
import type { SiteFormValues } from "./form-state";

type FieldErrors = Partial<Record<keyof SiteFormValues, string>>;

export interface ScheduleCardProps {
  values: SiteFormValues;
  onChange: <K extends keyof SiteFormValues>(field: K, value: SiteFormValues[K]) => void;
  errors?: FieldErrors;
}

/** 📅 Takvim & Bütçe kartı (mockup satır 91–99, spec §4.3). */
export function ScheduleCard({ values, onChange, errors }: ScheduleCardProps) {
  // Türev alan — gövdede GÖNDERİLMEZ (spec §8.2). Uç-dahil: bitiş − başlangıç + 1.
  const duration = durationDays(values.startDate, values.endDate);

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📅 Takvim &amp; Bütçe</h2>
      <div className="pf-grid pf-grid--4">
        <Field label="Başlangıç Tarihi" required error={errors?.startDate}>
          {(control) => (
            <DateInput
              {...control}
              value={values.startDate}
              status={errors?.startDate ? "error" : "default"}
              onValueChange={(iso) => onChange("startDate", iso)}
            />
          )}
        </Field>

        <Field label="Planlanan Bitiş" required error={errors?.endDate}>
          {(control) => (
            <DateInput
              {...control}
              value={values.endDate}
              status={errors?.endDate ? "error" : "default"}
              onValueChange={(iso) => onChange("endDate", iso)}
            />
          )}
        </Field>

        {/* Salt okunur türev: tek tarihte veya ters tarihte BOŞ kalır, 0 basmaz. */}
        <Field label="Süre (Gün)" hint="Otomatik hesaplanır">
          {(control) => (
            <Input
              {...control}
              readOnly
              numeric
              value={duration === null ? "" : String(duration)}
              placeholder="480"
            />
          )}
        </Field>

        <Field label="Şantiye Bütçesi (₺)" error={errors?.budget}>
          {(control) => (
            <Input
              {...control}
              type="number"
              numeric
              value={values.budget}
              placeholder="11200000"
              status={errors?.budget ? "error" : "default"}
              onChange={(e) => onChange("budget", e.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}
