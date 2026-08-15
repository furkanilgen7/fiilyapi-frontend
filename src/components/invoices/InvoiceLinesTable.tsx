import { formatAmount, formatPercent, formatQuantity } from "@/lib/format";
import type { InvoiceDetailResponse } from "@/lib/api/hooks/useInvoiceDetail";

import { REASONS } from "./invoice-labels";

/** tfoot satırı — oranlı etiketler (FGI:168 "Avans Kesintisi (%20)") burada kurulur. */
function FootRow({
  label,
  value,
  colSpan,
  tone,
}: {
  label: string;
  value: string;
  colSpan: number;
  tone?: "danger" | "success";
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="is-right">
        {label}
      </td>
      <td
        className={`is-right is-mono fat-table__strong${
          tone === "danger" ? " fat-summary-row__value--danger" : ""
        }`}
      >
        {value}
      </td>
    </tr>
  );
}

/**
 * FGI:112-189 / FGE:146-194 "Fatura Kalemleri" tablosu — okuma.
 *
 * 🔴 tfoot'un HER SATIRI sunucunun SAKLANAN kolonundan gelir (`subtotal`,
 * `advance_amount`, `retention_amount`, `tax_base`, `vat_amount`,
 * `withholding_amount`, `total`): fatura DONMUŞ bir belgedir, okuma anında
 * yeniden hesaplanmaz (K7).
 *
 * Sıfır olan kesinti satırı BASILMAZ (mockup da yalnız var olanı yazar);
 * gizlenmesi bir eksiklik DEĞİLDİR — o faturada gerçekten yoktur.
 */
export function InvoiceLinesTable({ invoice }: { invoice: InvoiceDetailResponse }) {
  const isIncoming = invoice.direction === "incoming";
  // Sıra sütunu YALNIZ giden detayda vardır (FGI:116); FGE onu çizmez.
  const showSeq = !isIncoming;
  const columnCount = showSeq ? 7 : 6;
  const footSpan = columnCount - 1;

  const hasAdvance = Number(invoice.advance_amount) !== 0;
  const hasRetention = Number(invoice.retention_amount) !== 0;
  const hasWithholding = Number(invoice.withholding_amount) !== 0;

  return (
    <section className="fat-panel" aria-label="Fatura Kalemleri">
      <div className="fat-panel__head">
        <span className="fat-panel__title">
          {isIncoming ? "Fatura Kalemleri (Satıcının Gönderdiği)" : "Fatura Kalemleri"}
        </span>
      </div>
      <div className="fat-table-scroll">
        <table className="fat-table" data-testid="fat-detail-lines">
          <thead>
            <tr>
              {showSeq && <th scope="col">Sıra</th>}
              <th scope="col">{isIncoming ? "Hizmet" : "Hizmet / Poz"}</th>
              <th scope="col" className="is-center">
                Birim
              </th>
              <th scope="col" className="is-right">
                Miktar
              </th>
              <th scope="col" className="is-right">
                Birim Fiyat
              </th>
              <th scope="col" className="is-center">
                KDV %
              </th>
              <th scope="col" className="is-right">
                Tutar
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.length === 0 && (
              <tr>
                <td colSpan={columnCount} data-testid="fat-detail-lines-empty">
                  Bu faturada kalem yok. Kalemsiz fatura gönderilemez/onaylanamaz.
                </td>
              </tr>
            )}
            {invoice.lines.map((line, index) => (
              <tr key={line.id} data-testid="fat-detail-line">
                {showSeq && <td className="is-mono fat-table__muted">{index + 1}</td>}
                <td>
                  <div>{line.description}</div>
                  {line.detail_note !== null && (
                    <div className="fat-table__muted">{line.detail_note}</div>
                  )}
                </td>
                <td className="is-center">{line.unit ?? "—"}</td>
                <td className="is-right is-mono">{formatQuantity(line.quantity)}</td>
                <td className="is-right is-mono">{formatAmount(line.unit_price)}</td>
                <td className="is-center">{formatAmount(line.vat_rate)}</td>
                <td className="is-right is-mono fat-table__strong">
                  {formatAmount(line.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* FGI:164 · FGE:177 */}
            <FootRow
              colSpan={footSpan}
              label="Mal/Hizmet Toplamı"
              value={formatAmount(invoice.subtotal)}
            />
            {hasAdvance && (
              <FootRow
                colSpan={footSpan}
                tone="danger"
                label={`Avans Kesintisi (${formatPercent(invoice.advance_rate ?? 0)})`}
                value={`– ${formatAmount(invoice.advance_amount)}`}
              />
            )}
            {hasRetention && (
              <FootRow
                colSpan={footSpan}
                tone="danger"
                label={`Teminat Kesintisi (${formatPercent(invoice.retention_rate ?? 0)})`}
                value={`– ${formatAmount(invoice.retention_amount)}`}
              />
            )}
            <FootRow
              colSpan={footSpan}
              label="Vergi Matrahı"
              value={formatAmount(invoice.tax_base)}
            />
            <FootRow
              colSpan={footSpan}
              label="Hesaplanan KDV"
              value={formatAmount(invoice.vat_amount)}
            />
            {hasWithholding && (
              <FootRow
                colSpan={footSpan}
                tone="danger"
                label={`Tevkifat (${formatPercent(invoice.withholding_rate ?? 0)})`}
                value={`– ${formatAmount(invoice.withholding_amount)}`}
              />
            )}
            <tr
              className={`fat-total-row${isIncoming ? " fat-total-row--incoming" : ""}`}
              data-testid="fat-detail-total-row"
            >
              <td colSpan={footSpan} className="is-right">
                ÖDENECEK TOPLAM
              </td>
              <td className="is-right fat-total-row__amount">{formatAmount(invoice.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="fat-notice" data-testid="fat-detail-lines-note">
        Tüm toplamlar faturanın kayıtlı (donmuş) değerleridir; ekranda yeniden
        hesaplanmaz. {REASONS.accounting}
      </p>
    </section>
  );
}
