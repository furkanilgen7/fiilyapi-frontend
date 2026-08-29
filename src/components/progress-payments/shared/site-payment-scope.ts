import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";

/**
 * HAK-NULL · şantiye taşeron hakedişi listesinin KAPSAM süzgeci (saf fonksiyon).
 *
 * ## Neden var
 *
 * `GET /subcontractor-progress-payments?site_id=…` artık EŞİTLİK değil KAPSAMA
 * sorar: sözleşmesi bu şantiyeye bağlı hakedişlerin YANINDA, sözleşmesi PROJE
 * GENELİ (`contract_site_id === null`) olanlar da döner. Canlıda ölçüldü ki
 * yedi taşeron sözleşmesinin YEDİSİ DE proje geneliydi — eski eşitlik süzgeci
 * yüzünden bu paranın TAMAMI hiçbir şantiyede, hiçbir bölümde görünmüyordu.
 *
 * ## 🔴 GÖRÜNÜR OLMAK ≠ ŞANTİYENİN PARASI OLMAK — bu ayrımın SEBEBİ
 *
 * Proje geneli bir sözleşmenin hakedişi projenin BÜTÜN şantiyelerini kapsar,
 * dolayısıyla `?site_id=` ile çağrılan HER şantiyede TEKRAR döner. Onu
 * şantiyenin kendi parası gibi toplamaya kalkmak, aynı parayı N şantiyede N KEZ
 * saymak olurdu: "Toplam Taşeron Ödemesi" şişer, ondan türeyen BRÜT KÂR MARJI
 * ((işveren − taşeron)/işveren) düşer, ve üç şantiyeli bir projede toplamların
 * hiçbiri projeyle tutmaz. Yani süzgeci ham hâlde gevşetmek görünürlüğü AÇAR
 * ama TOPLAMLARI YALANCI YAPAR.
 *
 * Bu yüzden burada iki küme AYRIŞTIRILIR ve karar tek cümledir:
 *   **para toplamları YALNIZ `siteScoped` kümesinden alınır; `projectWide`
 *   GÖRÜNÜR ama TOPLANMAZ.**
 *
 * ## Emsal — bu desen İCAT EDİLMEDİ
 *
 * Bölüm düzeyinde aynı ayrım zaten çözülmüştü:
 * `section-detail/section-payments.ts` `partitionSectionPayments`, `sectionId
 * === null` satırlarını DÜŞÜRMEZ, `allSectionsCount` ile ayrı bir küme olarak
 * taşır. Buradaki tek fark eksen: orada BÖLÜM, burada ŞANTİYE.
 *
 * ## İki `null` AYNI ŞEY DEĞİLDİR
 *
 * `sectionId === null` → hakediş bölüme kırılmamış.
 * `contractSiteId === null` → SÖZLEŞME şantiyeye kırılmamış (proje geneli).
 * Bir satır ikisini birden taşıyabilir; eksenler bağımsızdır.
 *
 * 🔴 SESSİZ ATLAMA = İHLAL (F-TH kanonu): `projectWide` çağırana VERİLİR ve
 * ekran onu görünür biçimde basar. "Toplama girmiyor" kararı kullanıcıdan
 * SAKLANMAZ, SÖYLENİR.
 */
export interface SitePaymentScopePartition {
  /** Sözleşmesi BU şantiyeye bağlı satırlar — para toplamlarının TEK kaynağı. */
  readonly siteScoped: readonly SiteSubcontractorPaymentItem[];
  /**
   * Sözleşmesi PROJE GENELİ (`contractSiteId === null`) satırlar. Basılır,
   * TOPLANMAZ — her şantiyede tekrar döndükleri için (bkz. dosya başlığı).
   */
  readonly projectWide: readonly SiteSubcontractorPaymentItem[];
}

export function partitionSitePayments(
  items: readonly SiteSubcontractorPaymentItem[],
): SitePaymentScopePartition {
  const siteScoped: SiteSubcontractorPaymentItem[] = [];
  const projectWide: SiteSubcontractorPaymentItem[] = [];
  for (const item of items) {
    if (item.contractSiteId === null) {
      projectWide.push(item);
    } else {
      siteScoped.push(item);
    }
  }
  return { siteScoped, projectWide };
}

/**
 * Proje geneli satırların GÖRÜNÜR notu. Sayı sıfırsa `null` — boş bir not
 * basmak gürültüdür.
 *
 * Metin "toplama girmiyor" GERÇEĞİNİ söyler: kullanıcı listede gördüğü bir
 * tutarın KPI'da neden olmadığını başka türlü anlayamazdı.
 */
export function projectWideNote(count: number): string | null {
  if (count <= 0) return null;
  return `${count} proje geneli hakediş — projenin tüm şantiyelerini kapsar, bu şantiyenin toplamına eklenmez`;
}
