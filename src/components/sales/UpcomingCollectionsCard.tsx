import { cx } from "@/lib/cx";
import { formatCurrency, formatDateDots } from "@/lib/format";
import type { UpcomingCollection } from "@/lib/api/hooks/useSalesSummary";

import "./sales.css";

export interface UpcomingCollectionsCardProps {
  /** `undefined` ⇒ veri YOK (yükleniyor/hata); kart yine çizilir, satır basılmaz. */
  items: UpcomingCollection[] | undefined;
  isLoading: boolean;
  isError: boolean;
  /** Sunucunun Türkçe hata cümlesi — sabit cümle SON çaredir (ST §4b kanonu). */
  errorMessage?: string;
}

/**
 * Satır basılamıyorken kutuya ne yazılacağı. "Taksit yok" KESİN bir iddiadır:
 * yalnız sunucu GERÇEKTEN boş dizi verdiğinde doğrudur. Yükleniyor/hata hâlinde
 * basılsaydı gecikmiş tahsilatları gizleyen bir yanlış-negatif üretirdi —
 * kardeş `SalesKpiStrip` aynı kaynakta sahte sıfır basmaz, bu kart da basmaz.
 */
function emptyMessage(options: {
  items: UpcomingCollection[] | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}): string {
  if (options.isLoading) return "Yaklaşan tahsilatlar yükleniyor…";
  if (options.isError) return options.errorMessage ?? "Yaklaşan tahsilatlar yüklenemedi.";
  if (options.items === undefined) return "Yaklaşan tahsilat bilgisi henüz yüklenmedi.";
  return "Önümüzdeki 30 günde vadesi gelen taksit yok.";
}

/**
 * SY 217-234 · "Yaklaşan Tahsilatlar (30 Gün)".
 *
 * ⚠️ SATIRLARIN TAMAMI SUNUCU TÜREVİDİR (`SalesSummaryResponse.upcoming_
 * collections`): pencere backend'de 30 gündür (`UPCOMING_WINDOW_DAYS = 30`),
 * gecikme günü `days_overdue`, **gecikme faizi `late_fee_amount` (223)**
 * sunucudan gelir. İstemci ne vade sayar ne faiz hesaplar (P8 kararı: gecikme
 * faizi YALNIZ gösterim türevidir, tahakkuk YOKTUR).
 *
 * ⚠️ Mockup'ın ÜÇÜNCÜ satırı (229-231, yeşil) bir taksit değil "Sözleşme
 * imzası" olayıdır; `upcoming_collections` yalnız TAKSİT taşır ve backend'de
 * sözleşme-imza takvimi diye bir uç yoktur. Uydurma bir yeşil satır
 * ÜRETİLMEZ — iki ton (gecikmiş kırmızı 221-224 · yaklaşan kehribar 225-228)
 * gerçek veriden basılır.
 */
export function UpcomingCollectionsCard({
  items,
  isLoading,
  isError,
  errorMessage,
}: UpcomingCollectionsCardProps) {
  const rows = items ?? [];

  return (
    <section className="satis-upcoming" aria-labelledby="satis-yaklasan-basligi">
      {/* 219 */}
      <h2 className="satis-upcoming__title" id="satis-yaklasan-basligi">
        Yaklaşan Tahsilatlar (30 Gün)
      </h2>

      {rows.length === 0 ? (
        <p className="satis-upcoming__empty" data-testid="satis-yaklasan-bos">
          {emptyMessage({ items, isLoading, isError, errorMessage })}
        </p>
      ) : (
        <ul className="satis-upcoming__list">
          {rows.map((item) => (
            <li
              key={item.installment_id}
              className={cx(
                "satis-upcoming__row",
                item.is_overdue
                  ? "satis-upcoming__row--overdue"
                  : "satis-upcoming__row--due",
              )}
              data-testid={`satis-yaklasan-${item.installment_id}`}
            >
              <div>
                {/* 222 */}
                <div className="satis-upcoming__name">
                  {item.unit_label} — {item.customer_name}
                </div>
                <div
                  className={cx(
                    "satis-upcoming__meta",
                    item.is_overdue && "satis-upcoming__meta--overdue",
                  )}
                >
                  {item.is_overdue
                    ? `${item.label} · Vadesi ${item.days_overdue} gün geçti`
                    : `${item.label} · ${formatDateDots(item.due_date)}`}
                </div>
              </div>
              <div className="satis-upcoming__amount-box">
                {/* 223 */}
                <span
                  className={cx(
                    "satis-upcoming__amount",
                    item.is_overdue
                      ? "satis-upcoming__amount--overdue"
                      : "satis-upcoming__amount--due",
                  )}
                >
                  {formatCurrency(item.remaining_amount)}
                </span>
                {/* 223 · gecikme faizi SUNUCU türevidir — istemci hesaplamaz */}
                {item.is_overdue && Number(item.late_fee_amount) > 0 && (
                  <div
                    className="satis-upcoming__fee"
                    data-testid={`satis-gecikme-faizi-${item.installment_id}`}
                  >
                    Gecikme faizi: {formatCurrency(item.late_fee_amount)}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
