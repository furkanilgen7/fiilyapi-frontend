import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

// F-MU1 T2 · hesap planı katalogu. PAYLAŞILAN hook: E8'in hesap süzgeci
// (T2) ve Hesap Planı ekranı (T3) AYNI kaynağı kullanır — ikinci bir kopya
// yazılırsa iki ekran aynı katalog için farklı sorgu üretirdi.
export type ChartAccountListResponse = components["schemas"]["ChartAccountListResponse"];
export type ChartAccountResponse = components["schemas"]["ChartAccountResponse"];
export type ChartAccountType = components["schemas"]["ChartAccountType"];

export const CHART_OF_ACCOUNTS_QUERY_KEY = "chart-of-accounts";

/** `limit` tavanı 200, aşım **422** (kırpma DEĞİL) — openapi: `maximum: 200`. */
export const CHART_ACCOUNTS_MAX_LIMIT = 200;

/** `GET /chart-of-accounts` süzgeçleri — openapi query parametrelerinin BİREBİR kopyası. */
export interface ChartAccountFilter {
  /** HP:47 — **kod ve ad** üzerinde arar. */
  q?: string;
  accountType?: ChartAccountType;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  /** `false` ⇒ ağa çıkılmaz. */
  enabled?: boolean;
}

/**
 * 🔴 Proje/şantiye kapsam süzgeci YOKTUR (şema notu): hesap planı şirket
 * geneli bir katalogtur, erişimi `accounting` izni denetler.
 *
 * `isActive: false` MEŞRU bir süzgeçtir (kaldırılmış hesaplar) — "verilmemiş"
 * sayılıp düşürülmez; `q: ""` ise süzgeç DEĞİLDİR ve hiç gönderilmez.
 */
export function useChartOfAccounts(
  filter: ChartAccountFilter = {},
): UseQueryResult<ChartAccountListResponse, Error> {
  return useQuery({
    enabled: filter.enabled ?? true,
    queryKey: [
      CHART_OF_ACCOUNTS_QUERY_KEY,
      filter.q ?? null,
      filter.accountType ?? null,
      filter.isActive ?? null,
      filter.limit ?? null,
      filter.offset ?? null,
    ],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/chart-of-accounts", {
          params: {
            query: {
              ...(filter.q ? { q: filter.q } : {}),
              ...(filter.accountType ? { account_type: filter.accountType } : {}),
              ...(filter.isActive !== undefined ? { is_active: filter.isActive } : {}),
              ...(filter.limit !== undefined ? { limit: filter.limit } : {}),
              ...(filter.offset !== undefined ? { offset: filter.offset } : {}),
            },
          },
        }),
      ),
  });
}
