"use client";

import { formatAmount } from "@/lib/format";

import type { JournalTotals } from "./journal-entry-form";

/**
 * 🔴 **DENGE GÖSTERGESİ** — kullanıcı dengesizliği GÖNDERMEDEN ÖNCE görür.
 *
 * Sunucu dengesiz fişi 422 ile reddeder ("Fiş dengede değil…") ama bu SON
 * ÇAREdir: kullanıcı hangi tarafın ne kadar eksik olduğunu ancak burada,
 * yazarken görebilir.
 *
 * Toplamlar ve fark `journalTotals`tan gelir — `lib/decimal.ts`in kayıpsız
 * aritmetiği. Kayan noktayla karşılaştırma yapılsaydı `0.1 + 0.2` fişi
 * "dengesiz" görünürdü.
 */
export function JournalBalanceStrip({ totals }: { totals: JournalTotals }) {
  return (
    <div className="mu-balance" data-testid="mu-balance-strip">
      <div className="mu-balance__cell">
        <span className="mu-balance__label">Toplam Borç</span>
        <span className="mu-balance__value mu-amount--debit" data-testid="mu-balance-debit">
          {formatAmount(totals.totalDebit)}
        </span>
      </div>
      <div className="mu-balance__cell">
        <span className="mu-balance__label">Toplam Alacak</span>
        <span className="mu-balance__value mu-amount--credit" data-testid="mu-balance-credit">
          {formatAmount(totals.totalCredit)}
        </span>
      </div>
      <div className="mu-balance__cell">
        <span className="mu-balance__label">Fark</span>
        <span
          className={`mu-balance__value ${
            totals.isBalanced ? "mu-balance__value--ok" : "mu-balance__value--off"
          }`}
          data-testid="mu-balance-difference"
        >
          {formatAmount(totals.difference)}
        </span>
      </div>
      <p
        className={`mu-balance__state ${
          totals.isBalanced ? "mu-balance__state--ok" : "mu-balance__state--off"
        }`}
        role="status"
        data-testid="mu-balance-state"
      >
        {totals.isBalanced ? "Fiş dengede." : "Fiş dengede değil; kaydedilemez."}
      </p>
    </div>
  );
}
