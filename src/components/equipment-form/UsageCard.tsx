import { useId } from "react";

import { Field, Input, Select } from "@/components/ui";

import {
  FUEL_TYPE_OPTIONS,
  MAINTENANCE_PERIOD_OPTIONS,
  NORM_CONSUMPTION_HINT,
  NORM_SPLIT_NOTE,
  NORM_UNIT_LABEL,
  NORM_UNIT_OPTIONS,
  OPERATOR_HINT,
  SELECT_PLACEHOLDER,
  SITE_FIELD_LABEL,
  SITE_FIELD_NOTE,
  STATUS_OPTIONS,
  UNASSIGNED_SITE_LABEL,
  USAGE_CARD_TITLE,
} from "./constants";
import { SITE_UNASSIGNED_VALUE, type EquipmentFormValues } from "./form-state";
import type { EquipmentFormErrors } from "./validate";

/** "Atandığı Proje" seçicisinin veri durumu (etiket mockup'tan, alan `site_id`). */
export interface SitePickerState {
  items: readonly { siteId: string; label: string }[];
  isLoading: boolean;
  isError: boolean;
}

/** "Sorumlu Operatör" seçicisinin veri durumu. */
export interface OperatorPickerState {
  items: readonly { id: string; label: string }[];
  isLoading: boolean;
  isError: boolean;
}

interface UsageCardProps {
  values: EquipmentFormValues;
  onChange: <K extends keyof EquipmentFormValues>(
    field: K,
    value: EquipmentFormValues[K],
  ) => void;
  sites: SitePickerState;
  operators: OperatorPickerState;
  errors?: EquipmentFormErrors;
}

/** Sessiz boş açılır liste YASAK — her durumda görünür açıklama. */
export function siteNote(state: SitePickerState): string {
  if (state.isLoading) return "Yükleniyor…";
  if (state.isError) {
    return "Şantiye listesi yüklenemedi — ekipmanı “Depoda (Atanmadı)” bırakabilirsiniz.";
  }
  if (state.items.length === 0) {
    return "Kayıtlı şantiye yok — ekipman “Depoda (Atanmadı)” kaydedilir.";
  }
  return SITE_FIELD_NOTE;
}

export function operatorNote(state: OperatorPickerState): string {
  if (state.isLoading) return "Yükleniyor…";
  if (state.isError) {
    return "Personel listesi yüklenemedi — ekipmanı operatör atamadan da kaydedebilirsiniz.";
  }
  if (state.items.length === 0) {
    return "Kayıtlı aktif personel yok — ekipmanı operatör atamadan kaydedebilirsiniz.";
  }
  return OPERATOR_HINT; // 119 — mockup'ın kendi ipucu
}

/**
 * 📍 Kullanım & Atama (mockup satır 115-125) — üç sütunlu tek ızgara.
 *
 * **K6 onaylı sapma:** 118'in etiketi mockup'tan ("Atandığı Proje") ama alan
 * `site_id`dir ve seçenekler ŞANTİYE listesinden gelir (MK-1 K4). Gerekçe
 * seçicinin altında GÖRÜNÜR yazar.
 *
 * **K5/MK-1 K5 onaylı sapma:** 122 tek serbest metin çiziyor ("4,2 Lt/saat");
 * sapma hesabı sayı + birim istediği için iki kontrole bölündü.
 */
export function UsageCard({ values, onChange, sites, operators, errors }: UsageCardProps) {
  const siteNoteId = useId();
  const operatorNoteId = useId();

  return (
    <section className="pf-card">
      {/* 116 */}
      <h2 className="pf-card__title">{USAGE_CARD_TITLE}</h2>

      {/* 117 — üç sütun */}
      <div className="pf-grid pf-grid--3">
        {/* 118 — K6 */}
        <Field label={SITE_FIELD_LABEL} required error={errors?.siteId}>
          {(control) => (
            <Select
              {...control}
              aria-describedby={
                [control["aria-describedby"], siteNoteId].filter(Boolean).join(" ") || undefined
              }
              value={values.siteId}
              status={errors?.siteId ? "error" : "default"}
              onChange={(event) => onChange("siteId", event.target.value)}
            >
              <option value="">{SELECT_PLACEHOLDER}</option>
              {/* Düzenleme kipinde kaydın şantiyesi listede olmayabilir
                  (arşiv, yetki süzgeci) — seçim sessizce KIRPILMAZ. */}
              {values.siteId &&
                values.siteId !== SITE_UNASSIGNED_VALUE &&
                !sites.items.some((item) => item.siteId === values.siteId) && (
                  <option value={values.siteId}>Atanmış şantiye (listede yok)</option>
                )}
              {sites.items.map((item) => (
                <option key={item.siteId} value={item.siteId}>
                  {item.label}
                </option>
              ))}
              {/* 118 son seçenek — `site_id = null` */}
              <option value={SITE_UNASSIGNED_VALUE}>{UNASSIGNED_SITE_LABEL}</option>
            </Select>
          )}
        </Field>

        {/* 119 */}
        <Field label="Sorumlu Operatör">
          {(control) => (
            <Select
              {...control}
              aria-describedby={
                [control["aria-describedby"], operatorNoteId].filter(Boolean).join(" ") ||
                undefined
              }
              value={values.operatorId}
              onChange={(event) => onChange("operatorId", event.target.value)}
            >
              <option value="">{SELECT_PLACEHOLDER}</option>
              {values.operatorId &&
                !operators.items.some((item) => item.id === values.operatorId) && (
                  <option value={values.operatorId}>Atanmış operatör (listede yok)</option>
                )}
              {operators.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 120 — boş seçenek yok ama sunucuda NOT NULL (K5 kapısı DIŞI) */}
        <Field label="Durum">
          {(control) => (
            <Select
              {...control}
              value={values.status}
              onChange={(event) =>
                onChange("status", event.target.value as EquipmentFormValues["status"])
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 121 — "—" seçeneği `none` ENUM'udur, BOŞ DEĞİL → K5 kapısı */}
        <Field label="Yakıt Tipi">
          {(control) => (
            <Select
              {...control}
              value={values.fuelType}
              onChange={(event) =>
                onChange("fuelType", event.target.value as EquipmentFormValues["fuelType"])
              }
            >
              {FUEL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 122 — sayı parçası; ipucu mockup'tan AYNEN + bölme gerekçesi */}
        <Field label="Norm Tüketim" hint={`${NORM_CONSUMPTION_HINT} · ${NORM_SPLIT_NOTE}`}>
          {(control) => (
            <Input
              {...control}
              type="number"
              numeric
              min={0}
              step="0.01"
              value={values.normConsumption}
              placeholder="4.2"
              onChange={(event) => onChange("normConsumption", event.target.value)}
            />
          )}
        </Field>

        {/* 122 — birim parçası; boş seçenek YOK → K5 kapısı */}
        <Field label={NORM_UNIT_LABEL}>
          {(control) => (
            <Select
              {...control}
              value={values.normUnit}
              onChange={(event) =>
                onChange("normUnit", event.target.value as EquipmentFormValues["normUnit"])
              }
            >
              {NORM_UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 123 — boş seçenek YOK → K5 kapısı */}
        <Field label="Bakım Periyodu">
          {(control) => (
            <Select
              {...control}
              value={values.maintenancePeriod}
              onChange={(event) =>
                onChange(
                  "maintenancePeriod",
                  event.target.value as EquipmentFormValues["maintenancePeriod"],
                )
              }
            >
              {MAINTENANCE_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <p className="eqf-picker-note" id={siteNoteId}>
        {siteNote(sites)}
      </p>
      <p className="eqf-picker-note" id={operatorNoteId}>
        {operatorNote(operators)}
      </p>
    </section>
  );
}
