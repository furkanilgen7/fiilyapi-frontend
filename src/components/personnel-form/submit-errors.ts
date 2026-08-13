import { backendErrorMessage } from "@/lib/api/error-message";
import { BackendError } from "@/lib/api/unwrap";

/**
 * Personel kaydetme hatalarının Türkçe metinleri (spec K3).
 *
 * ⭐ KURAL: **409 ile 422 TEK MESAJA İNDİRİLMEZ.** İkisi kullanıcı için
 * bambaşka iki durumdur ve farklı eylem gerektirir:
 *   • 422 → girilen bilgi GEÇERSİZ (or. TC kimlik no doğrulamayı geçmedi,
 *     tarih biçimi bozuk). Çözüm: alanı düzeltmek.
 *   • 409 → bilgi geçerli ama AYNI KAYIT ZATEN VAR (aynı TC'li personel).
 *     Çözüm: yeni kayıt açmak değil, mevcut kaydı bulup düzenlemek.
 * "Kaydedilemedi" gibi tek bir metin kullanıcıyı ikinci durumda sonsuz
 * döngüye sokardı.
 *
 * Mesaj gövdesi repodaki TEK KAYNAKTAN gelir (`lib/api/error-message.ts`):
 * backend Türkçe `detail` yazdıysa O basılır. Öndeki etiket ("Çift kayıt:" /
 * "Geçersiz bilgi:") sunucu iki durum için AYNI `detail`i yazsa bile iki
 * metnin ayrışmasını GARANTİ eder (`timesheet-errors.ts` emsali).
 */

/** 409 — sunucu `detail` yazmadıysa. */
export const DUPLICATE_PERSONNEL_FALLBACK =
  "Bu TC kimlik numarasıyla kayıtlı bir personel zaten var — yeni kayıt açmak yerine mevcut kaydı açıp düzenleyin.";

/** 422 — sunucu `detail` yazmadıysa. */
export const INVALID_PERSONNEL_FALLBACK =
  "Girilen bilgiler sunucu doğrulamasından geçmedi — TC kimlik numarasını ve tarih alanlarını denetleyin.";

/** Diğer her durum. */
export const SAVE_PERSONNEL_FALLBACK = "Personel kaydedilemedi.";

const DUPLICATE_PREFIX = "Çift kayıt";
const INVALID_PREFIX = "Geçersiz bilgi";

/** TC alanının ALTINA basılan kısa hata — çakışmanın hangi alan olduğu belirsiz kalmaz. */
export const DUPLICATE_TC_FIELD_MESSAGE = "Bu TC kimlik no ile kayıtlı personel zaten var.";

/** Kayıt çakışması mı (409) — TC alanının altına da hata basmak için. */
export function isPersonnelDuplicateError(error: unknown): boolean {
  return error instanceof BackendError && error.status === 409;
}

export function personnelSubmitErrorMessage(error: unknown): string {
  if (error instanceof BackendError && error.status === 409) {
    return `${DUPLICATE_PREFIX}: ${backendErrorMessage(error, DUPLICATE_PERSONNEL_FALLBACK)}`;
  }
  if (error instanceof BackendError && error.status === 422) {
    return `${INVALID_PREFIX}: ${backendErrorMessage(error, INVALID_PERSONNEL_FALLBACK)}`;
  }
  return backendErrorMessage(error, SAVE_PERSONNEL_FALLBACK);
}
