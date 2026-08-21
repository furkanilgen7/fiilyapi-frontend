import { Field, Input, Select } from "@/components/ui";

import {
  FACING_OPTIONS,
  PARKING_RIGHT_OPTIONS,
  UNIT_INFO_CARD_TITLE,
  UNIT_KIND_OPTIONS,
  UNIT_LAYOUT_MAX_LENGTH,
  UNIT_LAYOUT_OPTIONS,
  UNIT_NO_HINT,
  UNIT_NO_MAX_LENGTH,
  type UnitFacing,
  type UnitKind,
  type UnitParkingRight,
} from "./constants";
import type { UnitFormValues } from "./form-state";

interface UnitInfoCardProps {
  values: UnitFormValues;
  onChangeField: <K extends keyof UnitFormValues>(field: K, value: UnitFormValues[K]) => void;
}

/**
 * "🏠 Ünite Bilgileri" kartı (UE 70-83, üç sütun).
 *
 * ⚠️ UE 74 "Ünite Türü" dokunma kapısına GİRMEZ: `unit_kind` sunucuda NOT
 * NULL'dır, yani ezilecek bir `NULL` yoktur ve gövdede DAİMA bulunur.
 * UE 75 · 78 · 81 ise nullable sütunlardır — kapı onlar içindir.
 *
 * ⚠️ UE 75 "Oda Tipi" sunucuda SERBEST METİNDİR (`layout: str`, max 20) ama
 * mockup küratörlü bir seçici çizer: mockup kazanır, SAKLANAN metindir. Bu
 * yüzden `<option value>` etiketin kendisidir.
 *
 * ⚠️ UE 78 "Cephe" mockup'ta DÖRT seçenek çizer; liste BEŞTİR — `west`
 * (Batı) eklenmezse başka yoldan yazılmış bir ünite UI'dan düzeltilemez
 * hale gelirdi (`constants.ts` gerekçesi).
 */
export function UnitInfoCard({ values, onChangeField }: UnitInfoCardProps) {
  return (
    <section className="pf-card">
      <h2 className="pf-card__title">🏠 {UNIT_INFO_CARD_TITLE}</h2>

      <div className="pf-grid pf-grid--3">
        {/* 73 — mono, SOLA yaslı */}
        <Field label="Ünite No" required hint={UNIT_NO_HINT}>
          {(control) => (
            <Input
              {...control}
              className="uf-mono"
              data-testid="unite-form-no"
              maxLength={UNIT_NO_MAX_LENGTH}
              placeholder="B-12"
              value={values.unitNo}
              onChange={(event) => onChangeField("unitNo", event.target.value)}
            />
          )}
        </Field>

        {/* 74 — NOT NULL: kapıya girmez */}
        <Field label="Ünite Türü" required>
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-tur"
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

        {/* 75 — saklanan METİN; boş seçenek YOK → dokunma kapısı */}
        <Field label="Oda Tipi" required>
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-oda-tipi"
              value={values.layout}
              onChange={(event) =>
                onChangeField("layout", event.target.value.slice(0, UNIT_LAYOUT_MAX_LENGTH))
              }
            >
              {UNIT_LAYOUT_OPTIONS.map((layout) => (
                <option key={layout} value={layout}>
                  {layout}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 76 — m² birim fiyatın TABANI */}
        <Field label="Brüt m²" required>
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="decimal"
              data-testid="unite-form-brut"
              value={values.grossAreaM2}
              onChange={(event) => onChangeField("grossAreaM2", event.target.value)}
            />
          )}
        </Field>

        {/* 77 — m² birim fiyata GİRMEZ (UE 89 "Brüt m² üzerinden") */}
        <Field label="Net m²" required>
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="decimal"
              data-testid="unite-form-net"
              value={values.netAreaM2}
              onChange={(event) => onChangeField("netAreaM2", event.target.value)}
            />
          )}
        </Field>

        {/* 78 — dokunma kapısı; BEŞ seçenek (mockup dördü çizer) */}
        <Field label="Cephe / Yön">
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-cephe"
              value={values.facing}
              onChange={(event) => onChangeField("facing", event.target.value as UnitFacing)}
            >
              {FACING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 79 */}
        <Field label="Balkon m²">
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="decimal"
              data-testid="unite-form-balkon"
              value={values.balconyAreaM2}
              onChange={(event) => onChangeField("balconyAreaM2", event.target.value)}
            />
          )}
        </Field>

        {/* 80 */}
        <Field label="Banyo Sayısı">
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="numeric"
              data-testid="unite-form-banyo"
              value={values.bathroomCount}
              onChange={(event) => onChangeField("bathroomCount", event.target.value)}
            />
          )}
        </Field>

        {/* 81 — dokunma kapısı: "Yok" GERÇEK bir enum değeridir */}
        <Field label="Otopark Hakkı">
          {(control) => (
            <Select
              {...control}
              data-testid="unite-form-otopark-hakki"
              value={values.parkingRight}
              onChange={(event) =>
                onChangeField("parkingRight", event.target.value as UnitParkingRight)
              }
            >
              {PARKING_RIGHT_OPTIONS.map((option) => (
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
