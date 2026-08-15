import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import type { ContractDistributionSave } from "@/lib/contract-distribution-save";

import {
  CONTRACT_DISTRIBUTION_QUERY_KEY,
  EMPLOYER_CONTRACT_QUERY_KEY,
  EMPLOYER_CONTRACT_ITEMS_QUERY_KEY,
  type ContractDistributionResponse,
} from "./useContract";

// F-P5 T1 · POZ dağılımı KAYDETME (`PUT /projects/{id}/contract/distribution`).
//
// ⚠️ Gövde BİRLEŞTİRME semantiğindedir — kuralın tamamı ve saf üreticisi
// `src/lib/contract-distribution-save.ts`tedir (`buildDistributionSaveBody`).
// Bu hook gövdeyi KENDİ KURMAZ: ızgara (T4) saf üreticiyi çağırır, sonucu
// buraya geçirir. Böylece "yalnız kirli hücreler / boşaltılan `null` /
// dokunulmamış gönderilmez / `0` asla" kuralı tek yerde yaşar ve React'sız
// test edilebilir.
//
// Yanıt, kaydetme sonrası TAM dağılımdır — `setQueryData` ile önbelleğe
// yazılır (ızgara ekstra bir GET beklemeden birleştirilmiş sonucu görür),
// ayrıca türev okumalar (`items` kolonları, sözleşme metrikleri) geçersiz
// kılınır.
export function useSaveContractDistribution(
  projectId: string,
): UseMutationResult<ContractDistributionResponse, Error, ContractDistributionSave> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.PUT("/projects/{project_id}/contract/distribution", {
          params: { path: { project_id: projectId } },
          body,
        }),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData([CONTRACT_DISTRIBUTION_QUERY_KEY, projectId], data);
      queryClient.invalidateQueries({ queryKey: [EMPLOYER_CONTRACT_ITEMS_QUERY_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [EMPLOYER_CONTRACT_QUERY_KEY, projectId] });
    },
  });
}

export type EmployerContractItemCreateRequest =
  components["schemas"]["EmployerContractItemCreate"];
export type EmployerContractItemResponse =
  components["schemas"]["EmployerContractItemResponse"];

/**
 * F-BLG T2a · İşveren sözleşmesine elle poz ekleme
 * (`POST /projects/{project_id}/contract/items`; kanon
 * `Form - Poz Ekle Isveren.dc.html`).
 *
 * Geçersiz kılma `useSaveContractDistribution` ile AYNI üç anahtarı tazeler —
 * yeni poz hem kalem listesinde (`items`), hem dağıtım ızgarasında
 * (`distribution`, yeni satır olarak), hem de sözleşme metriklerinde
 * (`items_total`/`items_total_diff`) görünür. `setQueryData` YOKTUR: yanıt tek
 * kalemdir, listeyi temsil etmez — yarım önbellek yazmak yerine yeniden çekilir.
 */
export function useCreateEmployerContractItem(
  projectId: string,
): UseMutationResult<EmployerContractItemResponse, Error, EmployerContractItemCreateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.POST("/projects/{project_id}/contract/items", {
          params: { path: { project_id: projectId } },
          body,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYER_CONTRACT_ITEMS_QUERY_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [CONTRACT_DISTRIBUTION_QUERY_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [EMPLOYER_CONTRACT_QUERY_KEY, projectId] });
    },
  });
}
