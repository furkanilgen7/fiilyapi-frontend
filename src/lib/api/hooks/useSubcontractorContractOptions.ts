import { useMemo } from "react";

import { buildListTruncation, type ListTruncation } from "@/lib/list-truncation";

import {
  useSubcontractorContractsList,
  SUBCONTRACTOR_CONTRACT_LIST_MAX_LIMIT,
  type SubcontractorContractListItem,
} from "./useSubcontractorProgressPayments";

// F-TH TB2 takip — bu hook önce (T1) `GET /subcontractor-progress-payments`
// yanıtından DISTINCT `contract_id` türetiyordu, çünkü backend'de bir
// sözleşme LİSTE ucu yoktu. TB2 ile `GET /subcontractor-contracts` (U1)
// geldi: türetme TAMAMEN kaldırıldı, artık DOĞRUDAN bu uçtan beslenir.
// Sonuç: hiç hakedişi olmayan sözleşmeler de artık seçilebilir — eski sınır
// (yalnız en az bir hakedişi olan sözleşmeler görünürdü) bitti.
//
// ⚠️ F-P5 T1 DÜZELTMESİ — eskiden burada "Sayfalama YOK (U1'in kendisinde
// `limit`/`offset`/`total` yok) — kırpılma kavramı bu uçta anlamsız" yazıyordu.
// TB3 ile bu İDDİA GEÇERSİZ oldu: uç `limit` (varsayılan 50, tavan 200) ve
// `offset` alır, yanıtta `total` döner. Açık `limit` gönderilmezse seçim kutusu
// SESSİZCE ilk 50 sözleşmeyle sınırlanır ve kullanıcının aradığı sözleşme
// listede hiç görünmez. Bu yüzden F-TH'nin korkuluk emsali (`buildListTruncation`
// + görünür bant) buraya da uygulandı: şema tavanı kadar istenir, `total` ile
// kırpılma hesaplanır ve `truncation`/`isPartial` çağırana SIZDIRILIR — çağıran
// taraf görünür uyarı basmak ZORUNDADIR (sessiz kırpma yasak).
//
// Dönüş şekli (`SubcontractorContractOption`) SABİT kaldı — çağıranlar U1'in
// fazladan alanlarını (`site_id`, `status`, `is_draft`, `work_category`)
// GÖRMEZ.

/** Hook'un çağıranlara sızdırdığı TEK şekil — ham liste öğesi asla dışarı sızmaz. */
export interface SubcontractorContractOption {
  contractId: string;
  contractNo: string | null;
  subcontractorName: string;
  projectId: string;
  projectName: string;
}

export interface UseSubcontractorContractOptionsResult {
  options: SubcontractorContractOption[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  /** `options` KISMİ — sunucu tavanı aşıldı, seçim kutusunda OLMAYAN sözleşme
   * var. Çağıran taraf görünür bant basar. */
  isPartial: boolean;
  /** Bant metnini (`listTruncationMessage`) üretmek için ham sayılar. */
  truncation: ListTruncation;
}

function toOption(item: SubcontractorContractListItem): SubcontractorContractOption {
  return {
    contractId: item.id,
    contractNo: item.contract_no,
    subcontractorName: item.subcontractor_name ?? "",
    projectId: item.project_id,
    projectName: item.project_name,
  };
}

/**
 * Sözleşme seçenekleri — U1'den doğrudan gelir, taşeron adına göre (`tr`
 * yerel sıralama) alfabetik sıralanmış. Şema tavanı (`limit=200`) AÇIKÇA
 * gönderilir; sunucu daha fazlasını bildirirse (`total > items.length`)
 * kırpılma `isPartial`/`truncation` ile görünür kılınır.
 */
export function useSubcontractorContractOptions(): UseSubcontractorContractOptionsResult {
  const query = useSubcontractorContractsList({
    limit: SUBCONTRACTOR_CONTRACT_LIST_MAX_LIMIT,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const truncation = buildListTruncation(items.length, query.data?.total);

  const options = useMemo<SubcontractorContractOption[]>(
    () =>
      items
        .map(toOption)
        .sort((a, b) => a.subcontractorName.localeCompare(b.subcontractorName, "tr")),
    [items],
  );

  return {
    options,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isPartial: truncation.isTruncated,
    truncation,
  };
}
