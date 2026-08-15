/**
 * Personel belge formunun SAF gövde üreticisi (React'sız, ayrı test edilir).
 *
 * 🔴 BOŞ BIRAKILAN İSTEĞE BAĞLI ALAN GÖVDEYE HİÇ KONMAZ — boş dize göndermek
 * "bilinmiyor" değil "boş metin" demektir ve `type_id`de 422 üretir
 * (`document-form/build-input.ts` ile aynı kapsam semantiği).
 *
 * 🔴 XOR YAPISAL: "Diğer…" seçiliyse gövdeye YALNIZ `free_label`, aksi hâlde
 * YALNIZ `type_id` konur. İkisini birden koyan bir dal YOKTUR — şema
 * `model_validator`ı "tam biri" ister.
 *
 * 🔴 DEVRE-DIŞI BASILAN "Arşivden Mevcut Belge Seç" (108-117) gövdeye GİRMEZ:
 * `document_id` YALNIZ iki adımlı yüklemenin döndürdüğü künyeden gelir.
 */

import type { PersonnelDocumentCreate } from "@/lib/api/hooks/usePersonnelDocumentMutations";

import { OTHER_TYPE_VALUE } from "./constants";
import type { PersonnelDocumentFormValues } from "./validate";

export function buildPersonnelDocumentBody(
  values: PersonnelDocumentFormValues,
  documentId: string | null,
): PersonnelDocumentCreate {
  const freeLabel = values.freeLabel.trim();
  const issuedAt = values.issuedAt.trim();
  const validUntil = values.validUntil.trim();
  const note = values.note.trim();

  return {
    ...(values.typeId === OTHER_TYPE_VALUE
      ? { free_label: freeLabel }
      : { type_id: values.typeId }),
    ...(issuedAt ? { issued_at: issuedAt } : {}),
    ...(validUntil ? { valid_until: validUntil } : {}),
    ...(note ? { note } : {}),
    ...(documentId ? { document_id: documentId } : {}),
  };
}
