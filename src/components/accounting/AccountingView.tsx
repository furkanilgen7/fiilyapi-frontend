"use client";

import { useState } from "react";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button, Select } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import {
  CHART_ACCOUNTS_MAX_LIMIT,
  useChartOfAccounts,
} from "@/lib/api/hooks/useChartOfAccounts";
import {
  JOURNAL_ENTRIES_MAX_LIMIT,
  useJournalEntries,
} from "@/lib/api/hooks/useJournalEntries";
import {
  useDeleteJournalEntry,
  usePostJournalEntry,
  useReverseJournalEntry,
} from "@/lib/api/hooks/useJournalEntryMutations";
import { useJournalSummary } from "@/lib/api/hooks/useJournalSummary";
import { LEDGER_MAX_LIMIT, useLedger } from "@/lib/api/hooks/useLedger";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { formatAmount } from "@/lib/format";
import { buildListTruncation, listTruncationMessage } from "@/lib/list-truncation";
import { pendingModuleLabel } from "@/lib/pending-modules";

import {
  ACCOUNTING_PERMISSION_MODULE,
  ACCOUNTING_REASONS,
  currentPeriod,
  hasCarriedBalance,
  type Period,
} from "./accounting-labels";
import { DraftEntriesPanel } from "./DraftEntriesPanel";
import { JournalKpiStrip } from "./JournalKpiStrip";
import { LedgerTable } from "./LedgerTable";
import { PeriodPicker } from "./PeriodPicker";
import "./accounting.css";

/**
 * "+ Yevmiye Kaydı" (E8:67) ve "Düzenle" düğmelerinin AÇTIĞI diyaloğun
 * durumu. Gövdesini T4 yazar; burada yalnız açma yolu kurulur ki düğmeler
 * ölü kalmasın.
 */
export type JournalEntryDialogState =
  | { readonly mode: "create" }
  | { readonly mode: "edit"; readonly entryId: string };

/**
 * MU · `/muhasebe` — mockup `Ekran 8 - Muhasebe.dc.html` (kanonik).
 * Yorumlardaki sayılar O dosyanın SATIR numaralarıdır.
 *
 * Mockup'ın kendi üst barı (20-33) ve sol menüsü (36-59) BASILMAZ: kabuk
 * canon kazanır (F3 Topbar + Sidebar).
 *
 * ⚠️ ÜÇ CANLI VERİ KAYNAĞI: KPI özeti · defter · taslak fişler (+ süzgeç
 * seçenekleri için hesap planı). Her biri KENDİ yükleme/hata yolunu işletir —
 * biri patlayınca ötekiler yaşar (F-İK dersi: tek bayrak ikinci kaynağın hâlâ
 * beklediğini GİZLERDİ).
 *
 * ⚠️ SÜZGEÇLER SUNUCUYA GİDER (`year`/`month`/`account_id`); istemcide
 * süzülen hiçbir şey YOKTUR — aksi hâlde sayfalanan kümenin dışındaki
 * satırlar sessizce kaybolurdu.
 */
export function AccountingView() {
  const permission = useModulePermission(ACCOUNTING_PERMISSION_MODULE);

  // 📅 Dönem penceresinin TEK referansı; mount başına bir kez üretilir
  // (`InvoicesView` deseni) — alt bileşenler `new Date()` çağırmaz, testler
  // ve görsel kareler deterministik kalır.
  const [period, setPeriod] = useState<Period>(() => currentPeriod(new Date()));
  const [accountId, setAccountId] = useState("");
  const [entryDialog, setEntryDialog] = useState<JournalEntryDialogState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);

  const summaryQuery = useJournalSummary(period.year, period.month);
  const ledgerQuery = useLedger({
    year: period.year,
    month: period.month,
    limit: LEDGER_MAX_LIMIT,
    ...(accountId.length > 0 ? { accountId } : {}),
  });
  const draftsQuery = useJournalEntries({
    status: "draft",
    year: period.year,
    month: period.month,
    limit: JOURNAL_ENTRIES_MAX_LIMIT,
  });
  const accountsQuery = useChartOfAccounts({ limit: CHART_ACCOUNTS_MAX_LIMIT });

  const postMutation = usePostJournalEntry();
  const reverseMutation = useReverseJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  if (
    !permission.canView ||
    isForbidden(summaryQuery.error) ||
    isForbidden(ledgerQuery.error) ||
    isForbidden(draftsQuery.error)
  ) {
    return <AccessDenied />;
  }

  const ledgerRows = ledgerQuery.data?.items;
  const ledgerTruncation = buildListTruncation(ledgerRows?.length ?? 0, ledgerQuery.data?.total);
  const draftRows = draftsQuery.data?.items;
  const draftTruncation = buildListTruncation(draftRows?.length ?? 0, draftsQuery.data?.total);
  const accountOptions = accountsQuery.data?.items;
  const accountTruncation = buildListTruncation(
    accountOptions?.length ?? 0,
    accountsQuery.data?.total,
  );
  const carriedBalance = ledgerQuery.data?.carried_balance;

  /** Dönem değişince satır-içi işlem hatası bayatlar — birlikte temizlenir. */
  function handlePeriodChange(next: Period) {
    setPeriod(next);
    setActionError(null);
  }

  /**
   * Fiş kimliği mutation DEĞİŞKENİDİR (satır başına hook açılamaz, Rules of
   * Hooks). Hata YUTULMAZ: sunucunun Türkçe `detail` metni (ör. dengesiz fişte
   * 422, matris dışı geçişte 409) panelin üstünde basılır.
   */
  function runEntryAction(
    entryId: string,
    mutate: (id: string, options: { onSettled: () => void; onError: (e: Error) => void }) => void,
    fallback: string,
  ) {
    setBusyEntryId(entryId);
    setActionError(null);
    mutate(entryId, {
      onSettled: () => setBusyEntryId(null),
      onError: (error) => setActionError(backendErrorMessage(error, fallback)),
    });
  }

  return (
    <div className="mu">
      {/* E8:62 — kabuktaki breadcrumb'ın metin karşılığı */}
      <p className="mu__eyebrow">Sözleşme &amp; Mali</p>

      <div className="mu__head">
        {/* E8:64 */}
        <h1 className="mu__title">Muhasebe</h1>
        <div className="mu__actions">
          {/* E8:66 — ucu YOK; düğme SİLİNMEZ, devre dışı + gerekçesi EKRANDA. */}
          <Button variant="secondary" disabled data-testid="mu-export">
            Dışa Aktar
          </Button>
          {/* E8:67 — diyaloğu T4 yazar; açma yolu burada kurulur. */}
          <Button
            variant="primary"
            disabled={!permission.canWrite}
            data-testid="mu-create-entry"
            onClick={() => setEntryDialog({ mode: "create" })}
          >
            + Yevmiye Kaydı
          </Button>
        </div>
      </div>

      <p className="mu-notice" data-testid="mu-export-reason">
        “Dışa Aktar”: {pendingModuleLabel(ACCOUNTING_REASONS.export)}.
      </p>
      {!permission.canWrite && (
        <p className="mu-notice" data-testid="mu-write-notice">
          {ACCOUNTING_REASONS.write}
        </p>
      )}

      {/* E8:72-89 — dönem seçici + ÜÇ KPI kartı TEK ızgarada. */}
      {summaryQuery.isError && (
        <p className="mu-notice mu-notice--danger" data-testid="mu-summary-error">
          {backendErrorMessage(summaryQuery.error, "Dönem özeti yüklenemedi.")}
        </p>
      )}
      <div className="mu-strip">
        <PeriodPicker period={period} onChange={handlePeriodChange} />
        <JournalKpiStrip summary={summaryQuery.data} />
      </div>

      {/* E8:93-159 */}
      <section className="mu-panel" aria-label="Yevmiye Defteri">
        <div className="mu-panel__head">
          {/* E8:95 */}
          <span className="mu-panel__title">Yevmiye Defteri</span>
          {/* E8:96 — ham <select> YASAK; `Select` primitive'i. */}
          <Select
            size="row"
            aria-label="Hesap süzgeci"
            value={accountId}
            data-testid="mu-account-filter"
            onChange={(event) => setAccountId(event.target.value)}
          >
            <option value="">Tüm Hesaplar</option>
            {accountOptions?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} · {account.name}
              </option>
            ))}
          </Select>
        </div>

        {hasCarriedBalance(carriedBalance) && carriedBalance !== undefined && (
          // 🔴 `carried_balance` pencere ÖNCESİ toplamdır: sıfır değilse ilk
          // satırın bakiyesi sıfırdan başlamaz ve açıklanamaz görünürdü.
          <div className="mu-carried" data-testid="mu-carried-balance">
            <span>Devir bakiyesi (bu dönemden önceki toplam)</span>
            <span className="mu-carried__value">{formatAmount(carriedBalance)}</span>
          </div>
        )}

        <div className="mu-panel__body">
          {accountsQuery.isError && (
            <p className="mu-notice mu-notice--danger" data-testid="mu-accounts-error">
              {backendErrorMessage(accountsQuery.error, "Hesap listesi yüklenemedi.")}
            </p>
          )}
          {accountTruncation.isTruncated && (
            <p className="mu-notice" data-testid="mu-accounts-truncation">
              {listTruncationMessage(accountTruncation)}
            </p>
          )}
          {ledgerTruncation.isTruncated && (
            <p className="mu-notice" data-testid="mu-ledger-truncation">
              {listTruncationMessage(ledgerTruncation)}
            </p>
          )}
          <LedgerTable
            rows={ledgerRows}
            isLoading={ledgerQuery.isLoading}
            errorMessage={
              ledgerQuery.isError
                ? backendErrorMessage(ledgerQuery.error, "Yevmiye defteri yüklenemedi.")
                : undefined
            }
          />
        </div>
      </section>

      {actionError !== null && (
        <p className="mu-notice mu-notice--danger" data-testid="mu-action-error">
          {actionError}
        </p>
      )}
      {draftTruncation.isTruncated && (
        <p className="mu-notice" data-testid="mu-drafts-truncation">
          {listTruncationMessage(draftTruncation)}
        </p>
      )}
      <DraftEntriesPanel
        entries={draftRows}
        isLoading={draftsQuery.isLoading}
        errorMessage={
          draftsQuery.isError
            ? backendErrorMessage(draftsQuery.error, "Taslak fişler yüklenemedi.")
            : undefined
        }
        canWrite={permission.canWrite}
        writeDisabledReason={ACCOUNTING_REASONS.write}
        busyEntryId={busyEntryId}
        onEdit={(entryId) => setEntryDialog({ mode: "edit", entryId })}
        onPost={(entryId) =>
          runEntryAction(entryId, postMutation.mutate, "Fiş kayıtlaştırılamadı.")
        }
        onReverse={(entryId) =>
          runEntryAction(entryId, reverseMutation.mutate, "Storno fişi oluşturulamadı.")
        }
        onDelete={(entryId) => runEntryAction(entryId, deleteMutation.mutate, "Fiş silinemedi.")}
      />

      {entryDialog !== null && (
        // T4 bu yuvaya gerçek diyaloğu takar; o güne kadar tıklama SESSİZ
        // KALMAZ — kullanıcı ne olduğunu görür.
        <p className="mu-notice" role="status" data-testid="mu-entry-dialog-slot">
          {entryDialog.mode === "create" ? "Yeni yevmiye fişi" : "Yevmiye fişi düzenleme"} formu
          bu ekrana henüz bağlanmadı.{" "}
          <button
            type="button"
            className="mu-period__nav"
            data-testid="mu-entry-dialog-close"
            onClick={() => setEntryDialog(null)}
          >
            Kapat
          </button>
        </p>
      )}

      {/* Görsel spec (T6) "yüklendi" iddiasını KAYNAK BAŞINA kurar. */}
      {summaryQuery.data !== undefined && <span hidden data-testid="mu-loaded-summary" />}
      {ledgerQuery.data !== undefined && <span hidden data-testid="mu-loaded-ledger" />}
      {draftsQuery.data !== undefined && <span hidden data-testid="mu-loaded-drafts" />}
      {accountsQuery.data !== undefined && <span hidden data-testid="mu-loaded-accounts" />}
    </div>
  );
}
