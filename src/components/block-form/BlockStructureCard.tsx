import { Field, Input, Select } from "@/components/ui";

import {
  BLOCK_ESTIMATE_EMPTY,
  BLOCK_ESTIMATE_TITLE,
  BLOCK_STRUCTURE_CARD_TITLE,
  BLOCK_UNITS_PER_FLOOR_HINT,
  GROUND_FLOOR_USAGE_OPTIONS,
  PARKING_TYPE_OPTIONS,
  ROOF_TYPE_OPTIONS,
  type BlockGroundUsage,
  type BlockParkingType,
  type BlockRoofType,
} from "./constants";
import { deriveBlockEstimate } from "./estimate";
import type { BlockFormValues } from "./form-state";

interface BlockStructureCardProps {
  values: BlockFormValues;
  onChangeField: <K extends keyof BlockFormValues>(field: K, value: BlockFormValues[K]) => void;
}

/**
 * "📐 Yapı Bilgileri" kartı (BE 75-95, üç sütun) + "Tahmini Toplam Ünite"
 * paneli (BE 88-94).
 *
 * ⚠️ Üç seçicinin (80 · 82 · 86) BOŞ SEÇENEĞİ YOKTUR — mockup öyle çizer. Bu
 * yüzden gövdeye girmeleri `touched` kapısına bağlıdır (`build-body.ts`);
 * kart yalnız `onChangeField`i çağırır, kapıyı görünüm yönetir.
 *
 * ⚠️ Sayı kutuları mockup'ta `type="number"`dır ama burada metin + `inputMode`
 * olarak basılır (`sales-form` emsali): TR klavyede virgüllü ondalık
 * `type="number"`da SESSİZCE boşalır ve `construction_area_m2` kullanıcının
 * yazdığı değeri kaybederdi.
 */
export function BlockStructureCard({ values, onChangeField }: BlockStructureCardProps) {
  const estimate = deriveBlockEstimate(values);

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📐 {BLOCK_STRUCTURE_CARD_TITLE}</h2>

      <div className="pf-grid pf-grid--3">
        {/* 78 — formüle GİRMEZ (BE 91 kendi cümlesiyle kanıtlar). */}
        <Field label="Bodrum Kat Sayısı">
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="numeric"
              data-testid="blok-form-bodrum"
              value={values.basementFloorCount}
              onChange={(event) => onChangeField("basementFloorCount", event.target.value)}
            />
          )}
        </Field>

        {/* 79 */}
        <Field label="Normal Kat Sayısı" required>
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="numeric"
              data-testid="blok-form-kat"
              value={values.floorCount}
              onChange={(event) => onChangeField("floorCount", event.target.value)}
            />
          )}
        </Field>

        {/* 80 — dokunma kapısı: "Yok" GERÇEK bir enum değeridir, "belirtilmedi" değil. */}
        <Field label="Çatı Katı">
          {(control) => (
            <Select
              {...control}
              data-testid="blok-form-cati"
              value={values.roofType}
              onChange={(event) =>
                onChangeField("roofType", event.target.value as BlockRoofType)
              }
            >
              {ROOF_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 81 */}
        <Field label="Kat Başına Daire" hint={BLOCK_UNITS_PER_FLOOR_HINT}>
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="numeric"
              data-testid="blok-form-kat-basina-daire"
              value={values.unitsPerFloor}
              onChange={(event) => onChangeField("unitsPerFloor", event.target.value)}
            />
          )}
        </Field>

        {/* 82 — dokunma kapısı */}
        <Field label="Zemin Kat Kullanımı">
          {(control) => (
            <Select
              {...control}
              data-testid="blok-form-zemin-kullanim"
              value={values.groundFloorUsage}
              onChange={(event) =>
                onChangeField("groundFloorUsage", event.target.value as BlockGroundUsage)
              }
            >
              {GROUND_FLOOR_USAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 83 */}
        <Field label="Dükkan Sayısı">
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="numeric"
              data-testid="blok-form-dukkan"
              value={values.shopCount}
              onChange={(event) => onChangeField("shopCount", event.target.value)}
            />
          )}
        </Field>

        {/* 84 — ondalık(12,2); TR virgülü `normalizeDecimalInput` ile çözülür. */}
        <Field label="Toplam İnşaat Alanı (m²)">
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="decimal"
              data-testid="blok-form-insaat-alani"
              placeholder="3200"
              value={values.constructionAreaM2}
              onChange={(event) => onChangeField("constructionAreaM2", event.target.value)}
            />
          )}
        </Field>

        {/* 85 */}
        <Field label="Asansör Sayısı">
          {(control) => (
            <Input
              {...control}
              className="uf-num"
              inputMode="numeric"
              data-testid="blok-form-asansor"
              value={values.elevatorCount}
              onChange={(event) => onChangeField("elevatorCount", event.target.value)}
            />
          )}
        </Field>

        {/* 86 — dokunma kapısı */}
        <Field label="Otopark">
          {(control) => (
            <Select
              {...control}
              data-testid="blok-form-otopark"
              value={values.parkingType}
              onChange={(event) =>
                onChangeField("parkingType", event.target.value as BlockParkingType)
              }
            >
              {PARKING_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {/* 88-94 — CANLI türev; sunucunun `estimated_unit_count` alanıyla BİREBİR
          aynı kural (üç girdi de boşken sayı BASILMAZ, "0" yazılmaz). */}
      <div className="be-estimate" data-testid="blok-form-tahmin">
        <div>
          <div className="be-estimate__label">{BLOCK_ESTIMATE_TITLE}</div>
          {estimate.caption !== null && (
            <div className="be-estimate__caption" data-testid="blok-form-tahmin-alt">
              {estimate.caption}
            </div>
          )}
        </div>
        <div className="be-estimate__value" data-testid="blok-form-tahmin-sayi">
          {estimate.count === null ? BLOCK_ESTIMATE_EMPTY : estimate.count}
        </div>
      </div>
    </section>
  );
}
