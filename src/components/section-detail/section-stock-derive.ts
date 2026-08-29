import { sumDecimalStrings } from "@/lib/decimal";
import type { SectionStockRow } from "@/lib/api/hooks/useSectionStock";

/**
 * STOK-BOLUM · `A1 › Malzeme` türevleri.
 *
 * 🔴 BU DOSYADA BAKİYE HESABI YOKTUR ve olamaz: uç bakiye DÖNDÜRMEZ ("STOK
 * DEPODA DURUR, BÖLÜM TÜKETİR"). `assigned − issued` bir BAKİYE DEĞİLDİR,
 * sunucunun kendi adını verdiği `net_quantity`dir ve satırda ZATEN gelir —
 * burada YENİDEN HESAPLANMAZ (`stock-labels.ts` "durum sunucudan gelir"
 * kuralının kardeşi).
 *
 * 🔴 ALIM ETİKETİ İLE SARF ETİKETİ AYRI SAYILIR. Tek toplam basılsaydı
 * `+10 alım` ile `−4 sarf` birbirini götürür ve ekran 4 birimin harcandığını
 * HİÇ söyleyemezdi. Aşağıdaki her türev ikisini AYRI taşır.
 */

/**
 * Bir malzemenin bütün POZ satırlarının toplandığı hâl.
 *
 * Uç satırları (malzeme, poz) çifti başına açar — aynı malzeme birden çok pozda
 * görünebilir. Poz kırılımı İSTEMEYEN yüzey (alt kart "Bölüm Malzeme Durumu")
 * malzemeye göre toplar; backend docstring'i bunu açıkça çağırana bırakır
 * ("poz kırılımı istemeyen ekran malzemeye göre kendisi toplar").
 */
export interface SectionStockItemTotal {
  itemId: string;
  code: string;
  name: string;
  unit: string;
  /** Atfedilmiş POZİTİF miktarların toplamı — "bu bölüm için depoya girdi". */
  assigned: string;
  /** NEGATİF miktarların MUTLAK toplamı — "bu bölüme çıkıldı / sarf edildi". */
  issued: string;
  /** Bu malzemenin KAÇ farklı poza kırıldığı (poz atfı olmayan satır da sayılır). */
  lineCount: number;
}

/**
 * Satırları malzemeye göre toplar. Sıra KORUNUR: sunucunun döndürdüğü sıra
 * anlamlıdır ve istemci yeniden SIRALAMAZ (kendi sıralamasını uydurmak,
 * sayfalanmış bir listede sayfalar arası tutarsızlık üretirdi).
 *
 * Ondalık toplama `sumDecimalStrings` iledir — `Number` toplaması 3 basamaklı
 * miktarlarda kayan nokta artığı üretir (`0.1 + 0.2`).
 */
export function totalsByItem(
  rows: readonly SectionStockRow[],
): SectionStockItemTotal[] {
  const order: string[] = [];
  const assigned = new Map<string, string[]>();
  const issued = new Map<string, string[]>();
  const meta = new Map<string, { code: string; name: string; unit: string }>();
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!meta.has(row.item_id)) {
      order.push(row.item_id);
      meta.set(row.item_id, { code: row.code, name: row.name, unit: row.unit });
      assigned.set(row.item_id, []);
      issued.set(row.item_id, []);
      counts.set(row.item_id, 0);
    }
    assigned.get(row.item_id)!.push(row.assigned_quantity);
    issued.get(row.item_id)!.push(row.issued_quantity);
    counts.set(row.item_id, (counts.get(row.item_id) ?? 0) + 1);
  }

  return order.map((itemId) => {
    const info = meta.get(itemId)!;
    return {
      itemId,
      code: info.code,
      name: info.name,
      unit: info.unit,
      assigned: sumDecimalStrings(assigned.get(itemId) ?? []),
      issued: sumDecimalStrings(issued.get(itemId) ?? []),
      lineCount: counts.get(itemId) ?? 0,
    };
  });
}

/**
 * Poz hücresinin metni. Poz atfı OLMAYAN satır MEŞRUDUR (backend fail-open:
 * "bölüme çıkılmış ama bir poza bağlanmamış malzeme meşrudur") — bu bir EKSİK
 * DEĞİLDİR, o yüzden bir "pending" gerekçesi de basılmaz.
 *
 * `boq_code` ile `boq_description` AYRI alanlardır; ikisi de `null` olabilir.
 * Yalnız biri doluysa dolu olan basılır — birleştirme ayıracı uydurulmaz.
 */
export function boqLabel(row: SectionStockRow): string | null {
  const code = row.boq_code?.trim() || null;
  const description = row.boq_description?.trim() || null;
  if (code && description) return `${code} · ${description}`;
  return code ?? description;
}

/** Poz atfı olmayan satırın hücre gerekçesi — "eksik" DEĞİL, meşru bir hâl. */
export const SECTION_STOCK_NO_BOQ_REASON =
  "Bu satır bir iş kalemine bağlanmadan bölüme yazıldı (poz kırılımı zorunlu değildir)";
