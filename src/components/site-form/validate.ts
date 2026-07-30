/**
 * İstemci doğrulaması (spec §10). Sunucununkini **taklit eder, yerine geçmez**.
 * Mesajlar §10.1 / §10.3 tablolarından birebir alınmıştır (metin envanteri
 * §15/82) — yeniden yazılmaz.
 */

import { numberOrNull } from "./build-body";
import type { SiteFormValues } from "./form-state";

export const MESSAGES = {
  nameRequired: "Şantiye adı zorunludur.",
  chiefRequired: "Şantiye şefi seçiniz.",
  cityRequired: "İl / ilçe zorunludur.",
  constructionAreaRequired: "İnşaat alanı zorunludur.",
  startDateRequired: "Başlangıç tarihi zorunludur.",
  endDateRequired: "Planlanan bitiş tarihi zorunludur.",
  endBeforeStart: "Planlanan bitiş tarihi başlangıçtan önce olamaz.",
  negativeValue: "Değer negatif olamaz.",
  notANumber: "Bu alan sayı olmalıdır.",
  workerCountInteger: "İşçi sayısı tam sayı olmalıdır.",
  siteCodeConflict:
    "Bu şantiye kodu zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın.",
} as const;

export type SiteFormErrors = Partial<Record<keyof SiteFormValues, string>>;

export function hasSiteFormErrors(errors: SiteFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

interface ValidateOptions {
  isDraft: boolean;
  /**
   * `GET /users` yüklenemedi (403 veya diğer hata). Şantiye Şefi zorunluluğu
   * bu durumda KALKAR (spec §10.1.1, §11.15): kullanıcının seçemediği alan
   * zorunlu tutulamaz. Liste geldiğinde kural aynen işler.
   */
  isUserListUnavailable: boolean;
}

/** Boş geçerli; dolu ise sayı olmalı ve negatif olamaz. */
function numberError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const parsed = numberOrNull(value);
  if (parsed === null) return MESSAGES.notANumber;
  if (parsed < 0) return MESSAGES.negativeValue;
  return undefined;
}

/** İşçi sayısı: sayı kurallarına ek olarak tam sayı olmalıdır (§10.3). */
function workerCountError(value: string): string | undefined {
  const base = numberError(value);
  if (base) return base;
  const parsed = numberOrNull(value);
  if (parsed !== null && !Number.isInteger(parsed)) return MESSAGES.workerCountInteger;
  return undefined;
}

/**
 * Alan hatalarını üretir. Taslakta yalnız ad zorunludur; tarih sırası ve
 * negatif sayı kuralları taslakta da UYGULANIR (eksik değil, yanlış veri).
 *
 * GPS için hiçbir kural yoktur (§4.2.1, §11.13).
 */
export function validateSiteForm(
  values: SiteFormValues,
  { isDraft, isUserListUnavailable }: ValidateOptions,
): SiteFormErrors {
  const errors: SiteFormErrors = {};

  if (!values.name.trim()) errors.name = MESSAGES.nameRequired;

  if (!isDraft) {
    if (!values.siteManagerUserId && !isUserListUnavailable) {
      errors.siteManagerUserId = MESSAGES.chiefRequired;
    }
    if (!values.city.trim()) errors.city = MESSAGES.cityRequired;
    if (!values.constructionAreaM2.trim()) {
      errors.constructionAreaM2 = MESSAGES.constructionAreaRequired;
    }
    if (!values.startDate) errors.startDate = MESSAGES.startDateRequired;
    if (!values.endDate) errors.endDate = MESSAGES.endDateRequired;
  }

  const landAreaError = numberError(values.landAreaM2);
  if (landAreaError) errors.landAreaM2 = landAreaError;

  const constructionAreaError = numberError(values.constructionAreaM2);
  if (constructionAreaError) errors.constructionAreaM2 = constructionAreaError;

  const budgetError = numberError(values.budget);
  if (budgetError) errors.budget = budgetError;

  const workerError = workerCountError(values.plannedWorkerCount);
  if (workerError) errors.plannedWorkerCount = workerError;

  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = MESSAGES.endBeforeStart;
  }

  return errors;
}
