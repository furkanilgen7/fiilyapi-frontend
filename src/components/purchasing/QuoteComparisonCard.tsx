"use client";

import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatCurrency, formatCurrencyPrecise } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { PurchaseQuoteCard } from "@/lib/api/hooks/useQuotes";

import { PAYMENT_TERMS_LABELS } from "./purchasing-labels";
import "./purchasing.css";

/** TEK 100 · "EN HIZLI" rozetinin pending anahtarı (tek kaynak). */
export const FASTEST_BADGE_PENDING_MODULE = "quote_fastest_badge";

export interface QuoteComparisonCardProps {
  quote: PurchaseQuoteCard;
  /**
   * 63 · birim fiyatın altındaki "/Ton" — talebin kalemleri TEK birimdeyse
   * dolu, karışıksa `null` (birimsiz toplam bir birim taşıyamaz).
   */
  quantityUnit: string | null;
  /** Seçim düğmesi tıklanabilir mi (yetki + talebin durumu). */
  canSelect: boolean;
  /** Tıklanamıyorsa GÖRÜNÜR gerekçe — sessiz devre dışılık yasak. */
  disabledReason?: string;
  isPending: boolean;
  onSelect: () => void;
}

/**
 * TEK 53-116 · teklif karşılaştırma kartı.
 *
 * 🔴 "EN İYİ FİYAT" ROZETİ SUNUCU DAMGASIDIR (`is_best_price`) — istemci
 * `unit_price`lara bakıp YENİDEN HESAPLAMAZ. Şema: `total_cost` =
 * `unit_price × talebin toplam miktarı` (+ nakliye hariçse `shipping_cost`);
 * birim fiyata bakan bir türev, nakliyesi hariç ucuz GÖRÜNEN teklifi öne
 * çıkarırdı (TEK 90'ın tam senaryosu). Beraberlikte sunucu HEPSİNİ rozetler
 * ve ekran bunu olduğu gibi basar. Emsal: F-P10 "rozet artık sunucu
 * `quantity_source` damgasından".
 *
 * 🔴 "EN HIZLI" ROZETİ (100) BASILMAZ ve UYDURULMAZ: `delivery_time` SERBEST
 * METİNDİR ("Yarın sabah" ile "3 iş günü" karşılaştırılamaz) ve sunucuda
 * sıralı bir veri kaynağı yoktur. Rozet mockup'ta ÇİZİLİ olduğu için
 * SİLİNMEZ — yuvasında devre dışı + gerekçeli durur (F-P5 T5
 * `subcontractor_rating` emsali).
 *
 * ⚠️ Mockup üç kartı ÜÇ FARKLI kılıkta çizer (56 vurgulu · 77 düz · 97
 * rozetli). Kılık KARTIN KENDİ VERİSİNDEN gelir: `is_best_price` vurguyu,
 * `is_selected` seçili şeridini açar — dizideki SIRA hiçbir şeyi belirlemez.
 */
export function QuoteComparisonCard({
  quote,
  quantityUnit,
  canSelect,
  disabledReason,
  isPending,
  onSelect,
}: QuoteComparisonCardProps) {
  const fastestReason = pendingModuleLabel(FASTEST_BADGE_PENDING_MODULE);

  return (
    <article
      className={cx(
        "tek-card",
        quote.is_best_price && "tek-card--best", // 56
        quote.is_selected && "tek-card--selected",
      )}
      data-testid={`tek-card-${quote.id}`}
    >
      {/* 57-60 */}
      <header className="tek-card__head">
        <h3 className="tek-card__supplier">{quote.supplier_name}</h3>
        <div className="tek-card__badges">
          {quote.is_best_price && (
            <span className="tek-card__badge tek-card__badge--best" data-testid={`tek-best-${quote.id}`}>
              EN İYİ FİYAT
            </span>
          )}
          {/* 100 — rozet YERİNDE ama devre dışı: sıralanabilir veri yok */}
          <span
            className="tek-card__badge tek-card__badge--pending"
            aria-disabled="true"
            title={fastestReason}
            data-testid={`tek-fastest-${quote.id}`}
          >
            EN HIZLI<span className="sr-only"> — {fastestReason}</span>
          </span>
        </div>
      </header>

      <div className="tek-card__body">
        {/* 62-65 */}
        <div className="tek-card__figures">
          <div className="tek-card__figure">
            <div className="tek-card__figure-label">Birim Fiyat</div>
            <div
              className={cx(
                "tek-card__figure-value",
                quote.is_best_price && "tek-card__figure-value--best",
              )}
              data-testid={`tek-unit-price-${quote.id}`}
            >
              {formatCurrencyPrecise(quote.unit_price)}
            </div>
            {quantityUnit && <div className="tek-card__figure-unit">/{quantityUnit}</div>}
          </div>
          <div className="tek-card__figure">
            <div className="tek-card__figure-label">Toplam</div>
            {/* 64 — SUNUCU türevi; istemci çarpmaz */}
            <div className="tek-card__figure-value" data-testid={`tek-total-${quote.id}`}>
              {formatCurrency(quote.total_cost)}
            </div>
          </div>
        </div>

        {/* 66-71 */}
        <dl className="tek-card__facts">
          <div className="tek-card__fact">
            <dt>Teslimat</dt>
            <dd data-testid={`tek-delivery-${quote.id}`}>{quote.delivery_time}</dd>
          </div>
          <div className="tek-card__fact">
            <dt>Garanti</dt>
            {/* Şemada `null` olabilir — uydurma metin YOK */}
            <dd>{quote.warranty_note ?? "—"}</dd>
          </div>
          <div className="tek-card__fact">
            <dt>Ödeme</dt>
            <dd>{PAYMENT_TERMS_LABELS[quote.payment_terms]}</dd>
          </div>
          <div className="tek-card__fact">
            <dt>Nakliye</dt>
            {/* 70 "Dahil" yeşil · 90 "Hariç (+₺8.000)" kehribar */}
            <dd
              className={
                quote.shipping_included
                  ? "tek-card__shipping tek-card__shipping--included"
                  : "tek-card__shipping tek-card__shipping--excluded"
              }
              data-testid={`tek-shipping-${quote.id}`}
            >
              {quote.shipping_included
                ? "Dahil"
                : quote.shipping_cost === null
                  ? "Hariç"
                  : `Hariç (+${formatCurrency(quote.shipping_cost)})`}
            </dd>
          </div>
        </dl>

        {/* 72 / 92 — vurgulu kartta "Sipariş Ver", diğerlerinde "Seç" */}
        {quote.is_selected ? (
          <p className="tek-card__selected" data-testid={`tek-selected-${quote.id}`}>
            Bu teklif seçildi ve siparişe dönüştü.
          </p>
        ) : (
          <Button
            variant={quote.is_best_price ? "primary" : "secondary"}
            className="tek-card__action"
            disabled={!canSelect || isPending}
            title={canSelect ? undefined : disabledReason}
            onClick={onSelect}
            data-testid={`tek-select-${quote.id}`}
          >
            {quote.is_best_price ? "Sipariş Ver" : "Seç"}
            {!canSelect && disabledReason && (
              <span className="sr-only"> — {disabledReason}</span>
            )}
          </Button>
        )}
      </div>
    </article>
  );
}
