import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// F-TH T1 · Taşeron Hakedişi ekranları — okuma sorguları. `useProgressPayments.ts`
// deseniyle AYNI (isimlendirme/hata-unwrap yardımcıları). Tipler `pnpm gen:api`
// çıktısından takma ad olarak alınır; elle arayüz yazmak yasak.
export type SubcontractorProgressPaymentListResponse =
  components["schemas"]["SubcontractorProgressPaymentListResponse"];
export type SubcontractorProgressPaymentListItem =
  components["schemas"]["SubcontractorProgressPaymentListItem"];
export type SubcontractorProgressPaymentDetail =
  components["schemas"]["SubcontractorProgressPaymentDetail"];
export type SubcontractorProgressPaymentLineRead =
  components["schemas"]["SubcontractorProgressPaymentLineRead"];
export type SubcontractorProgressPaymentSummary =
  components["schemas"]["SubcontractorProgressPaymentSummary"];
export type SubcontractorPaymentStatus = components["schemas"]["SubcontractorPaymentStatus"];
export type SubcontractorContractDetail = components["schemas"]["SubcontractorContractDetail"];
export type SubcontractorContractListItem = components["schemas"]["SubcontractorContractListItem"];
export type SubcontractorContractListResponse =
  components["schemas"]["SubcontractorContractListResponse"];

// Liste ve özet uçlarının ORTAK filtre alanları (openapi.json GET
// /subcontractor-progress-payments + .../summary query parametreleri).
// `site_id` TB2/U2 ile eklendi — sözleşme üzerinden süzer, hakedişin kendi
// şantiye kolonu yoktur.
export interface SubcontractorProgressPaymentFilter {
  project_id?: string;
  site_id?: string;
  period_year?: number;
  period_month?: number;
  status?: SubcontractorPaymentStatus;
  q?: string;
}

// Liste ucu ayrıca sayfalama alır — `limit`/`offset` özet ucunda YOKTUR.
export interface SubcontractorProgressPaymentListFilter extends SubcontractorProgressPaymentFilter {
  limit?: number;
  offset?: number;
}

// TB2 U1 (`GET /subcontractor-contracts`) filtreleri — sayfalama YOK
// (`limit`/`offset`/`total` taşımaz), sıralama sunucuda deterministiktir.
export interface SubcontractorContractListFilter {
  project_id?: string;
  site_id?: string;
  status?: components["schemas"]["ContractStatus"];
  q?: string;
}

export const SUBCONTRACTOR_PROGRESS_PAYMENTS_QUERY_KEY = "subcontractor-progress-payments";
export const SUBCONTRACTOR_PROGRESS_PAYMENT_QUERY_KEY = "subcontractor-progress-payment";
export const SUBCONTRACTOR_PROGRESS_PAYMENT_SUMMARY_QUERY_KEY = "subcontractor-progress-payment-summary";
export const SUBCONTRACTOR_CONTRACT_QUERY_KEY = "subcontractor-contract";
// Coordinator review (Minor 2) — modül-özel (export EDİLMEZ): bu dilimde
// sözleşme oluşturma/güncelleme ucu YOK (brief §Yasaklar), dolayısıyla bu
// listeyi invalidate edecek bir mutasyon da YOK. Dışarıdan tüketen olmadığı
// için kullanılmayan bir kamu yüzeyi bırakmamak adına export edilmiyor.
const SUBCONTRACTOR_CONTRACTS_LIST_QUERY_KEY = "subcontractor-contracts-list";

function filterQuery(
  filter: SubcontractorProgressPaymentFilter,
): Record<string, string | number> {
  return {
    ...(filter.project_id ? { project_id: filter.project_id } : {}),
    ...(filter.site_id ? { site_id: filter.site_id } : {}),
    ...(filter.period_year !== undefined ? { period_year: filter.period_year } : {}),
    ...(filter.period_month !== undefined ? { period_month: filter.period_month } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.q ? { q: filter.q } : {}),
  };
}

function contractListFilterQuery(
  filter: SubcontractorContractListFilter,
): Record<string, string> {
  return {
    ...(filter.project_id ? { project_id: filter.project_id } : {}),
    ...(filter.site_id ? { site_id: filter.site_id } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.q ? { q: filter.q } : {}),
  };
}

/**
 * Taşeron hakedişi listesi. Filtresiz çağrıda tüm hakedişler döner —
 * `useProgressPayments` deseniyle ayni, bos filtre alanlari govdeye eklenmez.
 */
export function useSubcontractorProgressPayments(
  filter: SubcontractorProgressPaymentListFilter = {},
): UseQueryResult<SubcontractorProgressPaymentListResponse, Error> {
  return useQuery({
    queryKey: [
      SUBCONTRACTOR_PROGRESS_PAYMENTS_QUERY_KEY,
      filter.project_id ?? null,
      filter.site_id ?? null,
      filter.period_year ?? null,
      filter.period_month ?? null,
      filter.status ?? null,
      filter.q ?? null,
      filter.limit ?? null,
      filter.offset ?? null,
    ],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/subcontractor-progress-payments", {
          params: {
            query: {
              ...filterQuery(filter),
              ...(filter.limit !== undefined ? { limit: filter.limit } : {}),
              ...(filter.offset !== undefined ? { offset: filter.offset } : {}),
            },
          },
        }),
      ),
  });
}

/**
 * Taşeron hakedişi detayı. `useProgressPayment` deseni: bos id ile aga
 * cikilmaz.
 */
export function useSubcontractorProgressPayment(
  paymentId: string,
): UseQueryResult<SubcontractorProgressPaymentDetail, Error> {
  return useQuery({
    enabled: paymentId.length > 0,
    queryKey: [SUBCONTRACTOR_PROGRESS_PAYMENT_QUERY_KEY, paymentId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/subcontractor-progress-payments/{payment_id}", {
          params: { path: { payment_id: paymentId } },
        }),
      ),
  });
}

/**
 * KPI özeti (`GET /subcontractor-progress-payments/summary`). İşveren
 * tarafından FARKLI: tek `projectId` yerine liste ucuyla ayni filtre
 * kümesini alır (openapi'de summary de proje/dönem/durum/arama filtrelenir).
 */
export function useSubcontractorProgressPaymentSummary(
  filter: SubcontractorProgressPaymentFilter = {},
): UseQueryResult<SubcontractorProgressPaymentSummary, Error> {
  return useQuery({
    queryKey: [
      SUBCONTRACTOR_PROGRESS_PAYMENT_SUMMARY_QUERY_KEY,
      filter.project_id ?? null,
      filter.site_id ?? null,
      filter.period_year ?? null,
      filter.period_month ?? null,
      filter.status ?? null,
      filter.q ?? null,
    ],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/subcontractor-progress-payments/summary", {
          params: { query: filterQuery(filter) },
        }),
      ),
  });
}

/**
 * Taşeron sözleşmesi detayı (T2-T5'in sözleşme başlığı/kalemleri okuması
 * için). `useEmployerContract` deseni: bos id ile aga cikilmaz.
 */
export function useSubcontractorContract(
  contractId: string,
): UseQueryResult<SubcontractorContractDetail, Error> {
  return useQuery({
    enabled: contractId.length > 0,
    queryKey: [SUBCONTRACTOR_CONTRACT_QUERY_KEY, contractId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/subcontractor-contracts/{contract_id}", {
          params: { path: { contract_id: contractId } },
        }),
      ),
  });
}

/**
 * TB2 U1 (`GET /subcontractor-contracts`) — sözleşme LİSTE ucu. Sayfalama
 * YOK (`/contracts` liste ucu deseni), sıralama sunucuda deterministiktir.
 * `useSubcontractorContractOptions` (hakediş açma seçim adımı) VE
 * `useSiteSubcontractorPayments` (workCategory join'i) bu tek hook'u paylaşır
 * — aynı filtreyle çağrılan istekler TanStack Query önbelleğinden gelir.
 */
export function useSubcontractorContractsList(
  filter: SubcontractorContractListFilter = {},
): UseQueryResult<SubcontractorContractListResponse, Error> {
  return useQuery({
    queryKey: [
      SUBCONTRACTOR_CONTRACTS_LIST_QUERY_KEY,
      filter.project_id ?? null,
      filter.site_id ?? null,
      filter.status ?? null,
      filter.q ?? null,
    ],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/subcontractor-contracts", {
          params: { query: contractListFilterQuery(filter) },
        }),
      ),
  });
}
