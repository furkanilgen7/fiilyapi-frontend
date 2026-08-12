import { Badge } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatQuantity } from "@/lib/format";
import type { StockSummaryRow } from "@/lib/api/hooks/useStockSummary";

import {
  isStockRowHighlighted,
  stockBalanceTone,
  STOCK_CATEGORY_LABELS,
  STOCK_STATUS_BADGE_VARIANTS,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_UNKNOWN_REASON,
} from "./stock-labels";
import "./stock.css";

export interface StockCatalogTableProps {
  /** `undefined` ⇒ yükleniyor/hata; satır BASILMAZ (mockup örnekleri sabit değildir). */
  rows: StockSummaryRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
  /**
   * Sunucunun Türkçe hata cümlesi (`stockErrorMessage`). ST §4b kanonu görünür
   * mesajı SUNUCUNUN `detail`inden ister — sabit bir cümle 404/422/403 ayrımını
   * yutar. `SiteStockView` ile aynı kanonun uygulanması (F-ST final review).
   */
  errorMessage?: string;
  /** Süzgeç uygulanmış mı — boş listenin metnini ayırır. */
  hasFilter: boolean;
}

/** 116 · "Depo" hücresi — bakiyesi olan depoların adları; hiç yoksa "—". */
function warehouseLabel(row: StockSummaryRow): string {
  if (row.warehouses.length === 0) return "—";
  return row.warehouses.map((warehouse) => warehouse.warehouse_name).join(", ");
}

function emptyMessage(options: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  hasFilter: boolean;
}): { title: string; hint?: string } {
  if (options.isLoading) return { title: "Stok listesi yükleniyor…" };
  // ST §4b: görünür cümle SUNUCUNUN `detail`inden gelir; `stockErrorMessage`
  // düşemezse sabit cümle yalnız SON çare olarak kalır.
  if (options.isError) return { title: options.errorMessage ?? "Stok listesi yüklenemedi." };
  if (options.hasFilter) {
    return {
      title: "Bu süzgeçle eşleşen malzeme yok.",
      hint: "Durum/kategori seçimini genişletin ya da aramayı temizleyin.",
    };
  }
  return {
    title: "Henüz malzeme kartı yok.",
    hint: "“+ Malzeme Ekle” ile ilk kartı oluşturun.",
  };
}

/**
 * E3 108-185 · katalog tablosu: Malzeme (+kod) · Kategori · Birim · Stok ·
 * Min Stok · Depo · Durum.
 *
 * ⚠️ SATIRLARIN KAYNAĞI `GET /stock/summary`dir, `GET /stock/items` DEĞİL:
 * künye ucu bakiye/durum TAŞIMAZ (backend spec §3).
 *
 * ⚠️ Mockup'ın YEDİ örnek satırı (121-183) SABİT İÇERİK OLARAK BASILMAZ —
 * hepsi veriden gelir. Rozet sunucunun `status` damgasıdır; eşik formülü
 * istemcide YENİDEN HESAPLANMAZ (spec §3, `stock-labels.ts` notu).
 */
export function StockCatalogTable({
  rows,
  isLoading,
  isError,
  errorMessage,
  hasFilter,
}: StockCatalogTableProps) {
  const visibleRows = rows ?? [];
  const message =
    visibleRows.length === 0
      ? emptyMessage({ isLoading, isError, errorMessage, hasFilter })
      : undefined;

  return (
    <div className="stok-card">
      <table className="stok-table">
        <thead>
          {/* 110-118 */}
          <tr>
            <th scope="col" className="stok-table__th stok-table__th--left">
              Malzeme
            </th>
            <th scope="col" className="stok-table__th stok-table__th--left">
              Kategori
            </th>
            <th scope="col" className="stok-table__th stok-table__th--center">
              Birim
            </th>
            <th scope="col" className="stok-table__th stok-table__th--right">
              Stok
            </th>
            <th scope="col" className="stok-table__th stok-table__th--right">
              Min Stok
            </th>
            <th scope="col" className="stok-table__th stok-table__th--left">
              Depo
            </th>
            <th scope="col" className="stok-table__th stok-table__th--center">
              Durum
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const tone = stockBalanceTone(row.balance, row.status);
            return (
              <tr
                key={row.id}
                className={cx("stok-row", isStockRowHighlighted(row.status) && "stok-row--flagged")}
                data-testid={`stok-row-${row.code}`}
              >
                {/* 122 */}
                <td className="stok-table__td">
                  <div className="stok-table__name">{row.name}</div>
                  <div className="stok-table__code">{row.code}</div>
                </td>
                {/* 123 */}
                <td className="stok-table__td">{STOCK_CATEGORY_LABELS[row.category]}</td>
                {/* 124 */}
                <td className="stok-table__td stok-table__td--center">{row.unit}</td>
                {/* 125 */}
                <td className="stok-table__td stok-table__td--right stok-table__td--mono">
                  <span
                    className={cx("stok-balance", `stok-balance--${tone}`)}
                    data-testid={`stok-balance-${row.code}`}
                  >
                    {formatQuantity(row.balance)}
                  </span>
                </td>
                {/* 126 — eşik yoksa "—" */}
                <td className="stok-table__td stok-table__td--right stok-table__td--mono stok-table__min">
                  {row.min_stock === null ? "—" : formatQuantity(row.min_stock)}
                </td>
                {/* 127 */}
                <td className="stok-table__td">{warehouseLabel(row)}</td>
                {/* 128 — rozet SUNUCUDAN; `status` null ise uydurma YOK */}
                <td className="stok-table__td stok-table__td--center">
                  {row.status === null ? (
                    <span
                      className="stok-status--unknown"
                      title={STOCK_STATUS_UNKNOWN_REASON}
                      data-testid={`stok-status-${row.code}`}
                    >
                      —
                    </span>
                  ) : (
                    <Badge
                      variant={STOCK_STATUS_BADGE_VARIANTS[row.status]}
                      className={cx("stok-badge", `stok-badge--${row.status}`)}
                      data-testid={`stok-status-${row.code}`}
                    >
                      {STOCK_STATUS_LABELS[row.status]}
                    </Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {message && (
        <div className="stok-empty">
          <p className="stok-empty__title">{message.title}</p>
          {message.hint && <p className="stok-empty__hint">{message.hint}</p>}
        </div>
      )}
    </div>
  );
}
