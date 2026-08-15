"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { ProgressPaymentsListBody } from "@/components/progress-payments/ProgressPaymentsList";
import { EmployerItemFormModal } from "@/components/contract-item-form/EmployerItemFormModal";
import { useEmployerContract, useEmployerContractItems } from "@/lib/api/hooks/useContract";
import { useProgressPayments } from "@/lib/api/hooks/useProgressPayments";
import { useProject } from "@/lib/api/hooks/useProjects";
import { isForbidden } from "@/lib/api/unwrap";

import { contractTabHref } from "./contract-tabs";
import { ContractDocumentsPendingCard } from "./ContractDocumentsPendingCard";
import { ContractMilestonesPendingCard } from "./ContractMilestonesPendingCard";
import { ContractPaymentSummaryCard } from "./ContractPaymentSummaryCard";
import { ContractTermsCard } from "./ContractTermsCard";
import {
  EmployerContractHeaderCard,
  EDIT_DISABLED_REASON,
  PDF_DISABLED_REASON,
} from "./EmployerContractHeaderCard";
import { EmployerContractItemsTable } from "./EmployerContractItemsTable";
import { EmployerContractTabs } from "./EmployerContractTabs";
import { parseEmployerContractTab } from "./employer-contract-tabs";
import "./employer-contract-detail.css";

/**
 * E14 · `/sozlesmeler/isveren/[projectId]` (F-P5 T3). Kanon: projedesign
 * `Ekran 14 - Sözleşme Detay.dc.html`.
 *
 * ⚠️ Segment PROJE kimliğidir (proje başına TEK işveren sözleşmesi; SZL
 * satırının `item.id`si de projenin kimliğidir — `ContractsTable` notu).
 *
 * ⚠️ Mockup'ın üst şeridi + sol menüsü (20-59) UYGULAMA KABUĞUdur (F3
 * Topbar + Sidebar) — sayfa onları YENİDEN ÇİZMEZ (SZL ile aynı karar).
 *
 * Sekme durumu URL'dedir (`?tab=`, bkz. `employer-contract-tabs.ts`) — T2'nin
 * `?type=` deseniyle tutarlı.
 */
export interface EmployerContractDetailViewProps {
  projectId: string;
}

export function EmployerContractDetailView({ projectId }: EmployerContractDetailViewProps) {
  const searchParams = useSearchParams();
  const tab = parseEmployerContractTab(searchParams);

  const contractQuery = useEmployerContract(projectId);
  const projectQuery = useProject(projectId);
  // İş Kalemleri sekmesi açıkken çağrılır — diğer sekmelerde ağa çıkılmaz
  // (`useEmployerContractItems` boş id ile `enabled: false` olur).
  const itemsQuery = useEmployerContractItems(tab === "items" ? projectId : "");
  // Hakedişler sekmesi PROJE FİLTRELİdir — bu ekran tek bir sözleşmenin
  // (=tek projenin) hakedişlerini gösterir, proje-genel liste DEĞİL.
  // ⚠️ Filtre sekmeye göre KOŞULLANDIRILMAZ: `useProgressPayments({})` boş
  // filtreyle TÜM projelerin hakedişlerini çeker — sekme değişiminde yanlış
  // önbellek anahtarı ısıtmamak için `project_id` HER ZAMAN gönderilir.
  const paymentsQuery = useProgressPayments({ project_id: projectId });

  // F-BLG T2a · "+ Poz Ekle" diyalogu; sahibi bu ekrandır (tablo yalnız tetikler).
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  if (isForbidden(contractQuery.error)) return <AccessDenied />;

  const detail = contractQuery.data;

  return (
    <div className="ecd">
      {/* 62 · "← Sözleşmeler" — liste rotasına `contractTabHref` ile döner. */}
      <Link href={contractTabHref("employer")} className="ecd__back">
        ← Sözleşmeler
      </Link>

      {contractQuery.isError ? (
        <p className="ecd__message">Sözleşme yüklenemedi</p>
      ) : !detail ? (
        <p className="ecd__message">Yükleniyor…</p>
      ) : (
        <>
          <EmployerContractHeaderCard detail={detail} projectName={projectQuery.data?.name} />

          {/* 76-77 · iki devre-dışı butonun gerekçesi `title`da saklı kalmaz. */}
          <p className="ecd__notice">
            PDF: {PDF_DISABLED_REASON}. Düzenle: {EDIT_DISABLED_REASON} —{" "}
            <Link href={`/projeler/${projectId}`} className="ecd__notice-link">
              projeye git →
            </Link>
          </p>

          <EmployerContractTabs projectId={projectId} active={tab} />

          {tab === "general" && (
            <>
              <div className="ecd-grid">
                <ContractMilestonesPendingCard />
                <ContractPaymentSummaryCard
                  summary={detail.progress_payment_summary}
                  retainagePct={detail.retainage_pct}
                />
              </div>
              {/* §7 S3 — mockup gövdesinin DIŞINDA, ayrı bölüm. */}
              <div className="ecd-terms-section">
                <ContractTermsCard detail={detail} />
              </div>
            </>
          )}

          {tab === "items" && (
            <>
              <EmployerContractItemsTable
                projectId={projectId}
                detail={detail}
                isError={itemsQuery.isError}
                isLoading={itemsQuery.isLoading}
                data={itemsQuery.data}
                onAddItem={() => setIsAddItemOpen(true)}
              />
              {isAddItemOpen && itemsQuery.data && (
                <EmployerItemFormModal
                  projectId={projectId}
                  groups={itemsQuery.data.groups}
                  detail={detail}
                  onClose={() => setIsAddItemOpen(false)}
                />
              )}
            </>
          )}

          {tab === "payments" && (
            /* F-P7 bileşeni PAYLAŞILIR (yeniden yazılmaz). Proje adı bu ekranda
               başlıkta zaten var → `showProjectName={false}` (mevcut prop). */
            <ProgressPaymentsListBody
              isError={paymentsQuery.isError}
              isLoading={paymentsQuery.isLoading}
              data={paymentsQuery.data}
              showProjectName={false}
            />
          )}

          {tab === "documents" && <ContractDocumentsPendingCard />}
        </>
      )}
    </div>
  );
}
