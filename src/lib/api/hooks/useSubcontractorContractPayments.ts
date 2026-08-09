import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { sumDecimalStrings } from "@/lib/decimal";
import { buildListTruncation, type ListTruncation } from "@/lib/list-truncation";

import { SUBCONTRACTOR_PAYMENT_LIST_MAX_LIMIT } from "./useSiteSubcontractorPayments";
import {
  subcontractorPaymentQueryOptions,
  useSubcontractorProgressPayments,
  type SubcontractorProgressPaymentLineRead,
  type SubcontractorProgressPaymentListItem,
} from "./useSubcontractorProgressPayments";

/**
 * F-P5 T7 · TSD'nin (`Taşeron Sözleşme Detay.dc.html`) TEK bir sözleşmeye ait
 * hakediş verisi.
 *
 * 🛑 **Uçta `contract_id` filtresi YOKTUR** (openapi teyidi:
 * `GET /subcontractor-progress-payments` yalnız `project_id`, `site_id`,
 * `period_year`, `period_month`, `status`, `q`, `limit`, `offset` alır). Bu
 * yüzden filtre SUNUCUDA proje düzeyinde uygulanır, sözleşme süzmesi
 * İSTEMCİDE yapılır (`SubcontractorProgressPaymentListItem.contract_id`
 * şemada VARDIR — ada göre eşleştirmeye gerek yok).
 *
 * Kırpılma korkuluğu (F-TH F-3 dersi): sunucu tavanı AÇIKÇA gönderilir ve
 * `total` ile eksiklik görünür kılınır. Liste kırpıldıysa istemci süzmesi
 * eksik bir kümede çalışır — bu kümeden türeyen para/oran değerleri
 * BASILMAZ (`cumulativeGross === null`, `Hakediş %` pending).
 */
export interface SubcontractorContractPaymentsResult {
  /** Yalnız bu sözleşmenin hakedişleri; sıra: en yeni (`sequence_no`) önce. */
  items: SubcontractorProgressPaymentListItem[];
  isLoading: boolean;
  isError: boolean;
  /** Liste kırpıldı VEYA uç hata verdi — türev değerler güvenilmez. */
  isPartial: boolean;
  truncation: ListTruncation;
  /**
   * Mockup 74 · "Ödenen Hakediş". Değer mockup'ın KENDİ aritmetiğinden
   * çıkarıldı: 74'teki ₺2.936.000 = 199+200+201 satırlarındaki üç hakediş
   * tutarının (1.240.000 + 960.000 + 736.000) toplamıdır — yani "yalnız
   * `paid` olanlar" DEĞİL, sözleşmenin TÜM hakedişlerinin brüt toplamıdır
   * (199. satırdaki kayıt "Onay Bekliyor"dur ve toplama dahildir).
   * `gross_total` seçimi de mockup'tan: 194 "Tutar" kolonu = F-TH'nin "Brüt
   * Tutar" hücresi (bkz. `shared/status.ts` içindeki aynı kanıt).
   * Kırpılmada `null` (PENDING).
   */
  cumulativeGross: string | null;
}

export function useSubcontractorContractPayments(
  contractId: string,
  /** Sözleşmenin projesi; detay gelene kadar boş — sorgu o sürede KAPALIDIR. */
  projectId: string,
): SubcontractorContractPaymentsResult {
  const isEnabled = projectId.length > 0 && contractId.length > 0;
  const paymentsQuery = useSubcontractorProgressPayments(
    { project_id: projectId, limit: SUBCONTRACTOR_PAYMENT_LIST_MAX_LIMIT },
    { enabled: isEnabled },
  );

  const projectPayments = useMemo(
    () => paymentsQuery.data?.items ?? [],
    [paymentsQuery.data],
  );
  const truncation = buildListTruncation(projectPayments.length, paymentsQuery.data?.total);
  const isPartial = truncation.isTruncated || paymentsQuery.isError;

  const items = useMemo(
    () =>
      projectPayments
        .filter((payment) => payment.contract_id === contractId)
        .sort((a, b) => b.sequence_no - a.sequence_no),
    [projectPayments, contractId],
  );

  const cumulativeGross = isPartial
    ? null
    : sumDecimalStrings(items.map((payment) => payment.gross_total));

  return {
    items,
    isLoading: isEnabled && paymentsQuery.isLoading,
    isError: paymentsQuery.isError,
    isPartial,
    truncation,
    cumulativeGross,
  };
}

export interface SubcontractorPaymentLinesResult {
  /** Tüm hakedişlerin satırları, düzleştirilmiş. */
  lines: SubcontractorProgressPaymentLineRead[];
  /** `true` ⇒ satır kümesi EKSİK/GÜVENİLMEZ — yüzde BASILMAZ. */
  isPending: boolean;
}

/**
 * "Hakediş %" kolonunun (mockup 103, 117-120) ham kaynağı.
 *
 * Yüzde, poz başına KÜMÜLATİF hakediş miktarının sözleşme miktarına oranıdır;
 * miktarlar yalnız hakediş DETAYINDA (`lines[].contract_item_id` +
 * `quantity`) bulunur. Toplulaştıran bir uç YOKTUR (openapi'de
 * `/subcontractor-contracts/*` altında ilerleme veren yol yok), bu yüzden
 * sözleşmenin hakedişleri PARALEL çekilir (`useQueries`). Fan-out TEK bir
 * sözleşmenin geçmişiyle sınırlıdır ve önbellek hakediş detay ekranıyla
 * paylaşılır.
 *
 * Herhangi bir detay yükleniyor/hatalıysa ya da liste kırpıldıysa yüzde
 * SESSİZCE yanlış basılmaz — `isPending` döner.
 */
export function useSubcontractorPaymentLines(
  paymentIds: readonly string[],
  isEnabled: boolean,
): SubcontractorPaymentLinesResult {
  const queries = useQueries({
    queries: isEnabled ? paymentIds.map((id) => subcontractorPaymentQueryOptions(id)) : [],
  });

  const lines = queries.flatMap((query) => query.data?.lines ?? []);
  const isPending =
    !isEnabled || queries.some((query) => query.isLoading || query.isError);

  return { lines, isPending };
}
