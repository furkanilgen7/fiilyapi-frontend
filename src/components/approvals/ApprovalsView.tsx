"use client";

import { useState } from "react";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import {
  APPROVAL_INBOX_MAX_LIMIT,
  useApprovalInbox,
  useApprovalSettings,
  useApproveApprovalItem,
  type ApprovalInboxItem,
} from "@/lib/api/hooks/useApprovals";
import { isForbidden } from "@/lib/api/unwrap";
import { buildListTruncation, listTruncationMessage } from "@/lib/list-truncation";

import { ApprovalCard } from "./ApprovalCard";
import { ApprovalFlowStrip } from "./ApprovalFlowStrip";
import { ApprovalRejectModal } from "./ApprovalRejectModal";
import {
  APPROVAL_ACTIVE_TAB_KEY,
  APPROVAL_APPROVE_ERROR_FALLBACK,
  APPROVAL_BULK_DISABLED_REASON,
  APPROVAL_BULK_LABEL,
  APPROVAL_TABS,
  approvalTabLabel,
} from "./approval-labels";
import "./approvals.css";

const PAGE_TITLE = "Onay Kutusu";
const EMPTY_MESSAGE = "Onayınızı bekleyen kalem yok.";
const LOADING_MESSAGE = "Yükleniyor…";
const LIST_ERROR_FALLBACK = "Onay kutusu yüklenemedi.";
const SETTINGS_ERROR_FALLBACK = "Onay eşiği yüklenemedi; akış şeridinde eşik gösterilemiyor.";

/**
 * F-OK T5 · `/onay-kutusu` — kanon `projedesign/Onay Kutusu.dc.html`
 * (yorumlardaki sayılar O dosyanın SATIR numaralarıdır).
 *
 * Mockup'ın KENDİ üst barı (`:23-35`) ve sol menüsü BASILMAZ: kabuk canon'u
 * kazanır (F3 Topbar + Sidebar) — emsal `FinancialInstrumentsView`. Üst barın
 * yalnız iki parçası sayfaya TAŞINDI: `:32` "{total} bekleyen" ve `:33`
 * "Tümünü Onayla" (devre dışı, gerekçesi görünür).
 *
 * 🔴 ÖN YETKİ KAPISI YOKTUR (`useModulePermission` KULLANILMAZ). Sözleşme bunu
 * açıkça yasaklar (`GET /approvals` açıklaması, openapi.json):
 *   "Ayri bir yetki kapisi YOKTUR ve olmamalidir: donen kume zaten 'bu adim
 *    SANA dustu' olgusuyla sinirlidir; `approvals` izni dusuk olan bir rol de
 *    kendine dusen imzayi gormek zorundadir (matriste sef/saha/IK = `_OWN`)."
 * `useModulePermission(...).canView` seviye `"none"` olduğunda kapatır — yani
 * zincirde adımı olan ama modül izni `none` olan bir kullanıcıyı KENDİ
 * İMZASINDAN kilitlerdi. Geriye yalnız 403 TÜREVLİ `AccessDenied` kalır.
 *
 * ⚠️ İKİ BAĞIMSIZ VERİ KAYNAĞI (`/approvals` + `/approvals/settings`): her biri
 * KENDİ yükleme/hata yolunu işletir ve "yüklendi" bayrağı KAYNAK BAŞINA basılır
 * — tek bayrak ikincisinin hâlâ pending olduğunu GİZLERDİ (F-İK dersi).
 */
export function ApprovalsView() {
  // Kırpma korkuluğu (TB3/F-TH): tavan AÇIKÇA gönderilir, eksik kalan kayıt
  // `total` üzerinden GÖRÜNÜR bir bantla bildirilir. Mockup sayfalama çubuğu
  // ÇİZMEZ (K5, mockup kazanır) — tavanı aşan kullanıcı bandı görür.
  const inboxQuery = useApprovalInbox({ limit: APPROVAL_INBOX_MAX_LIMIT });
  const settingsQuery = useApprovalSettings();
  const approveItem = useApproveApprovalItem();

  const [rejectTarget, setRejectTarget] = useState<ApprovalInboxItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isForbidden(inboxQuery.error) || isForbidden(settingsQuery.error)) {
    return <AccessDenied />;
  }

  const items = inboxQuery.data?.items;
  const total = inboxQuery.data?.total;
  const myRoles = inboxQuery.data?.my_approval_roles ?? [];
  const truncation = buildListTruncation(items?.length ?? 0, total);

  function handleApprove(item: ApprovalInboxItem) {
    setActionError(null);
    approveItem.mutate(
      { documentType: item.document_type, documentId: item.document_id },
      { onError: (error) => setActionError(backendErrorMessage(error, APPROVAL_APPROVE_ERROR_FALLBACK)) },
    );
  }

  return (
    <div className="ok">
      <div className="ok__head">
        <h1 className="ok__title">{PAGE_TITLE}</h1>
        {/* :32 — sayı SUNUCUNUN `total`idir, uydurulmaz. */}
        {total !== undefined && (
          <span className="ok__pending" data-testid="ok-pending-count">
            {total} bekleyen
          </span>
        )}
        {/* :33 — rotası/ucu olmayan mockup öğesi SİLİNMEZ, DEVRE DIŞI basılır
            ve gerekçesi hem `title` hem `sr-only` hem GÖRÜNÜR bantla taşınır. */}
        <Button
          variant="success"
          disabled
          title={APPROVAL_BULK_DISABLED_REASON}
          data-testid="ok-bulk-approve"
        >
          {APPROVAL_BULK_LABEL}
          <span className="sr-only"> — {APPROVAL_BULK_DISABLED_REASON}</span>
        </Button>
      </div>
      <p className="ok-notice" data-testid="ok-bulk-reason">
        {APPROVAL_BULK_DISABLED_REASON}
      </p>

      {/* :42-68 — eşik ayarı KENDİ hata yolunu işletir; liste onsuz da yaşar. */}
      {settingsQuery.isError && (
        <p className="ok-notice ok-notice--danger" data-testid="ok-settings-error">
          {backendErrorMessage(settingsQuery.error, SETTINGS_ERROR_FALLBACK)}
        </p>
      )}
      <ApprovalFlowStrip threshold={settingsQuery.data?.approval_threshold_try} />

      {/* :71-76 — DÖRT sekme; yalnız "Benim Onayım" çalışır. */}
      <ApprovalTabs total={total} />

      {truncation.isTruncated && (
        <p className="ok-notice" data-testid="ok-truncation">
          {listTruncationMessage(truncation)}
        </p>
      )}

      {actionError !== null && (
        <p className="ok-notice ok-notice--danger" data-testid="ok-action-error">
          {actionError}
        </p>
      )}

      {inboxQuery.isError && (
        <p className="ok-notice ok-notice--danger" data-testid="ok-list-error">
          {backendErrorMessage(inboxQuery.error, LIST_ERROR_FALLBACK)}
        </p>
      )}

      {/* :79-240 */}
      {inboxQuery.isLoading ? (
        <p className="ok-empty" data-testid="ok-loading">
          {LOADING_MESSAGE}
        </p>
      ) : items !== undefined && items.length === 0 ? (
        <p className="ok-empty" data-testid="ok-empty">
          {EMPTY_MESSAGE}
        </p>
      ) : (
        <div className="ok-list" data-testid="ok-list">
          {items?.map((item) => (
            <ApprovalCard
              key={item.chain_id}
              item={item}
              myRoles={myRoles}
              isPending={approveItem.isPending}
              onApprove={handleApprove}
              onReject={(target) => {
                setActionError(null);
                setRejectTarget(target);
              }}
            />
          ))}
        </div>
      )}

      {rejectTarget !== null && (
        <ApprovalRejectModal item={rejectTarget} onClose={() => setRejectTarget(null)} />
      )}

      {/* Görsel spec "yüklendi" iddiasını KAYNAK BAŞINA kurar. */}
      {inboxQuery.data !== undefined && <span hidden data-testid="ok-loaded-list" />}
      {settingsQuery.data !== undefined && <span hidden data-testid="ok-loaded-settings" />}
    </div>
  );
}

/**
 * :71-76 · sekme şeridi. Devre-dışı sekmelerde PARANTEZ İÇİ SAYI BASILMAZ
 * (mockup'ın `(7)`/`(12)`/`(2)` rakamları çizim verisidir).
 *
 * Gerekçe notu öğenin KENDİ `disabledReason` alanından TÜRETİLİR, sabit
 * basılmaz (F-PRJTAB kanonu): sekme ileride canlanınca not KENDİLİĞİNDEN
 * kalkar — sabit bir not, canlı bir sekmenin altında onu yalanlayarak kalırdı.
 */
function ApprovalTabs({ total }: { total: number | undefined }) {
  const disabledTab = APPROVAL_TABS.find((tab) => tab.disabledReason !== undefined);

  return (
    <>
      <div className="ok-tabs" role="tablist" aria-label="Onay kutusu sekmeleri">
        {APPROVAL_TABS.map((tab) => {
          const isDisabled = tab.disabledReason !== undefined;
          return (
            <span
              key={tab.key}
              role="tab"
              className="ok-tab"
              aria-selected={!isDisabled}
              aria-current={tab.key === APPROVAL_ACTIVE_TAB_KEY ? "page" : undefined}
              aria-disabled={isDisabled || undefined}
              tabIndex={isDisabled ? -1 : 0}
              title={tab.disabledReason}
              data-testid={`ok-tab-${tab.key}`}
            >
              {approvalTabLabel(tab, total)}
            </span>
          );
        })}
      </div>
      {disabledTab?.disabledReason !== undefined && (
        <p className="ok-notice" data-testid="ok-tabs-reason">
          {disabledTab.disabledReason}
        </p>
      )}
    </>
  );
}
