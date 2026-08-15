import { Button, Input } from "@/components/ui";
import { formatAmount } from "@/lib/format";

import { lineTotal, type InvoiceLineDraft } from "./invoice-line-math";

/**
 * FK:160-215 "Fatura Kalemleri" tablosu — YEDİ sütun (FK:168-174):
 * Açıklama · Birim · Miktar · B. Fiyat · KDV % · Tutar · (sil).
 *
 * "Tutar" HESAPLANMAZ değil, SATIR düzeyinde hesaplanır (miktar × birim fiyat,
 * mockup'ın kendi rakamlarıyla doğrulandı — `invoice-line-math.ts`). Başlık
 * toplamları burada YOKTUR: onlar sunucunun saklanan kolonlarıdır.
 *
 * Ham `<input>` YASAK: `Input` primitive'i (`size="row"`) kullanılır.
 */
export function InvoiceLinesEditor({
  lines,
  onChange,
  onAdd,
  onRemove,
  disabled,
}: {
  lines: readonly InvoiceLineDraft[];
  onChange: (key: string, patch: Partial<InvoiceLineDraft>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="fat-panel" aria-label="Fatura Kalemleri">
      <div className="fat-panel__head">
        <span className="fat-panel__title">Fatura Kalemleri</span>
        {/* 164 */}
        <Button
          size="sm"
          variant="ghost"
          className="fat-panel__push"
          disabled={disabled}
          data-testid="fat-line-add"
          onClick={onAdd}
        >
          + Kalem Ekle
        </Button>
      </div>
      <div className="fat-table-scroll">
        <table className="fat-table" data-testid="fat-lines-editor">
          <thead>
            <tr>
              <th scope="col">Açıklama</th>
              <th scope="col" className="is-center">
                Birim
              </th>
              <th scope="col" className="is-right">
                Miktar
              </th>
              <th scope="col" className="is-right">
                B. Fiyat
              </th>
              <th scope="col" className="is-center">
                KDV %
              </th>
              <th scope="col" className="is-right">
                Tutar
              </th>
              <th scope="col">
                <span className="sr-only">Sil</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const total = lineTotal(line);
              const rowNo = index + 1;
              return (
                <tr key={line.key} data-testid="fat-line-row">
                  <td>
                    <Input
                      size="row"
                      aria-label={`${rowNo}. kalem açıklaması`}
                      value={line.description}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(line.key, { description: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <Input
                      size="row"
                      aria-label={`${rowNo}. kalem birimi`}
                      value={line.unit}
                      disabled={disabled}
                      onChange={(event) => onChange(line.key, { unit: event.target.value })}
                    />
                  </td>
                  <td>
                    <Input
                      size="row"
                      type="number"
                      step="any"
                      aria-label={`${rowNo}. kalem miktarı`}
                      value={line.quantity}
                      disabled={disabled}
                      onChange={(event) => onChange(line.key, { quantity: event.target.value })}
                    />
                  </td>
                  <td>
                    <Input
                      size="row"
                      type="number"
                      step="any"
                      aria-label={`${rowNo}. kalem birim fiyatı`}
                      value={line.unitPrice}
                      disabled={disabled}
                      onChange={(event) => onChange(line.key, { unitPrice: event.target.value })}
                    />
                  </td>
                  <td>
                    <Input
                      size="row"
                      type="number"
                      step="any"
                      aria-label={`${rowNo}. kalem KDV oranı`}
                      value={line.vatRate}
                      disabled={disabled}
                      onChange={(event) => onChange(line.key, { vatRate: event.target.value })}
                    />
                  </td>
                  <td className="is-right is-mono fat-table__strong" data-testid="fat-line-total">
                    {total === null ? "—" : formatAmount(total)}
                  </td>
                  <td className="is-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      aria-label={`${rowNo}. kalemi sil`}
                      data-testid="fat-line-remove"
                      onClick={() => onRemove(line.key)}
                    >
                      &times;
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
