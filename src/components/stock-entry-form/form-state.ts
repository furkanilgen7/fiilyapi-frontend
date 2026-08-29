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

import {
  multiplyDecimalStrings,
  normalizeDecimalInput,
  sumDecimalStrings,
} from "@/lib/decimal";
import type { StockEntryType, StockQuality } from "@/lib/api/hooks/useStockMutations";

export interface StockEntryLineValues {
  /** SALT İSTEMCİ — gövdeye girmez. */
  key: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
  quality: StockQuality;
  /**
   * 🔴 STOK-BOLUM — ATIF **SATIR** BAZINDADIR, başlıkta DEĞİL (kullanıcı kararı
   * 2026-08-29, backend `stock_entry_lines.section_id`). Tek bir irsaliyenin
   * farklı kalemleri farklı bölümlere gidebilir; başlığa konsaydı bu ayrım
   * yapısal olarak imkânsız olurdu.
   *
   * Boş dize = ATIF YOK (meşru: ikisi de nullable). `build-body.ts` boş dizeyi
   * gövdeye HİÇ koymaz — `null` göndermekle göndermemek aynı sonucu verir ama
   * gövde gürültüsüz kalır.
   */
  sectionId: string;
  /**
   * Poz atfı. Bölümden BAĞIMSIZDIR: backend **fail-open**tur — pozun bölüme
   * TAHSİS EDİLMİŞ olması ARANMAZ ("kayıt, planın rehinesi olmaz"). İstemci bu
   * kararı DARALTMAZ; seçenek listesi tahsise göre süzülmez.
   */
  boqItemId: string;
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
    sectionId: "",
    boqItemId: "",
  };
}

/**
 * 🔴 `transfer` SEÇİLDİĞİNDE SATIRLARIN ATFI SİLİNİR — YAPISAL 1. KATMAN.
 *
 * Backend `transfer` + atıf kombinasyonunu **422** ile reddeder ve gerekçesi
 * anlamsaldır: *"transfer tüketim değildir, iki bacaklıdır"* — bir depodan
 * diğerine taşınan malzeme hiçbir bölüm tarafından harcanmamıştır.
 *
 * Kullanıcı önce "Satınalma"da bölüm seçip SONRA "Transfer"e geçebilir. Değer
 * durumda kalsaydı ekran onu göstermese bile bir sonraki tip değişiminde geri
 * gelir ve gövdeye sızabilirdi. Burada SİLİNİR; `build-body.ts` ayrıca anahtarı
 * hiç kurmaz (2. katman). İki katman da tek başına yeterli DEĞİLDİR: bu katman
 * olmasa ekran hayalet bir seçim gösterirdi, öteki olmasa yarış hâlinde sızardı.
 */
export function applyEntryTypeToLines(
  values: StockEntryFormValues,
  entryType: StockEntryType,
): StockEntryFormValues {
  if (entryType !== "transfer") return { ...values, entryType };
  return {
    ...values,
    entryType,
    lines: values.lines.map((line) => ({ ...line, sectionId: "", boqItemId: "" })),
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
 * Ondalık girdi normalleştirici — KANON `@/lib/decimal`tedir (F-SA T3'te üç
 * kopya tek kaynağa indirildi). Buradan yeniden dışa verilir ki bu klasörün
 * çağıranları ve testleri ithalatlarını değiştirmesin.
 */
export { normalizeDecimalInput };

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
