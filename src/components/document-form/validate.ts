/**
 * Belge yükleme formlarının SAF doğrulaması (React'sız, ayrı test edilir).
 *
 * Sıra MOCKUP sırasıdır: ilk hatalı alan bulunur ve odak oraya verilir
 * (`contract-item-form/validate.ts` emsali). Kurallar openapi gövde
 * şemalarından gelir — ezberden yazılmaz:
 *   EKP `file`* `type_id`*  · `valid_until` isteğe bağlı (date)
 *   ARŞ `file`* `project_id`* · `site_id`/`folder_id`/`description` isteğe bağlı
 */

import { MAX_LENGTH } from "./constants";

export type EquipmentDocumentField = "file" | "typeId" | "validUntil";
export type ArchiveDocumentField = "file" | "projectId" | "description";

export interface FormProblem<TField extends string> {
  field: TField;
  message: string;
}

export interface EquipmentDocumentFormValues {
  file: File | null;
  typeId: string;
  validUntil: string;
}

export interface ArchiveDocumentFormValues {
  file: File | null;
  projectId: string;
  siteId: string;
  folderId: string;
  description: string;
}

/** `<input type="date">` çıktısı; şema `format: date` bekler. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(raw: string): boolean {
  if (!ISO_DATE_PATTERN.test(raw)) return false;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

/**
 * EKP formu. `valid_until` BOŞ bırakılabilir (mockup 122 "Boş bırakılırsa
 * süre takibi yapılmaz"); doluysa geçerli bir tarih olmalıdır.
 */
export function validateEquipmentDocument(
  values: EquipmentDocumentFormValues,
): FormProblem<EquipmentDocumentField> | null {
  if (!values.file) return { field: "file", message: "Bir dosya seçin." };
  if (!values.typeId.trim()) return { field: "typeId", message: "Belge Türü zorunludur." };

  const validUntil = values.validUntil.trim();
  if (validUntil && !isIsoDate(validUntil))
    return { field: "validUntil", message: "Geçerlilik Bitiş Tarihi geçerli bir tarih olmalıdır." };

  return null;
}

/**
 * ARŞ formu. `project_id` ZORUNLUdur (şema `required`); şantiye/klasör/
 * açıklama boş bırakılabilir — boş bırakmak "proje düzeyi / klasörsüz /
 * açıklamasız" demektir, boş dize DEĞİL (bkz. `build-input.ts`).
 */
export function validateArchiveDocument(
  values: ArchiveDocumentFormValues,
): FormProblem<ArchiveDocumentField> | null {
  if (!values.file) return { field: "file", message: "Bir dosya seçin." };
  if (!values.projectId.trim()) return { field: "projectId", message: "Proje zorunludur." };

  if (values.description.trim().length > MAX_LENGTH.description)
    return {
      field: "description",
      message: `Açıklama en fazla ${MAX_LENGTH.description} karakter olabilir.`,
    };

  return null;
}
