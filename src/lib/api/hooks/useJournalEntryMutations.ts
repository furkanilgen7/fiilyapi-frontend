import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";

import { JOURNAL_ENTRIES_QUERY_KEY, type JournalEntryDetailResponse } from "./useJournalEntries";
import { JOURNAL_SUMMARY_QUERY_KEY } from "./useJournalSummary";
import { LEDGER_QUERY_KEY } from "./useLedger";
import { CHART_OF_ACCOUNTS_QUERY_KEY } from "./useChartOfAccounts";

// F-MU1 T2 · Taslak Fişler panelinin YAZMA uçları.
//
// 🔴 Bir fişin DURUMUNU oynatan her yazma DÖRT okumayı birden bayatlatır:
// fiş listesi · defter (`draft → posted` satırları deftere GİRER) · KPI şeridi
// (`POSTING_STATUSES` toplamı değişir) · hesap planı (`balance` TÜREVDİR).
// Dördü tek yerde geçersizleştirilir; çağıran başına kopyalanmaz.
function invalidateAccountingScope(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: [JOURNAL_ENTRIES_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [LEDGER_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [JOURNAL_SUMMARY_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [CHART_OF_ACCOUNTS_QUERY_KEY] });
}

/**
 * `POST /journal-entries/{id}/post` — `draft → posted`, fişi MALİ İZE sokar.
 *
 * Fiş KİMLİĞİ hook parametresi DEĞİL, mutation DEĞİŞKENİDİR: panel satır
 * başına hook AÇAMAZ (Rules of Hooks) ama her satırın kendi fişini
 * kayıtlaştırması gerekir (`useInvoiceAction` deseni).
 *
 * 🔴 İstemci K1 kapısını (Σ borç = Σ alacak · en az iki satır · yalnız yaprak
 * hesap) KOPYALAMAZ — tek sahibi sunucudur; hata YUTULMAZ, Türkçe `detail`
 * metni ekrana basılır.
 */
export function usePostJournalEntry(): UseMutationResult<
  JournalEntryDetailResponse,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId) =>
      unwrap(
        await backendClient.POST("/journal-entries/{entry_id}/post", {
          params: { path: { entry_id: entryId } },
        }),
      ),
    onSuccess: () => invalidateAccountingScope(queryClient),
  });
}

/**
 * `POST /journal-entries/{id}/reverse` — `posted → reversed` + YENİ bir storno
 * fişi (**201**). Yanıt STORNONUN detayıdır, orijinalin değil.
 *
 * 🔴 K3: orijinal `reversed` olur ama defterden ÇIKMAZ — ikisi birlikte
 * bakiyeyi tam sıfıra götürür. Bu yüzden defter de tazelenir.
 */
export function useReverseJournalEntry(): UseMutationResult<
  JournalEntryDetailResponse,
  Error,
  string
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId) =>
      unwrap(
        await backendClient.POST("/journal-entries/{entry_id}/reverse", {
          params: { path: { entry_id: entryId } },
        }),
      ),
    onSuccess: () => invalidateAccountingScope(queryClient),
  });
}

/**
 * `DELETE /journal-entries/{id}` — **204**, yalnız `draft` fişte anlamlıdır
 * (aksi **409**). Ekran düğmeyi zaten yalnız `draft` satırda basar; hook
 * matrisi İKİNCİ KEZ doğrulamaz — tek sahibi sunucudur.
 */
export function useDeleteJournalEntry(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId) => {
      unwrap(
        await backendClient.DELETE("/journal-entries/{entry_id}", {
          params: { path: { entry_id: entryId } },
        }),
      );
    },
    onSuccess: () => invalidateAccountingScope(queryClient),
  });
}
