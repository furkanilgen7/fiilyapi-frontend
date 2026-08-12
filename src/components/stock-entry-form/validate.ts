/**
 * F-ST T4 · İstemci doğrulaması — backend ST spec §4b'nin **422 kurallarının
 * AYNADAKİ karşılığı**. Amaç sunucuyu taklit etmek değil, kullanıcıya
 * beklemeden Türkçe geri bildirim vermektir; kural yine SUNUCUDA bağlayıcıdır
 * ve sunucu 422'si `stockErrorMessage` ile ayrıca basılır.
 *
 * Kapsanan 422 kuralları: miktar işareti/sıfır · transferde kaynak eksikliği ·
 * kendine transfer. (`purchase`/`adjustment`ta kaynak verilmesi kuralı burada
 * DEĞİL `build-body.ts`tedir: alan gövdeye hiç girmez, yani ihlal ÜRETİLEMEZ.)
 */

import { MAX_LENGTH } from "./constants";
import { normalizeDecimalInput, type StockEntryFormValues } from "./form-state";

export const MESSAGES = {
  entryDateRequired: "Giriş tarihi zorunludur.",
  warehouseRequired: "Depo seçimi zorunludur.",
  sourceWarehouseRequired: "Transfer girişinde kaynak depo zorunludur.",
  sourceWarehouseSame: "Kaynak depo ile hedef depo aynı olamaz.",
  linesRequired: "En az bir malzeme kalemi eklemelisiniz.",
  itemRequired: "Malzeme seçilmedi.",
  quantityRequired: "Miktar zorunludur.",
  quantityInvalid: "Miktar geçerli bir sayı olmalıdır.",
  quantityZero: "Miktar sıfır olamaz.",
  quantityNegative: "Bu giriş tipinde miktar negatif olamaz — negatif miktar yalnız “Manuel Düzeltme” tipinde girilebilir.",
  unitPriceInvalid: "Birim fiyat geçerli bir sayı olmalıdır.",
  unitPriceNegative: "Birim fiyat negatif olamaz.",
  supplierTooLong: `Tedarikçi adı en fazla ${MAX_LENGTH.supplierName} karakter olabilir.`,
  deliveryNoteTooLong: `İrsaliye no en fazla ${MAX_LENGTH.deliveryNoteNo} karakter olabilir.`,
  noteTooLong: `Not en fazla ${MAX_LENGTH.note} karakter olabilir.`,
} as const;

export interface StockEntryLineErrors {
  itemId?: string;
  quantity?: string;
  unitPrice?: string;
}

export interface StockEntryFormErrors {
  entryDate?: string;
  warehouseId?: string;
  sourceWarehouseId?: string;
  supplierName?: string;
  deliveryNoteNo?: string;
  note?: string;
  /** Tablonun tamamına ait hata (hiç satır yok). */
  lines?: string;
  /** Satır anahtarı → alan hataları. */
  lineErrors: Record<string, StockEntryLineErrors>;
}

function validateLineQuantity(
  raw: string,
  entryType: StockEntryFormValues["entryType"],
): string | undefined {
  if (!raw.trim()) return MESSAGES.quantityRequired;
  const normalized = normalizeDecimalInput(raw);
  if (normalized === null) return MESSAGES.quantityInvalid;
  const quantity = Number(normalized);
  if (quantity === 0) return MESSAGES.quantityZero;
  // §7 S4: NEGATİF miktar YALNIZ `adjustment` tipinde meşrudur (sayım
  // farkı/iade/sarf tek kapısı); diğer tiplerde sunucu 422 verir.
  if (quantity < 0 && entryType !== "adjustment") return MESSAGES.quantityNegative;
  return undefined;
}

function validateLineUnitPrice(raw: string): string | undefined {
  if (!raw.trim()) return undefined;
  const normalized = normalizeDecimalInput(raw);
  if (normalized === null) return MESSAGES.unitPriceInvalid;
  if (Number(normalized) < 0) return MESSAGES.unitPriceNegative;
  return undefined;
}

export function validateStockEntryForm(values: StockEntryFormValues): StockEntryFormErrors {
  const errors: StockEntryFormErrors = { lineErrors: {} };

  if (!values.entryDate) errors.entryDate = MESSAGES.entryDateRequired;
  if (!values.warehouseId) errors.warehouseId = MESSAGES.warehouseRequired;

  if (values.entryType === "transfer") {
    if (!values.sourceWarehouseId) {
      errors.sourceWarehouseId = MESSAGES.sourceWarehouseRequired;
    } else if (values.sourceWarehouseId === values.warehouseId) {
      errors.sourceWarehouseId = MESSAGES.sourceWarehouseSame;
    }
  }

  if (values.supplierName.trim().length > MAX_LENGTH.supplierName) {
    errors.supplierName = MESSAGES.supplierTooLong;
  }
  if (values.deliveryNoteNo.trim().length > MAX_LENGTH.deliveryNoteNo) {
    errors.deliveryNoteNo = MESSAGES.deliveryNoteTooLong;
  }
  if (values.note.trim().length > MAX_LENGTH.note) {
    errors.note = MESSAGES.noteTooLong;
  }

  if (values.lines.length === 0) {
    errors.lines = MESSAGES.linesRequired;
    return errors;
  }

  for (const line of values.lines) {
    const lineErrors: StockEntryLineErrors = {};
    if (!line.itemId) lineErrors.itemId = MESSAGES.itemRequired;
    const quantityError = validateLineQuantity(line.quantity, values.entryType);
    if (quantityError) lineErrors.quantity = quantityError;
    const unitPriceError = validateLineUnitPrice(line.unitPrice);
    if (unitPriceError) lineErrors.unitPrice = unitPriceError;
    if (Object.keys(lineErrors).length > 0) errors.lineErrors[line.key] = lineErrors;
  }

  return errors;
}

/** İlk hata cümlesi — genel uyarı bandında gösterilir. */
export function firstStockEntryError(errors: StockEntryFormErrors): string | null {
  const top = [
    errors.entryDate,
    errors.warehouseId,
    errors.sourceWarehouseId,
    errors.supplierName,
    errors.deliveryNoteNo,
    errors.note,
    errors.lines,
  ].find(Boolean);
  if (top) return top;
  for (const lineErrors of Object.values(errors.lineErrors)) {
    const message = lineErrors.itemId ?? lineErrors.quantity ?? lineErrors.unitPrice;
    if (message) return message;
  }
  return null;
}

export function hasStockEntryErrors(errors: StockEntryFormErrors): boolean {
  return firstStockEntryError(errors) !== null;
}
