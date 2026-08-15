import type { InvoiceLineCreate } from "@/lib/api/hooks/useInvoiceMutations";

/**
 * F-FAT2 · FK kalem tablosunun SAF hesabı.
 *
 * 🔴 KAPSAM SINIRI — bu modül YALNIZ İKİ sayıyı hesaplar: satır tutarı ve
 * mal/hizmet toplamı. Kesinti/matrah/KDV/genel toplam BURADA HESAPLANMAZ ve
 * ekranda da basılmaz: onlar SUNUCUNUN saklanan kolonlarıdır (K7) ve
 * formülleri backend'dedir. İstemcide bir kopya formül yazmak, sunucununkiyle
 * ayrıştığı gün ekranda YANLIŞ PARA basardı — repo'nun "türev para tek
 * kaynaktan" kuralının ihlali.
 *
 * İki hesabın mockup'tan DOĞRULAMASI (`Fatura - Kes.dc.html`):
 *   180-183: 1320 × 2113   = 2.789.160 ✓
 *   189-192:  300 × 2398   =   719.400 ✓
 *   198-201: 61,2 × 21500  = 1.315.800 ✓
 *   207-210: 2880 ×  211   =   607.680 ✓
 *   246:     Σ             = 5.432.040 ✓ ("Mal/Hizmet Toplamı")
 */

/** FK tablosunun BİR satırının form hâli — hepsi metin (kontrol değerleri). */
export interface InvoiceLineDraft {
  /** İstemci tarafı anahtar; sunucuya GİTMEZ. */
  key: string;
  description: string; // FK:178 — poz numarası açıklamanın İÇİNDEDİR (S2)
  unit: string; // FK:179 — SERBEST METİN (S3), kapalı küme icat edilmez
  quantity: string; // FK:180
  unitPrice: string; // FK:181
  vatRate: string; // FK:182
}

export function emptyLineDraft(key: string): InvoiceLineDraft {
  return { key, description: "", unit: "", quantity: "", unitPrice: "", vatRate: "20" };
}

/** Boş/bozuk metin `null` döner — `0` DEĞİL: "girilmedi" ile "sıfır" ayrıdır. */
export function parseNumeric(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed.length === 0) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** Satır tutarı (FK:183 "Tutar" sütunu); girdilerden biri okunamazsa `null`. */
export function lineTotal(line: InvoiceLineDraft): number | null {
  const quantity = parseNumeric(line.quantity);
  const unitPrice = parseNumeric(line.unitPrice);
  if (quantity === null || unitPrice === null) return null;
  return quantity * unitPrice;
}

export interface SubtotalPreview {
  /** Okunabilen satırların toplamı. */
  amount: number;
  /** Tutarı ÇÖZÜLEMEYEN satır sayısı — sıfır değilse toplam EKSİKTİR. */
  unknownCount: number;
}

/**
 * FK:246 "Mal/Hizmet Toplamı" önizlemesi.
 *
 * Çözülemeyen satır sessizce `0` sayılmaz: `unknownCount` ile SAYILIR ve ekran
 * toplamın eksik olduğunu söyler (SA/T3 "bilinmeyen büyük sayılır" dersinin
 * istemci karşılığı — eksiklik gizlenmez).
 */
export function subtotalPreview(lines: readonly InvoiceLineDraft[]): SubtotalPreview {
  let amount = 0;
  let unknownCount = 0;
  for (const line of lines) {
    const total = lineTotal(line);
    if (total === null) unknownCount += 1;
    else amount += total;
  }
  return { amount, unknownCount };
}

/** Sunucuya gidecek hâle çevrilebilen satır mı (boş satır sessizce ATILMAZ). */
export function isBlankLine(line: InvoiceLineDraft): boolean {
  return (
    line.description.trim().length === 0 &&
    line.unit.trim().length === 0 &&
    line.quantity.trim().length === 0 &&
    line.unitPrice.trim().length === 0
  );
}

export type LineBuildResult =
  | { ok: true; lines: InvoiceLineCreate[] }
  | { ok: false; message: string };

/**
 * Form satırlarını `InvoiceLineCreate[]`e çevirir.
 *
 * 🔴 `line_total` ve `sort_order` GÖNDERİLMEZ (gönderilirse 422): ilki
 * sunucunun hesabı, ikincisi gövdedeki dizinin İNDEKSİdir (şema notu).
 *
 * TAMAMEN boş satır atlanır (kullanıcı "+ Kalem Ekle"ye fazladan bastıysa);
 * KISMEN dolu satır ATLANMAZ, hata döner — sessiz veri kaybı yasaktır.
 */
export function buildLines(lines: readonly InvoiceLineDraft[]): LineBuildResult {
  const built: InvoiceLineCreate[] = [];
  for (const [index, line] of lines.entries()) {
    if (isBlankLine(line)) continue;
    const rowNo = index + 1;
    const description = line.description.trim();
    if (description.length === 0) {
      return { ok: false, message: `${rowNo}. kalemin açıklaması boş olamaz.` };
    }
    const quantity = parseNumeric(line.quantity);
    if (quantity === null || quantity <= 0) {
      return { ok: false, message: `${rowNo}. kalemin miktarı sıfırdan büyük olmalıdır.` };
    }
    const unitPrice = parseNumeric(line.unitPrice);
    if (unitPrice === null || unitPrice < 0) {
      return { ok: false, message: `${rowNo}. kalemin birim fiyatı geçersiz.` };
    }
    const vatRate = parseNumeric(line.vatRate);
    if (vatRate === null || vatRate < 0 || vatRate > 100) {
      return { ok: false, message: `${rowNo}. kalemin KDV oranı 0-100 aralığında olmalıdır.` };
    }
    const unit = line.unit.trim();
    built.push({
      description,
      quantity,
      unit_price: unitPrice,
      vat_rate: vatRate,
      ...(unit.length > 0 ? { unit } : {}),
    });
  }
  return { ok: true, lines: built };
}
