/**
 * Belge yükleme formlarının SAF gövde üreticileri (React'sız, ayrı test edilir).
 *
 * 🔴 BOŞ BIRAKILAN İSTEĞE BAĞLI ALAN GÖVDEYE HİÇ KONMAZ — boş dize göndermek
 * gerçek backend'de 422 üretir (`DocumentUploadModal` ve `useDocumentFolders`
 * ile aynı kapsam semantiği: "geçmemek" ≠ "boş").
 *
 * 🔴 DEVRE-DIŞI BASILAN ALANLAR GÖVDEYE GİRMEZ:
 *   EKP "Belge No" (111-114) · "Düzenlenme Tarihi" (115-118) · "Not" (147-151)
 *   ARŞ "Belge Adı" (121-125)
 * Bu alanların şemada karşılığı YOKTUR; form onları taşımaz.
 */

import type { DocumentUploadInput } from "@/lib/api/documents-client";
import type { EquipmentDocumentUploadInput } from "@/lib/api/equipment-documents-client";

import type { ArchiveDocumentFormValues, EquipmentDocumentFormValues } from "./validate";

/**
 * EKP girdisi. `file`/`typeId` doğrulamadan geçmiş sayılır (`file` burada
 * yine de daraltılır, çünkü tip `File | null`dır).
 */
export function buildEquipmentDocumentInput(
  equipmentId: string,
  values: EquipmentDocumentFormValues,
  file: File,
): EquipmentDocumentUploadInput {
  const validUntil = values.validUntil.trim();
  return {
    equipmentId,
    file,
    typeId: values.typeId.trim(),
    ...(validUntil ? { validUntil } : {}),
  };
}

/** ARŞ girdisi — `DocumentUploadInput` (mevcut `useUploadDocument` hook'u). */
export function buildArchiveDocumentInput(
  values: ArchiveDocumentFormValues,
  file: File,
): DocumentUploadInput {
  const siteId = values.siteId.trim();
  const folderId = values.folderId.trim();
  const description = values.description.trim();
  return {
    file,
    projectId: values.projectId.trim(),
    ...(siteId ? { siteId } : {}),
    ...(folderId ? { folderId } : {}),
    ...(description ? { description } : {}),
  };
}
