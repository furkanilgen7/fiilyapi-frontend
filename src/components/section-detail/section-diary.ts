import type { SiteDiaryEntryListItem } from "@/lib/api/hooks/useSiteDiary";

/**
 * F-BLMSEK T1 · Bölüm Detay › "Günlük Kayıt" sekmesinin SAF süzgeci.
 *
 * 🔴 SÜZGEÇ NEDEN İSTEMCİDE: `GET /sites/{site_id}/diary` `section_id` sorgu
 * parametresi KABUL ETMEZ — geçirilen değeri SESSİZCE YOK SAYAR (canlıya
 * uydurma bir UUID ile ölçüldü: 23 satırın hepsi yine döndü). Sunucuya
 * güvenmek "süzülmüş" sanılan tam listeyi basardı. Emsal aynı ekrandadır:
 * F-BLMPUAN'ın `cellInSection` süzgeci de yalnız GÖRÜNÜME uygulanır.
 * Ayrıca ağa süzgeçsiz çıkmak React Query önbelleğini şantiye günlüğü
 * ekranıyla PAYLAŞTIRIR (aynı `queryKey`), ikinci istek doğmaz.
 *
 * 🔴 `section_id === null` KAYITLARI BU SEKMEDE GÖSTERİLMEZ. Şantiye geneline
 * yazılmış bir günlük, bu bölümün günlüğü DEĞİLDİR; listeye katmak kullanıcıya
 * "bu bölümde şu iş yapıldı" YALANINI söylerdi. Sessizce de düşürülmez —
 * `unassignedCount` çağırana verilir, panel görünür bir not basar.
 *
 * 🔴 BU KURAL TAŞERON HAKEDİŞİNİNKİNDEN BİLEREK FARKLIDIR
 * (`src/components/progress-payments/shared/subcontractor-row-subtitle.ts`,
 * orada `null` = "Tüm Bölümler" yazılır). İki `null` AYNI ŞEY DEĞİLDİR:
 *   - günlük kaydın `null`'ı = kaydı giren kişi BÖLÜM SEÇMEDİ (atanmamış),
 *   - hakedişin `null`'ı = sözleşme kapsamı TÜM BÖLÜMLERİ kapsar (kasıtlı).
 * Birincisi kapsam iddiası taşımaz, ikincisi taşır — bu yüzden biri süzülür,
 * diğeri her bölümde gösterilir.
 */
export interface SectionDiaryPartition {
  /** `section_id === sectionId` — sekmede BASILAN küme. */
  readonly entries: SiteDiaryEntryListItem[];
  /** `section_id === null` — bölüme atanmamış; basılmaz ama SAYILIR. */
  readonly unassignedCount: number;
  /** `section_id` dolu ama BAŞKA bir bölüm; basılmaz ama SAYILIR. */
  readonly otherSectionCount: number;
}

export function partitionSectionDiaryEntries(
  items: readonly SiteDiaryEntryListItem[],
  sectionId: string,
): SectionDiaryPartition {
  const entries: SiteDiaryEntryListItem[] = [];
  let unassignedCount = 0;
  let otherSectionCount = 0;

  for (const item of items) {
    if (item.section_id === sectionId) {
      entries.push(item);
    } else if (item.section_id === null) {
      unassignedCount += 1;
    } else {
      otherSectionCount += 1;
    }
  }

  return { entries, unassignedCount, otherSectionCount };
}
