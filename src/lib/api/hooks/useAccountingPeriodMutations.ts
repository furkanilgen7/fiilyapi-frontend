import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";

import { ACCOUNTING_PERIODS_QUERY_KEY, type AccountingPeriodResponse } from "./useAccountingPeriods";

// F-DKAP T2 · Dönem Kapanışı ekranının YAZMA uçları.
//
// 🔴 K1 — yetki eşiği sunucudadır (`periods_router.py`): `close` = `full`,
// `reopen` = `admin`. İstemci düğmeyi görünür/devre-dışı basar (K6) ama tek
// gerçek kapı 403'tür; hook bunu YUTMAZ, çağıran `backendErrorMessage` ile
// gösterir.

interface ClosePeriodVariables {
  readonly year: number;
  readonly month: number;
}

/**
 * `POST /accounting-periods/{year}/{month}/close` — **409** iki sebepten:
 * dönem zaten kapalı ya da dönemde `draft` fiş var (K2). İstemci kararı
 * ikinci kez KOPYALAMAZ; 409 sunucudan geldiği gibi Türkçeleştirilip basılır.
 */
export function useCloseAccountingPeriod(): UseMutationResult<
  AccountingPeriodResponse,
  Error,
  ClosePeriodVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month }) =>
      unwrap(
        await backendClient.POST("/accounting-periods/{year}/{month}/close", {
          params: { path: { year, month } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTING_PERIODS_QUERY_KEY] });
    },
  });
}

/**
 * `POST /accounting-periods/{year}/{month}/reopen` — **YALNIZ `admin`**.
 * Ekran düğmeyi zaten yalnız o seviyede aktif basar (K1/K6); sunucu yine de
 * 403 ile son sözü söyler.
 */
export function useReopenAccountingPeriod(): UseMutationResult<
  AccountingPeriodResponse,
  Error,
  ClosePeriodVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month }) =>
      unwrap(
        await backendClient.POST("/accounting-periods/{year}/{month}/reopen", {
          params: { path: { year, month } },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ACCOUNTING_PERIODS_QUERY_KEY] });
    },
  });
}
