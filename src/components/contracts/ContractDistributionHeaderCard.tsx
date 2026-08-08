import { formatCompactCurrency } from "@/lib/format";
import type { EmployerContractDetail } from "@/lib/api/hooks/useContract";

import "./contract-distribution.css";

/**
 * POZ 42-60 · sözleşme başlık kartı + iki sayaç kutusu.
 *
 * Başlıktaki sözleşme no / işveren / bedel DAĞILIM ucundan DEĞİL sözleşme
 * DETAY ucundan gelir (`useEmployerContract`) — dağılım yanıtında bu alanlar
 * yoktur. Detay yüklenemezse kart SESSİZ düşmez: eksik alanların yerine
 * görünür bir gerekçe yazılır (üst kural).
 *
 * 51-52 "Şantiyeler" = dağılım yanıtının kolon sayısı ·
 * 55-56 "Dağıtılan Poz" = `distributed_item_count`/`total_item_count`.
 */
export interface ContractDistributionHeaderCardProps {
  detail?: EmployerContractDetail;
  isDetailError: boolean;
  projectName?: string;
  siteCount: number;
  distributedItemCount: number;
  totalItemCount: number;
}

export function ContractDistributionHeaderCard({
  detail,
  isDetailError,
  projectName,
  siteCount,
  distributedItemCount,
  totalItemCount,
}: ContractDistributionHeaderCardProps) {
  const contractNo = detail?.contract_no ?? null;

  return (
    <section className="cdist-head" aria-labelledby="cdist-head-title">
      <div>
        {/* 45 */}
        <p className="cdist-head__no" data-testid="cdist-head-no">
          İşveren Sözleşmesi
          {contractNo === null ? "" : ` · ${contractNo}`}
        </p>
        {/* 46 — sayfanın tek h1'i; POZ'da daha büyük bir başlık yoktur. */}
        <h1 className="cdist-head__title" id="cdist-head-title">
          {projectName ?? "Poz Dağılımı"}
        </h1>
        {/* 47 */}
        <p className="cdist-head__parties" data-testid="cdist-head-parties">
          {detail === undefined
            ? isDetailError
              ? "İşveren ve sözleşme bedeli yüklenemedi — sözleşme detayı okunamıyor."
              : "İşveren ve sözleşme bedeli yükleniyor…"
            : `İşveren: ${detail.employer_name ?? "—"} · Toplam Bedel: ${
                detail.amount === null ? "—" : formatCompactCurrency(detail.amount)
              }`}
        </p>
      </div>

      <div className="cdist-head__stats">
        {/* 50-53 */}
        <div className="cdist-stat cdist-stat--sites">
          <div className="cdist-stat__label">Şantiyeler</div>
          <div className="cdist-stat__value" data-testid="cdist-site-count">
            {siteCount}
          </div>
        </div>
        {/* 54-57 */}
        <div className="cdist-stat cdist-stat--items">
          <div className="cdist-stat__label">Dağıtılan Poz</div>
          <div className="cdist-stat__value" data-testid="cdist-distributed-count">
            {distributedItemCount}/{totalItemCount}
          </div>
        </div>
      </div>
    </section>
  );
}
