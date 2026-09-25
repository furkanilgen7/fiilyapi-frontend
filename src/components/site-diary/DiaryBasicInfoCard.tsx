import { DateInput } from "@/components/ui/date-input/DateInput";
import { Field } from "@/components/ui/field/Field";
import { Input } from "@/components/ui/input/Input";
import { Select } from "@/components/ui/select/Select";
import { formatWindKmh } from "@/lib/format";

import { DIARY_WEATHER_NUMBER_MAX } from "./diary-labels";
import { DiaryWeatherPicker } from "./DiaryWeatherPicker";
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
 * İ:164-207 · "📅 Temel Bilgiler & Hava" kartı (PLN-F2.2 hava genişlemesi,
 * GK179-203'ün yerine). Üstte Tarih · Bölüm (1fr 1fr), altta gri panelde on
 * ikonlu hava seçicisi + Min °C · Max °C · Rüzgâr m/s (1fr 1fr 1.4fr) ve
 * "≈ X km/sa" (K22 etiket "km/sa"; `formatWindKmh` genel `lib/format`tan).
 * Mockup'taki "GENİŞLEDİ" çipi tasarım işaretidir, ürün metni DEĞİL — basılmaz.
 *
 * ⚠️ Tarih mockup'ta sabittir; TARİH ARTEFAKTI İSTİSNASI gereği kopyalanmaz —
 * varsayılan BUGÜNdür (çağıran verir).
 */
export function DiaryBasicInfoCard({ form, onChange, disabled, sections }: DiaryBasicInfoCardProps) {
  return (
    <section className="diary-card" aria-labelledby="diary-basic-title">
      <h2 className="diary-card__title" id="diary-basic-title">
        📅 Temel Bilgiler &amp; Hava
      </h2>
      <div className="diary-basic__grid">
        <Field label="Tarih">
          {(control) => (
            <DateInput
              {...control}
              value={form.entryDate}
              disabled={disabled}
              onValueChange={(iso) => onChange({ entryDate: iso })}
            />
          )}
        </Field>

        {/* İ:171-175 — bölüm seçici. Alan nullable: "Bölüm seçilmedi" geçerli
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

      <div className="diary-basic__weather">
        <DiaryWeatherPicker
          value={form.weather}
          disabled={disabled}
          onChange={(weather) => onChange({ weather })}
        />
        <div className="diary-basic__weather-numbers">
          <Field label="Min °C">
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                numeric
                maxLength={DIARY_WEATHER_NUMBER_MAX}
                className="diary-basic__number"
                value={form.tempMinC}
                disabled={disabled}
                onChange={(event) => onChange({ tempMinC: event.target.value })}
              />
            )}
          </Field>
          <Field label="Max °C">
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                numeric
                maxLength={DIARY_WEATHER_NUMBER_MAX}
                className="diary-basic__number"
                value={form.tempMaxC}
                disabled={disabled}
                onChange={(event) => onChange({ tempMaxC: event.target.value })}
              />
            )}
          </Field>
          <Field label="Rüzgâr m/s">
            {(control) => (
              <div className="diary-basic__wind">
                <Input
                  {...control}
                  inputMode="decimal"
                  numeric
                  maxLength={DIARY_WEATHER_NUMBER_MAX}
                  className="diary-basic__number diary-basic__number--wind"
                  value={form.windMs}
                  disabled={disabled}
                  onChange={(event) => onChange({ windMs: event.target.value })}
                />
                {/* İ:203 — tahmini km/sa; boş/anlamsız girdide "—" (K20). Mockup'taki
                    "yaklaşık" işareti (U+2248) font alt kümesi DIŞINDA (sembol
                    bekçisi) — ASCII "~" basılır; izin listesi kararı CEO'da. */}
                <span className="diary-basic__kmh">~ {formatWindKmh(form.windMs.replace(",", "."))}</span>
              </div>
            )}
          </Field>
        </div>
      </div>
    </section>
  );
}
