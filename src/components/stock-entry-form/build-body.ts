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
 * 3. 🔴 **`section_id`/`boq_item_id` `transfer`da HİÇ GİRMEZ** (STOK-BOLUM) —
 *    2. kuralın TAM AYNASI. Backend `transfer` + atıf gövdesini 422 ile
 *    reddeder ("transfer tüketim değildir, iki bacaklıdır") ve form kullanıcıyı
 *    o 422'ye ÇARPTIRMAMALIDIR: kural burada YAPISAL olarak uygulanır, anahtar
 *    kurulmaz. `form-state.applyEntryTypeToLines` ayrıca DEĞERİ de siler —
 *    iki katman, çünkü tek katman ya hayalet seçim gösterir ya sızdırır.
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

function buildLine(
  line: StockEntryLineValues,
  entryType: StockEntryFormValues["entryType"],
): StockEntryLineCreate {
  const unitPrice = normalizeDecimalInput(line.unitPrice);
  // 🔴 `transfer`da atıf ANAHTARI HİÇ KURULMAZ (kural 3). Koşul satırın kendi
  // değerine DEĞİL hareketin TİPİNE bakar: satır kendi başına hangi tipte
  // olduğunu bilmez (backend `StockEntryLineCreate` docstring'inin aynısı).
  const attributionAllowed = entryType !== "transfer";
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
    // Atıf İSTEĞE BAĞLIDIR: boş bırakılan satır anahtarı hiç kurmaz. Bölümsüz
    // ya da pozsuz satır MEŞRUDUR (ikisi de nullable, backend fail-open).
    ...(attributionAllowed && line.sectionId ? { section_id: line.sectionId } : {}),
    ...(attributionAllowed && line.boqItemId ? { boq_item_id: line.boqItemId } : {}),
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
    lines: values.lines.map((line) => buildLine(line, values.entryType)),
  };
}
