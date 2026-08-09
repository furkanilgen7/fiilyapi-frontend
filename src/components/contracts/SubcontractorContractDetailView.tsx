"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui";
import { ContractTermsCard } from "@/components/subcontractor-contract-form/ContractTermsCard";
import { buildContractTermsUpdateBody } from "@/components/subcontractor-contract-form/build-body";
import {
  contractTermsFromDetail,
  type ContractTermsValues,
} from "@/components/subcontractor-contract-form/form-state";
import { backendErrorMessage } from "@/lib/api/error-message";
import { isForbidden } from "@/lib/api/unwrap";
import { formatPercent } from "@/lib/format";
import { listTruncationMessage } from "@/lib/list-truncation";
import { pendingModuleLabel } from "@/lib/pending-modules";
import { useEmployerContract } from "@/lib/api/hooks/useContract";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSites } from "@/lib/api/hooks/useSites";
import { useSubcontractors } from "@/lib/api/hooks/useSubcontractors";
import { useSubcontractorContract } from "@/lib/api/hooks/useSubcontractorProgressPayments";
import {
  useSubcontractorContractPayments,
  useSubcontractorPaymentLines,
} from "@/lib/api/hooks/useSubcontractorContractPayments";
import {
  useUpdateSubcontractorContract,
  useUpdateSubcontractorContractItem,
} from "@/lib/api/hooks/useSubcontractorContractMutations";

import { contractTabHref } from "./contract-tabs";
import { buildItemProgressPct } from "./subcontractor-item-progress";
import {
  SubcontractorContractHeaderCard,
  type ChainLink,
} from "./SubcontractorContractHeaderCard";
import { SubcontractorContractItemsTable } from "./SubcontractorContractItemsTable";
import { SubcontractorContractPaymentsCard } from "./SubcontractorContractPaymentsCard";
// Sıra önemli: önce paylaşılan tablo/kabuk kanonu (`.ecd-*`), sonra TSD farkları.
import "./employer-contract-detail.css";
import "./subcontractor-contract-detail.css";

/**
 * TSD · `/sozlesmeler/taseron/[contractId]` (F-P5 T7). Kanon: projedesign
 * `Taşeron Sözleşme Detay.dc.html`; parantez içi sayılar o dosyanın SATIR
 * numaralarıdır.
 *
 * ⚠️ Mockup'ın üst şeridi (14-27) UYGULAMA KABUĞUdur (F3 Topbar) — sayfa onu
 * YENİDEN ÇİZMEZ (SZL/E14 ile aynı karar). Şeritteki üç öğe yine de basılır:
 * 19 "Sözleşmeler" kırıntısı → "← Sözleşmeler" dönüş linki (E14 emsali),
 * 24 "PDF" → devre-dışı + görünür gerekçe, 25 "Kaydet" → şart alanlarının
 * kaydeti olduğu için "Sözleşme Şartları" bölümünün başlığına iner
 * (spec §7 S3 taşeron ayağı; poz fiyatları zaten hücre bazında commit olur).
 *
 * **§7 S3 (ONAYLI):** FSO kart-3'ün aynısı DÜZENLENEBİLİR olarak eklenir.
 * Alanlar FSO mockup'ından gelir (icat değil, mockup'lar arası tamamlama);
 * gövde YALNIZ şart alanlarını taşır (`buildContractTermsUpdateBody`) — proje/
 * şantiye/taşeron bağlamına DOKUNMAZ.
 */
export interface SubcontractorContractDetailViewProps {
  contractId: string;
}

export const PDF_DISABLED_REASON = pendingModuleLabel("pdf_export");

/** 41 · VKN'nin çözülemediği dallar (sessiz boşluk YASAK). */
export const TAX_NUMBER_NO_SUBCONTRACTOR_REASON =
  "Sözleşmede taşeron firması seçili değil — VKN gösterilemiyor";
export const TAX_NUMBER_UNRESOLVED_REASON =
  "Taşeron firma kaydı listede bulunamadı — VKN gösterilemiyor";

/** 103 · Hakediş % kolonunun pending gerekçeleri. */
export const PROGRESS_PENDING_REASON =
  "Hakediş listesi eksik olduğu için ilerleme yüzdesi hesaplanamıyor";
/** 74 · kümülatif hakediş pending gerekçesi. */
export const CUMULATIVE_PENDING_REASON =
  "Hakediş listesi eksik olduğu için ödenen hakediş toplamı gösterilemiyor";

const EMPLOYER_CONTRACT_PENDING_REASON = "İşveren sözleşmesi bulunamadı";
const SITE_PROJECT_WIDE = "Proje geneli";
/** `vat_pct` FSO'da kontrolü olmadığı için TSD'de SALT-OKUNUR (E14 emsali). */
const VAT_READONLY_NOTE = "KDV oranı sözleşme formunda çizili değildir — salt-okunur gösterilir";

export function SubcontractorContractDetailView({
  contractId,
}: SubcontractorContractDetailViewProps) {
  const contractQuery = useSubcontractorContract(contractId);
  const detail = contractQuery.data;
  const projectId = detail?.project_id ?? "";

  const projectQuery = useProject(projectId);
  const sitesQuery = useSites(projectId);
  const employerContractQuery = useEmployerContract(projectId);
  // Pasif taşeronun da VKN'si gösterilebilsin (varsayılan `active_only=true`
  // pasif firmayı listeden düşürür ve VKN sessizce "—" olurdu).
  const subcontractorsQuery = useSubcontractors({ activeOnly: false });

  const payments = useSubcontractorContractPayments(contractId, projectId);
  const paymentLines = useSubcontractorPaymentLines(
    payments.items.map((payment) => payment.id),
    !payments.isPartial && !payments.isLoading,
  );

  const updateContract = useUpdateSubcontractorContract(contractId);
  const updateItem = useUpdateSubcontractorContractItem(contractId);

  const [terms, setTerms] = useState<ContractTermsValues | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [termsSaved, setTermsSaved] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  // Sunucu verisi geldiğinde şart alanları BİR KEZ tohumlanır; kullanıcının
  // yazdıkları sonraki tazelemelerde ezilmez (FSO ile aynı karar).
  useEffect(() => {
    if (!detail) return;
    setTerms((prev) => prev ?? contractTermsFromDetail(detail));
  }, [detail]);

  if (isForbidden(contractQuery.error)) return <AccessDenied />;

  if (contractQuery.isError) {
    return (
      <div className="tsd">
        <BackLink />
        <p className="ecd__message">Sözleşme yüklenemedi</p>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="tsd">
        <BackLink />
        <p className="ecd__message">Yükleniyor…</p>
      </div>
    );
  }

  const subcontractor =
    detail.subcontractor_id === null
      ? null
      : (subcontractorsQuery.data?.items.find(
          (item) => item.id === detail.subcontractor_id,
        ) ?? null);
  const taxNumber = subcontractor?.tax_number ?? null;
  const taxNumberReason =
    taxNumber !== null
      ? null
      : detail.subcontractor_id === null
        ? TAX_NUMBER_NO_SUBCONTRACTOR_REASON
        : TAX_NUMBER_UNRESOLVED_REASON;

  const site = detail.site_id
    ? (sitesQuery.data?.items.find((item) => item.id === detail.site_id) ?? null)
    : null;
  const employerContract = employerContractQuery.data;

  // 47-68 · dört halka. Her halkanın kaynağı FARKLI bir uçtur.
  const chain: ChainLink[] = [
    {
      chip: "İşveren Sözleşmesi",
      tone: "employer",
      primary: employerContract?.contract_no ?? "—",
      secondary: employerContract?.employer_name ?? null,
      href: employerContract ? `/sozlesmeler/isveren/${detail.project_id}` : null,
      pendingReason: employerContract ? null : EMPLOYER_CONTRACT_PENDING_REASON,
    },
    {
      chip: "Proje",
      tone: "project",
      primary: projectQuery.data?.name ?? "—",
      href: `/projeler/${detail.project_id}`,
    },
    {
      chip: "Şantiye",
      tone: "site",
      // `site_id === null` = proje geneli sözleşme (şema açıkça nullable) —
      // eksik veri DEĞİL, bu yüzden pending gerekçesi basılmaz.
      primary: detail.site_id ? (site?.name ?? "—") : SITE_PROJECT_WIDE,
      href: detail.site_id
        ? `/projeler/${detail.project_id}/santiyeler/${detail.site_id}`
        : null,
    },
    {
      chip: "Bu Sözleşme",
      tone: "current",
      primary: `${detail.contract_no ?? "—"} ${detail.subcontractor_name ?? ""}`.trim(),
    },
  ];

  const createPaymentHref = `/hakedisler/taseron/yeni?contract=${detail.id}`;
  const isProgressPending = paymentLines.isPending;
  const progressPctByItemId = isProgressPending
    ? null
    : buildItemProgressPct(detail.items, paymentLines.lines);

  function handleCommitUnitPrice(itemId: string, value: string) {
    setItemsError(null);
    updateItem.mutate(
      // Boş = "girilmedi" → `null`; `0` ASLA türetilmez (FSO kontratı).
      { itemId, body: { unit_price: value ? value : null } },
      { onError: (error) => setItemsError(backendErrorMessage(error)) },
    );
  }

  function handleSaveTerms() {
    if (!terms) return;
    setTermsError(null);
    setTermsSaved(false);
    updateContract.mutate(buildContractTermsUpdateBody(terms), {
      onSuccess: () => setTermsSaved(true),
      onError: (error) => setTermsError(backendErrorMessage(error)),
    });
  }

  return (
    <div className="tsd">
      <BackLink />

      <SubcontractorContractHeaderCard
        detail={detail}
        taxNumber={taxNumber}
        taxNumberReason={taxNumberReason}
        chain={chain}
        cumulativeGross={payments.cumulativeGross}
        cumulativeGrossReason={CUMULATIVE_PENDING_REASON}
        createPaymentHref={createPaymentHref}
      />

      {/* 24 · PDF butonu SİLİNMEZ; gerekçe `title`da saklı kalmaz. */}
      <p className="tsd__notice">
        <Button
          variant="secondary"
          className="tsd__pdf"
          disabled
          title={PDF_DISABLED_REASON}
          data-testid="tsd-pdf-disabled"
        >
          PDF
        </Button>
        <span>{PDF_DISABLED_REASON}.</span>
      </p>

      {/* 79-85 · kehribar bilgi bandı (mockup metni birebir) */}
      <div className="tsd-banner">
        <span className="tsd-banner__icon" aria-hidden="true">
          ⭐
        </span>
        <div>
          <p className="tsd-banner__title">Taşeron birim fiyatlarını burada belirliyorsunuz</p>
          <p className="tsd-banner__text">
            Poz isimleri işveren sözleşmesinden
            {employerContract?.contract_no ? ` (${employerContract.contract_no})` : ""} geldi. Sarı
            alanlara <strong>siz</strong> taşerona ödeyeceğiniz birim fiyatları girin. Bu fiyatlar
            tüm hakedişlerde otomatik kullanılır — her seferinde tekrar girmek gerekmez.
          </p>
        </div>
      </div>

      <SubcontractorContractItemsTable
        items={detail.items}
        contractTotal={detail.contract_total}
        itemsMissingPrice={detail.items_missing_price}
        employerContractNo={employerContract?.contract_no ?? null}
        progressPctByItemId={progressPctByItemId}
        progressPendingReason={PROGRESS_PENDING_REASON}
        isBusy={updateItem.isPending}
        errorMessage={itemsError}
        onCommitUnitPrice={handleCommitUnitPrice}
      />

      <SubcontractorContractPaymentsCard
        items={payments.items}
        isLoading={payments.isLoading}
        isError={payments.isError}
        truncationMessage={
          payments.truncation.isTruncated ? listTruncationMessage(payments.truncation) : null
        }
        newPaymentHref={createPaymentHref}
      />

      {/* §7 S3 taşeron ayağı — mockup gövdesinin DIŞINDA, ayrı bölüm. */}
      <div className="tsd-terms-section">
        {terms && (
          <ContractTermsCard
            values={terms}
            disabled={updateContract.isPending}
            headerAside={
              <Button
                variant="primary"
                className="tsd-terms__save"
                disabled={updateContract.isPending}
                onClick={handleSaveTerms}
                data-testid="tsd-terms-save"
              >
                {updateContract.isPending ? "Kaydediliyor…" : "Kaydet"}
              </Button>
            }
            onChange={(field, value) =>
              setTerms((prev) => (prev ? { ...prev, [field]: value } : prev))
            }
          />
        )}
        {/* `vat_pct` FSO'da kontrolü olmadığı için salt-okunur (E14 emsali). */}
        <p className="tsd-terms__readonly" data-testid="tsd-vat-readonly">
          KDV Oranı: {formatPercent(detail.vat_pct)} — {VAT_READONLY_NOTE}
        </p>
        {termsError && (
          <p className="tsd-items__notice tsd-items__notice--error" data-testid="tsd-terms-error">
            {termsError}
          </p>
        )}
        {termsSaved && !termsError && (
          <p className="tsd-items__notice" data-testid="tsd-terms-saved">
            Sözleşme şartları kaydedildi.
          </p>
        )}
      </div>
    </div>
  );
}

/** 19 · kırıntı yolunun kökü — liste rotasının TAŞERON sekmesi. */
function BackLink() {
  return (
    <Link href={contractTabHref("subcontractor")} className="ecd__back">
      ← Sözleşmeler
    </Link>
  );
}
