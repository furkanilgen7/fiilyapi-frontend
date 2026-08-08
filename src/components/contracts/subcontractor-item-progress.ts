import type { SubcontractorContractItemResponse } from "@/lib/api/hooks/useSubcontractorContractMutations";
import type { SubcontractorProgressPaymentLineRead } from "@/lib/api/hooks/useSubcontractorProgressPayments";

/**
 * TSD 103, 117-120 · "Hakediş %" kolonunun TÜREVİ.
 *
 * Kural: poz başına kümülatif hakediş miktarı ÷ sözleşme miktarı. Hakediş
 * satırı sözleşme kalemine `contract_item_id` ile bağlıdır; bağı KOPUK
 * satırlar (sözleşmede olmayan poz — şemada `contract_item_id` nullable)
 * hiçbir poza yazılmaz.
 *
 * Hangi hakedişler sayılır: sözleşmenin GEÇMİŞİNDE görünen HEPSİ (mockup
 * 199-201'de listelenen üç kaydın hepsi "Hakediş Geçmişi"ndedir ve biri
 * "Onay Bekliyor"dur — mockup durum ayrımı yapmaz). Böylece ekranın iki
 * yüzeyi (geçmiş tablosu ve yüzde kolonu) AYNI kümeden türer.
 *
 * Sözleşme miktarı 0/geçersiz olan poz haritaya GİRMEZ — oran tanımsızdır,
 * `0` uydurulmaz; çağıran taraf o hücreyi gerekçeli "—" basar.
 */
export function buildItemProgressPct(
  items: readonly SubcontractorContractItemResponse[],
  lines: readonly SubcontractorProgressPaymentLineRead[],
): Map<string, number> {
  const billedByItemId = new Map<string, number>();
  for (const line of lines) {
    if (!line.contract_item_id) continue;
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity)) continue;
    billedByItemId.set(
      line.contract_item_id,
      (billedByItemId.get(line.contract_item_id) ?? 0) + quantity,
    );
  }

  const pctByItemId = new Map<string, number>();
  for (const item of items) {
    const contractQuantity = Number(item.quantity);
    if (!Number.isFinite(contractQuantity) || contractQuantity <= 0) continue;
    const billed = billedByItemId.get(item.id) ?? 0;
    pctByItemId.set(item.id, (billed / contractQuantity) * 100);
  }
  return pctByItemId;
}

/**
 * 118-143 · çubuk/yüzde TONU. TSD yalnız İKİ ton kullanır ve eşik 50'dir:
 * 48 → kehribar (142-143 `#f59e0b`), 55/60/75/80 → mavi (118, 130, 157, 169
 * `#2563eb`; yüzde metni 119/131/158/170 sönük `#94a3b8`).
 *
 * ⚠️ SZL'nin dört tonlu kuralı (`contract-progress.ts`) BURAYA UYMAZ ve
 * PAYLAŞILAMAZ: orada 80+ MOR olur, TSD'de 80 MAVİdir (157). İki mockup
 * farklı kural çiziyor — mockup kazanır, tek kaynak zorlaması icat olurdu.
 */
export const TSD_PROGRESS_LOW_THRESHOLD = 50;

export type TsdProgressTone = "normal" | "low";

export function tsdProgressTone(pct: number): TsdProgressTone {
  return pct < TSD_PROGRESS_LOW_THRESHOLD ? "low" : "normal";
}
