import { pendingModuleLabel } from "@/lib/pending-modules";

/**
 * TL 62 · "PUAN" kolonunun gerekçesi — ONAYLI KARAR S4 (yeniden tartışılmaz).
 * `SubcontractorResponse` şemasında (ve tüm taşeron uçlarında) bir
 * değerlendirme/puan alanı HİÇ YOKTUR. Kolon SİLİNMEZ, yıldız İCAT EDİLMEZ:
 * hücreler "—" + bu gerekçeyle basılır.
 */
export const RATING_PENDING_REASON = pendingModuleLabel("subcontractor_rating");

/**
 * Hakediş listesi sunucu tavanında (`limit` ≤ 200) kırpıldığında para
 * kolonlarının/KPI'larının gerekçesi. Yanlış toplam basmaktansa "—" (F-TH
 * korkuluğu, `src/lib/list-truncation.ts`).
 */
export const PAYMENT_PENDING_REASON =
  "Hakediş listesi eksik olduğu için tutar hesaplanmadı";

/**
 * M5_1 kayıt #339: hakediş ucu 403 (yetki eksikliği) verdiğinde ayrı, DOĞRU
 * bir gerekçe — `PAYMENT_PENDING_REASON` "liste eksik" der, ama sebep burada
 * "liste eksik" DEĞİL "bu kullanıcının yetkisi yok"tur; ikisi karıştırılmaz.
 */
export const PAYMENT_FORBIDDEN_REASON =
  "Hakediş listesini görüntüleme yetkiniz yok — tutar hesaplanmadı";

/** 63 · firmanın hiç sözleşmesi yoksa "Detay →" hedefi de yoktur. */
export const NO_CONTRACT_REASON = "Bu firmanın sözleşmesi henüz yok";
