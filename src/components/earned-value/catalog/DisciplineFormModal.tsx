"use client";

import { useState } from "react";

import { Modal } from "@/components/settings/Modal";
import { Button, Field, Input, Segmented } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import { useCreateEvDiscipline, useUpdateEvDiscipline } from "@/lib/api/hooks/useEvDisciplines";
import type { EvDisciplineRead } from "@/lib/api/models";

import { CONTRACTOR_OPTIONS, DisciplineSwatch } from "./CatalogBits";
import { FormErrorBanner, groupProps } from "./FormErrorBanner";
import {
  DISCIPLINE_CODE_MAX_LENGTH,
  DISCIPLINE_NAME_MAX_LENGTH,
  buildDisciplineCreateBody,
  buildDisciplineUpdateBody,
  disciplineFormFromRead,
  newDisciplineForm,
  validateDisciplineForm,
  type ContractorType,
  type DisciplineFormState,
} from "./discipline-form";
import { DISCIPLINE_PALETTE } from "./discipline-palette";

interface DisciplineFormModalProps {
  /** null = yeni disiplin. */
  discipline: EvDisciplineRead | null;
  existing: readonly EvDisciplineRead[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

/**
 * M6:227-304 — "Disiplin Ekle / Düzenle". Kod kullanımdayken de düzenlenir
 * (§3.10 F0-7). Renk seçimi 5'li paletten (§11.b); düzenlenen kaydın rengi
 * palet dışındaysa (eski veri) seçenek olarak korunur, kaybolmaz.
 */
export function DisciplineFormModal({ discipline, existing, onClose, onSaved }: DisciplineFormModalProps) {
  const create = useCreateEvDiscipline();
  const update = useUpdateEvDiscipline();
  const [form, setForm] = useState<DisciplineFormState>(() =>
    discipline ? disciplineFormFromRead(discipline) : newDisciplineForm(existing.length),
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const isPending = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;
  const errors = isSubmitted ? validateDisciplineForm(form, existing, discipline?.id ?? null) : {};
  const errorCount = Object.keys(errors).length;
  const palette =
    discipline && !DISCIPLINE_PALETTE.includes(discipline.color)
      ? [...DISCIPLINE_PALETTE, discipline.color]
      : DISCIPLINE_PALETTE;

  function patch(changes: Partial<DisciplineFormState>) {
    setForm((current) => ({ ...current, ...changes }));
  }

  function save() {
    setIsSubmitted(true);
    if (Object.keys(validateDisciplineForm(form, existing, discipline?.id ?? null)).length > 0) return;
    const name = form.name.trim();
    if (!discipline) {
      create.mutate(buildDisciplineCreateBody(form, existing), { onSuccess: () => onSaved(`${name} eklendi`) });
      return;
    }
    const body = buildDisciplineUpdateBody(discipline, form);
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    update.mutate({ id: discipline.id, body }, { onSuccess: () => onSaved(`${name} güncellendi`) });
  }

  const footer = (
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
    <Modal
      title={discipline ? "Disiplin Düzenle" : "Disiplin Ekle"}
      onClose={onClose}
      footer={footer}
      className="ev-cat-modal--form"
    >
      <div className="ev-cat-modal__body">
        <p className="ev-cat-modal__subtitle">Şirket listesi · bütün şantiyelerde ve katalogda ortak</p>
        {errorCount > 0 && (
          <FormErrorBanner lead={`${errorCount} alan hatalı.`} text="Kaydetmeden önce işaretli alanları düzeltin." />
        )}
        {saveError && <FormErrorBanner text={backendErrorMessage(saveError)} />}

        <div className="ev-cat-form__code-row">
          <Field
            label="Kod"
            required
            className="ev-cat-code"
            hint={errors.code ? undefined : discipline ? "Şirkette tekil · kullanımda da düzenlenir" : "Şirkette tekil"}
            error={errors.code}
          >
            {(control) => (
              <Input
                {...control}
                value={form.code}
                onChange={(event) => patch({ code: event.target.value.toUpperCase() })}
                maxLength={DISCIPLINE_CODE_MAX_LENGTH}
                placeholder="KAB"
                status={errors.code ? "error" : "default"}
              />
            )}
          </Field>
          <Field label="Disiplin adı" required hint={errors.name ? undefined : "Şirkette tekil"} error={errors.name}>
            {(control) => (
              <Input
                {...control}
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
                maxLength={DISCIPLINE_NAME_MAX_LENGTH}
                placeholder="Örn. Kaba İnşaat"
                status={errors.name ? "error" : "default"}
              />
            )}
          </Field>
        </div>

        <Field
          label="Grafik rengi"
          required
          hint={
            errors.color
              ? undefined
              : "Panel ve Adam-Saat Bütçesi grafiklerinde bu disiplinin rengi · aynı renk birden çok disipline verilebilir"
          }
          error={errors.color}
        >
          {(control) => (
            <div {...groupProps(control)} className="ev-cat-chips" role="group" aria-label="Grafik rengi">
              {palette.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className="ev-cat-chip ev-cat-chip--hex"
                  aria-pressed={form.color === hex}
                  onClick={() => patch({ color: hex })}
                >
                  <DisciplineSwatch color={hex} />
                  {hex}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field
          label="Varsayılan yapan"
          hint="Yeni iş tipine ve bütçede iş tipine varsayılan olarak geçer; iş tipi bazında değiştirilebilir"
        >
          {(control) => (
            <div {...groupProps(control)}>
              <Segmented<ContractorType>
                aria-label="Varsayılan yapan"
                options={CONTRACTOR_OPTIONS}
                value={form.own}
                onChange={(own) => patch({ own })}
                className="ev-cat-form__own-narrow"
                fill
              />
            </div>
          )}
        </Field>
      </div>
    </Modal>
  );
}
