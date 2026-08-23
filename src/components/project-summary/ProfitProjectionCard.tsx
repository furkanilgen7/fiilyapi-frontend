import { formatCurrency, formatPercent } from "@/lib/format";
import type { ProjectProfitProjection } from "@/lib/api/hooks/useProjectCosts";

import { PendingCell, EMPTY_VALUE } from "./PendingCell";
import { PROJECT_SUMMARY_PENDING_KEYS } from "./project-summary-labels";

/**
 * KY 168-194 / KK 121-141 kâr projeksiyonu bloğu — şema açıklamasının kendi
 * adresi.
 *
 * 🔴 ALTI ALANIN HEPSİ `string | null`DIR ve `null` "HESAPLANAMAZ" demektir,
 * "sıfır" DEĞİL. `₺0` basmak, satış hedefi girilmemiş bir projede
 * "hedef yok" ile "hedef sıfır"ı aynı gösterirdi. `null` hâlinde hücre
 * gerekçesiyle boş basılır.
 *
 * `realized_sales` ve `remaining_stock_value` TAAHHÜTTE her zaman `null`dır
 * (backend `_profit`: ünite/satış kavramı o türde yoktur) — ama bu ekran
 * zaten taahhütte hiç açılmaz (K1).
 *
 * 🔴 BASILMAYAN: KY 190-193 "Başabaş noktası: 32 ünite". Altı alanın hiçbiri
 * eşik ünite sayısı değildir; ortalama fiyattan türetmek mockup'ın
 * söylemediği bir formül uydurmak olurdu (K2 · `sales_breakeven`).
 */
export interface ProfitProjectionCardProps {
  profit: ProjectProfitProjection;
}

function Line({
  label,
  note,
  value,
  tone,
}: {
  label: string;
  note?: string;
  value: string | null;
  tone?: "revenue" | "stock" | "cost";
}) {
  return (
    <div className={`psum-profit__line${tone ? ` psum-profit__line--${tone}` : ""}`}>
      <div>
        <div className="psum-profit__label">{label}</div>
        {note ? <div className="psum-profit__note">{note}</div> : null}
      </div>
      <span className="psum-profit__value">
        {value === null ? EMPTY_VALUE : formatCurrency(value)}
      </span>
    </div>
  );
}

export function ProfitProjectionCard({ profit }: ProfitProjectionCardProps) {
  return (
    <section className="psum-card" aria-labelledby="psum-profit-title">
      <h2 className="psum-card__title" id="psum-profit-title">
        Kâr Projeksiyonu
      </h2>

      <div className="psum-profit">
        {/* KY 171-176 · toplam satış hedefi. Mockup'ın "52 ünite · Ortalama
            ₺927K" alt satırı BASILMAZ: ortalama fiyat yanıtta yoktur ve
            `revenue / ünite sayısı` istemci türevi olurdu (K4). */}
        <Line label="Toplam Satış Hedefi" value={profit.revenue} tone="revenue" />
        <Line label="Gerçekleşen Satış" value={profit.realized_sales} />
        <Line label="Kalan Stok Değeri" value={profit.remaining_stock_value} tone="stock" />

        <hr className="psum-profit__rule" />

        <Line label="Toplam Bütçe Maliyeti" value={profit.cost} tone="cost" />

        {/* KY 183-189 · vurgulu net kâr kutusu. Kâr ve marj AYRI alanlardır ve
            ayrı ayrı `null` olabilir — marjı kârdan türetmeyiz (K4). */}
        <div className="psum-profit__net">
          <div>
            <div className="psum-profit__net-label">Tahmini Net Kâr</div>
            <div className="psum-profit__net-note">Tüm üniteler satıldığında</div>
          </div>
          <div className="psum-profit__net-figures">
            <div className="psum-profit__net-value">
              {profit.profit === null ? EMPTY_VALUE : formatCurrency(profit.profit)}
            </div>
            <div className="psum-profit__net-margin">
              {profit.margin_pct === null
                ? EMPTY_VALUE
                : `${formatPercent(profit.margin_pct)} marj`}
            </div>
          </div>
        </div>

        {/* KY 190-193 — kart SİLİNMEZ, gerekçesiyle durur. */}
        <PendingCell
          label="Başabaş Noktası"
          moduleKey={PROJECT_SUMMARY_PENDING_KEYS.salesBreakeven}
          className="psum-profit__pending"
        />
      </div>
    </section>
  );
}
