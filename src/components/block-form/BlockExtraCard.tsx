import { Field, Input, Select, Textarea } from "@/components/ui";

import {
  BLOCK_EXTRA_CARD_TITLE,
  BLOCK_NOTES_MAX_LENGTH,
  BLOCK_STATUS_OPTIONS,
  type BlockStatus,
} from "./constants";
import type { BlockFormValues } from "./form-state";

interface BlockExtraCardProps {
  values: BlockFormValues;
  onChangeField: <K extends keyof BlockFormValues>(field: K, value: BlockFormValues[K]) => void;
}

/**
 * "📋 Ek Bilgiler" kartı (BE 97-104, iki sütun; Not iki sütuna yayılır).
 *
 * ⚠️ BE 101 "Durum" seçicisinin mockup'ta `selected` değeri "İnşaat Halinde"dir
 * ve form o değerle AÇILIR — ama dokunma kapısı yüzünden kullanıcı seçiciyi
 * açmadıysa gövdeye GİRMEZ. Sunucu varsayılanı ile mockup'ın `selected`ı
 * burada AYNI DEĞİLDİR (şema `status` alanını nullable bırakır), bu yüzden
 * kapı gerçekten iş görür.
 */
export function BlockExtraCard({ values, onChangeField }: BlockExtraCardProps) {
  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📋 {BLOCK_EXTRA_CARD_TITLE}</h2>

      <div className="pf-grid pf-grid--2">
        {/* 100 */}
        <Field label="Tahmini Teslim Tarihi">
          {(control) => (
            <Input
              {...control}
              type="date"
              data-testid="blok-form-teslim-tarihi"
              value={values.estimatedDeliveryDate}
              onChange={(event) => onChangeField("estimatedDeliveryDate", event.target.value)}
            />
          )}
        </Field>

        {/* 101 — dokunma kapısı */}
        <Field label="Durum">
          {(control) => (
            <Select
              {...control}
              data-testid="blok-form-durum"
              value={values.status}
              onChange={(event) => onChangeField("status", event.target.value as BlockStatus)}
            >
              {BLOCK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 102 — iki sütuna yayılır, rows=2 */}
        <Field label="Not" className="pf-col-span-2">
          {(control) => (
            <Textarea
              {...control}
              rows={2}
              maxLength={BLOCK_NOTES_MAX_LENGTH}
              data-testid="blok-form-not"
              placeholder="Blok özellikleri, özel durumlar..."
              value={values.notes}
              onChange={(event) => onChangeField("notes", event.target.value)}
            />
          )}
        </Field>
      </div>
    </section>
  );
}
