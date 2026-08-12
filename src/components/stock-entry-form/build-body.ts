/**
 * F-ST T4 · `POST /stock/entries` gövdesinin TEK kurucusu.
 *
 * İKİ bağlayıcı kural (ikisinin de adlı testi `build-body.test.ts`tedir):
 *
 * 1. **PENDING SIZINTISI YASAK** (spec §5 S5 · F-PT emsali): sipariş,
 *    otomatik bildirim ve belge yüzeyleri gövdeye HİÇBİR anahtar eklemez —
 *    `undefined`/`null` olarak bile. `form-state.ts` bu alanları hiç
 *    tanımlamadığı için buradan da geçemezler; test gövdenin anahtar KÜMESİNİ
 *    birebir iddia eder (fazladan anahtar = kırmızı).
 * 2. **`source_warehouse_id` KOŞULLUDUR** (backend spec §7 S4 · §4b):
 *    `transfer` DIŞINDAKİ tiplerde anahtar gövdeye HİÇ GİRMEZ. Girerse sunucu
 *    422 verir ("Bu hareket tipinde kaynak depo verilemez").
 *
 * Boş bırakılan isteğe bağlı alanlar da GÖNDERİLMEZ (anahtar hiç kurulmaz):
 * `null` göndermek ile göndermemek burada aynı sonucu verir, ama gövdeyi
 * gürültüsüz tutmak anahtar testini okunur kılar.
 */

import type {
  StockEntryCreate,
  StockEntryLineCreate,
} from "@/lib/api/hooks/useStockMutations";

import { normalizeDecimalInput, type StockEntryFormValues, type StockEntryLineValues } from "./form-state";

function buildLine(line: StockEntryLineValues): StockEntryLineCreate {
  const unitPrice = normalizeDecimalInput(line.unitPrice);
  return {
    item_id: line.itemId,
    // Ondalık STRING gönderilir (şema `number | string`): `Number()`e
    // çevirmek 3 basamaklı miktarlarda hassasiyet kaybı riskidir.
    quantity: normalizeDecimalInput(line.quantity) ?? line.quantity.trim(),
    // Fiyatsız satır MEŞRUDUR (kalem "Stok Değeri" hesabına girmez) — alan
    // uydurma `0` ile doldurulmaz, anahtar hiç kurulmaz.
    ...(unitPrice !== null ? { unit_price: unitPrice } : {}),
    // Şemada varsayılanlı ama üretilmiş tipte ZORUNLU — açıkça verilir.
    quality: line.quality,
  };
}

export function buildStockEntryBody(values: StockEntryFormValues): StockEntryCreate {
  const supplierName = values.supplierName.trim();
  const deliveryNoteNo = values.deliveryNoteNo.trim();
  const note = values.note.trim();

  return {
    entry_type: values.entryType,
    entry_date: values.entryDate,
    warehouse_id: values.warehouseId,
    ...(values.entryType === "transfer"
      ? { source_warehouse_id: values.sourceWarehouseId }
      : {}),
    ...(supplierName ? { supplier_name: supplierName } : {}),
    ...(deliveryNoteNo ? { delivery_note_no: deliveryNoteNo } : {}),
    ...(values.receivedByUserId ? { received_by_user_id: values.receivedByUserId } : {}),
    ...(note ? { note } : {}),
    lines: values.lines.map(buildLine),
  };
}
