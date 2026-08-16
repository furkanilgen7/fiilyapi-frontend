"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge/Badge";
import {
  type ProgressPaymentListItem,
  type ProgressPaymentListResponse,
} from "@/lib/api/hooks/useProgressPayments";
import { cx } from "@/lib/cx";
import { formatCompactCurrency } from "@/lib/format";

import { PROGRESS_PAYMENT_STATUS_BADGE } from "./status";
import { formatPaymentTitle } from "./title";

// P7 T2 + T6 ortak hakediş liste gövdesi. `/hakedisler` (proje-genel) ve
// şantiye "Hakedişler" sekmesi AYNI kaydın iki görünümüdür (T6 brief §Kalıcı
// mimari karar) — satır bileşeni burada TEK yerde yaşar, kopyalanmaz.
// Yükleniyor/hata/boş/liste dört dalı da burada; her iki görünüm aynı
// metinleri kullanır (T6 brief'te ayrı metin istenmedi).
export function ProgressPaymentsListBody({
  isError,
  isLoading,
  data,
  showProjectName = true,
  isFiltered = false,
}: {
  isError: boolean;
  isLoading: boolean;
  data?: ProgressPaymentListResponse;
  /**
   * FİNAL İNCELEME düzeltmesi #5: `/hakedisler` (proje-genel) listede proje
   * adı etiketi GEREKLİ — aynı "#5" farklı projelerde tekrar edebilir. Ama
   * şantiye "Hakedişler" sekmesinde (`SiteProgressPaymentsView`) proje zaten
   * breadcrumb'ta gösteriliyor, orada tekrar aynı etiket gürültü. Varsayılan
   * `true` → mevcut çağıran (`ProgressPaymentsView`) davranışı DEĞİŞMEZ.
   */
  showProjectName?: boolean;
  /**
   * F-PRJTAB T3: liste bir süzgeçle daraltılmışken boş dönerse "hiç hakediş
   * yok" demek YANLIŞ olur — kayıt olabilir, seçili projede yoktur. Boş durum
   * metni bunu ayırt eder. Varsayılan `false` → mevcut çağıranların
   * (şantiye sekmesi) davranışı DEĞİŞMEZ.
   */
  isFiltered?: boolean;
}) {
  if (isError) return <p className="pp-message">Hakedişler yüklenemedi</p>;
  if (isLoading || !data) return <p className="pp-message">Yükleniyor…</p>;
  if (data.items.length === 0) {
    return (
      <section className="pp-empty">
        <p className="pp-empty__title">
          {isFiltered ? "Seçili projede hakediş yok" : "Henüz hakediş oluşturulmadı"}
        </p>
        <p className="pp-empty__hint">
          {isFiltered
            ? "Tüm hakedişleri görmek için proje süzgecini Tüm Projeler yapın"
            : "+ Yeni Hakediş ile başlayın"}
        </p>
      </section>
    );
  }
  return (
    <section className="pp-card">
      <ul className="pp-list">
        {data.items.map((item) => (
          <ProgressPaymentRow key={item.id} item={item} showProjectName={showProjectName} />
        ))}
      </ul>
    </section>
  );
}

function ProgressPaymentRow({
  item,
  showProjectName,
}: {
  item: ProgressPaymentListItem;
  showProjectName: boolean;
}) {
  const badge = PROGRESS_PAYMENT_STATUS_BADGE[item.status];
  return (
    <li className="pp-row">
      <Link
        href={`/hakedisler/${item.id}`}
        className="pp-row__link"
        aria-label={`${item.project_name} — ${formatPaymentTitle(item)}`}
      >
        <div className="pp-row__main">
          {showProjectName && <p className="pp-row__project">{item.project_name}</p>}
          <p className="pp-row__title">{formatPaymentTitle(item)}</p>
          {item.description && <p className="pp-row__desc">{item.description}</p>}
        </div>
        <div className="pp-row__side">
          {/* FİNAL İNCELEME düzeltmesi #4: mockup (satır 99/103) kompakt
              basıyor ("₺2,10M") — `formatCurrencyPrecise` (kuruş hassasiyetli
              tam sayı) yerine bu ekranın kendi KPI şeridiyle (`formatCompact
              Currency`) TUTARLI hale getirildi. Ekran 15 detay ekranı kuruş
              hassasiyetli KALIR — orada tam tutar gerekir, burada YALNIZ
              liste satırı özet gösterimi değişti. */}
          {/* FİNAL İNCELEME düzeltmesi #3: mockup satır 99'da yalnız
              `pending_approval` durumundaki tutar primary mavidir (diğerleri
              koyu metin) — mevcut token'lar (`--color-primary`/`--color-text`)
              mockup değerleriyle birebir eşleştiğinden yeni token EKLENMEDİ,
              yalnız durum-bazlı modifier sınıfı eklendi. */}
          <span
            className={cx(
              "pp-row__amount",
              item.status === "pending_approval" && "pp-row__amount--pending",
            )}
          >
            {formatCompactCurrency(item.gross_total)}
          </span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </Link>
    </li>
  );
}
