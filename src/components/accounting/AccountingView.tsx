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
import { useTrialBalance } from "@/lib/api/hooks/useTrialBalance";
import { useVatReturn } from "@/lib/api/hooks/useVatReturn";
import { LEDGER_MAX_LIMIT, useLedger } from "@/lib/api/hooks/useLedger";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { formatAmount, formatCurrency } from "@/lib/format";
import { buildListTruncation, listTruncationMessage } from "@/lib/list-truncation";
import { pendingModuleLabel } from "@/lib/pending-modules";

import {
  ACCOUNTING_PERMISSION_MODULE,
  ACCOUNTING_REASONS,
  currentPeriod,
  hasCarriedBalance,
  type Period,
} from "./accounting-labels";
import { AccountingKpiCards } from "./AccountingKpiCards";
import { AccountBalancesPanel, EInvoicePanel } from "./AccountingRail";
import { DraftEntriesPanel } from "./DraftEntriesPanel";
import { JournalEntryFormModal } from "./JournalEntryFormModal";
import { LedgerTable } from "./LedgerTable";
import { PeriodPicker } from "./PeriodPicker";
import { AccountingTabs } from "./shell/AccountingTabs";
import "./accounting.css";
import "./accounting-pro.css";

/**
 * "+ Yevmiye Kaydı" (E8:67) ve "Düzenle" düğmelerinin AÇTIĞI diyaloğun
 * durumu; gövdesi `JournalEntryFormModal`dır (T4).
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
  // 🔴 T5 BULGUSU — `status: "draft"` SÜZGECİ KALDIRILDI (gerçek kusur).
  //
  // Panel yalnız taslakları çekerken `posted` bir fiş ekranın HİÇBİR YERİNDE
  // görünmüyordu: defter (`/journal`) satır bazlıdır ve hiç EYLEM sunmaz. Yani
  // "Storno" düğmesi (yönetim kararı 2'nin `posted → reversed` yolu) kullanıcı
  // için ULAŞILAMAZDI — kayıtlaştırılan bir fiş bir daha asla terslenemezdi.
  // Birim testi bunu göremezdi çünkü `posted` fişi doğrudan sorgu sonucuna
  // enjekte ediyordu; kusur ancak uçtan uca akışta ortaya çıktı.
  //
  // Panel artık DÖNEMİN TÜM fişlerini listeler; hangi eylemin sunulacağını
  // zaten satır başına `entryActions(status)` söylüyordu.
  const draftsQuery = useJournalEntries({
    year: period.year,
    month: period.month,
    limit: JOURNAL_ENTRIES_MAX_LIMIT,
  });
  const accountsQuery = useChartOfAccounts({ limit: CHART_ACCOUNTS_MAX_LIMIT });
  // MP:165-209 sağ ray — mini mizan. Mizan ekranıyla AYNI uç, AYNI dönem.
  const railQuery = useTrialBalance(period.year, period.month);
  // MP:128-131 KDV kartı — `journal-summary` bu sayıyı TAŞIMAZ, ayrı uçtur.
  const vatQuery = useVatReturn(period.year, period.month);

  const postMutation = usePostJournalEntry();
  const reverseMutation = useReverseJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  if (
    !permission.canView ||
    isForbidden(summaryQuery.error) ||
    isForbidden(ledgerQuery.error) ||
    isForbidden(draftsQuery.error) ||
    isForbidden(railQuery.error) ||
    isForbidden(vatQuery.error)
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
      {/* MP:101 — kabuktaki breadcrumb'ın metin karşılığı */}
      <p className="mu__eyebrow">Sözleşme &amp; Mali</p>

      <div className="mu__head">
        {/* MP:103 */}
        <h1 className="mu__title">Muhasebe</h1>
        <div className="mu__actions">
          {/* 🔴 MP:104 dönem seçiciyi BAŞLIK SATIRINA koyar (E8'de KPI
              şeridinin içindeydi). Mockup ham bir `<select>` çizer; ham
              form kontrolü YASAK ve `PeriodPicker` zaten bu modülün ölçülmüş
              dönem gezginidir (‹ › + yıl taşması). */}
          <PeriodPicker period={period} onChange={handlePeriodChange} />
          {/* MP:104 — `JournalEntryFormModal`ı açar (T4). */}
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

      {/* MP:105-112 — modül sekmeleri; drill-in sidebar'ın YERİNE (KK-10). */}
      <AccountingTabs />

      {!permission.canWrite && (
        <p className="mu-notice" data-testid="mu-write-notice">
          {ACCOUNTING_REASONS.write}
        </p>
      )}

      {/* MP:114-139 — BEŞ KPI kartı. İki kaynak AYRI hata yolu işletir. */}
      {summaryQuery.isError && (
        <p className="mu-notice mu-notice--danger" data-testid="mu-summary-error">
          {backendErrorMessage(summaryQuery.error, "Dönem özeti yüklenemedi.")}
        </p>
      )}
      {vatQuery.isError && (
        <p className="mu-notice mu-notice--danger" data-testid="mu-vat-error">
          {backendErrorMessage(vatQuery.error, "KDV özeti yüklenemedi.")}
        </p>
      )}
      <AccountingKpiCards summary={summaryQuery.data} vat={vatQuery.data} />

      {/* MP:140-251 — İKİ SÜTUN: defter (esner) + 340px sağ ray. */}
      <div className="mu-pro-grid">
      <section className="mu-panel" aria-label="Yevmiye Defteri">
        <div className="mu-panel__head">
          {/* MP:141 */}
          <span className="mu-panel__title">Yevmiye Defteri</span>
          {/* MP:143 — ham <select> YASAK; `Select` primitive'i. */}
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
          {/* MP:146 "Excel" — ucu YOK; düğme SİLİNMEZ, devre dışı + gerekçesi
              EKRANDA (`title`da SAKLANMAZ). E8'de bu düğme sayfa başlığındaydı
              ve "Dışa Aktar" diyordu; MP onu defter panelinin başlığına
              taşıyıp "Excel" adını veriyor. */}
          <Button variant="secondary" disabled data-testid="mu-export">
            Excel
          </Button>
        </div>

        <p className="mu-notice" data-testid="mu-export-reason">
          “Excel”: {pendingModuleLabel(ACCOUNTING_REASONS.export)}.
        </p>

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

        {/* MP:247-250 — defterin ALTINDA dönem toplamları. Kaynak KPI
            kartlarıyla AYNI uçtur (`journal-summary`), ikinci bir toplam
            İSTEMCİDE hesaplanmaz: defter SAYFALANMIŞTIR ve görünen satırların
            toplamı dönemin toplamı DEĞİLDİR. */}
        <div className="mu-pro-foot" data-testid="mu-ledger-totals">
          <span className="mu-pro-foot__cell">
            Dönem Borç:{" "}
            <strong className="mu-pro-foot__value mu-pro-foot__value--danger">
              {summaryQuery.data === undefined
                ? "—"
                : formatCurrency(summaryQuery.data.total_debit)}
            </strong>
          </span>
          <span className="mu-pro-foot__cell">
            Dönem Alacak:{" "}
            <strong className="mu-pro-foot__value mu-pro-foot__value--success">
              {summaryQuery.data === undefined
                ? "—"
                : formatCurrency(summaryQuery.data.total_credit)}
            </strong>
          </span>
        </div>
      </section>

      {/* MP:163-239 — sağ ray: mini mizan + e-Fatura. */}
      <div className="mu-pro-aside">
        <AccountBalancesPanel
          data={railQuery.data}
          isLoading={railQuery.isLoading}
          errorMessage={
            railQuery.isError
              ? backendErrorMessage(railQuery.error, "Hesap bakiyeleri yüklenemedi.")
              : undefined
          }
        />
        <EInvoicePanel />
      </div>
      </div>

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
            ? backendErrorMessage(draftsQuery.error, "Dönem fişleri yüklenemedi.")
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
        <JournalEntryFormModal
          entryId={entryDialog.mode === "edit" ? entryDialog.entryId : null}
          onClose={() => setEntryDialog(null)}
        />
      )}

      {/* Görsel spec (T6) "yüklendi" iddiasını KAYNAK BAŞINA kurar. */}
      {summaryQuery.data !== undefined && <span hidden data-testid="mu-loaded-summary" />}
      {ledgerQuery.data !== undefined && <span hidden data-testid="mu-loaded-ledger" />}
      {draftsQuery.data !== undefined && <span hidden data-testid="mu-loaded-drafts" />}
      {accountsQuery.data !== undefined && <span hidden data-testid="mu-loaded-accounts" />}
      {railQuery.data !== undefined && <span hidden data-testid="mu-loaded-rail" />}
      {vatQuery.data !== undefined && <span hidden data-testid="mu-loaded-vat" />}
    </div>
  );
}
