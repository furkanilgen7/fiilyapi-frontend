import { isZeroDecimalString, subtractDecimalStrings, sumDecimalStrings } from "@/lib/decimal";
import type {
  BoqItemAllocation,
  BoqItemAllocationInput,
} from "@/lib/api/hooks/useBoqAllocations";

/**
 * 🔴🔴 TAM KÜME DEĞİŞTİRME MATEMATİĞİ — bu dosyanın tek işi, bölüm formunun
 * GÖRMEDİĞİ payları SİLMEMESİDİR.
 *
 * `PUT /boq/items/{id}/allocations` kümenin tamamını değiştirir. Bölüm formu
 * yalnız kendi payını düzenler; gövdeye yalnız onu koymak, pozun öbür
 * bölümlerdeki paylarını sessizce sıfırlardı ve HİÇBİR KAPI bunu görmezdi —
 * istek 200 döner, ekran doğru görünür, veri kaybolur.
 *
 * Bu yüzden mantık bileşenin İÇİNDE satır içi yazılmaz: burada, saf ve
 * doğrudan test edilebilir hâlde durur.
 */

/** Miktar alanları ondalık STRING'dir; `Number` aritmetiği YASAK (IEEE-754). */
export interface AllocationMergeInput {
  /** Pozun BÜTÜN bölüm payları — `GET .../allocations` yanıtından, taze. */
  readonly current: readonly BoqItemAllocation[];
  /** Bu formun düzenlediği bölüm. */
  readonly sectionId: string;
  /**
   * Bu bölümün YENİ payı. `null` ya da sıfır ⇒ satır gövdeden DÜŞÜRÜLÜR.
   * 🔴 Sıfır YAZILMAZ: `quantity` sözleşmede STRICT pozitiftir (`gt=0`), sıfır
   * bir satır olarak tutulmaz ve göndermek 422 verirdi. "Bu bölümden çıkar"
   * demenin tek yolu satırı gövdeden çıkarmaktır.
   */
  readonly nextQuantity: string | null;
}

/**
 * Öbür bölümlerin payları KORUNARAK yeni tam küme üretilir.
 *
 * Dönüş `readonly`dır ve girdiler MUTASYONA UĞRAMAZ (yeni dizi kurulur).
 */
export function mergeSectionAllocation({
  current,
  sectionId,
  nextQuantity,
}: AllocationMergeInput): readonly BoqItemAllocationInput[] {
  const others = current
    .filter((allocation) => allocation.section_id !== sectionId)
    .map((allocation) => ({
      section_id: allocation.section_id,
      quantity: allocation.quantity,
    }));

  if (nextQuantity === null || isZeroDecimalString(nextQuantity)) return others;
  return [...others, { section_id: sectionId, quantity: nextQuantity }];
}

/** Kümedeki payların toplamı — aşım kontrolünün sol tarafı. */
export function allocationsTotal(
  allocations: readonly BoqItemAllocationInput[],
): string {
  return sumDecimalStrings(allocations.map((a) => String(a.quantity)));
}

export interface OvershootCheck {
  /** Toplam kotayı aşıyor mu? */
  readonly isOvershoot: boolean;
  /** Bu bölümün en fazla yazabileceği miktar (kendi mevcut payı DAHİL). */
  readonly maxForSection: string;
  /** Aşım miktarı — aşım yoksa `"0"`. */
  readonly excess: string;
}

/**
 * Aşım kontrolü (mockup `Form - Poz Secici` üçüncü satırı: *"Kalan kotayı 8 Ton
 * aşıyor"*).
 *
 * 🔑 `maxForSection` KENDİ PAYINI İÇERİR: 700 kotalı, 500'ü BU bölümde olan bir
 * pozda "kalan" 200'dür ama bu bölüm 700'e kadar yazabilir. Ham
 * `unallocated_quantity` gösterilseydi kullanıcı kendi payını büyütemez,
 * ekran sebepsiz kırmızı verirdi.
 *
 * ⚠️ İSTEMCİ KONTROLÜ SUNUCUNUN YERİNE GEÇMEZ: backend aynı kuralı 409 ile
 * zorlar (`"Bölümlere dağıtılan miktar poz miktarını aşamaz"`). Buradaki
 * kontrol yalnız kullanıcıya ERKEN ve GÖRÜNÜR geri bildirim içindir; iki
 * kullanıcı aynı anda yazarsa kapıyı yine sunucu kapatır.
 */
export function checkOvershoot({
  siteQuota,
  allocatedTotal,
  sectionCurrentQuantity,
  nextQuantity,
}: {
  readonly siteQuota: string;
  /** Pozun BÜTÜN bölümlere dağıtılmış toplamı (`allocated_quantity`). */
  readonly allocatedTotal: string;
  /** Bu bölümün SUNUCUDAKİ mevcut payı. */
  readonly sectionCurrentQuantity: string;
  readonly nextQuantity: string | null;
}): OvershootCheck {
  const otherSectionsTotal = subtractDecimalStrings(allocatedTotal, sectionCurrentQuantity);
  const maxForSection = subtractDecimalStrings(siteQuota, otherSectionsTotal);
  if (nextQuantity === null) {
    return { isOvershoot: false, maxForSection, excess: "0" };
  }
  const excess = subtractDecimalStrings(nextQuantity, maxForSection);
  const isOvershoot = !excess.startsWith("-") && !isZeroDecimalString(excess);
  return { isOvershoot, maxForSection, excess: isOvershoot ? excess : "0" };
}
