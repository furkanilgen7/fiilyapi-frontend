import { useMemo } from "react";

import { buildListTruncation, type ListTruncation } from "@/lib/list-truncation";

import {
  useSubcontractorProgressPayments,
  useSubcontractorContractsList,
  type SubcontractorPaymentStatus,
} from "./useSubcontractorProgressPayments";

// F-TH TB2 takip — bu hook önce (T5) `site_id` filtresini İSTEMCİ tarafında
// uyguluyordu: proje-düzeyi hakediş listesi çekilir, distinct `contract_id`
// için sözleşme detayı N+1 fan-out ile çözülür, sonra `site_id` süzülürdü.
// TB2 ile U2'ye (`GET /subcontractor-progress-payments`) `site_id` filtresi
// eklendi: süzme artık SUNUCUDA yapılır, N+1 tamamen kaldırıldı.
//
// `site_id === null` (proje-geneli, şantiyeye bağlanmamış) sözleşmelerin
// hakedişleri şantiye sekmesine BİLİNÇLİ olarak DAHİL EDİLMEZ (tek-anlamlılık
// kararı, DEĞİŞMEDİ) — bu artık sunucu tarafındaki `site_id` filtresinin
// kendisi tarafından sağlanır (`site_id` verilince proje-geneli sözleşmeler
// zaten dönmez).
//
// `workCategory` (kullanıcı kararı — KORUNUR): liste şemasında YOK, bu yüzden
// U2'nin YANINA site'ye ait sözleşmeleri listeleyen TEK bir U1 isteği eklenir
// (`useSubcontractorContractsList({ site_id })`) ve `contract_id` üzerinden
// join edilir. Bu istek U2 ile PARALEL gider (ikisi de bağımsız `useQuery`),
// N+1 YOKTUR — sözleşme sayısından BAĞIMSIZ tek istek. Join'de eşleşme
// bulunamazsa (yarış durumu: hakediş listesi geldi, sözleşme o anda
// değişti/silindi) `workCategory = null` ile zarif düşüş uygulanır, hata
// FIRLATILMAZ.

/** Hook'un çağıranlara sızdırdığı TEK şekil — ham liste öğesi VE sözleşme
 * detayı tipi asla dışarı sızmaz. */
export interface SiteSubcontractorPaymentItem {
  id: string;
  contractId: string;
  subcontractorName: string;
  sequenceNo: number;
  /** Sözleşme LİSTE ucundan (`work_category`) join ile — liste şemasında
   * YOK. `null` olabilir (sözleşmede de boşsa ya da join'de eşleşme
   * bulunamazsa) — çağıran taraf zarif düşüş uygular. */
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
  /** Şantiyeye ait hakedişler (sunucu tarafında `site_id` ile süzülmüş). */
  items: SiteSubcontractorPaymentItem[];
  /** Hakediş listesi yükleniyor — çağıran taraf iskelet/spinner gösterir. */
  isLoading: boolean;
  /** Hakediş liste ucunun kendisi hata verdi — `items` GÜVENİLMEZ, tümüyle atlanır. */
  isError: boolean;
  /** `items` KISMİ — hakediş listesi sunucu tavanında KIRPILDI (final
   * inceleme F-3). Çağıran taraf toplamı/marjı sessizce basmaz, görünür bant
   * gösterir (brief §Yükleme/hata görünürlüğü). */
  isPartial: boolean;
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
    site_id: siteId,
    limit: SUBCONTRACTOR_PAYMENT_LIST_MAX_LIMIT,
  });
  const payments = useMemo(() => paymentsQuery.data?.items ?? [], [paymentsQuery.data]);
  // F-3: tavan aşıldıysa elde EKSİK liste var — bu şantiyenin taşeron toplamı
  // ve ondan türeyen brüt kâr marjı YANLIŞ olurdu, o yüzden `isPartial`e
  // beslenir (para değerleri pending'e düşer, bant görünür).
  const truncation = buildListTruncation(payments.length, paymentsQuery.data?.total);

  // U2 ile PARALEL — biri diğerini beklemez, N+1 yok (tek istek, sözleşme
  // sayısından bağımsız).
  const contractsQuery = useSubcontractorContractsList({ site_id: siteId });

  const workCategoryByContractId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const contract of contractsQuery.data?.items ?? []) {
      map.set(contract.id, contract.work_category);
    }
    return map;
  }, [contractsQuery.data]);

  const items = useMemo<SiteSubcontractorPaymentItem[]>(() => {
    return payments.map((payment) => ({
      id: payment.id,
      contractId: payment.contract_id,
      subcontractorName: payment.subcontractor_name ?? "—",
      sequenceNo: payment.sequence_no,
      // Eşleşme bulunamazsa (yarış durumu) `null` — hata fırlatılmaz.
      workCategory: workCategoryByContractId.get(payment.contract_id) ?? null,
      sectionId: payment.section_id,
      grossTotal: payment.gross_total,
      netTotal: payment.net_total,
      status: payment.status,
      isRevisionRequired: payment.is_revision_required,
    }));
  }, [payments, workCategoryByContractId]);

  return {
    items,
    isLoading: paymentsQuery.isLoading || contractsQuery.isLoading,
    isError: paymentsQuery.isError,
    isPartial: truncation.isTruncated,
    truncation,
  };
}
