"use client";

import { useState } from "react";

import { Modal } from "@/components/settings/Modal";
import { Button, Field, Input, Segmented, Select, Textarea } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatUnitRate } from "@/lib/earned-value";
import { backendErrorMessage } from "@/lib/api/error-message";
import { useCreateEvCatalogItem, useUpdateEvCatalogItem } from "@/lib/api/hooks/useEvCatalog";
import type { EvCatalogItemRead, EvDisciplineRead } from "@/lib/api/models";

import { CONTRACTOR_OPTIONS } from "./CatalogBits";
import { FormErrorBanner, groupProps } from "./FormErrorBanner";
import {
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
  buildCatalogCreateBody,
  buildCatalogUpdateBody,
  catalogFormFromItem,
  emptyCatalogForm,
  unitOptions,
  validateCatalogForm,
  type CatalogFormState,
  type ContractorType,
} from "./catalog-item-form";

export type CatalogFormMode = { kind: "create"; disciplineId: string | null } | { kind: "edit"; item: EvCatalogItemRead };

interface CatalogItemFormModalProps {
  mode: CatalogFormMode;
  disciplines: readonly EvDisciplineRead[];
  /** Katalogda kullanılan birimler — açılır listeye eklenir. */
  catalogUnits: readonly string[];
  /** full altı: form salt okunur açılır, Kaydet yok (KAT:398). */
  readOnly: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function initialForm(mode: CatalogFormMode, disciplines: readonly EvDisciplineRead[]): CatalogFormState {
  if (mode.kind === "edit") return catalogFormFromItem(mode.item);
  // KAT:528 — yeni iş tipi: seçili süzgeç disiplini, yoksa ilki; yapan disiplinin varsayılanı.
  const discipline = disciplines.find((d) => d.id === mode.disciplineId) ?? disciplines[0];
  return emptyCatalogForm(discipline?.id ?? "", discipline?.default_contractor_type ?? "own");
}

function formTitle(mode: CatalogFormMode, readOnly: boolean): string {
  if (readOnly) return "İş Tipi";
  return mode.kind === "edit" ? "İş Tipi Düzenle" : "İş Tipi Ekle";
}

/** KAT:473-475 — oran ipucu: düzenlemede geçmiş ortalama varsa onu söyler. */
function rateHint(mode: CatalogFormMode): string {
  if (mode.kind === "edit" && mode.item.actual.avg !== null) {
    return `Geçmiş ort. ${formatUnitRate(mode.item.actual.avg)} · ${mode.item.actual.site_count} şantiye`;
  }
  return "Bir birim iş için planlanan adam-saat";
}

/** KAT:234-296 — "İş Tipi Ekle / Düzenle" modalı. */
export function CatalogItemFormModal({
  mode,
  disciplines,
  catalogUnits,
  readOnly,
  onClose,
  onSaved,
}: CatalogItemFormModalProps) {
  const create = useCreateEvCatalogItem();
  const update = useUpdateEvCatalogItem();
  const [initial] = useState(() => initialForm(mode, disciplines));
  const [form, setForm] = useState(initial);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isPending = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  const errors = isSubmitted ? validateCatalogForm(form) : {};
  const errorCount = Object.keys(errors).length;
  const units = unitOptions(catalogUnits, form.uom);

  function patch(changes: Partial<CatalogFormState>) {
    setForm((current) => ({ ...current, ...changes }));
  }

  function chooseDiscipline(discipline: EvDisciplineRead) {
    // KAT:472 — disiplin seçimi varsayılan yapanı disiplinden alır.
    patch({ disciplineId: discipline.id, own: discipline.default_contractor_type });
  }

  function save() {
    setIsSubmitted(true);
    if (Object.keys(validateCatalogForm(form)).length > 0) return;
    const name = form.name.trim();
    if (mode.kind === "create") {
      create.mutate(buildCatalogCreateBody(form), { onSuccess: () => onSaved(`${name} kataloğa eklendi`) });
      return;
    }
    const body = buildCatalogUpdateBody(initial, form);
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    update.mutate({ id: mode.item.id, body }, { onSuccess: () => onSaved(`${name} güncellendi`) });
  }

  const footer = readOnly ? (
    <Button variant="secondary" onClick={onClose}>
      Kapat
    </Button>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose} disabled={isPending}>
        Vazgeç
      </Button>
      <Button onClick={save} disabled={isPending}>
        Kaydet
      </Button>
    </>
  );

  return (
    <Modal title={formTitle(mode, readOnly)} onClose={onClose} footer={footer} className="ev-cat-modal--form">
      <div className="ev-cat-modal__body">
        <p className="ev-cat-modal__subtitle">Şirket kataloğu · bütün şantiyelerde öneri olarak görünür</p>
        {errorCount > 0 && (
          <FormErrorBanner lead={`${errorCount} alan eksik.`} text="Kaydetmeden önce işaretli alanları doldurun." />
        )}
        {saveError && <FormErrorBanner text={backendErrorMessage(saveError)} />}

        <Field
          label="İş tipi adı"
          required
          hint={errors.name ? undefined : "Maks 120 karakter · aynı disiplinde tekil"}
          error={errors.name}
        >
          {(control) => (
            <Input
              {...control}
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              readOnly={readOnly}
              maxLength={CATALOG_NAME_MAX_LENGTH}
              placeholder="Örn. Beton döküm"
              status={errors.name ? "error" : "default"}
            />
          )}
        </Field>

        <div className="ev-cat-form__row">
          <Field label="Disiplin" required error={errors.discipline}>
            {(control) => (
              <div {...groupProps(control)} className="ev-cat-chips" role="group" aria-label="Disiplin">
                {disciplines.map((discipline) => (
                  <button
                    key={discipline.id}
                    type="button"
                    className="ev-cat-chip"
                    aria-pressed={form.disciplineId === discipline.id}
                    disabled={readOnly}
                    onClick={() => chooseDiscipline(discipline)}
                  >
                    {discipline.name}
                  </button>
                ))}
              </div>
            )}
          </Field>
          <Field label="Birim" required>
            {(control) => (
              <Select
                {...control}
                value={form.uom}
                onChange={(event) => patch({ uom: event.target.value })}
                disabled={readOnly}
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="ev-cat-form__pair">
          <div className={cx("ev-cat-rate", errors.rate && "ev-cat-rate--error")}>
            <Field
              label="Standart oran"
              required
              hint={errors.rate ? undefined : rateHint(mode)}
              error={errors.rate}
            >
              {(control) => (
                <span className="ev-cat-rate__input">
                  <Input
                    {...control}
                    value={form.rate}
                    onChange={(event) => patch({ rate: event.target.value })}
                    readOnly={readOnly}
                    inputMode="decimal"
                    placeholder="0,00"
                    numeric
                    status={errors.rate ? "error" : "default"}
                  />
                  <span className="ev-cat-rate__suffix">{`a-s/${form.uom}`}</span>
                </span>
              )}
            </Field>
          </div>
          <Field label="Varsayılan yapan" hint="Bütçede kalem bazında değiştirilebilir">
            {(control) => (
              <div {...groupProps(control)}>
                <Segmented<ContractorType>
                  aria-label="Varsayılan yapan"
                  options={CONTRACTOR_OPTIONS}
                  value={form.own}
                  onChange={(own) => patch({ own })}
                  disabled={readOnly}
                  fill
                />
              </div>
            )}
          </Field>
        </div>

        <Field label="Açıklama">
          {(control) => (
            <Textarea
              {...control}
              value={form.description}
              onChange={(event) => patch({ description: event.target.value })}
              readOnly={readOnly}
              rows={3}
              maxLength={CATALOG_DESCRIPTION_MAX_LENGTH}
              placeholder="Kapsam: neler dahil, neler hariç"
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}
