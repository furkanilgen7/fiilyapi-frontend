import { Badge, Button } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatQuantity } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { SiteStockRow } from "@/lib/api/hooks/useSiteStock";

import {
  isStockRowHighlighted,
  siteStockRowAction,
  stockBalanceTone,
  SITE_STOCK_STATUS_LABELS,
  STOCK_STATUS_BADGE_VARIANTS,
  STOCK_STATUS_UNKNOWN_REASON,
} from "./stock-labels";
import "./stock.css";

export interface SiteStockTableProps {
  /** `undefined` ⇒ yükleniyor/hata; satır BASILMAZ (mockup örnekleri sabit değildir). */
  rows: SiteStockRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

/** Boş/yükleniyor/hata metinleri — ŞS'de süzgeç şeridi YOK, tek dal yeter. */
function emptyMessage(options: { isLoading: boolean; isError: boolean }): {
  title: string;
  hint?: string;
} {
  if (options.isLoading) return { title: "Şantiye stok listesi yükleniyor…" };
  if (options.isError) return { title: "Şantiye stok listesi yüklenemedi." };
  return {
    title: "Bu şantiyenin depolarında hareket görmüş malzeme yok.",
    hint: "“+ Stok Girişi” ile ilk girişi yapın; merkez depo bakiyeleri bu listeye GİRMEZ.",
  };
}

/** 100 · "Aylık İhtiyaç" — zarf `available` olursa sunucunun değeri basılır. */
function monthlyNeedText(placeholder: SiteStockRow["monthly_need"]): string | null {
  if (placeholder.available && placeholder.value !== null && placeholder.value !== undefined) {
    return formatQuantity(placeholder.value);
  }
  return null;
}

/** 101 · "Bölüm" — zarf `available` olursa sunucunun listesi basılır. */
function sectionText(placeholder: SiteStockRow["section"]): string | null {
  if (placeholder.available && placeholder.items !== undefined && placeholder.items.length > 0) {
    return placeholder.items.join(", ");
  }
  return null;
}

/**
 * ŞS 95-163 · şantiye bakiye tablosu: Malzeme (+kod) · Birim · Mevcut Stok ·
 * Aylık İhtiyaç · Bölüm · Durum · (başlıksız aksiyon sütunu).
 *
 * ⚠️ İKİ SÜTUNUN BACKEND KAYNAĞI YOKTUR (spec §1, backend `SiteStockRow`
 * açıklaması): "Aylık İhtiyaç" ve "Bölüm" birer YER TUTUCU ZARFI olarak gelir
 * (`monthly_need` = MetricPlaceholder, `section` = ListPlaceholder) ve bugün
 * `available: false`tur. Sütunlar SİLİNMEZ, mockup'ın "15"/"Kat 6–10 Kaba
 * İnşaat" örnekleri UYDURULMAZ: "—" + görünür gerekçe basılır. Zarf bir gün
 * `true` dönerse sunucunun değeri OLDUĞU GİBİ görünür.
 *
 * ⚠️ Rozet ve bakiye rengi SUNUCUNUN `status` damgasındandır; eşik formülü
 * istemcide YENİDEN HESAPLANMAZ. Eksi bakiye meşrudur ve kırmızı basılır.
 */
export function SiteStockTable({ rows, isLoading, isError }: SiteStockTableProps) {
  const visibleRows = rows ?? [];
  const message = visibleRows.length === 0 ? emptyMessage({ isLoading, isError }) : undefined;

  return (
    <div className="stok-card">
      <table className="stok-table">
        <thead>
          {/* 97-104 */}
          <tr>
            <th scope="col" className="stok-table__th stok-table__th--left">
              Malzeme
            </th>
            <th scope="col" className="stok-table__th stok-table__th--center">
              Birim
            </th>
            <th scope="col" className="stok-table__th stok-table__th--right">
              Mevcut Stok
            </th>
            <th scope="col" className="stok-table__th stok-table__th--right">
              Aylık İhtiyaç
            </th>
            <th scope="col" className="stok-table__th stok-table__th--left">
              Bölüm
            </th>
            <th scope="col" className="stok-table__th stok-table__th--center">
              Durum
            </th>
            {/* 103 — mockup'ta başlığı boştur; ekran okuyucuya adı verilir */}
            <th scope="col" className="stok-table__th stok-table__th--center">
              <span className="stok-table__th-hidden">İşlem</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const tone = stockBalanceTone(row.balance, row.status);
            const action = siteStockRowAction(row.status);
            const need = monthlyNeedText(row.monthly_need);
            const section = sectionText(row.section);
            const needReason = pendingModuleLabel(row.monthly_need.pending_module);
            const sectionReason = pendingModuleLabel(row.section.pending_module);
            return (
              <tr
                key={row.id}
                className={cx("stok-row", isStockRowHighlighted(row.status) && "stok-row--flagged")}
                data-testid={`santiye-stok-row-${row.code}`}
              >
                {/* 107 */}
                <td className="stok-table__td">
                  <div className="stok-table__name">{row.name}</div>
                  <div className="stok-table__code">{row.code}</div>
                </td>
                {/* 108 */}
                <td className="stok-table__td stok-table__td--center">{row.unit}</td>
                {/* 109 */}
                <td className="stok-table__td stok-table__td--right stok-table__td--mono">
                  <span
                    className={cx("stok-balance", `stok-balance--${tone}`)}
                    data-testid={`santiye-stok-balance-${row.code}`}
                  >
                    {formatQuantity(row.balance)}
                  </span>
                </td>
                {/* 110 — PENDING: kaynak yok, sayı uydurulmaz */}
                <td className="stok-table__td stok-table__td--right stok-table__td--mono">
                  {need ?? (
                    <span
                      className="stok-pending-cell"
                      title={needReason}
                      data-testid={`santiye-stok-need-${row.code}`}
                    >
                      —
                    </span>
                  )}
                </td>
                {/* 111 — PENDING: kaynak yok, bölüm adı uydurulmaz */}
                <td className="stok-table__td">
                  {section ?? (
                    <span
                      className="stok-pending-cell"
                      title={sectionReason}
                      data-testid={`santiye-stok-section-${row.code}`}
                    >
                      —
                    </span>
                  )}
                </td>
                {/* 112 — rozet SUNUCUDAN; eşiksiz kalemde uydurma YOK */}
                <td className="stok-table__td stok-table__td--center">
                  {row.status === null ? (
                    <span
                      className="stok-status--unknown"
                      title={STOCK_STATUS_UNKNOWN_REASON}
                      data-testid={`santiye-stok-status-${row.code}`}
                    >
                      —
                    </span>
                  ) : (
                    <Badge
                      variant={STOCK_STATUS_BADGE_VARIANTS[row.status]}
                      className={cx("stok-badge", `stok-badge--${row.status}`)}
                      data-testid={`santiye-stok-status-${row.code}`}
                    >
                      {SITE_STOCK_STATUS_LABELS[row.status]}
                    </Badge>
                  )}
                </td>
                {/* 113 — SA/detay pending: düğme SİLİNMEZ, devre dışı durur */}
                <td className="stok-table__td stok-table__td--center">
                  <Button
                    variant={action.variant}
                    size="sm"
                    disabled
                    title={action.reason}
                    data-testid={`santiye-stok-action-${row.code}`}
                  >
                    {action.label}
                  </Button>
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
