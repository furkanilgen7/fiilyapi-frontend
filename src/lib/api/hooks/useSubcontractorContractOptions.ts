import { useMemo } from "react";

import {
  useSubcontractorContractsList,
  type SubcontractorContractListItem,
} from "./useSubcontractorProgressPayments";

// F-TH TB2 takip — bu hook önce (T1) `GET /subcontractor-progress-payments`
// yanıtından DISTINCT `contract_id` türetiyordu, çünkü backend'de bir
// sözleşme LİSTE ucu yoktu. TB2 ile `GET /subcontractor-contracts` (U1)
// geldi: türetme TAMAMEN kaldırıldı, artık DOĞRUDAN bu uçtan beslenir.
// Sonuç: hiç hakedişi olmayan sözleşmeler de artık seçilebilir — eski sınır
// (yalnız en az bir hakedişi olan sözleşmeler görünürdü) bitti.
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
 * yerel sıralama) alfabetik sıralanmış. Sayfalama YOK (U1'in kendisinde
 * `limit`/`offset`/`total` yok) — kırpılma kavramı bu uçta anlamsız.
 */
export function useSubcontractorContractOptions(): UseSubcontractorContractOptionsResult {
  const query = useSubcontractorContractsList();

  const options = useMemo<SubcontractorContractOption[]>(() => {
    const items = query.data?.items ?? [];
    return items
      .map(toOption)
      .sort((a, b) => a.subcontractorName.localeCompare(b.subcontractorName, "tr"));
  }, [query.data]);

  return {
    options,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
