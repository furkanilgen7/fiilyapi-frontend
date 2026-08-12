import type { BadgeVariant } from "@/components/ui/badge/Badge";
import type { StockCategory, StockStatus } from "@/lib/api/hooks/useStockItems";
import { pendingModuleLabel } from "@/lib/pending-modules";

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

/* ---------------------------------------------------------------------------
 * F-ST T3 · ŞS (`Şantiye - Stok.dc.html`) — şantiye "Stok" sekmesine ÖZGÜ
 * sözlük. Aşağıdaki sayılar O DOSYANIN satır numaralarıdır. E3 ile ORTAK olan
 * her şey (kategori/rozet varyantı/bakiye tonu/satır vurgusu) yukarıdan AYNEN
 * kullanılır — kopyalanmaz.
 * ------------------------------------------------------------------------ */

/**
 * ŞS'nin durum rozeti metinleri (118 · 128 · 138 · 148 · 158 · 168).
 *
 * ⚠️ İKİ MOCKUP AYNI SUNUCU DEĞERİNE FARKLI AD VERİYOR: `normal` E3'te
 * "Normal" (137), ŞS'de "Yeterli" (138) basılır. Mockup kazanır (WORKFLOW §3),
 * bu yüzden ŞS için tek alan üzerinden türetilmiş bir örtü tutulur; `excess`
 * ŞS'de hiç çizilmediğinden E3 metnini korur. Bu bir HESAP DEĞİL, yalnızca
 * sunucunun `status` dizesinin ekrana göre çevirisidir.
 */
export const SITE_STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  ...STOCK_STATUS_LABELS,
  normal: "Yeterli", // 138, 148, 168
};

/**
 * Sunucunun ŞS satırlarında kullandığı pending anahtarları (backend
 * `PENDING_PURCHASING` / `PENDING_SITE_PLANNING`). Gerekçe METNİ tek kaynaktan
 * (`pendingModuleLabel`) gelir — ekranlara elle cümle yazılmaz.
 */
export const STOCK_PURCHASING_PENDING_MODULE = "purchasing";
export const STOCK_SITE_PLANNING_PENDING_MODULE = "site_planning";

/**
 * ŞS 78 "Satınalma Talebi →" ve satır sonundaki "Acil Sipariş"/"Sipariş Ver"
 * düğmeleri — spec §5 **S5 (ONAYLI)**: hepsi SATINALMA dilimine pending'dir.
 * Düğmeler SİLİNMEZ; devre dışı + görünür gerekçeyle dururlar.
 */
export const SITE_STOCK_ORDER_PENDING_REASON = pendingModuleLabel(
  STOCK_PURCHASING_PENDING_MODULE,
);

/**
 * ŞS 100/101 "Aylık İhtiyaç" + "Bölüm" sütunlarının ORTAK gerekçesi. Satır
 * hücreleri kendi gerekçesini SUNUCUNUN zarfından okur (`pending_module`);
 * bu sabit yalnızca tablo üstündeki görünür açıklama bandı içindir.
 */
export const SITE_STOCK_COLUMN_PENDING_REASON = pendingModuleLabel(
  STOCK_SITE_PLANNING_PENDING_MODULE,
);

/**
 * ŞS 158/168 "Detay" düğmesi — malzeme detay ekranının mockup'ı ÇİZİLMEMİŞTİR
 * ve bir ekran İCAT EDİLMEZ (S2 ile aynı gerekçe kalıbı). Düğme yerinde durur.
 */
export const SITE_STOCK_DETAIL_PENDING_REASON =
  "Malzeme detay ekranı henüz tasarlanmadı — mockup çizilince açılacak";

export interface SiteStockRowAction {
  label: string;
  reason: string;
  variant: "danger" | "warning" | "secondary";
}

/**
 * Satır sonundaki düğme (118-168) — etiketi SUNUCUNUN `status` damgası seçer:
 * kritik ⇒ "Acil Sipariş" (118), düşük ⇒ "Sipariş Ver" (128), geri kalan ⇒
 * "Detay" (138). Eşiksiz kalem (`status: null`) sipariş aciliyeti İMA ETMEZ,
 * "Detay"a düşer. Burada eşik hesabı YOKTUR.
 */
export function siteStockRowAction(status: StockStatus | null): SiteStockRowAction {
  if (status === "critical") {
    return { label: "Acil Sipariş", reason: SITE_STOCK_ORDER_PENDING_REASON, variant: "danger" };
  }
  if (status === "low") {
    return { label: "Sipariş Ver", reason: SITE_STOCK_ORDER_PENDING_REASON, variant: "warning" };
  }
  return { label: "Detay", reason: SITE_STOCK_DETAIL_PENDING_REASON, variant: "secondary" };
}

/** T4'ün (`.../stok/giris`) rota sözleşmesi — link hedefi TEK yerden kurulur. */
export function siteStockEntryHref(projectId: string, siteId: string): string {
  return `/projeler/${projectId}/santiyeler/${siteId}/stok/giris`;
}
