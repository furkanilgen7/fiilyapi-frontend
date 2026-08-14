import { backendErrorMessage } from "@/lib/api/error-message";
import { BackendError } from "@/lib/api/unwrap";

/**
 * Ekipman kaydetme hatalarının Türkçe metinleri (`personnel-form/
 * submit-errors.ts` deseni).
 *
 * 422 ile diğer hatalar TEK METNE İNDİRİLMEZ: 422 "girdiğiniz bilgi geçersiz"
 * demektir ve çözümü alanı düzeltmektir; ağ/500 hatasının çözümü tekrar
 * denemektir. Mesaj gövdesi repodaki TEK KAYNAKTAN gelir
 * (`lib/api/error-message.ts`): backend Türkçe `detail` yazdıysa O basılır.
 *
 * 🔴 En sık 422 sebebi K8'dir (MK-1 K2: `ownership == owned` iken
 * `purchase_amount` zorunlu). Form bunu istemcide de doğrular — bu metin
 * yalnızca istemci denetiminden KAÇAN durumlar için son savunmadır.
 */

/** 422 — sunucu `detail` yazmadıysa. */
export const INVALID_EQUIPMENT_FALLBACK =
  "Girilen bilgiler sunucu doğrulamasından geçmedi — alış bedeli, tarih ve sayısal alanları denetleyin.";

/** Diğer her durum. */
export const SAVE_EQUIPMENT_FALLBACK = "Ekipman kaydedilemedi.";

const INVALID_PREFIX = "Geçersiz bilgi";

export function equipmentSubmitErrorMessage(error: unknown): string {
  if (error instanceof BackendError && error.status === 422) {
    return `${INVALID_PREFIX}: ${backendErrorMessage(error, INVALID_EQUIPMENT_FALLBACK)}`;
  }
  return backendErrorMessage(error, SAVE_EQUIPMENT_FALLBACK);
}
