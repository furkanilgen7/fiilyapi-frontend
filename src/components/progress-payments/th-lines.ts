import type {
  SubcontractorContractDetail,
  SubcontractorProgressPaymentLineRead,
} from "@/lib/api/hooks/useSubcontractorProgressPayments";
import type { SubcontractorProgressPaymentLineInput } from "@/lib/api/hooks/useSubcontractorProgressPaymentMutations";

// F-TH T3 · hakediş kalem tablosunun SAF (component'sız) mantığı — İşveren
// tarafının `pivot.ts`si ile AYNI amaç, ama satır kaynağı FARKLI: burada
// satır = sözleşme kalemi (`SubcontractorContractDetail.items`), şantiye
// kırılımı YOK (brief §Veri kaynakları).
//
// Final inceleme F-5: miktar sanitizasyonu için BURADA takma ad TUTULMAZ —
// form `sanitizeQuantityInput`ü doğrudan `./pivot`tan alır. Aynı işin iki yolu
// bırakılmaz (ölü export kaldırıldı).

export type SubcontractorContractItem = SubcontractorContractDetail["items"][number];

export interface SubcontractorLineRow {
  itemId: string;
  code: string;
  description: string;
  unit: string;
  /** `null` = grupsuz kalem — mockup'ta grup başlığı basılmaz. */
  groupName: string | null;
  sortOrder: number;
  /**
   * Sözleşme B.F. (salt-okunur) — kayıtlı satır varsa onun `contract_unit_price`'ı
   * (LineRead şemasında ZORUNLU string), yoksa sözleşme kaleminin `unit_price`'ı.
   * `SubcontractorContractItemResponse.unit_price` NULLABLE'dır (`anyOf:
   * [string, null]`) — fix round 1 (kontrolcü bulgusu, Important): eksik fiyat
   * ASLA sessizce `"0"`a düşürülmez, `null` OLARAK taşınır. Sessiz `"0"`
   * gerçek sıfır fiyatla eksik fiyatı ayırt edilemez hale getirirdi
   * (kullanıcı "₺ 0" görüp bunun GERÇEK bir sıfır olduğunu sanırdı).
   * `null` ⇒ ekranda zarif düşüş (pending) gösterilir, `formatAmount` HİÇ
   * çağrılmaz.
   */
  contractUnitPrice: string | null;
  /** TEK düzenlenebilir alan (brief §Kalem tablosu). */
  quantity: string;
  quantitySource: "manual" | "diary";
  /** Kayıtlı satırın türev tutarı — hiç kaydedilmemişse `null` ("—" basılır, İKİNCİ bir çarpma icat edilmez). */
  lineTotal: string | null;
}

/**
 * Sözleşme kalemleri + (varsa) hakedişin kayıtlı satırları → ekran satırları.
 * Her sözleşme kalemi TAM OLARAK bir satır üretir (brief: kalemler
 * sözleşmeden otomatik yüklenir); kayıtlı satır yoksa miktar `"0"` ile
 * başlar (pivot.ts'teki "0 meşrudur" kararıyla AYNI — boş bırakmak yerine
 * geçerli bir varsayılan).
 */
export function buildSubcontractorLineRows(
  items: readonly SubcontractorContractItem[],
  existingLines: readonly SubcontractorProgressPaymentLineRead[] = [],
): SubcontractorLineRow[] {
  const lineByItemId = new Map<string, SubcontractorProgressPaymentLineRead>();
  for (const line of existingLines) {
    if (!line.contract_item_id) continue;
    lineByItemId.set(line.contract_item_id, line);
  }

  return [...items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => {
      const existing = lineByItemId.get(item.id);
      return {
        itemId: item.id,
        code: item.code,
        description: item.description,
        unit: item.unit,
        groupName: item.group?.name ?? null,
        sortOrder: item.sort_order,
        contractUnitPrice: existing ? existing.contract_unit_price : item.unit_price,
        quantity: existing ? existing.quantity : "0",
        quantitySource: existing ? existing.quantity_source : "manual",
        lineTotal: existing ? existing.line_total : null,
      };
    });
}

/**
 * Kaydetmeden HEMEN önce boş/geçersiz ara halleri (""/".") güvenli `"0"`a
 * çevirir — `pivot.ts`teki `normalizeQuantityForSave` ile AYNI karar.
 */
export function normalizeSubcontractorQuantityForSave(raw: string): string {
  if (raw === "" || raw === ".") return "0";
  return raw;
}

/**
 * ⚠️ `PUT …/lines` gövdesi — DEĞİŞTİRME (replace) semantiği (brief §PUT
 * lines): gövdede GEÇMEYEN satır sunucuda SİLİNİR. Bu yüzden ekrandaki TÜM
 * satırlar (miktarı "0" olanlar DAHİL) tek gövdede gönderilir — yalnız
 * DEĞİŞENLER değil. `coefficient` BİLEREK gönderilmez (`undefined`): şema
 * açıklaması "gönderilmezse yeni satır hakedişin varsayılan katsayısını
 * alır, mevcut satırın katsayısı KORUNUR" der — bu formda satır bazlı
 * katsayı girişi YOK (brief §Üst form, katsayı yalnız başlık seviyesinde).
 */
export function buildSubcontractorLinesSaveBody(
  rows: readonly SubcontractorLineRow[],
): SubcontractorProgressPaymentLineInput[] {
  return rows.map((row) => ({
    contract_item_id: row.itemId,
    quantity: normalizeSubcontractorQuantityForSave(row.quantity),
    sort_order: row.sortOrder,
  }));
}
