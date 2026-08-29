import type { BadgeVariant } from "@/components/ui/badge/Badge";
import type { PurchaseOrderStatus } from "@/lib/api/hooks/usePurchaseOrders";
import type {
  PurchasePriority,
  PurchaseRequestStatus,
} from "@/lib/api/hooks/usePurchaseRequests";
import type { PaymentTerms } from "@/lib/api/hooks/useSuppliers";
import { routes } from "@/lib/routes";

/**
 * F-SA T2 · SAT (`Satınalma & Teklif.dc.html`) + TED
 * (`Satınalma - Tedarikçiler.dc.html`) etiket/renk sözlüğü. Parantez içi
 * sayılar İLGİLİ mockup dosyasının SATIR numaralarıdır.
 *
 * ⚠️ Bu dosyada HESAP YOKTUR: durum sunucunun `status` damgasıdır, tutar
 * sunucunun `estimated_total`ı, tedarikçi cirosu sunucunun
 * `orders_total_this_year` türevidir. Buraya bir eşik/toplam eklemek review
 * bulgusudur (`stock-labels.ts` ile aynı kanon).
 */

/**
 * İzin modülü anahtarı — backend `procurement.guards.PERMISSION_MODULE`
 * ("Satınalma & Teklif", seed'deki 10. modül). Her iki ekran da AYNI anahtarı
 * kullanır; ekran başına izin sabiti yazmak yasaktır.
 */
export const PURCHASING_PERMISSION_MODULE = "procurement";

/** URL durumu anahtarları — sekme/süzgeç paylaşılabilir olmalı (E12/E3 deseni). */
export const STATUS_PARAM = "durum";
export const PROJECT_PARAM = "proje";
export const QUERY_PARAM = "q";

/**
 * Durum rozeti metinleri (SAT 118 · 127 · 136 · 145 · 154).
 *
 * ⚠️ `PurchaseRequestStatus` enum'unun ALTI değerinin ALTISI da eşlenir.
 * Mockup yalnız dördünü çizer; `draft` ve `rejected` eşlenmezse rozet
 * hücresi sessizce boş kalırdı (WORKFLOW §3: sessiz atlama yasak).
 */
export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  draft: "Taslak", // mockup'ta çizilmedi (talep henüz gönderilmemiş)
  pending_approval: "Onay Bekliyor", // 118
  quote_wait: "Teklif Bekleniyor", // 127, 145
  ordered: "Sipariş Verildi", // 136
  delivered: "Teslim Edildi", // 154
  rejected: "Reddedildi", // mockup'ta çizilmedi
};

/**
 * Rozet renkleri — mockup zemin/metin çiftleri `Badge` varyantlarına oturur:
 * Onay Bekliyor `#fee2e2/#dc2626` = danger (118) · Teklif Bekleniyor
 * `#fef3c7/#d97706` = warning (127, 145) · Sipariş Verildi `#dcfce7/#16a34a`
 * = success (136) · Teslim Edildi `#dbeafe/#2563eb` = primary (154).
 *
 * Metin tonu iki rozette primitive'den KOYUdur (`#dc2626`/`#d97706`); fark
 * `purchasing.css`teki `.sat-badge--*` kurallarıyla kapatılır (F-ST emsali).
 *
 * Çizilmeyen iki değer: `draft` nötr (henüz bir şey olmadı), `rejected`
 * danger (olumsuz sonuç). İkisi de mockup'tan DEĞİL, palet mantığından gelir
 * — mockup onları hiç çizmediği için birebir alınacak bir renk yoktur.
 */
export const PURCHASE_REQUEST_STATUS_BADGE_VARIANTS: Record<
  PurchaseRequestStatus,
  BadgeVariant
> = {
  draft: "neutral",
  pending_approval: "danger",
  quote_wait: "warning",
  ordered: "success",
  delivered: "primary",
  rejected: "danger",
};

/**
 * Sipariş durumu (SIP 66 "Yolda" · 77 "Onaylandı" · 88 "Teslim Edildi").
 * `PurchaseOrderStatus` ÜÇ değerlidir ve üçü de mockup'ta çizilidir; SIP 34'ün
 * süzgeç seçicisi de bu üçünü sayar.
 */
export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  approved: "Onaylandı", // 77
  in_transit: "Yolda", // 66, 99, 121
  delivered: "Teslim Edildi", // 88, 110
};

/**
 * Rozet renkleri — mockup zemin/metin çiftleri `Badge` varyantlarına oturur:
 * Yolda `#fef3c7/#d97706` = warning (66) · Onaylandı `#dbeafe/#2563eb` =
 * primary (77) · Teslim Edildi `#dcfce7/#16a34a` = success (88).
 *
 * "Yolda" metni primitive'den KOYUdur (`#d97706`); fark `purchasing.css`teki
 * `.sip-badge--in_transit` kuralıyla kapatılır (SAT rozetlerinin emsali).
 */
export const PURCHASE_ORDER_STATUS_BADGE_VARIANTS: Record<PurchaseOrderStatus, BadgeVariant> = {
  approved: "primary",
  in_transit: "warning",
  delivered: "success",
};

/**
 * SIP 34 süzgeç seçicisinin SIRASI mockup'tan gelir: "Tüm Durumlar" · Yolda ·
 * Onaylandı · Teslim Edildi. Alfabetik/enum sırası KULLANILMAZ.
 */
export const PURCHASE_ORDER_STATUS_OPTIONS: readonly PurchaseOrderStatus[] = [
  "in_transit",
  "approved",
  "delivered",
];

/** URL'den okunan serbest metni güvenli bir `PurchaseOrderStatus`a daraltır. */
export function parsePurchaseOrderStatus(raw: string | null): PurchaseOrderStatus | undefined {
  if (raw === null) return undefined;
  return raw in PURCHASE_ORDER_STATUS_LABELS ? (raw as PurchaseOrderStatus) : undefined;
}

/** Öncelik etiketi — SAT 113'ün "Acil" satır altı notunun kaynağı. */
export const PURCHASE_PRIORITY_LABELS: Record<PurchasePriority, string> = {
  normal: "Normal",
  urgent: "Acil", // 113
  critical: "Kritik",
};

/**
 * Ödeme vadesi (TED 50 "30 gün" · 71/112 "15 gün" · 91 "Peşin").
 * `PaymentTerms` KAPALI kümedir; dördünün dördü de eşlenir.
 */
export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  cash: "Peşin", // 91
  days_15: "15 gün", // 71, 112
  days_30: "30 gün", // 50
  days_60: "60 gün", // mockup'ta çizilmedi ama küme üyesi
};

export const PAYMENT_TERMS_OPTIONS: readonly PaymentTerms[] = [
  "cash",
  "days_15",
  "days_30",
  "days_60",
];

/**
 * `GET /purchase-requests` ve `GET /suppliers` uçlarının `limit` TAVANI
 * (openapi: varsayılan 50, tavan 200). Kırpılma korkuluğu (ARCHITECTURE §5 /
 * `list-truncation.ts`) tavanı AÇIKÇA gönderir; varsayılana bırakılırsa 51.
 * kayıt SESSİZCE düşerdi.
 */
export const PURCHASING_LIST_MAX_LIMIT = 200;

/** URL'den okunan serbest metni güvenli bir `PurchaseRequestStatus`a daraltır. */
export function parsePurchaseRequestStatus(
  raw: string | null,
): PurchaseRequestStatus | undefined {
  if (raw === null) return undefined;
  return raw in PURCHASE_REQUEST_STATUS_LABELS
    ? (raw as PurchaseRequestStatus)
    : undefined;
}

/**
 * SAT 62 · breadcrumb ve TED 33 · aynı üst grup adı — iki ekranda da AYNI
 * metin; iki yere elle yazılmaz.
 */
export const PURCHASING_EYEBROW = "Stok & Satınalma";

/**
 * "Proje" sütunu (SAT 103/114) — satır yalnız `project_id` taşır, proje ADI
 * ayrı bir uçtan (`GET /projects`) çözülür. Kullanıcının GÖREMEDİĞİ bir
 * projeye ait talep listede görünüyorsa ad çözülemez; uydurma bir ad
 * basmaktansa "—" + bu gerekçe basılır (`section_name` emsali, ama bu bir
 * MODÜL eksikliği değil çözümleme boşluğudur — `pending-modules` anahtarı
 * AÇILMAZ).
 */
export const PROJECT_NAME_UNRESOLVED_REASON =
  "Proje adı çözümlenemedi — proje listesi yüklenmedi ya da proje görünür değil";

/**
 * SAT kökü — sekme şeridinin ilk sekmesi (SAT 90) ve TEK 34'ün
 * "← Satınalma & Teklif" dönüş bağlantısı AYNI rotadır; iki yere elle yazılmaz.
 */
export const PURCHASING_ROOT_HREF = routes.purchasing.root();

/**
 * T3'ün açacağı talep formu (spec K1) — SAT 65 "+ Satın Alma Talebi".
 * Hedef rota TEK yerden kurulur; T3 rotayı açınca burası değişmez.
 */
export const NEW_PURCHASE_REQUEST_HREF = routes.purchasing.newRequest();

/** T4'ün açacağı teklif karşılaştırma ekranı (spec K1) — satır hedefi. */
export function purchaseRequestQuotesHref(requestId: string): string {
  return routes.purchasing.requestQuotes({ requestId });
}
