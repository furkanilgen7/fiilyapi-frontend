import type { ProgressPaymentStatus } from "@/lib/api/hooks/useProgressPayments";
import { PAYMENT_STATUS_BADGE } from "./shared/status";

// Durum → rozet metni/renk eşlemesi F-TH T1'de `shared/status.ts`e taşındı
// (Taşeron tarafı AYNI dört durumu/eşlemeyi kullanır — kopya kod yasak).
// Bu dosya yalnız İşveren tipine (`ProgressPaymentStatus`) göre takma ad
// verir; davranış/değerler DEĞİŞMEDİ.
export const PROGRESS_PAYMENT_STATUS_BADGE: Record<
  ProgressPaymentStatus,
  (typeof PAYMENT_STATUS_BADGE)[keyof typeof PAYMENT_STATUS_BADGE]
> = PAYMENT_STATUS_BADGE;
