import { Field, Input, Select } from "@/components/ui";
import { ListIcon, inlineSymbolProps } from "@/components/ui/icons";

import {
  BULK_END_FLOOR_LABEL,
  BULK_NUMBERING_HINT,
  BULK_NUMBERING_LABEL,
  BULK_PLACEHOLDER,
  BULK_RULES_CARD_TITLE,
  BULK_START_FLOOR_LABEL,
  BULK_START_NUMBER_HINT,
  BULK_START_NUMBER_LABEL,
  BULK_TOTAL_LABEL,
  BULK_UNITS_PER_FLOOR_LABEL,
  BULK_UNIT_KIND_HINT,
  BULK_UNIT_KIND_LABEL,
  NUMBERING_OPTIONS,
  UNIT_KIND_OPTIONS,
  type UnitKind,
  type UnitNumberingPattern,
} from "./constants";
import type { BulkTotalResult } from "./derive";
import type { FloorRange } from "./floor-range";
import type { BulkUnitFormValues } from "./form-state";

interface BulkRulesCardProps {
  values: BulkUnitFormValues;
  /** TU 70/71 seçenekleri — SEÇİLİ BLOKTAN türer (`floor-range.ts`). */
  range: FloorRange;
  /** TU 73 türevi — sunucu formülüyle birebir (`derive.ts`). */
  total: BulkTotalResult;
  onChangeField: <K extends keyof BulkUnitFormValues>(
    field: K,
    value: BulkUnitFormValues[K],
  ) => void;
  /** TU 72'nin ÖZEL yazarı: alanı ve kat şablonu satırlarını BİRLİKTE günceller. */
  onChangeUnitsPerFloor: (raw: string) => void;
}

/**
 * "Üretim Kuralları" kartı (TU 67-88).
 *
 * ⚠️ TU 68 başlığı mockup'ta `🔢` (U+1F4A2 değil, U+1F522) ile başlar ve bu
 * kod noktası glif bekçisinin izin listesinde YOKTUR (`symbol-subset-guard`).
 * Kanon: BAŞKA bir emoji ile İKAME ETMEK yasak (mockup sadakati bozulur),
 * izin listesini gevşetmek de yasak (bekçinin amacı tam olarak bu) — doğru yol
 * `ui/icons` SVG'sidir; `icons/index.tsx` kendi açıklamasında bunu
 * *"mockup inline SVG kalibi"* diye yazar. `📍` (TU 59) ve `🏠` (TU 93) İZİNLİ
 * olduğu için onlar aynen basılır; ayrım kod noktası düzeyindedir, keyfi değil.
 *
 * 🔴 TU 71 "Bitiş Katı" BİR kutu → İKİ gövde alanı (`end_floor` +
 * `roof_floor`, karar 4). Sentinel `floor-range.ts`te tanımlıdır ve gövdeye
 * metin olarak ASLA geçmez.
 *
 * 🔴 TU 73 "Toplam Üretilecek" `readOnly`dır, `disabled` DEĞİL — ayrım UE 89'da
 * kurulmuştu ve burada AYNEN korunur: CANLI bir türev `readOnly`, bekleyen bir
 * yüzey (TU 104 Maliyet) `disabled`dır. Karıştırılırsa ekran "hesaplanıyor" ile
 * "hiç hesaplanmayacak"ı aynı görünüme indirir.
 *
 * 🔴 "Ünite Türü" MOCKUP + BİR (T0 ölçümü §2e). TU'da kutusu YOKTUR ama
 * `unit_kind` üretilmiş tipte ZORUNLU ve sunucuda `NOT NULL`dır; sabit
 * `apartment` gömmek `shop`/`office`/`warehouse`/`parking` türlerini toplu
 * üretimden ULAŞILMAZ kılardı. Bu, `FACING_OPTIONS`ın kendi ONAYLI SAPMASIYLA
 * (mockup dört cephe çizer, enum beş üyelidir — *"dördünü basmak `west`i UI'dan
 * ULAŞILMAZ kılardı"*) aynı sınıftır. Kutu, TU 69/76 ızgaralarının ölçülerini
 * BOZMADAN kendi satırında durur.
 */
export function BulkRulesCard({
  values,
  range,
  total,
  onChangeField,
  onChangeUnitsPerFloor,
}: BulkRulesCardProps) {
  const hasBlock = range.startOptions.length > 0;
  const totalMessage = "message" in total ? total.message : undefined;

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">
        <ListIcon {...inlineSymbolProps} />
        {BULK_RULES_CARD_TITLE}
      </h2>

      {/* 69 — dört sütun */}
      <div className="pf-grid pf-grid--4">
        {/* 70 — gövdede `start_floor` (tam sayı) */}
        <Field label={BULK_START_FLOOR_LABEL} required hint={range.hint}>
          {(control) => (
            <Select
              {...control}
              data-testid="toplu-form-baslangic-kat"
              disabled={!hasBlock}
              value={values.startFloor}
              onChange={(event) => onChangeField("startFloor", event.target.value)}
            >
              <option value="">{BULK_PLACEHOLDER}</option>
              {range.startOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 71 — BİR kutu → `end_floor` + `roof_floor` */}
        <Field label={BULK_END_FLOOR_LABEL} required>
          {(control) => (
            <Select
              {...control}
              data-testid="toplu-form-bitis-kat"
              disabled={!hasBlock}
              value={values.endFloor}
              onChange={(event) => onChangeField("endFloor", event.target.value)}
            >
              <option value="">{BULK_PLACEHOLDER}</option>
              {range.endOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 72 — gövdede `units_per_floor` (ge=1 le=20); kat şablonunu SÜRER */}
        <Field label={BULK_UNITS_PER_FLOOR_LABEL} required>
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="numeric"
              data-testid="toplu-form-kat-basina"
              value={values.unitsPerFloor}
              onChange={(event) => onChangeUnitsPerFloor(event.target.value)}
            />
          )}
        </Field>

        {/* 73 — TÜREV: alan DEĞİL. `readOnly`, `disabled` DEĞİL. */}
        <Field label={BULK_TOTAL_LABEL} error={totalMessage}>
          {(control) => (
            <Input
              {...control}
              className={
                total.kind === "valid" ? "uf-num tu-total" : "uf-num tu-total tu-total--invalid"
              }
              data-testid="toplu-form-toplam"
              readOnly
              value={total.text}
              onChange={() => undefined}
            />
          )}
        </Field>
      </div>

      {/* 75 */}
      <hr className="tu-rules-divider" />

      {/* 76-87 — iki sütun */}
      <div className="pf-grid pf-grid--2">
        {/* 79 — gövdede `numbering`; beşinci desen ONAYLI SAPMA (`constants.ts`) */}
        <Field label={BULK_NUMBERING_LABEL} required hint={BULK_NUMBERING_HINT}>
          {(control) => (
            <Select
              {...control}
              data-testid="toplu-form-numaralandirma"
              value={values.numbering}
              onChange={(event) =>
                onChangeField("numbering", event.target.value as UnitNumberingPattern)
              }
            >
              {NUMBERING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 84 — gövdede `start_number` (ge=0, varsayılan 1) */}
        <Field label={BULK_START_NUMBER_LABEL} hint={BULK_START_NUMBER_HINT}>
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="numeric"
              data-testid="toplu-form-baslangic-no"
              value={values.startNumber}
              onChange={(event) => onChangeField("startNumber", event.target.value)}
            />
          )}
        </Field>
      </div>

      {/* MOCKUP + BİR — TU 69/76 ızgaralarının ölçüsü bozulmasın diye AYRI satır */}
      <div className="pf-grid pf-grid--2">
        <Field label={BULK_UNIT_KIND_LABEL} required hint={BULK_UNIT_KIND_HINT}>
          {(control) => (
            <Select
              {...control}
              data-testid="toplu-form-unite-turu"
              value={values.unitKind}
              onChange={(event) => onChangeField("unitKind", event.target.value as UnitKind)}
            >
              {UNIT_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </section>
  );
}
