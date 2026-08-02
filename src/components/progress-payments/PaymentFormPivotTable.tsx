import { Input } from "@/components/ui";
import { formatAmount, formatQuantity } from "@/lib/format";
import type { ContractDistributionSite } from "@/lib/api/hooks/useContract";

import { rowAmountTotal, rowQuantityTotal, sanitizeQuantityInput, type PivotRow } from "./pivot";

export interface PaymentFormPivotTableProps {
  sites: ContractDistributionSite[];
  rows: PivotRow[];
  disabled: boolean;
  onQuantityChange: (itemId: string, siteId: string, value: string) => void;
}

// E "İşveren Hakediş Oluştur" mockup 88-200 — şantiye bazlı miktar tablosu.
// Sözleşme kalemi = satır, şantiye = sütun (brief §Veri kaynakları). Mockup'ın
// "FF Katsayı" + "Düz. B.F." sütunları (mockup 101-102, 121, 136...) BURADA
// YOK: brief §Form üst bölümü katsayıyı yalnız hakediş BAŞLIĞI seviyesinde
// (`default_coefficient`) tanımlıyor, satır bazlı katsayı girişi istemiyor —
// `ProgressPaymentLineInput.coefficient` gönderilmezse backend yeni satıra
// başlığın varsayılanını uygular, var olanı DEĞİŞTİRMEZ (şema açıklaması).
// "Hakediş Tutarı" sütunu da mockup'taki gibi anlık çarpımla (birim fiyat ×
// miktar × katsayı) HESAPLANMAZ — float/çarpma riski (brief §tfoot: yalnız
// backend'in zaten hesapladığı `line_total` toplanır, `sumDecimalStrings`
// ile). Hiç kaydedilmemiş hücrede bu yüzden "—" basılır.
export function PaymentFormPivotTable({
  sites,
  rows,
  disabled,
  onQuantityChange,
}: PaymentFormPivotTableProps) {
  return (
    <section className="pp-table-card">
      <div className="pp-table-card__head">
        <span>Hakediş Kalemleri — Şantiye Bazlı</span>
        <span className="pp-form-table__head-note">
          Birim fiyatlar sözleşmeden gelir · değiştirilemez
        </span>
      </div>
      <div className="pp-form-table__scroll">
        <table className="pp-table pp-form-table">
          <thead>
            <tr>
              <th className="pp-table__th pp-table__col--item">Poz No</th>
              <th className="pp-table__th pp-table__col--item">Poz Adı</th>
              <th className="pp-table__th">Birim</th>
              <th className="pp-table__th">Sözl. B.F. 🔒</th>
              {sites.map((site) => (
                <th key={site.id} className="pp-table__th">
                  {site.name}
                </th>
              ))}
              <th className="pp-table__th">Toplam</th>
              <th className="pp-table__th">Hakediş Tutarı</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const previousGroup = index > 0 ? rows[index - 1].groupName : null;
              const showGroupHeader = row.groupName !== previousGroup;
              return (
                <PivotRowGroup key={row.item.id}>
                  {showGroupHeader && (
                    <tr className="pp-form-table__group-row">
                      <td colSpan={4 + sites.length + 2}>{row.groupName}</td>
                    </tr>
                  )}
                  <tr className="pp-table__row">
                    <td className="pp-table__cell pp-table__col--item">{row.item.code}</td>
                    <td className="pp-table__cell pp-table__col--item">
                      {row.item.description}
                    </td>
                    <td className="pp-table__cell">{row.item.unit}</td>
                    <td className="pp-table__cell">{formatAmount(row.item.unit_price)}</td>
                    {row.cells.map((cell) => (
                      <td key={cell.siteId} className="pp-table__cell pp-form-table__qty-cell">
                        {cell.editable ? (
                          <Input
                            size="row"
                            numeric
                            inputMode="decimal"
                            aria-label={`${row.item.description} — ${
                              sites.find((s) => s.id === cell.siteId)?.name ?? ""
                            } miktar`}
                            value={cell.quantity}
                            disabled={disabled}
                            onChange={(event) =>
                              // Ham deger degil, sanitize edilmis deger state'e yazilir
                              // (kontrolcu bulgusu §2): harf/isaret hicbir zaman
                              // state'e girmez, "12." gibi gecici ara haller
                              // serbest birakilir — kaydetmeden hemen once
                              // `normalizePivotRowsForSave` bunlari "0"a cevirir.
                              onQuantityChange(
                                row.item.id,
                                cell.siteId,
                                sanitizeQuantityInput(event.target.value),
                              )
                            }
                          />
                        ) : (
                          <span
                            className="pp-form-table__locked-cell"
                            title="Bu poz seçilen şantiyeye dağıtılmadı; önce poz dağılımını yapın."
                          >
                            —
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="pp-table__cell pp-table__cell--total">
                      {formatQuantity(rowQuantityTotal(row))}
                    </td>
                    <td className="pp-table__cell pp-table__cell--total">
                      {rowAmountTotal(row) !== null ? formatAmount(rowAmountTotal(row)!) : "—"}
                    </td>
                  </tr>
                </PivotRowGroup>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// `<tbody>` içine yalnız `<tr>` konabildiğinden grup başlığı + kalem satırı
// bir Fragment ile birlikte döner — ekstra sarmalayıcı DOM elemanı eklemez.
function PivotRowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
