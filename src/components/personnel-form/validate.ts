import { PERSONNEL_FIELD_MAX_LENGTH } from "./constants";
import type { PersonnelFormValues } from "./form-state";

/**
 * İstemci doğrulaması — sunucununkini taklit eder, YERİNE GEÇMEZ.
 *
 * ⚠️ Doğrulama YALNIZ doldurulabilen dört alana uygulanır (Ad · Soyad ·
 * Çalışan Tipi · Meslek/Görev). Mockup'ta `*` taşıyan ama devre-dışı basılan
 * alanlar (TC, doğum tarihi, telefon, adres, acil durum, işe giriş tarihi,
 * proje, ücret…) gönderimi ENGELLEMEZ — doldurulamayan alanı zorunlu tutmak
 * formu kilitlerdi. Bu kural kullanıcıya GÖRÜNÜR yazılır (`constants.ts`
 * `PENDING_NOTICES`).
 */
export const MESSAGES = {
  firstNameRequired: "Ad zorunludur.",
  lastNameRequired: "Soyad zorunludur.",
  sourceRequired: "Çalışan tipi seçiniz.",
  tradeRequired: "Meslek / görev seçiniz.",
  fullNameTooLong: `Ad ve soyad birlikte en fazla ${PERSONNEL_FIELD_MAX_LENGTH.full_name} karakter olabilir.`,
} as const;

export type PersonnelFormErrors = Partial<Record<keyof PersonnelFormValues, string>>;

export function hasPersonnelFormErrors(errors: PersonnelFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function validatePersonnelForm(values: PersonnelFormValues): PersonnelFormErrors {
  const errors: PersonnelFormErrors = {};

  const firstName = values.firstName.trim();
  const lastName = values.lastName.trim();

  if (!firstName) errors.firstName = MESSAGES.firstNameRequired;
  if (!lastName) errors.lastName = MESSAGES.lastNameRequired;

  // Birleşik dize sunucu sınırına vurursa alan bazlı `maxLength` yetmez
  // (ikisi ayrı ayrı sınırın yarısı kadar olabilir + araya boşluk girer).
  if (firstName && lastName) {
    const fullNameLength = `${firstName} ${lastName}`.length;
    if (fullNameLength > PERSONNEL_FIELD_MAX_LENGTH.full_name) {
      errors.lastName = MESSAGES.fullNameTooLong;
    }
  }

  if (!values.source) errors.source = MESSAGES.sourceRequired;
  if (!values.trade.trim()) errors.trade = MESSAGES.tradeRequired;

  return errors;
}
