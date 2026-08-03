import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";

import {
  useSubcontractorProgressPayments,
  SUBCONTRACTOR_CONTRACT_QUERY_KEY,
  type SubcontractorPaymentStatus,
} from "./useSubcontractorProgressPayments";

// F-TH T5 · KULLANICI KARARI (bağlayıcı, yeniden tartışılmaz) — taşeron
// hakedişi liste ucu (`GET /subcontractor-progress-payments`) yalnız
// `project_id` ile filtrelenir; backend'de `site_id` filtresi YOK. Şantiye
// bağı sözleşmededir (`SubcontractorContractDetail.site_id`). Bu yüzden
// istemci-tarafı süzmenin TAMAMI burada, TEK yerde yaşar:
//
//   1) projenin taşeron hakedişlerini çek
//   2) distinct `contract_id`lerin sözleşme detaylarını PARALEL VE
//      ÖNBELLEKLİ al (`useQueries` + `useSubcontractorContract` ile AYNI
//      query key — TanStack Query cache'i T1/T4 ile PAYLAŞILIR, elle fetch
//      döngüsü YOK)
//   3) `site_id` eşleşenleri süz
//
// BU SÜZME GEÇİCİDİR: backend'e `site_id` filtresi (TB2) eklendiğinde
// YALNIZ BU HOOK'UN İÇİ değişecek — dönüş tipi (`SiteSubcontractorPaymentItem`)
// ve çağıranlar SABİT kalır.
//
// `site_id === null` (proje-geneli, şantiyeye bağlanmamış) sözleşmelerin
// hakedişleri şantiye sekmesine BİLİNÇLİ olarak DAHİL EDİLMEZ (tek-anlamlılık
// kararı) — "veri kayboluyor" diye geri alınmaz.

/** Hook'un çağıranlara sızdırdığı TEK şekil — ham liste öğesi VE sözleşme
 * detayı tipi asla dışarı sızmaz. */
export interface SiteSubcontractorPaymentItem {
  id: string;
  contractId: string;
  subcontractorName: string;
  sequenceNo: number;
  /** Sözleşme detayından (`work_category`) — liste şemasında YOK, bu hook
   * zaten sözleşme detayını çektiğinden GERÇEK değer taşınabilir. `null`
   * olabilir (sözleşmede de boşsa) — çağıran taraf zarif düşüş uygular. */
  workCategory: string | null;
  grossTotal: string;
  netTotal: string;
  status: SubcontractorPaymentStatus;
  isRevisionRequired: boolean;
}

export interface UseSiteSubcontractorPaymentsResult {
  /** Şantiyeye ait VE sözleşme detayı başarıyla çözülmüş hakedişler. */
  items: SiteSubcontractorPaymentItem[];
  /** Hakediş listesi ya da sözleşme detaylarının ilk turu yükleniyor —
   * çağıran taraf iskelet/spinner gösterir. */
  isLoading: boolean;
  /** Hakediş liste ucunun kendisi hata verdi — `items` GÜVENİLMEZ, tümüyle atlanır. */
  isError: boolean;
  /** Sözleşme detaylarının BİR KISMI hata verdi — `items` KISMİ olabilir.
   * Çağıran taraf toplamı/marjı sessizce basmaz, görünür hata bandı gösterir
   * (brief §Yükleme/hata görünürlüğü). */
  isPartial: boolean;
  /** Kaç sözleşme detayı hata verdi (hata bandı metni için). */
  failedContractCount: number;
}

export function useSiteSubcontractorPayments(
  projectId: string,
  siteId: string,
): UseSiteSubcontractorPaymentsResult {
  const paymentsQuery = useSubcontractorProgressPayments({ project_id: projectId, limit: 200 });
  const payments = useMemo(() => paymentsQuery.data?.items ?? [], [paymentsQuery.data]);

  const distinctContractIds = useMemo(() => {
    const ids = new Set<string>();
    for (const payment of payments) ids.add(payment.contract_id);
    return Array.from(ids);
  }, [payments]);

  const contractQueries = useQueries({
    queries: distinctContractIds.map((contractId) => ({
      queryKey: [SUBCONTRACTOR_CONTRACT_QUERY_KEY, contractId],
      queryFn: async () =>
        unwrap(
          await backendClient.GET("/subcontractor-contracts/{contract_id}", {
            params: { path: { contract_id: contractId } },
          }),
        ),
    })),
  });

  const contractsByid = useMemo(() => {
    const map = new Map<string, { siteId: string | null; workCategory: string | null }>();
    distinctContractIds.forEach((contractId, index) => {
      const query = contractQueries[index];
      if (query?.data) {
        map.set(contractId, { siteId: query.data.site_id, workCategory: query.data.work_category });
      }
    });
    return map;
  }, [distinctContractIds, contractQueries]);

  const failedContractCount = contractQueries.filter((query) => query.isError).length;
  const anyContractLoading = contractQueries.some((query) => query.isLoading);

  const items = useMemo<SiteSubcontractorPaymentItem[]>(() => {
    const filtered: SiteSubcontractorPaymentItem[] = [];
    for (const payment of payments) {
      const contract = contractsByid.get(payment.contract_id);
      if (!contract) continue; // sözleşme detayı henüz gelmedi ya da hata verdi
      if (contract.siteId !== siteId) continue; // başka şantiye ya da proje-geneli (null)
      filtered.push({
        id: payment.id,
        contractId: payment.contract_id,
        subcontractorName: payment.subcontractor_name ?? "—",
        sequenceNo: payment.sequence_no,
        workCategory: contract.workCategory,
        grossTotal: payment.gross_total,
        netTotal: payment.net_total,
        status: payment.status,
        isRevisionRequired: payment.is_revision_required,
      });
    }
    return filtered;
  }, [payments, contractsByid, siteId]);

  return {
    items,
    isLoading: paymentsQuery.isLoading || (distinctContractIds.length > 0 && anyContractLoading),
    isError: paymentsQuery.isError,
    isPartial: failedContractCount > 0,
    failedContractCount,
  };
}
