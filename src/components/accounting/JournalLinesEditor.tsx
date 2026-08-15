"use client";

import { Button, Input, Select } from "@/components/ui";
import type { ChartAccountResponse } from "@/lib/api/hooks/useChartOfAccounts";

import { isSideLocked, type JournalLineDraft, type LineSide } from "./journal-entry-form";

export interface JournalLinesEditorProps {
  lines: readonly JournalLineDraft[];
  /** Yalnız YAPRAK hesaplar (backend §4c) — süzgeç `selectableLineAccounts`ten. */
  accounts: readonly ChartAccountResponse[];
  /**
   * Seçenek listesinde bulunmayan bir hesabın etiketi (düzenlenen fişin satırı
   * kataloğun sayfasında olmayabilir). `undefined` ⇒ hiç bilinmiyor.
   */
  labelOf: (accountId: string) => string | undefined;
  disabled: boolean;
  onAccountChange: (key: string, accountId: string) => void;
  onAmountChange: (key: string, side: LineSide, raw: string) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}

const COLUMN_COUNT = 4;

/**
 * Fişin bacakları — ÜÇ sütun (E8:102-105'in çizdiği küme):
 * `Hesap` · `Borç` · `Alacak` (+ satır silme).
 *
 * 🔴 **TEK TARAF**: bir bacakta hem borç hem alacak dolamaz
 * (`ck_journal_lines_single_side`). Bir tarafa değer girilince öteki taraf
 * TEMİZLENİR ve KİLİTLENİR — kullanıcı 422'yi beklemeden kuralı görür.
 *
 * Ham `<select>/<input>` YASAK: `Select`/`Input` primitive'leri (`size="row"`).
 */
export function JournalLinesEditor({
  lines,
  accounts,
  labelOf,
  disabled,
  onAccountChange,
  onAmountChange,
  onAdd,
  onRemove,
}: JournalLinesEditorProps) {
  return (
    <section className="mu-lines" aria-label="Fiş Satırları">
      <div className="mu-lines__head">
        <span className="mu-panel__title">Fiş Satırları</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          data-testid="mu-line-add"
          onClick={onAdd}
        >
          + Satır Ekle
        </Button>
      </div>
      <div className="mu-table-scroll">
        <table className="mu-table" data-testid="mu-lines-editor">
          <thead>
            <tr>
              <th scope="col">Hesap</th>
              <th scope="col" className="is-right">
                Borç
              </th>
              <th scope="col" className="is-right">
                Alacak
              </th>
              <th scope="col">
                <span className="sr-only">Sil</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={COLUMN_COUNT} className="mu-table__state" data-testid="mu-lines-empty">
                  Fişte satır yok; en az iki satır ekleyin.
                </td>
              </tr>
            )}
            {lines.map((line, index) => {
              const rowNo = index + 1;
              const isKnown =
                line.accountId.length === 0 ||
                accounts.some((account) => account.id === line.accountId);
              return (
                <tr key={line.key} data-testid="mu-line-row">
                  <td>
                    <Select
                      size="row"
                      aria-label={`${rowNo}. satır hesabı`}
                      value={line.accountId}
                      disabled={disabled}
                      data-testid={`mu-line-account-${index}`}
                      onChange={(event) => onAccountChange(line.key, event.target.value)}
                    >
                      <option value="">Hesap seçin</option>
                      {/* Kataloğun sayfasında olmayan mevcut hesap DÜŞÜRÜLMEZ:
                          seçenek yoksa tarayıcı değeri sessizce ilk seçeneğe
                          kaydırır ve kullanıcı farkında olmadan hesabı değiştirirdi. */}
                      {!isKnown && (
                        <option value={line.accountId}>
                          {labelOf(line.accountId) ?? "Listede olmayan hesap"}
                        </option>
                      )}
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <Input
                      size="row"
                      type="number"
                      step="any"
                      min="0"
                      aria-label={`${rowNo}. satır borç tutarı`}
                      value={line.debit}
                      disabled={disabled || isSideLocked(line, "debit")}
                      data-testid={`mu-line-debit-${index}`}
                      onChange={(event) => onAmountChange(line.key, "debit", event.target.value)}
                    />
                  </td>
                  <td>
                    <Input
                      size="row"
                      type="number"
                      step="any"
                      min="0"
                      aria-label={`${rowNo}. satır alacak tutarı`}
                      value={line.credit}
                      disabled={disabled || isSideLocked(line, "credit")}
                      data-testid={`mu-line-credit-${index}`}
                      onChange={(event) => onAmountChange(line.key, "credit", event.target.value)}
                    />
                  </td>
                  <td className="is-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={disabled}
                      aria-label={`${rowNo}. satırı sil`}
                      data-testid={`mu-line-remove-${index}`}
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
