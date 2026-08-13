import { Badge } from "@/components/ui";
import { formatCompactCurrency } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { SupplierCard } from "@/lib/api/hooks/useSuppliers";

import { PAYMENT_TERMS_LABELS } from "./purchasing-labels";
import "./purchasing.css";

/** TED 55-58 · yıldız satırının pending anahtarı (şemada puan alanı YOK). */
export const SUPPLIER_RATING_PENDING_MODULE = "supplier_rating";

/**
 * TED 43/64/84/105 · künye kutusunun gradyanı kartlar arasında DÖRTLÜ döner
 * (mavi → yeşil → kehribar → mor). Renk tedarikçinin bir ÖZELLİĞİ değildir
 * (şemada böyle bir alan yok); mockup'ın ızgara ritmidir, bu yüzden SIRA
 * indeksinden türetilir.
 */
const AVATAR_TONE_COUNT = 4;

export interface SupplierGridCardProps {
  supplier: SupplierCard;
  /** Izgaradaki sırası — yalnız gradyan tonunu seçer. */
  index: number;
}

/**
 * TED 41-60 · tek tedarikçi kartı: künye şeridi (42-46) · üç künye satırı
 * (47-51) · "Bu Yıl Toplam Sipariş" kutusu (52-59).
 *
 * ⚠️ "Bu Yıl Toplam Sipariş" (53) SUNUCU TÜREVİDİR: istemci sipariş
 * listesinden yeniden TOPLAMAZ (`useSuppliers` notu). Siparişsiz tedarikçide
 * değer `null` DEĞİL SIFIRDIR — "veri yok" ile "hiç sipariş verilmedi"
 * ayrımı sunucuda çözülmüştür; kart ikincisini AÇIKÇA yazar ki ₺ 0 bir
 * yükleme hatası sanılmasın.
 *
 * ⚠️ PUAN/yıldız (55-58) BASILMAZ ama satır SİLİNMEZ: `SupplierCard`
 * şemasında puan alanı yoktur (`subcontractor_rating` emsali) — "—" +
 * görünür gerekçe.
 */
export function SupplierGridCard({ supplier, index }: SupplierGridCardProps) {
  const initial = supplier.name.trim().charAt(0).toLocaleUpperCase("tr-TR");
  const tone = (index % AVATAR_TONE_COUNT) + 1;
  const ratingReason = pendingModuleLabel(SUPPLIER_RATING_PENDING_MODULE);
  const hasOrders = supplier.orders_count_this_year > 0;

  return (
    <article className="ted-card" data-testid={`ted-card-${supplier.id}`}>
      {/* 42-46 */}
      <div className="ted-card__head">
        <div className={`ted-card__avatar ted-card__avatar--${tone}`} aria-hidden="true">
          {initial}
        </div>
        <div className="ted-card__identity">
          <div className="ted-card__name">{supplier.name}</div>
          {/* 44 — kategori SERBEST METİNDİR; yoksa satır boş kalır, uydurulmaz */}
          {supplier.category && <div className="ted-card__category">{supplier.category}</div>}
        </div>
        {/* 45 — pasif tedarikçi mockup'ta çizilmedi; rozet SİLİNMEZ, tonu düşer */}
        <Badge
          variant={supplier.is_active ? "success" : "neutral"}
          className="ted-card__status"
        >
          {supplier.is_active ? "Aktif" : "Pasif"}
        </Badge>
      </div>

      {/* 47-51 */}
      <dl className="ted-card__facts">
        <div className="ted-card__fact">
          <dt>VKN</dt>
          <dd className="ted-card__fact-value ted-card__fact-value--mono">
            {supplier.tax_no ?? "—"}
          </dd>
        </div>
        <div className="ted-card__fact">
          <dt>İletişim</dt>
          <dd className="ted-card__fact-value">{supplier.phone ?? "—"}</dd>
        </div>
        <div className="ted-card__fact">
          <dt>Ödeme Vadesi</dt>
          <dd className="ted-card__fact-value">
            {PAYMENT_TERMS_LABELS[supplier.payment_terms]}
          </dd>
        </div>
      </dl>

      {/* 52-59 */}
      <div className="ted-card__stats">
        <div className="ted-card__stat-row">
          <span className="ted-card__stat-label">Bu Yıl Toplam Sipariş</span>
          <span
            className="ted-card__stat-value"
            data-testid={`ted-total-${supplier.id}`}
          >
            {formatCompactCurrency(supplier.orders_total_this_year)}
          </span>
        </div>
        {/* Sunucu SIFIR gönderir; "hiç sipariş verilmedi" açıkça yazılır. */}
        {!hasOrders && (
          <p className="ted-card__stat-empty">Bu yıl hiç sipariş verilmedi</p>
        )}
        {/* 55-58 — yıldızlar İCAT EDİLMEZ; gerekçe metne DE basılır */}
        <div className="ted-card__rating" title={ratingReason}>
          <span className="ted-card__rating-value">—</span>
          <span className="ted-card__rating-hint">{ratingReason}</span>
        </div>
      </div>
    </article>
  );
}
