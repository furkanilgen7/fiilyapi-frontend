import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";

/**
 * F-BLMSEK T2 · Bölüm Detay › "Hakediş" sekmesinin SAF süzgeci.
 *
 * 🔴 SÜZGEÇ NEDEN İSTEMCİDE: `GET /subcontractor-progress-payments` `section_id`
 * sorgu parametresi KABUL ETMEZ (ölçüldü — uç yalnız `project_id` · `site_id` ·
 * `period_*` · `status` · `q` · `limit` · `offset` alır). Ayrıca süzgeçsiz
 * çıkmak `useSiteSubcontractorPayments`ın önbelleğini şantiye "Hakedişler"
 * ekranıyla PAYLAŞTIRIR — ikinci bir ağ isteği doğmaz.
 *
 * 🔴 `sectionId === null` KAYITLARI BU SEKMEDE **GÖSTERİLİR** — "Tüm Bölümler"
 * olarak. Bu, kardeş dosya `section-diary.ts`in kuralının TERSİDİR ve fark
 * BİLEREKTİR. İki `null` AYNI ŞEY DEĞİLDİR:
 *   - günlük kaydın `null`'ı = kaydı giren kişi BÖLÜM SEÇMEDİ (atanmamış) →
 *     hiçbir kapsam iddiası taşımaz, bu bölümün günlüğü olduğu SÖYLENEMEZ,
 *   - hakedişin `null`'ı = sözleşme kapsamı TÜM BÖLÜMLERİ kapsar (kasıtlı) →
 *     bu bölümü DE kapsar; düşürmek bilgi KAYBI olurdu.
 * Kanon zaten yazılıdır ve yeniden İCAT EDİLMEZ:
 * `progress-payments/shared/subcontractor-row-subtitle.ts` (41-59) `null` için
 * "Tüm Bölümler" GERÇEK metnini basar, pending saymaz.
 *
 * 🔴 BAŞKA bölümün kaydı düşürülür ama SESSİZCE DEĞİL (F-TH kanonu: "sessiz
 * atlama = ihlal") — `otherSectionCount` çağırana verilir, panel görünür bir
 * not basar.
 */
export interface SectionPaymentEntry {
  readonly item: SiteSubcontractorPaymentItem;
  /**
   * `true` → `sectionId` BU bölüm (satırda bölümün GERÇEK adı basılabilir).
   * `false` → `sectionId === null`, yani "Tüm Bölümler" (bölüm adı BASILMAZ:
   * kapsamı daraltan bir yalan olurdu).
   */
  readonly isSectionScoped: boolean;
}

export interface SectionPaymentsPartition {
  /** Sekmede BASILAN küme: bu bölümün kayıtları + `null` ("Tüm Bölümler"). */
  readonly entries: readonly SectionPaymentEntry[];
  /** `sectionId === sectionId` sayısı. */
  readonly sectionCount: number;
  /** `sectionId === null` sayısı — basılır, "Tüm Bölümler". */
  readonly allSectionsCount: number;
  /** `sectionId` dolu ama BAŞKA bölüm; basılmaz ama SAYILIR. */
  readonly otherSectionCount: number;
}

export function partitionSectionPayments(
  items: readonly SiteSubcontractorPaymentItem[],
  sectionId: string,
): SectionPaymentsPartition {
  const entries: SectionPaymentEntry[] = [];
  let sectionCount = 0;
  let allSectionsCount = 0;
  let otherSectionCount = 0;

  for (const item of items) {
    if (item.sectionId === sectionId) {
      entries.push({ item, isSectionScoped: true });
      sectionCount += 1;
    } else if (item.sectionId === null) {
      entries.push({ item, isSectionScoped: false });
      allSectionsCount += 1;
    } else {
      otherSectionCount += 1;
    }
  }

  return { entries, sectionCount, allSectionsCount, otherSectionCount };
}
