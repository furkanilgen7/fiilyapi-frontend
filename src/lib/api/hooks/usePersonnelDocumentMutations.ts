import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

import {
  HR_DOCUMENTS_SUMMARY_QUERY_KEY,
  PERSONNEL_DOCUMENTS_QUERY_KEY,
  type PersonnelDocumentResponse,
} from "./useHrDocuments";

/**
 * F-BLG T2c · `POST /personnel/{personnel_id}/documents` — personel belge
 * takip kaydı (`Form - Personel Belgesi.dc.html`).
 *
 * ⚠️ Uç **JSON** alır, DOSYA ALMAZ: gövdede `file` YOKTUR. Dosya iki adımlı
 * akışın BİRİNCİ adımında `POST /documents` (arşiv) ile yüklenir ve dönen
 * künye `document_id` olarak buraya bağlanır (mockup tasarım notu 30-39).
 *
 * ⚠️ `type_id` XOR `free_label` — TAM BİRİ (şema `model_validator`); ikisi de
 * dolu ya da ikisi de boş gövde 422 döner. İstemci tarafı da doğrular
 * (`validate.ts`) ki sunucuya bilerek 422 attırılmasın.
 *
 * Başarıda İKİ liste tazelenir: personelin belge listesi (PD kartı) ve İK
 * belge özeti (BT ekranı + bu formun tip kataloğu aynı uçtan besleniyor).
 */
export type PersonnelDocumentCreate = components["schemas"]["PersonnelDocumentCreate"];

export function useCreatePersonnelDocument(
  personnelId: string,
): UseMutationResult<PersonnelDocumentResponse, Error, PersonnelDocumentCreate> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.POST("/personnel/{personnel_id}/documents", {
          params: { path: { personnel_id: personnelId } },
          body,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PERSONNEL_DOCUMENTS_QUERY_KEY, personnelId] });
      queryClient.invalidateQueries({ queryKey: [HR_DOCUMENTS_SUMMARY_QUERY_KEY] });
    },
  });
}
