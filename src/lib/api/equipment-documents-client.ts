import { BackendError } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// F-BLG T2b · Ekipman belgesi yükleme — ŞEMADA olan ama `openapi-fetch` ile
// geçilemeyen multipart uç (`POST /equipment/{equipment_id}/documents`).
// `documents-client.ts` kanonu BİREBİR izlenir; yeni desen icat EDİLMEZ.

export type EquipmentDocumentResponse = components["schemas"]["EquipmentDocumentResponse"];

const EQUIPMENT_PATH = "/api/backend/equipment";

async function toBackendError(response: Response): Promise<BackendError> {
  const body = await response.json().catch(() => null);
  return new BackendError(response.status, body);
}

/** `equipmentId` UUID beklenir ama URL parçası olduğu için yine de kaçırılır. */
function uploadPath(equipmentId: string): string {
  return `${EQUIPMENT_PATH}/${encodeURIComponent(equipmentId)}/documents`;
}

export interface EquipmentDocumentUploadInput {
  equipmentId: string;
  file: File;
  /** `GET /equipment/document-types` satırının kimliği (altı sabit slot). */
  typeId: string;
  /**
   * Verilmezse gövdeye HİÇ eklenmez — backend semantiğinde "geçmemek" süre
   * takibi YAPILMAZ demektir (mockup 122), boş dize DEĞİL.
   */
  validUntil?: string;
}

/**
 * Ekipman belgesi yükler (`POST /equipment/{equipment_id}/documents`, multipart).
 *
 * ⚠️ `Content-Type` başlığı ELLE KURULMAZ: `FormData` verildiğinde tarayıcı
 * boundary'yi kendisi üretir; elle `multipart/form-data` yazmak boundary'siz
 * bir başlık üretir ve backend gövdeyi ayrıştıramaz (her yükleme 422).
 *
 * 413 (boyut sınırı) ve 422 (uzantı/tür reddi) gövdeleri YUTULMAZ — form
 * Türkçe `detail` mesajını basar.
 */
export async function uploadEquipmentDocument(
  input: EquipmentDocumentUploadInput,
): Promise<EquipmentDocumentResponse> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("type_id", input.typeId);
  if (input.validUntil !== undefined) form.append("valid_until", input.validUntil);

  const response = await globalThis.fetch(uploadPath(input.equipmentId), {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  if (!response.ok) throw await toBackendError(response);
  return (await response.json()) as EquipmentDocumentResponse;
}
