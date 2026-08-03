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
 * Durum → rozet metni + renk (P7 T2 brief). Metinler BİREBİR şu tabloya göre:
 * draft→Taslak, pending_approval→Onay Bekliyor, approved→Onaylandı, paid→Ödendi.
 *
 * Renkler: mockup'ın İŞVEREN HAKEDİŞLERİ yarısı yalnız iki durumu gösteriyor
 * (`Şantiye - Hakedişler.dc.html` 99: Onay Bekliyor = amber `#fef3c7/#d97706`;
 * 103/107/111: Ödendi = yeşil `#dcfce7/#16a34a`) — bunlar `badge--warning` ve
 * `badge--success` ile birebir eşleşiyor. `draft` ve `approved` o yarıda hiç
 * görünmüyor (taşeron yarısındaki "Onaylandı" yeşili bu ekranın kapsamı DIŞI —
 * brief §BASILMAYACAKLAR). Karar: `draft`→nötr (henüz akışa girmemiş),
 * `approved`→`primary` (mavi, `paid`in yeşilinden ayrışsın — onay ile ödeme
 * ayrı, birbirine karıştırılmamalı). Kaynak yoklukta yapılan bir tercih —
 * rapora not düşüldü. F-TH T1: taşeron tarafı da AYNI eşlemeyi kullanır.
 */
export const PAYMENT_STATUS_BADGE: Record<
  PaymentLifecycleStatus,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: "Taslak", variant: "neutral" },
  pending_approval: { label: "Onay Bekliyor", variant: "warning" },
  approved: { label: "Onaylandı", variant: "primary" },
  paid: { label: "Ödendi", variant: "success" },
};
