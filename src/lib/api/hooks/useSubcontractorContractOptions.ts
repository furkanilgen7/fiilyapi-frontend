import { useMemo } from "react";

import { buildListTruncation, type ListTruncation } from "@/lib/list-truncation";

import { SUBCONTRACTOR_PAYMENT_LIST_MAX_LIMIT } from "./useSiteSubcontractorPayments";
import {
  useSubcontractorProgressPayments,
  type SubcontractorProgressPaymentListItem,
} from "./useSubcontractorProgressPayments";

// F-TH T1 · KULLANICI KARARI (bağlayıcı) — backend'de taşeron sözleşmesi
// için bir LİSTE ucu YOK (yalnız `GET /subcontractor-contracts/{id}` tekil
// detay vardır). Sözleşme seçim listesi bu dilimde `GET
// /subcontractor-progress-payments` yanıtından DISTINCT türetilir. Bu
// türetme GEÇİCİDİR: `GET /subcontractor-contracts` liste ucu (TB2) geldiğinde
// YALNIZ BU HOOK'UN İÇİ değişecek — dönüş tipi (`SubcontractorContractOption`)
// ve `isDerivedFromPayments` bayrağı SABİT kalır, çağıranlar hakediş listesi
// şemasına ait hiçbir alanı GÖRMEZ.

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
  /** T3'ün kalıcı bilgi notu + boş-durum metni için: liste ucu gelene kadar
   * her zaman `true` — türetmenin GEÇİCİ olduğunu ekrana taşımak içindir. */
  isDerivedFromPayments: true;
  /** Final inceleme F-3 — hakediş listesi sunucu tavanında kırpıldıysa
   * seçenek listesi de EKSİKTİR; seçim adımı bunu GÖRÜNÜR basar. */
  truncation: ListTruncation;
}

function toOption(item: SubcontractorProgressPaymentListItem): SubcontractorContractOption {
  return {
    contractId: item.contract_id,
    contractNo: item.contract_no,
    subcontractorName: item.subcontractor_name ?? "",
    projectId: item.project_id,
    projectName: item.project_name,
  };
}

/**
 * Sözleşme seçenekleri — hakediş listesinden `contract_id`ye göre
 * tekilleştirilmiş, taşeron adına göre (`tr` yerel sıralama) alfabetik
 * sıralanmış.
 *
 * ⚠️ Final inceleme F-3 — eski yorum "limit 200 ile TAM LİSTE çekilir"
 * diyordu, bu YANLIŞTI: 200 şema TAVANIDIR, garanti değil. 200'den fazla
 * hakedişi olan bir kurulumda seçenek listesi SESSİZCE eksik kalırdı.
 * Kırpılma artık yutulmuyor: `truncation` dışa verilir, seçim adımı görünür
 * uyarı basar.
 */
export function useSubcontractorContractOptions(): UseSubcontractorContractOptionsResult {
  const query = useSubcontractorProgressPayments({ limit: SUBCONTRACTOR_PAYMENT_LIST_MAX_LIMIT });

  const options = useMemo<SubcontractorContractOption[]>(() => {
    const items = query.data?.items ?? [];
    const byContract = new Map<string, SubcontractorContractOption>();
    for (const item of items) {
      if (byContract.has(item.contract_id)) continue;
      byContract.set(item.contract_id, toOption(item));
    }
    return Array.from(byContract.values()).sort((a, b) =>
      a.subcontractorName.localeCompare(b.subcontractorName, "tr"),
    );
  }, [query.data]);

  return {
    options,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isDerivedFromPayments: true,
    truncation: buildListTruncation(query.data?.items.length ?? 0, query.data?.total),
  };
}
