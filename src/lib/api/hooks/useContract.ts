import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// P7 T5 · İşveren sözleşmesi okuma uçları — hakediş oluştur/düzenle formunun
// satır kaynağı (poz dağılımı) ve Fiyat Farkı bandı (sözleşme detayı) için.
// T1'in `useProgressPayments.ts`/`useProgressPaymentMutations.ts`i bu iki ucu
// SARMIYOR (brief §Belirsizlik çözümü 1) — `useBoq.ts` deseniyle burada
// eklendi. Tipler `pnpm gen:api` çıktısından takma ad olarak alınır; elle
// arayüz yazmak yasak.
export type ContractDistributionResponse = components["schemas"]["ContractDistributionResponse"];
export type ContractDistributionGroup = components["schemas"]["ContractDistributionGroup"];
export type ContractDistributionItem = components["schemas"]["ContractDistributionItem"];
export type ContractDistributionSite = components["schemas"]["ContractDistributionSite"];
export type ContractDistributionAllocation =
  components["schemas"]["ContractDistributionAllocation"];
export type EmployerContractDetail = components["schemas"]["EmployerContractDetail"];

export const CONTRACT_DISTRIBUTION_QUERY_KEY = "contract-distribution";
export const EMPLOYER_CONTRACT_QUERY_KEY = "employer-contract";

/**
 * Poz dağılımı (satır kaynağı — spec `POZ` ekranı). `useBoq` deseni: `siteId`
 * yerine `projectId` boşken ağa çıkılmaz — hakediş formu proje seçilmeden
 * (create kipinde `?project=` yoksa) bu hook boş id ile çağrılabilir.
 */
export function useContractDistribution(
  projectId: string,
): UseQueryResult<ContractDistributionResponse, Error> {
  return useQuery({
    enabled: projectId.length > 0,
    queryKey: [CONTRACT_DISTRIBUTION_QUERY_KEY, projectId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/projects/{project_id}/contract/distribution", {
          params: { path: { project_id: projectId } },
        }),
      ),
  });
}

/**
 * Sözleşme detayı — hakediş formunun Fiyat Farkı bandı (`has_price_escalation`,
 * SALT OKUNUR) ve İşveren adı için (brief §Form üst bölümü). Aynı bos-id
 * kapısı.
 */
export function useEmployerContract(
  projectId: string,
): UseQueryResult<EmployerContractDetail, Error> {
  return useQuery({
    enabled: projectId.length > 0,
    queryKey: [EMPLOYER_CONTRACT_QUERY_KEY, projectId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/projects/{project_id}/contract", {
          params: { path: { project_id: projectId } },
        }),
      ),
  });
}
