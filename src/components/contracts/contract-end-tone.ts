import { remainingDays } from "@/components/section-detail/remainingDays";

/**
 * E14 · "Bitiş Tarihi" metriğinin RENGİ (F-SZLEKR T1).
 *
 * ── NEDEN BİR TÜREV, NEDEN SABİT KIRMIZI DEĞİL ────────────────────────────
 * Mockup (`Ekran 14 - Sözleşme Detay.dc.html` **satır 84**) bu metriği
 * `color:#ef4444` ile, yani KIRMIZI basar — ama bastığı tarih `31.12.2026`,
 * yani mockup'ın çizildiği ana göre GELECEKTEDİR. Demek ki oradaki kırmızı
 * bir DURUM değil, bir BOYADIR: hiçbir şey ayırt etmez. Nitekim ürünün kendi
 * içinde de çelişir — `SubcontractorContractHeaderCard` aynı "Bitiş Tarihi"
 * metriğini NÖTR basar.
 *
 * Bu yüzden mockup-birebir kuralından ONAYLI SAPMA yapılır (yönetim kararı,
 * 2026-08-27): renk artık ANLAM taşır.
 *
 *   · `end_date` GEÇMİŞTE            → danger  (sözleşme süresi doldu)
 *   · bugüne 0..30 gün kaldı (dâhil) → warning (yaklaşıyor)
 *   · ötesi                          → nötr
 *   · `end_date` null                → nötr ("—" basılır; eksik veri bir
 *                                      uyarı değildir)
 *
 * ── EŞİK NEDEN 30, NEDEN `DELIVERY_SOON_DAYS` (7) DEĞİL ───────────────────
 * `purchase-order-delivery.ts`teki 7 günlük eşik SATINALMA TESLİMAT
 * mockup'ından türetilmiştir (kehribar satırların en uzağı 5 gündür). O eşik
 * BAŞKA bir büyüklüğü ölçer: bir sevkiyatın gecikme ufku günler mertebesinde,
 * bir inşaat sözleşmesinin bitiş ufku AYLAR mertebesindedir. İkisini tek
 * sabitte birleştirmek "yaklaşıyor"u sözleşme için anlamsız kılardı (30 günlük
 * bir sözleşme bitişi hâlâ nötr basılırdı). Bu yüzden AYRI ve adlandırılmış
 * bir eşik tanımlanır.
 *
 * ── `today` NEDEN ZORUNLU PARAMETRE ───────────────────────────────────────
 * Gizli `new Date()` YOKTUR (`purchase-order-delivery.ts` / `remainingDays.ts`
 * kanonu). İki gerekçe:
 *   1. birim testler sabit bir "bugün" ile deterministiktir,
 *   2. GÖRSEL KARELER de öyle: ekran saati kendisi okusaydı aynı baseline
 *      turdan tura başka renk basar ve kare KENDİLİĞİNDEN kırılırdı
 *      (`e2e/employer-contract-detail-visual.spec.ts` bu yüzden
 *      `page.clock.setFixedTime` ile saati dondurur).
 *
 * Gün matematiği YENİDEN YAZILMAZ: `remainingDays` saat dilimi kaymasını
 * zaten çözmüştür (`new Date(\`${iso}T00:00:00\`)` + gün-düzeyinde fark).
 */
export type ContractEndTone = "danger" | "warning" | "neutral";

/** Kehribar dalın üst sınırı (gün) — sihirli sayı değil, adlandırılmış eşik. */
export const CONTRACT_END_SOON_DAYS = 30;

export function contractEndTone(endDate: string | null, today: Date): ContractEndTone {
  const daysLeft = remainingDays(endDate, today);
  if (daysLeft === null) return "neutral";
  if (daysLeft < 0) return "danger";
  if (daysLeft <= CONTRACT_END_SOON_DAYS) return "warning";
  return "neutral";
}
