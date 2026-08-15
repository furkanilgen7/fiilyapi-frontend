import { Button, Input, Select } from "@/components/ui";
import { formatAmount } from "@/lib/format";
import type { StockItemResponse } from "@/lib/api/hooks/useStockItems";
import type { StockQuality } from "@/lib/api/hooks/useStockMutations";

import {
  EMPTY_VALUE,
  STOCK_ENTRY_ORDER_COLUMN_PENDING_REASON,
  STOCK_QUALITY_OPTIONS,
} from "./constants";
import {
  stockEntryLineAmount,
  stockEntryTotal,
  type StockEntryFormValues,
  type StockEntryLineValues,
} from "./form-state";
import type { StockEntryFormErrors } from "./validate";

interface StockEntryLinesCardProps {
  values: StockEntryFormValues;
  errors: StockEntryFormErrors;
  items: readonly StockItemResponse[];
  itemsDisabled: boolean;
  /** Malzeme listesinin durumu — sessiz boş açılır liste yasak. */
  itemsNote: string | null;
  onAddLine: () => void;
  onRemoveLine: (key: string) => void;
  onChangeLine: (key: string, patch: Partial<Omit<StockEntryLineValues, "key">>) => void;
}

/**
 * Malzeme Kalemleri tablosu (SG 92-147).
 *
 * ÜÇ kalıcı karar:
 * 1. **"Sipariş" sütunu (102/113) SA'ya pending**: kolon SİLİNMEZ, hücre
 *    gerekçeli "—" basar ve gövdeye HİÇBİR anahtar eklemez.
 * 2. **"Tutar" sütunu (105/116) TÜREVDİR** — `quantity × unit_price`
 *    istemcide gösterilir, şemada kolon YOKTUR (backend spec §2), gövdeye
 *    girmez.
 * 3. **Mockup'ın örnek satırları BASILMAZ** (111-128: "Nervürlü Demir Ø12",
 *    "⚠ Eksik teslimat", 322.500 …). Tablo boş bir satırla açılır; sabit
 *    içerik uydurmak bulgudur.
 */
export function StockEntryLinesCard({
  values,
  errors,
  items,
  itemsDisabled,
  itemsNote,
  onAddLine,
  onRemoveLine,
  onChangeLine,
}: StockEntryLinesCardProps) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const total = stockEntryTotal(values.lines);

  return (
    <section className="pf-card sgf-lines">
      {/* 93-97 */}
      <header className="sgf-lines__head">
        <span className="sgf-lines__title">Malzeme Kalemleri</span>
        <span className="sgf-lines__pending" data-testid="stok-giris-siparis-kolon-gerekce">
          “Sipariş” sütunu: {STOCK_ENTRY_ORDER_COLUMN_PENDING_REASON}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="sgf-lines__add"
          data-testid="stok-giris-kalem-ekle"
          onClick={onAddLine}
        >
          + Kalem Ekle
        </Button>
      </header>

      {itemsNote && (
        <p className="sgf-lines__note" data-testid="stok-giris-malzeme-note">
          {itemsNote}
        </p>
      )}
      {errors.lines && (
        <p className="sgf-lines__note sgf-lines__note--error" data-testid="stok-giris-kalem-hata">
          {errors.lines}
        </p>
      )}

      <table className="sgf-table">
        <thead>
          {/* 99-108 */}
          <tr>
            <th scope="col">Malzeme</th>
            <th scope="col" className="sgf-table__center">
              Birim
            </th>
            <th scope="col" className="sgf-table__right">
              Sipariş
            </th>
            <th scope="col" className="sgf-table__right sgf-table__accent">
              Gelen
            </th>
            <th scope="col" className="sgf-table__right">
              Birim Fiyat
            </th>
            <th scope="col" className="sgf-table__right">
              Tutar
            </th>
            <th scope="col" className="sgf-table__center">
              Kalite
            </th>
            <th scope="col">
              <span className="sr-only">Satırı sil</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {values.lines.map((line, index) => {
            const item = itemsById.get(line.itemId);
            const lineErrors = errors.lineErrors[line.key];
            const amount = stockEntryLineAmount(line);
            return (
              <tr key={line.key} data-testid={`stok-giris-satir-${index}`}>
                <td>
                  <Select
                    size="row"
                    aria-label={`Malzeme (satır ${index + 1})`}
                    data-testid={`stok-giris-malzeme-${index}`}
                    status={lineErrors?.itemId ? "error" : "default"}
                    disabled={itemsDisabled}
                    value={line.itemId}
                    onChange={(event) => onChangeLine(line.key, { itemId: event.target.value })}
                  >
                    {/* 132-135 "Stok kartından malzeme seç" */}
                    <option value="">Stok kartından malzeme seç…</option>
                    {items.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} · {option.code}
                      </option>
                    ))}
                  </Select>
                  {lineErrors?.itemId && (
                    <span className="sgf-table__error">{lineErrors.itemId}</span>
                  )}
                </td>
                {/* 112 — birim SEÇİLEN KARTTAN gelir, elle girilmez */}
                <td className="sgf-table__center sgf-table__muted">{item?.unit ?? EMPTY_VALUE}</td>
                {/* 113 — SA'ya pending */}
                <td
                  className="sgf-table__right sgf-table__muted"
                  title={STOCK_ENTRY_ORDER_COLUMN_PENDING_REASON}
                  data-testid={`stok-giris-siparis-${index}`}
                >
                  {EMPTY_VALUE}
                  {/* `title` tek başına erişilebilir değil (BoqTable deseni). */}
                  <span className="sr-only">{STOCK_ENTRY_ORDER_COLUMN_PENDING_REASON}</span>
                </td>
                {/* 114 */}
                <td className="sgf-table__right">
                  <Input
                    size="row"
                    numeric
                    inputMode="decimal"
                    className="sgf-table__input sgf-table__input--accent"
                    aria-label={`Gelen miktar (satır ${index + 1})`}
                    data-testid={`stok-giris-miktar-${index}`}
                    status={lineErrors?.quantity ? "error" : "default"}
                    value={line.quantity}
                    onChange={(event) => onChangeLine(line.key, { quantity: event.target.value })}
                  />
                  {lineErrors?.quantity && (
                    <span className="sgf-table__error">{lineErrors.quantity}</span>
                  )}
                </td>
                {/* 115 */}
                <td className="sgf-table__right">
                  <Input
                    size="row"
                    numeric
                    inputMode="decimal"
                    className="sgf-table__input"
                    aria-label={`Birim fiyat (satır ${index + 1})`}
                    data-testid={`stok-giris-fiyat-${index}`}
                    status={lineErrors?.unitPrice ? "error" : "default"}
                    value={line.unitPrice}
                    onChange={(event) => onChangeLine(line.key, { unitPrice: event.target.value })}
                  />
                  {lineErrors?.unitPrice && (
                    <span className="sgf-table__error">{lineErrors.unitPrice}</span>
                  )}
                </td>
                {/* 116 — TÜREV */}
                <td
                  className="sgf-table__right sgf-table__amount"
                  data-testid={`stok-giris-tutar-${index}`}
                >
                  {amount === null ? EMPTY_VALUE : formatAmount(amount)}
                </td>
                {/* 117 */}
                <td className="sgf-table__center">
                  <Select
                    size="row"
                    aria-label={`Kalite (satır ${index + 1})`}
                    data-testid={`stok-giris-kalite-${index}`}
                    value={line.quality}
                    onChange={(event) =>
                      onChangeLine(line.key, { quality: event.target.value as StockQuality })
                    }
                  >
                    {STOCK_QUALITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </td>
                {/* 118 */}
                <td className="sgf-table__center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="sgf-table__remove"
                    aria-label={`Satırı sil (satır ${index + 1})`}
                    data-testid={`stok-giris-satir-sil-${index}`}
                    onClick={() => onRemoveLine(line.key)}
                  >
                    ×
                  </Button>
                </td>
              </tr>
            );
          })}
          {/* 130-137 */}
          <tr className="sgf-table__adder">
            <td colSpan={8}>
              <Button
                variant="secondary"
                size="sm"
                className="sgf-table__pick"
                data-testid="stok-giris-kart-sec"
                onClick={onAddLine}
              >
                + Stok kartından malzeme seç
              </Button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          {/* 140-144 */}
          <tr>
            <td colSpan={5}>TOPLAM GİRİŞ DEĞERİ</td>
            <td className="sgf-table__right" data-testid="stok-giris-toplam">
              ₺{formatAmount(total)}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
