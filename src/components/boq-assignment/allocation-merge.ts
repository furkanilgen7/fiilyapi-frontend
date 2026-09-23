import { isZeroDecimalString, subtractDecimalStrings, sumDecimalStrings } from "@/lib/decimal";
import { maskeli, maskesiz } from "@/lib/masked";
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
      // 🔴 BURASI YAZMA YOLUDUR ve `maskesiz()` BİLEREK DURUR. 2026-09-19
      //    denetiminde `maskesiz()` çağrıları GÖSTERİM yollarından söküldü;
      //    bu SÖKÜLMEZ. Maskeli bir pay gövdeye `?? "0"` ile girseydi ya da
      //    atlansaydı `PUT` TAM KÜME DEĞİŞTİRMESİ öbür bölümün payını SESSİZCE
      //    yok ederdi — istek 200 döner, ekran doğru görünür, veri kaybolur.
      quantity: maskesiz(allocation.quantity, "quantity"),
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
  /** Toplam kotayı aşıyor mu? `isUnknown` iken DAİMA `false`dır — aşağıya bkz. */
  readonly isOvershoot: boolean;
  /**
   * 🔴 METRAJ GİZLİ: aşım hesaplanamaz.
   *
   * "Aşım yok" (`isOvershoot: false`) ile "BİLİNMİYOR" AYRI hâllerdir ve ayrı
   * alanlarda durur. Tek bayrakla yazılsaydı iki seçenek kalırdı ve ikisi de
   * yanlıştı: `false` dönmek seçicinin "Ata" kapısını maskeli satırda AÇIK
   * bırakır (kullanıcı GÖREMEDİĞİ kotanın üstüne yazar); `true` dönmek ise
   * uydurma bir `excess` ile ekranda sebepsiz KIRMIZI basardı.
   */
  readonly isUnknown: boolean;
  /**
   * Bu bölümün en fazla yazabileceği miktar (kendi mevcut payı DAHİL).
   * `null` = bilinmiyor; çağıran `formatQuantity` ile "—" basar.
   */
  readonly maxForSection: string | null;
  /** Aşım miktarı — aşım yoksa `"0"`, bilinmiyorsa `null`. */
  readonly excess: string | null;
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
  /** Pozun GERÇEK şantiye kotası — `siteQuotaOf()`. `null` = metraj gizli. */
  readonly siteQuota: string | null;
  /** Pozun BÜTÜN bölümlere dağıtılmış toplamı (`allocated_quantity`). */
  readonly allocatedTotal: string | null;
  /** Bu bölümün SUNUCUDAKİ mevcut payı. */
  readonly sectionCurrentQuantity: string | null;
  readonly nextQuantity: string | null;
}): OvershootCheck {
  // 🔴 BU FONKSİYON GÖSTERİM YOLUNDADIR: satır ve seçici JSX'i her karede
  //    çağırır. Bu yüzden maskeli girdide `maskesiz()` ile ATMAZ — atsaydı
  //    `boq` kapsamı `finance` olan rolün ekranı çökerdi (`lib/masked.ts`
  //    docstring'indeki hikâye). Maske `subtractDecimalStrings` üzerinden
  //    KENDİLİĞİNDEN yayılır: bilinmeyen bir bileşen içeren sonuç BİLİNMEZDİR.
  const otherSectionsTotal = subtractDecimalStrings(allocatedTotal, sectionCurrentQuantity);
  const maxForSection = subtractDecimalStrings(siteQuota, otherSectionsTotal);
  if (maskeli(maxForSection)) {
    return { isOvershoot: false, isUnknown: true, maxForSection: null, excess: null };
  }
  if (nextQuantity === null) {
    return { isOvershoot: false, isUnknown: false, maxForSection, excess: "0" };
  }
  const excess = subtractDecimalStrings(nextQuantity, maxForSection);
  const isOvershoot = !excess.startsWith("-") && !isZeroDecimalString(excess);
  return { isOvershoot, isUnknown: false, maxForSection, excess: isOvershoot ? excess : "0" };
}
