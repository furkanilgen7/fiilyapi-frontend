"use client";

import { useState } from "react";

import { Button, DateInput, Field, Input, Select } from "@/components/ui";
import { Modal } from "@/components/settings/Modal";
import { WarningTriangleIcon } from "@/components/ui/icons";
import { backendErrorMessage } from "@/lib/api/error-message";
import type { PayrollPeriodListRow } from "@/lib/api/hooks/usePayroll";
import { useCreatePayrollPeriod } from "@/lib/api/hooks/usePayrollMutations";
import { PERIOD_MONTHS } from "@/lib/format";

import { nextPeriodSuggestion, periodFormBlockReason } from "./payroll-derive";
import {
  OPEN_PERIOD_CANCEL_LABEL,
  OPEN_PERIOD_DUE_HINT,
  OPEN_PERIOD_DUE_LABEL,
  OPEN_PERIOD_ERROR_FALLBACK,
  OPEN_PERIOD_MONTH_ARIA,
  OPEN_PERIOD_PERIOD_LABEL,
  OPEN_PERIOD_SUBMIT_LABEL,
  OPEN_PERIOD_SUBTITLE,
  OPEN_PERIOD_TITLE,
  OPEN_PERIOD_YEAR_ARIA,
} from "./payroll-labels";
import "./payroll.css";

/**
 * F-BORDRO T2 · **DÖNEM AÇ** diyaloğu — uç: `POST /payroll/periods`.
 *
 * 🔴🔴 **ONAYLI SAPMA — MOCKUP'I YOKTUR.** Bu deponun kuralı *"UI mockup'a
 * BİREBİR; kafana göre tasarım YOK"*tur. `Form - Dönem Aç` mockup'ı ne
 * `projedesign/`de ne de `TASARIM-BRIEFI-2`de vardır. Yönetim kararı:
 * **modülün kullanılamaz kalması, türetilmiş bir formdan daha kötüdür.**
 * Canlıda `payroll_periods`a satır basan migration YOKTUR (bilinçli — dönemi
 * kullanıcı açar), dolayısıyla bu form olmadan üç bordro ekranı da KALICI
 * olarak boştur; kullanıcının bildirdiği kusur buydu.
 *
 * Sapma SERBEST TASARIM DEĞİLDİR — kanonik form modalı kabuğundan
 * (`LeaveRequestFormModal` / S-FRM deseni) BİREBİR türetildi:
 *   • kabuk `settings/Modal` (başlık + `footer` + odak tuzağı) — YENİ kabuk YOK;
 *   • alt başlık `iz-form__subtitle` emsali, hata `…__error`, pasif düğmenin
 *     gerekçesi footer'ın SOL ucunda `WarningTriangleIcon` ile OKUNUR;
 *   • ham `<select>`/`<input>` YOK — `ui/` primitive'leri; tarih `ui/DateInput`.
 *
 * 🔴 ALANLAR UÇTAN ÖLÇÜLDÜ, uydurulmadı (`PayrollPeriodCreate`):
 *   `year: number` (2000-2100) · `month: number` (1-12) ·
 *   `payment_due_date?: string | null` (OPSİYONEL).
 * Şema `extra="forbid"`dir: `status` GÖVDEYE GİRMEZ — yeni dönem her zaman
 * `draft`tır, aksi hâlde bir ay doğrudan `paid` açılıp onay zinciri atlanırdı.
 *
 * 🔴 Yıl+ay ÇİFTİ `ProgressPaymentForm` kanonuyla aynı çizilir (tek `Field`
 * içinde ay `Select`i + yıl `Input`u); ay adları `PERIOD_MONTHS` TEK
 * kaynağından gelir, kopyalanmaz.
 */
export interface PayrollPeriodFormModalProps {
  /** Açık dönemler — öneri ve "zaten açılmış" uyarısı bundan türer. */
  rows: readonly PayrollPeriodListRow[];
  onClose: () => void;
  /** Açılan dönem çağırana bildirilir (ay gezgini oraya atlar). */
  onCreated: (periodId: string) => void;
}

/** Yıl girdisi ayrıştırılamıyorsa `null` — `0`a düşmek 422 üretirdi. */
function parseYear(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

export function PayrollPeriodFormModal({
  rows,
  onClose,
  onCreated,
}: PayrollPeriodFormModalProps) {
  const createPeriod = useCreatePayrollPeriod();
  // 🔴 Öneri VERİDEN türer, `new Date()`ten DEĞİL (gerekçe:
  // `nextPeriodSuggestion`). Hiç dönem yoksa alanlar boş açılır.
  const [suggestion] = useState(() => nextPeriodSuggestion(rows));

  const [yearText, setYearText] = useState(
    suggestion === undefined ? "" : String(suggestion.year),
  );
  const [month, setMonth] = useState<number | null>(suggestion?.month ?? null);
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createPeriod.isPending;
  const year = parseYear(yearText);
  const blockReason = periodFormBlockReason({ year, month, rows });

  async function handleSubmit() {
    // Tip daraltması: `blockReason` ikisinin de dolu olduğunu zaten garanti
    // eder, ama derleyici bunu bilemez.
    if (blockReason !== undefined || year === null || month === null) return;
    setFormError(null);
    try {
      const created = await createPeriod.mutateAsync({
        year,
        month,
        // 🔴 Boş bırakılan alan gövdeye HİÇ eklenmez (`EmployerFormModal`
        // deseni): açıkça `null` göndermek "tarihi temizle" demektir ve bu bir
        // AÇMA isteğinde anlamsızdır.
        ...(dueDate === "" ? {} : { payment_due_date: dueDate }),
      });
      onCreated(created.id);
    } catch (error) {
      setFormError(backendErrorMessage(error, OPEN_PERIOD_ERROR_FALLBACK));
      return;
    }
    onClose();
  }

  return (
    <Modal
      title={OPEN_PERIOD_TITLE}
      className="bor-modal"
      onClose={onClose}
      footer={
        <>
          {blockReason !== undefined && (
            <span className="bor-form__footer-note" data-testid="bordro-open-block-reason">
              <WarningTriangleIcon className="bor-form__footer-icon" />
              {blockReason}
            </span>
          )}
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            {OPEN_PERIOD_CANCEL_LABEL}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={blockReason !== undefined || isPending}
            data-testid="bordro-open-submit"
          >
            {OPEN_PERIOD_SUBMIT_LABEL}
          </Button>
        </>
      }
    >
      <p className="bor-form__subtitle">{OPEN_PERIOD_SUBTITLE}</p>

      <Field label={OPEN_PERIOD_PERIOD_LABEL} required>
        {(control) => (
          <div className="bor-form__period-row">
            <Select
              {...control}
              value={month ?? ""}
              disabled={isPending}
              aria-label={OPEN_PERIOD_MONTH_ARIA}
              onChange={(event) => {
                setMonth(event.target.value === "" ? null : Number(event.target.value));
                setFormError(null);
              }}
              data-testid="bordro-open-month"
            >
              <option value="">{OPEN_PERIOD_MONTH_ARIA}</option>
              {PERIOD_MONTHS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              numeric
              disabled={isPending}
              aria-label={OPEN_PERIOD_YEAR_ARIA}
              value={yearText}
              onChange={(event) => {
                setYearText(event.target.value);
                setFormError(null);
              }}
              data-testid="bordro-open-year"
            />
          </div>
        )}
      </Field>

      <Field label={OPEN_PERIOD_DUE_LABEL} hint={OPEN_PERIOD_DUE_HINT}>
        {(control) => (
          <DateInput
            {...control}
            value={dueDate}
            disabled={isPending}
            onValueChange={(iso) => {
              setDueDate(iso);
              setFormError(null);
            }}
            data-testid="bordro-open-due"
          />
        )}
      </Field>

      {formError !== null && (
        <p className="bor-form__error" data-testid="bordro-open-error">
          {formError}
        </p>
      )}
    </Modal>
  );
}
