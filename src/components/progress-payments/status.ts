import type { BadgeVariant } from "@/components/ui/badge/Badge";
import type { ProgressPaymentStatus } from "@/lib/api/hooks/useProgressPayments";

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
 * rapora not düşüldü.
 */
export const PROGRESS_PAYMENT_STATUS_BADGE: Record<
  ProgressPaymentStatus,
  { label: string; variant: BadgeVariant }
> = {
  draft: { label: "Taslak", variant: "neutral" },
  pending_approval: { label: "Onay Bekliyor", variant: "warning" },
  approved: { label: "Onaylandı", variant: "primary" },
  paid: { label: "Ödendi", variant: "success" },
};
