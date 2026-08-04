import { Field } from "@/components/ui/field/Field";
import { Input } from "@/components/ui/input/Input";
import { Select } from "@/components/ui/select/Select";
import type { Weather } from "@/lib/api/hooks/useSiteDiary";

import { WEATHER_OPTIONS } from "./diary-labels";
import type { DiaryFormState } from "./form-state";

export interface DiarySectionOption {
  id: string;
  name: string;
}

export interface DiaryBasicInfoCardProps {
  form: DiaryFormState;
  onChange: (patch: Partial<DiaryFormState>) => void;
  /** Salt-okunur görünüm (izin yok ya da kayıt `submitted`). */
  disabled: boolean;
  /** Bölüm seçeneği listesi — şantiye detayının `sections` alanından. */
  sections: readonly DiarySectionOption[];
}

/**
 * GK179-203 · "📅 Temel Bilgiler" kartı — dört sütunlu ızgara (GK181):
 * Tarih (184) · Hava (187-190) · Sıcaklık °C (193-194) · Bölüm (197-200).
 *
 * ⚠️ Tarih mockup'ta `2026-07-17` sabitidir; TARİH ARTEFAKTI İSTİSNASI gereği
 * kopyalanmaz — varsayılan BUGÜNdür (çağıran verir).
 */
export function DiaryBasicInfoCard({ form, onChange, disabled, sections }: DiaryBasicInfoCardProps) {
  return (
    <section className="diary-card" aria-labelledby="diary-basic-title">
      <h2 className="diary-card__title" id="diary-basic-title">
        📅 Temel Bilgiler
      </h2>
      <div className="diary-basic__grid">
        <Field label="Tarih">
          {(control) => (
            <Input
              {...control}
              type="date"
              value={form.entryDate}
              disabled={disabled}
              onChange={(event) => onChange({ entryDate: event.target.value })}
            />
          )}
        </Field>

        <Field label="Hava">
          {(control) => (
            <Select
              {...control}
              value={form.weather}
              disabled={disabled}
              onChange={(event) => onChange({ weather: event.target.value as Weather | "" })}
            >
              <option value="">Seçiniz…</option>
              {WEATHER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Sıcaklık °C">
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="decimal"
              step="0.1"
              maxLength={6}
              value={form.temperatureC}
              disabled={disabled}
              onChange={(event) => onChange({ temperatureC: event.target.value })}
            />
          )}
        </Field>

        {/* GK198 — bölüm seçici. Alan nullable: "Bölüm seçilmedi" geçerli
            bir kayıttır (şantiye geneli günlük). */}
        <Field label="Bölüm">
          {(control) => (
            <Select
              {...control}
              value={form.sectionId}
              disabled={disabled}
              onChange={(event) => onChange({ sectionId: event.target.value })}
            >
              <option value="">Bölüm seçilmedi</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </section>
  );
}
