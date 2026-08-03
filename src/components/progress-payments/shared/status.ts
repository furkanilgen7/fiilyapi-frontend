import type { BadgeVariant } from "@/components/ui/badge/Badge";

/**
 * F-P7 (İşveren) ve F-TH (Taşeron) hakediş durum makinesi ORTAK dört değeri.
 * Backend'de iki AYRI enum vardır (`ProgressPaymentStatus` /
 * `SubcontractorPaymentStatus`) — şemalar ileride ayrışabilir diye bilinçli
 * olarak birbirine kilitlenmedi (bkz. openapi açıklaması), ama BUGÜN dört
 * değer de metin/renk anlamıyla birebir aynı olduğundan rozet eşlemesi ve
 * aksiyon kümesi mantığı burada TEK yerde yaşar (F-TH T1 §4 paylaşım kararı).
 * Çağıran taraf kendi backend enum tipini burada geçirir (`ProgressPaymentStatus`
 * ya da `SubcontractorPaymentStatus`, ikisi de bu literal kümeyle uyumludur).
 */
export type PaymentLifecycleStatus = "draft" | "pending_approval" | "approved" | "paid";

/**
 * Durum → rozet metni + renk. Metinler BİREBİR şu tabloya göre:
 * draft→Taslak, pending_approval→Onay Bekliyor, approved→Onaylandı, paid→Ödendi.
 *
 * RENK TARİHÇESİ (F-TH T2 fix round 1, 2026-08-03 — kullanıcı kararı,
 * BAĞLAYICI, sapma diye geri alınmaz): `approved`=YEŞİL (`success`),
 * `paid`=MAVİ (`primary`). Önceki sürüm (P7 T2) bunun TERSİNİ varsayıyordu
 * (`approved`=primary, `paid`=success) — İşveren mockup'ının o zamanki
 * kanıtı yalnız iki durumu (Onay Bekliyor=amber, Ödendi=yeşil) gösterdiğinden
 * `approved`/`draft` rengi kaynaksız bir tercihti (bkz. eski yorum, git
 * geçmişinde). F-TH T2'nin Taşeron mockup'ı (`Ekran 2 - Taşeron
 * Hakedişi.dc.html` satır 157/167) `approved`=yeşil/`paid`=mavi kanıtladı —
 * iki mockup seti TUTARSIZDI. Kullanıcı bunu tek eşlemede TEKLEŞTİRDİ: bu
 * dosya artık İşveren VE Taşeron için TEK renk kaynağıdır — ekrana özel bir
 * renk override'ı YAZILMAZ (F-TH T2 fix round 1 önceki denemesi buydu, geri
 * alındı). `pending_approval`=amber ve "Revize Gerekli"=kırmızı (rozet ayrı
 * bir bileşimde, bu tablonun dışında) DEĞİŞMEDİ.
 */
export const PAYMENT_STATUS_BADGE: Record<
  PaymentLifecycleStatus,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: "Taslak", variant: "neutral" },
  pending_approval: { label: "Onay Bekliyor", variant: "warning" },
  approved: { label: "Onaylandı", variant: "success" },
  paid: { label: "Ödendi", variant: "primary" },
};
