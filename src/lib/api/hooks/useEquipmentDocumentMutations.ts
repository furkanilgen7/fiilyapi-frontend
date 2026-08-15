import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import {
  uploadEquipmentDocument,
  type EquipmentDocumentUploadInput,
  type EquipmentDocumentResponse,
} from "@/lib/api/equipment-documents-client";
import { EQUIPMENT_DOCUMENTS_QUERY_KEY } from "./useEquipmentDocuments";

// F-BLG T2b · Ekipman belgesi YAZMA yüzeyi — TEK mutasyon vardır.
//
// ⚠️ Belge SİLME (`DELETE /equipment/documents/{document_id}`) için hook
// YAZILMAZ: bu formun mockup'ında (`Form - Ekipman Belgesi.dc.html`) silme
// aksiyonu YOKTUR. Uç backend'de durur; eksik olan bilerek eksiktir
// (`useDocumentMutations.ts` ile aynı karar).

/**
 * Ekipman belgesi yükleme (multipart).
 *
 * `openapi-fetch` yerine `equipment-documents-client.ts` çağrılır: multipart
 * gövde tarayıcının ürettiği boundary ile gitmelidir (bkz. o modülün notu).
 * Hata YUTULMAZ — 413/422 gövdesi `BackendError` olarak formda basılır.
 */
export function useUploadEquipmentDocument(): UseMutationResult<
  EquipmentDocumentResponse,
  Error,
  EquipmentDocumentUploadInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => uploadEquipmentDocument(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [EQUIPMENT_DOCUMENTS_QUERY_KEY, variables.equipmentId],
      });
    },
  });
}
