import type { BadgeVariant } from "@/components/ui/badge/Badge";
import type { StockCategory, StockStatus } from "@/lib/api/hooks/useStockItems";

/**
 * F-ST T2 · E3 (`Ekran 3 - Stok & Depo.dc.html`) etiket/renk sözlüğü.
 * Parantez içi sayılar o dosyanın SATIR numaralarıdır.
 *
 * ⚠️ EN ÖNEMLİ KURAL (spec §3): DURUM SUNUCUDAN GELİR. Bu dosyada `min_stock`
 * ile `balance`ı karşılaştıran TEK BİR SATIR YOKTUR — eşik formülü (%50·min /
 * min / 5×min) BACKEND'DEDİR (backend spec §7 S1). Buradaki her şey, sunucunun
 * gönderdiği `status` dizesinin GÖRÜNÜME çevrilmesidir. Buraya bir hesap
 * eklemek review bulgusudur.
 */

/** `StockCategory` enum'unun Türkçe karşılıkları — E3 99 seçenekleri + tablo (123 vd.). */
export const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  structural: "Yapı Malzemesi", // 132, 150, 159
  steel: "Demir-Çelik", // 123
  electrical: "Elektrik", // 141
  mechanical: "Mekanik", // 168
  interior: "İç Yapı", // 177
};

/**
 * Kategori süzgecinin seçenekleri — kaynak ŞEMADIR, mockup'ın sabit listesi
 * değil. E3 99'daki "Boya-Kaplama" seçeneği `stock_category` enum'unda YOKTUR
 * (backend spec §2: küme kapalıdır) — uydurma bir değer gönderip 422 almaktansa
 * seçenek basılmaz.
 */
export const STOCK_CATEGORY_OPTIONS: StockCategory[] = [
  "structural",
  "steel",
  "electrical",
  "mechanical",
  "interior",
];

/** Durum rozeti metni (128 · 137 · 146 · 155 · 173 · 182). */
export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  critical: "Kritik", // 128, 173
  low: "Düşük", // 146
  normal: "Normal", // 137, 155, 164
  excess: "Fazla", // 182
};

/**
 * Rozet renkleri — mockup zemin/metin çiftleri `Badge` varyantlarına oturur:
 * Kritik `#fee2e2/#dc2626` = danger · Düşük `#fef3c7/#d97706` = warning ·
 * Normal `#dcfce7/#16a34a` = success · Fazla `#dbeafe/#2563eb` = primary.
 */
export const STOCK_STATUS_BADGE_VARIANTS: Record<StockStatus, BadgeVariant> = {
  critical: "danger",
  low: "warning",
  normal: "success",
  excess: "primary",
};

/**
 * Durum segmenti (E3 94-97) — DÖRT düğme: Tümü · Kritik · Normal · Fazla Stok.
 *
 * ⚠️ "Düşük" BİLEREK YOKTUR: mockup segmenti dörtlü çizer ama satırlarda
 * "Düşük" rozeti (146) vardır. Beşinci düğme İCAT EDİLMEZ (mockup kazanır);
 * düşük stoklu kalemler "Tümü" görünümünde rozetleriyle görünür.
 */
export interface StockStatusSegment {
  /** `undefined` ⇒ süzgeç GÖNDERİLMEZ ("Tümü"). */
  value: StockStatus | undefined;
  label: string;
}

export const STOCK_STATUS_SEGMENTS: StockStatusSegment[] = [
  { value: undefined, label: "Tümü" }, // 94
  { value: "critical", label: "Kritik" }, // 95
  { value: "normal", label: "Normal" }, // 96
  { value: "excess", label: "Fazla Stok" }, // 97
];

/** URL'den okunan serbest metni güvenli bir `StockStatus`a daraltır. */
export function parseStockStatus(raw: string | null): StockStatus | undefined {
  return STOCK_STATUS_SEGMENTS.find((segment) => segment.value === raw)?.value;
}

/** URL'den okunan serbest metni güvenli bir `StockCategory`ye daraltır. */
export function parseStockCategory(raw: string | null): StockCategory | undefined {
  return STOCK_CATEGORY_OPTIONS.find((category) => category === raw);
}

/** "Stok" hücresinin renk tonu (125 · 134 · 143 · 152 · 161 · 170 · 179). */
export type StockBalanceTone = "danger" | "warning" | "neutral";

/**
 * Bakiye rengi — İKİ kaynaktan gelir, ikisi de sunucu verisidir:
 *
 * 1. **Eksi bakiye MEŞRU bir değerdir** (spec §3) ve durumdan BAĞIMSIZ olarak
 *    kırmızı basılır: `min_stock` yoksa `status` `null` gelir ama −5 ton demir
 *    yine de kırmızıdır. Hata DEĞİLDİR, gizlenmez.
 * 2. Aksi halde sunucunun `status` damgası boyar (kritik kırmızı 125/170 ·
 *    düşük kehribar 143 · geri kalanı nötr 134/152/161/179).
 */
export function stockBalanceTone(
  balance: string,
  status: StockStatus | null,
): StockBalanceTone {
  if (Number(balance) < 0) return "danger";
  if (status === "critical") return "danger";
  if (status === "low") return "warning";
  return "neutral";
}

/**
 * Satır zemini (121 · 139 · 166) — mockup KRİTİK ve DÜŞÜK satırları
 * `#fff7ed` ile vurgular; normal/fazla satırlar beyazdır.
 */
export function isStockRowHighlighted(status: StockStatus | null): boolean {
  return status === "critical" || status === "low";
}

/** Eşiksiz kalemin durum hücresi — uydurma rozet YOK (spec §3). */
export const STOCK_STATUS_UNKNOWN_REASON =
  "Min stok tanımlı değil — durum hesaplanmaz";

/**
 * E3 66 "Stok Hareketi" — spec §5 **S2 (ONAYLI)**: hedef ekranın mockup'ı
 * çizilmemiştir, `GET /stock/entries` ucu hazır olsa da bir liste ekranı
 * İCAT EDİLMEZ. Düğme SİLİNMEZ; devre dışı + görünür gerekçeyle durur.
 */
export const STOCK_MOVEMENTS_PENDING_REASON =
  "Stok hareketi listesi ekranı henüz tasarlanmadı — mockup çizilince açılacak";
