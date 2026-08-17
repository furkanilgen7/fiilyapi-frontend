/**
 * İstemci doğrulaması — backend `app/modules/sites/guards.py::validate_section`
 * runtime'ıyla BİREBİR (brief §Doğrulama). Mesajlar birebir alınmıştır,
 * yeniden yazılmaz.
 */

import { numberOrNull } from "./build-body";
import type { SectionFormValues } from "./form-state";

export const MESSAGES = {
  nameRequired: "Bölüm adı zorunludur.",
  endBeforeStart: "Planlanan bitiş tarihi başlangıçtan önce olamaz.",
  sectionTypeRequired: "Bölüm tipi seçiniz.",
  managerRequired: "Bölüm sorumlusu seçiniz.",
  datesRequired: "Başlangıç ve planlanan bitiş tarihi zorunludur.",
  budgetRequired: "Bölüm bedeli zorunludur.",
  sectionCodeConflict:
    "Bu bölüm kodu bu şantiyede zaten kullanılıyor. Farklı bir kod girin veya kodu boş bırakın.",
  // F-TKV T5 — "Milestone Ekle" satırı YARIM bırakılamaz: backend
  // `SectionMilestoneInput`te `title` ve `milestone_date` ikisi de ZORUNLUDUR
  // (422). Yarım satır sessizce DÜŞÜRÜLSEYDİ kullanıcı milestone girdiğini
  // sanır, kayıt hiç oluşmazdı.
  milestoneIncomplete: "Milestone için hem ad hem tarih girilmelidir.",
} as const;

export type SectionFormErrors = Partial<Record<keyof SectionFormValues, string>>;

export function hasSectionFormErrors(errors: SectionFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

interface ValidateOptions {
  isDraft: boolean;
  /**
   * `GET /users` yüklenemedi (site-form/user-picker deseni). Bölüm sorumlusu
   * zorunluluğu bu durumda KALKAR — kullanıcının seçemediği bir alan zorunlu
   * tutulamaz (backend kuralı "manager_user_id BOŞ VEYA manager_name BOŞ"
   * ikisinden birini ister; formda manager_name karşılığı olmadığından liste
   * yokken tek yol da kapanmış olur, bu yüzden kural gevşer).
   */
  isUserListUnavailable: boolean;
  /**
   * Düzenleme kipinde, mevcut kayıtta serbest-metin `manager_name` doluysa
   * `true` (final review I1). Backend kuralı "manager_user_id BOŞ VEYA
   * manager_name BOŞ DEĞİL" ikisinden birini yeter sayar; form `manager_name`
   * alanını ne okur ne yazar (build-body.ts PATCH gövdesine hiç sızdırmaz),
   * bu yüzden eski (yalnız-isim) sorumlu kayıtlı bölümler bu bayrak olmadan
   * "Bölüm sorumlusu seçiniz." duvarına çarpar — kullanıcı hiçbir şey
   * değiştirmese bile kaydedemez.
   */
  hasExistingManagerName: boolean;
}

/**
 * Alan hatalarını üretir. Pydantic `min_length=1` yüzünden `name` HER İKİ
 * yolda da zorunludur. Tarih tutarlılığı taslakta da uygulanır. Geri kalan
 * zorunluluklar YALNIZ `isDraft: false` (Bölümü Oluştur / yayınla) yolunda.
 */
export function validateSectionForm(
  values: SectionFormValues,
  { isDraft, isUserListUnavailable, hasExistingManagerName }: ValidateOptions,
): SectionFormErrors {
  const errors: SectionFormErrors = {};

  if (!values.name.trim()) errors.name = MESSAGES.nameRequired;

  // Tutarlılık — HER ZAMAN, taslakta da (brief §Doğrulama).
  if (
    values.startDate &&
    values.endDate &&
    values.endDate < values.startDate
  ) {
    errors.endDate = MESSAGES.endBeforeStart;
  }

  // Milestone satırı YARIM olamaz — taslakta da geçerli (backend `title`/
  // `milestone_date` ikisini de ister, taslak bayrağı bunu gevşetmez).
  const hasMilestoneTitle = values.milestoneTitle.trim().length > 0;
  const hasMilestoneDate = values.milestoneDate.trim().length > 0;
  if (hasMilestoneTitle !== hasMilestoneDate) {
    errors.milestoneTitle = MESSAGES.milestoneIncomplete;
  }

  if (!isDraft) {
    if (!values.sectionType) errors.sectionType = MESSAGES.sectionTypeRequired;

    if (!values.managerUserId && !isUserListUnavailable && !hasExistingManagerName) {
      errors.managerUserId = MESSAGES.managerRequired;
    }

    if (!errors.endDate && (!values.startDate || !values.endDate)) {
      errors.startDate = MESSAGES.datesRequired;
    }

    // `budget_amount` — `is None` kontrolü, `0` GEÇERLİDİR (falsy kontrolü DEĞİL).
    if (numberOrNull(values.budgetAmount) === null) {
      errors.budgetAmount = MESSAGES.budgetRequired;
    }
  }

  return errors;
}
