import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import { buildListTruncation, type ListTruncation } from "@/lib/list-truncation";

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
  /** Hakedişin bağlı olduğu bölüm — yalnız KİMLİK (`section_id`), İSİM
   * DEĞİL (bölüm adını çözecek bir uç/hook bu dilimde YOK — fix round 1:
   * çağıran taraf `null` ile "gerçekten bölümsüz" (Tüm Bölümler), dolu
   * değerle "adı çözülemeyen bölüm" durumunu AYIRT ETMELİDİR; ikisi de
   * pending DEĞİLDİR — yalnız ikincisi pending gösterilir). */
  sectionId: string | null;
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
  /** `items` KISMİ — ya sözleşme detaylarının BİR KISMI hata verdi ya da
   * hakediş listesi sunucu tavanında KIRPILDI (final inceleme F-3). Çağıran
   * taraf toplamı/marjı sessizce basmaz, görünür bant gösterir
   * (brief §Yükleme/hata görünürlüğü). İki neden için AYRI bir kanal
   * AÇILMAZ — mevcut `isPartial` kanalı tek karar noktasıdır. */
  isPartial: boolean;
  /** Kaç sözleşme detayı hata verdi (hata bandı metni için). */
  failedContractCount: number;
  /** Hakediş liste ucunun tavanı aşıldı mı (F-3) — bant metnini ayırt etmek
   * için; `isTruncated` zaten `isPartial`ın içindedir. */
  truncation: ListTruncation;
}

// F-3 · liste ucunun ŞEMA TAVANI. Daha büyük bir değer gönderilirse backend
// 422 döner — bu yüzden "hepsini çek" mümkün DEĞİLDİR, kırpılma görünür
// kılınır.
export const SUBCONTRACTOR_PAYMENT_LIST_MAX_LIMIT = 200;

export function useSiteSubcontractorPayments(
  projectId: string,
  siteId: string,
): UseSiteSubcontractorPaymentsResult {
  const paymentsQuery = useSubcontractorProgressPayments({
    project_id: projectId,
    limit: SUBCONTRACTOR_PAYMENT_LIST_MAX_LIMIT,
  });
  const payments = useMemo(() => paymentsQuery.data?.items ?? [], [paymentsQuery.data]);
  // F-3: tavan aşıldıysa elde EKSİK liste var — bu şantiyenin taşeron toplamı
  // ve ondan türeyen brüt kâr marjı YANLIŞ olurdu, o yüzden `isPartial`e
  // beslenir (para değerleri pending'e düşer, bant görünür).
  const truncation = buildListTruncation(payments.length, paymentsQuery.data?.total);

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
        sectionId: payment.section_id,
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
    isPartial: failedContractCount > 0 || truncation.isTruncated,
    failedContractCount,
    truncation,
  };
}
