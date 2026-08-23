import { DateInput, Field, Input, Select } from "@/components/ui";
import { durationDays } from "@/lib/form/derive";
import { formatDateDots } from "@/lib/format";
import type { SectionMilestone } from "./build-body";
import type { SectionFormValues } from "./form-state";
import type { SectionFormErrors } from "./validate";

/** Bağımlılık seçicisinin seçenekleri — aynı şantiyenin öbür bölümleri. */
export interface DependencyOption {
  id: string;
  name: string;
}

export interface ScheduleBudgetCardProps {
  values: SectionFormValues;
  onChange: <K extends keyof SectionFormValues>(field: K, value: SectionFormValues[K]) => void;
  errors?: SectionFormErrors;
  /** Aynı şantiyedeki öbür bölümler (kendisi HARİÇ). */
  dependencyOptions: readonly DependencyOption[];
  /** Düzenleme kipinde kayıtlı milestone'lar — ipucu metni bunlardan TÜRER. */
  existingMilestones: readonly SectionMilestone[];
}

/**
 * 📅 Takvim & Bütçe kartı (mockup F104–128).
 *
 * 🔴 F-TKV T5 — GANTT KİLİDİ BURADA AÇILDI. Bağımlılık (F115-118) ve Milestone
 * (F119-123) kontrolleri P11 uçları yokken `disabled` basılıyordu; uçlar
 * açıldı (`SectionCreate`/`SectionUpdate` → `depends_on_section_id`,
 * `milestones`) ve `/projeler/takvim` ekranı elmasları ÇİZİYOR. Kilit açılmasa
 * ekran "milestone çizen ama hiçbir zaman milestone göremeyen" bir yüzey
 * olurdu.
 *
 * MİLESTONE SATIRI = EKLEME KUTUSU: mockup TEK satır çizer, etiketi
 * "Milestone Ekle"dir ve silme/liste yüzeyi HİÇ çizmemiştir. Bu yüzden form
 * `milestones: []` (hepsini sil) gövdesini ASLA üretmez; kutu boşken anahtar
 * hiç gönderilmez ve kayıtlı satırlar korunur. Kaç satır korunduğu ipucunda
 * GÖRÜNÜR — sayı öğenin kendi verisinden türer, elle yazılmaz.
 */
export function ScheduleBudgetCard({
  values,
  onChange,
  errors,
  dependencyOptions,
  existingMilestones,
}: ScheduleBudgetCardProps) {
  // Türev alan — gövdede GÖNDERİLMEZ (F109).
  const duration = durationDays(values.startDate, values.endDate);
  const milestoneHint =
    existingMilestones.length === 0
      ? "Takvimde elmas işaret olarak görünür"
      : `Takvimde elmas işaret olarak görünür · kayıtlı ${existingMilestones.length} milestone korunur (${existingMilestones
          .map((milestone) => `${milestone.title} — ${formatDateDots(milestone.milestone_date)}`)
          .join(" · ")})`;

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
          error={errors?.dependsOnSectionId}
        >
          {(control) => (
            <Select
              {...control}
              value={values.dependsOnSectionId}
              status={errors?.dependsOnSectionId ? "error" : "default"}
              onChange={(e) => onChange("dependsOnSectionId", e.target.value)}
            >
              <option value="">— Bağımsız başlar</option>
              {dependencyOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Milestone Ekle" hint={milestoneHint} error={errors?.milestoneTitle}>
          {(control) => (
            <div className="sf-milestone-row">
              <Input
                {...control}
                value={values.milestoneTitle}
                status={errors?.milestoneTitle ? "error" : "default"}
                onChange={(e) => onChange("milestoneTitle", e.target.value)}
                placeholder="Kat 14 döşeme tamamlanması"
                className="sf-milestone-row__text"
              />
              <DateInput
                aria-label="Milestone tarihi"
                value={values.milestoneDate}
                status={errors?.milestoneTitle ? "error" : "default"}
                onValueChange={(iso) => onChange("milestoneDate", iso)}
                className="sf-milestone-row__date"
              />
            </div>
          )}
        </Field>
      </div>
    </section>
  );
}
