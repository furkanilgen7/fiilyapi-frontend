import { describe, it, expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { invalidateAccountingScope } from "./accounting-invalidate";
import { JOURNAL_ENTRIES_QUERY_KEY } from "./useJournalEntries";
import { LEDGER_QUERY_KEY } from "./useLedger";
import { JOURNAL_SUMMARY_QUERY_KEY } from "./useJournalSummary";
import { CHART_OF_ACCOUNTS_QUERY_KEY } from "./useChartOfAccounts";
import { ACCOUNTING_PERIODS_QUERY_KEY } from "./useAccountingPeriods";
import { TRIAL_BALANCE_QUERY_KEY } from "./useTrialBalance";
import { VAT_RETURN_QUERY_KEY } from "./useVatReturn";

/**
 * KAYIT 15 (2026-09-23): `invalidateAccountingScope` fiş/hesap yazmalarının
 * ORTAK geçersizleştirme kapsamıdır. `accounting-periods`/`trial-balance`/
 * `vat-return` bu kapsamda EKSİKTİ — fiş kaydından sonra bu üç ekran
 * `staleTime` boyunca bayat kalabiliyordu.
 */
describe("invalidateAccountingScope", () => {
  it("yedi muhasebe okumasının HEPSİNİ geçersiz kılar", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");

    invalidateAccountingScope(client);

    expect(spy).toHaveBeenCalledWith({ queryKey: [JOURNAL_ENTRIES_QUERY_KEY] });
    expect(spy).toHaveBeenCalledWith({ queryKey: [LEDGER_QUERY_KEY] });
    expect(spy).toHaveBeenCalledWith({ queryKey: [JOURNAL_SUMMARY_QUERY_KEY] });
    expect(spy).toHaveBeenCalledWith({ queryKey: [CHART_OF_ACCOUNTS_QUERY_KEY] });
    expect(spy).toHaveBeenCalledWith({ queryKey: [ACCOUNTING_PERIODS_QUERY_KEY] });
    expect(spy).toHaveBeenCalledWith({ queryKey: [TRIAL_BALANCE_QUERY_KEY] });
    expect(spy).toHaveBeenCalledWith({ queryKey: [VAT_RETURN_QUERY_KEY] });
    expect(spy).toHaveBeenCalledTimes(7);
  });
});
