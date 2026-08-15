/**
 * Personel belge formunun SAF doğrulaması (React'sız, ayrı test edilir).
 *
 * Sıra MOCKUP sırasıdır: ilk hatalı alan bulunur ve odak oraya verilir
 * (`document-form/validate.ts` emsali).
 *
 * 🔴 XOR: `type_id` XOR `free_label` — TAM BİRİ. Kural şemanın kendisidir
 * (`PersonnelDocumentCreate` docstring'i: `model_validator` "tam biri"yi
 * uygular, aksi hâlde 422). İSTEMCİDE DE doğrulanır ki sunucuya bilerek 422
 * attırılmasın; "Diğer…" seçilmemişken serbest etiket gövdeye HİÇ girmez
 * (bkz. `build-body.ts`), yani "ikisi de dolu" hâli yapısal olarak imkânsız
 * kılınır ve burada kalan tek risk "ikisi de boş"tur.
 */

import { MAX_LENGTH, OTHER_TYPE_VALUE, NO_PROJECT_UPLOAD_REASON } from "./constants";

export type PersonnelDocumentField =
  | "file"
  | "typeId"
  | "freeLabel"
  | "issuedAt"
  | "validUntil"
  | "note";

export interface FormProblem<TField extends string> {
  field: TField;
  message: string;
}

export interface PersonnelDocumentFormValues {
  file: File | null;
  typeId: string;
  freeLabel: string;
  issuedAt: string;
  validUntil: string;
  note: string;
}

export interface PersonnelDocumentValidationContext {
  /**
   * Personelin atanmış projesi (`assigned_project_id`). `null` ⇒ arşive
   * yükleme yapılamaz; dosya seçilmişse form DURUR.
   */
  projectId: string | null;
  /** Dosya zaten arşive yüklendiyse ikinci adımda proje gerekmez. */
  isFileUploaded: boolean;
}

/** `<input type="date">` çıktısı; şema `format: date` bekler. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(raw: string): boolean {
  if (!ISO_DATE_PATTERN.test(raw)) return false;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

export function validatePersonnelDocument(
  values: PersonnelDocumentFormValues,
  context: PersonnelDocumentValidationContext,
): FormProblem<PersonnelDocumentField> | null {
  // 88-118 · Dosya İSTEĞE BAĞLIdır (şema `document_id` nullable, "dosyasız
  // takip meşru") — ama seçildiyse yüklenebilir OLMALIDIR.
  if (values.file && !context.isFileUploaded && !context.projectId)
    return { field: "file", message: NO_PROJECT_UPLOAD_REASON };

  const freeLabel = values.freeLabel.trim();
  if (!values.typeId)
    return {
      field: "typeId",
      message: 'Belge Türü seçin — listede yoksa "Diğer…" seçip serbest etiket yazın.',
    };
  if (values.typeId === OTHER_TYPE_VALUE && !freeLabel)
    return {
      field: "freeLabel",
      message: '"Diğer…" seçildiğinde Serbest Etiket zorunludur.',
    };

  const issuedAt = values.issuedAt.trim();
  if (issuedAt && !isIsoDate(issuedAt))
    return { field: "issuedAt", message: "Düzenlenme Tarihi geçerli bir tarih olmalıdır." };

  const validUntil = values.validUntil.trim();
  if (validUntil && !isIsoDate(validUntil))
    return { field: "validUntil", message: "Geçerlilik Bitiş Tarihi geçerli bir tarih olmalıdır." };

  if (values.note.trim().length > MAX_LENGTH.note)
    return {
      field: "note",
      message: `Not en fazla ${MAX_LENGTH.note} karakter olabilir.`,
    };

  return null;
}
