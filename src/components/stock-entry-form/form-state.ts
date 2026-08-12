/**
 * F-ST T4 · Stok Girişi formunun DURUM modeli.
 *
 * ⚠️ DİLİMİN 3. ANA TUZAĞINA KARŞI YAPISAL KORUMA (spec §5 S5, F-PT emsali):
 * bu arayüzde "ilgili sipariş", "otomatik bildirim" ve "belge" alanları
 * **HİÇ YOKTUR**. Pending yüzeyler ekranda devre dışı basılır ama form
 * durumunda karşılıkları olmadığı için gövdeye SIZMALARI mümkün değildir —
 * `build-body.ts` bir alanı "unutmaya" güvenmez, alan var olmaz.
 *
 * `key` alanı SALT İSTEMCİDİR (React liste anahtarı + hata eşlemesi) ve
 * gövdeye GİRMEZ (bkz. `build-body.ts` gövde anahtar testi).
 */

import { multiplyDecimalStrings, sumDecimalStrings } from "@/lib/decimal";
import type { StockEntryType, StockQuality } from "@/lib/api/hooks/useStockMutations";

export interface StockEntryLineValues {
  /** SALT İSTEMCİ — gövdeye girmez. */
  key: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
  quality: StockQuality;
}

export interface StockEntryFormValues {
  entryType: StockEntryType;
  entryDate: string;
  warehouseId: string;
  /** YALNIZ `transfer` tipinde anlamlıdır (backend spec §7 S4). */
  sourceWarehouseId: string;
  supplierName: string;
  deliveryNoteNo: string;
  receivedByUserId: string;
  note: string;
  lines: StockEntryLineValues[];
}

/** Satır anahtarı — `Math.random` yok, artan sayaç deterministiktir. */
export function stockEntryLineKey(seq: number): string {
  return `line-${seq}`;
}

export function createStockEntryLine(seq: number): StockEntryLineValues {
  return {
    key: stockEntryLineKey(seq),
    itemId: "",
    quantity: "",
    unitPrice: "",
    // ⚠️ ÜRETİLMİŞ TİP TUZAĞI (T1 kaydı): `quality` şemada varsayılanlı ama
    // `openapi-typescript` çıktısında ZORUNLU görünür — hep dolu tutulur.
    quality: "ok",
  };
}

/**
 * Boş form. Tarih çağırandan gelir (gizli `new Date()` yok — site-diary
 * `isoDate` deseni); ilk satır AÇIK gelir, mockup'ta tablo boş değildir.
 */
export function emptyStockEntryFormValues(today: string): StockEntryFormValues {
  return {
    entryType: "purchase", // 54 — ilk kart seçili
    entryDate: today,
    warehouseId: "",
    sourceWarehouseId: "",
    supplierName: "",
    deliveryNoteNo: "",
    receivedByUserId: "",
    note: "",
    lines: [createStockEntryLine(0)],
  };
}

export function addStockEntryLine(
  values: StockEntryFormValues,
  seq: number,
): StockEntryFormValues {
  return { ...values, lines: [...values.lines, createStockEntryLine(seq)] };
}

export function removeStockEntryLine(
  values: StockEntryFormValues,
  key: string,
): StockEntryFormValues {
  return { ...values, lines: values.lines.filter((line) => line.key !== key) };
}

export function updateStockEntryLine(
  values: StockEntryFormValues,
  key: string,
  patch: Partial<Omit<StockEntryLineValues, "key">>,
): StockEntryFormValues {
  return {
    ...values,
    lines: values.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
  };
}

/**
 * Kullanıcının yazdığı sayıyı ondalık string'e indirger: TR virgülü noktaya
 * çevrilir, boşluk atılır. Boş/anlamsız girdi `null` döner — çağıran
 * "hesaplama yok" dalını seçer, `NaN` ekrana KAÇMAZ.
 */
export function normalizeDecimalInput(raw: string): string | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  if (!/^[-+]?\d*\.?\d*$/.test(trimmed)) return null;
  if (!Number.isFinite(Number(trimmed))) return null;
  return trimmed;
}

/**
 * Satır tutarı (116) — **TÜREVDİR**: kolon da alan da yoktur, sunucuya
 * gönderilmez (backend spec §2). Miktar ya da fiyat eksikse `null`.
 */
export function stockEntryLineAmount(line: StockEntryLineValues): string | null {
  const quantity = normalizeDecimalInput(line.quantity);
  const unitPrice = normalizeDecimalInput(line.unitPrice);
  if (quantity === null || unitPrice === null) return null;
  return multiplyDecimalStrings(quantity, unitPrice);
}

/** "TOPLAM GİRİŞ DEĞERİ" (141-142) — fiyatsız satırlar toplama GİRMEZ. */
export function stockEntryTotal(lines: readonly StockEntryLineValues[]): string {
  const amounts = lines
    .map(stockEntryLineAmount)
    .filter((amount): amount is string => amount !== null);
  return sumDecimalStrings(amounts);
}
