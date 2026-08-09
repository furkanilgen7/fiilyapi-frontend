/**
 * FSO istemci doğrulaması.
 *
 * Zorunluluklar mockup'taki `*` işaretlerinden gelir (56 Proje · 59 Şantiye ·
 * 75 Taşeron Firma · 82 İş Kategorisi · 90 Sözleşme No · 91 İmza Tarihi ·
 * 93 İşe Başlama · 94 Bitiş Tarihi). Sayısal sınırlar openapi
 * `SubcontractorContractCreate`ten: `advance_pct`/`retainage_pct` 0-100,
 * `payment_term_days` ≥ 0 tamsayı, `late_penalty_daily` ≥ 0.
 */

import { PCT_MAX, PCT_MIN } from "./constants";
import type { SubcontractorContractFormValues } from "./form-state";

export const MESSAGES = {
  projectRequired: "Proje seçiniz.",
  siteRequired: "Şantiye seçiniz.",
  subcontractorRequired: "Taşeron firma seçiniz.",
  workCategoryRequired: "İş kategorisi seçiniz.",
  contractNoRequired: "Sözleşme no zorunludur.",
  signatureDateRequired: "İmza tarihi zorunludur.",
  startDateRequired: "İşe başlama tarihi zorunludur.",
  endDateRequired: "Bitiş tarihi zorunludur.",
  endBeforeStart: "Bitiş tarihi işe başlama tarihinden önce olamaz.",
  pctRange: "Oran 0 ile 100 arasında olmalıdır.",
  termDaysInvalid: "Ödeme vadesi 0 veya daha büyük bir tam sayı olmalıdır.",
  latePenaltyInvalid: "Gecikme cezası 0 veya daha büyük olmalıdır.",
} as const;

export type SubcontractorContractFormErrors = Partial<
  Record<keyof SubcontractorContractFormValues, string>
>;

export function hasContractFormErrors(errors: SubcontractorContractFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Boş string → `null`; sayı olmayan metin → `NaN` (çağıran ayırt eder). */
function numberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

function pctError(raw: string): string | undefined {
  const value = numberOrNull(raw);
  if (value === null) return undefined;
  if (!Number.isFinite(value)) return MESSAGES.pctRange;
  return value < PCT_MIN || value > PCT_MAX ? MESSAGES.pctRange : undefined;
}

export interface ValidateContractFormOptions {
  /**
   * `true` → "Taslak Kaydet". Taslakta YALNIZ proje zorunludur (sözleşme
   * PROJE altında açılır, uç proje kimliği olmadan çağrılamaz); geri kalan
   * zorunluluklar yayına alma yolundadır. Değer/tutarlılık hataları taslakta
   * da uygulanır — geçersiz sayı taslağa da yazılmamalıdır.
   */
  isDraft: boolean;
}

export function validateContractForm(
  values: SubcontractorContractFormValues,
  { isDraft }: ValidateContractFormOptions,
): SubcontractorContractFormErrors {
  const errors: SubcontractorContractFormErrors = {};

  if (!values.projectId) errors.projectId = MESSAGES.projectRequired;

  const advanceProblem = pctError(values.advancePct);
  if (advanceProblem) errors.advancePct = advanceProblem;
  const retainageProblem = pctError(values.retainagePct);
  if (retainageProblem) errors.retainagePct = retainageProblem;

  const termDays = numberOrNull(values.paymentTermDays);
  if (termDays !== null && (!Number.isInteger(termDays) || termDays < 0)) {
    errors.paymentTermDays = MESSAGES.termDaysInvalid;
  }

  const latePenalty = numberOrNull(values.latePenaltyDaily);
  if (latePenalty !== null && (!Number.isFinite(latePenalty) || latePenalty < 0)) {
    errors.latePenaltyDaily = MESSAGES.latePenaltyInvalid;
  }

  // Tarih tutarlılığı — taslakta da (section-form emsali). Mockup tarih
  // kuralı YAZMAZ; bu bir DEĞER tutarlılığıdır, tasarım kararı değildir.
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = MESSAGES.endBeforeStart;
  }

  if (isDraft) return errors;

  if (!values.siteId) errors.siteId = MESSAGES.siteRequired;
  if (!values.subcontractorId) errors.subcontractorId = MESSAGES.subcontractorRequired;
  if (!values.workCategory.trim()) errors.workCategory = MESSAGES.workCategoryRequired;
  if (!values.contractNo.trim()) errors.contractNo = MESSAGES.contractNoRequired;
  if (!values.signatureDate) errors.signatureDate = MESSAGES.signatureDateRequired;
  if (!values.startDate) errors.startDate = MESSAGES.startDateRequired;
  if (!errors.endDate && !values.endDate) errors.endDate = MESSAGES.endDateRequired;

  return errors;
}
