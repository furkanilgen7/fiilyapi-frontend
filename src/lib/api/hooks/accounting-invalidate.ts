import type { useQueryClient } from "@tanstack/react-query";

import { CHART_OF_ACCOUNTS_QUERY_KEY } from "./useChartOfAccounts";
import { JOURNAL_ENTRIES_QUERY_KEY } from "./useJournalEntries";
import { JOURNAL_SUMMARY_QUERY_KEY } from "./useJournalSummary";
import { LEDGER_QUERY_KEY } from "./useLedger";

/**
 * F-MU1 · muhasebe okumalarının ORTAK geçersizleştirme kapsamı.
 *
 * 🔴 Muhasebede hiçbir yazma tek bir okumayı bayatlatmaz:
 *   * fiş durumu oynayınca → fiş listesi · defter · KPI özeti · **hesap planı**
 *     (`balance` TÜREVDİR, saklanan kolon değil);
 *   * hesap oynayınca → hesap planı · defter (`account_code` basar) · KPI/fiş
 *     listesi (kaldırılan hesap süzgeç seçeneğidir).
 *
 * T2 bu fonksiyonu `useJournalEntryMutations` içinde yazmıştı; T3'ün hesap
 * mutasyonları AYNI kapsama ihtiyaç duyduğu için buraya taşındı — ikinci bir
 * kopya yazılsaydı biri güncellenip öteki unutulur ve ekranların bir kısmı
 * sessizce bayat kalırdı (aynı formül iki yerde yaşamaz).
 */
export function invalidateAccountingScope(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  queryClient.invalidateQueries({ queryKey: [JOURNAL_ENTRIES_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [LEDGER_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [JOURNAL_SUMMARY_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [CHART_OF_ACCOUNTS_QUERY_KEY] });
}
