import { sumDecimalStrings } from "@/lib/decimal";

/**
 * 🔴 BOQ-SEC K2 — İKİ ANLAM TUZAĞI.
 *
 * `GET /sites/{id}/boq?section_id=` süzgeçli çağrıldığında yanıttaki üç miktar
 * alanı İKİ FARKLI TABANDAN gelir (backend `boq/schemas.py:62-71` bunu açıkça
 * yazmıştır):
 *
 * | alan                   | taban                                            |
 * |------------------------|--------------------------------------------------|
 * | `quantity`             | 🔴 O BÖLÜME tahsis edilen miktar (MASKELENİR)     |
 * | `allocated_quantity`   | pozun GERÇEK şantiye kotasından: dağıtılan toplam |
 * | `unallocated_quantity` | pozun GERÇEK şantiye kotasından: dağıtılmamış     |
 *
 * ⇒ Süzülmüş yanıtta `unallocated_quantity` ile `quantity - allocated_quantity`
 * BİRBİRİNE EŞİT DEĞİLDİR ve bu bir kusur değil, tanımdır.
 *
 * Mockup'ın "Şantiye Kotası" sütunu (`Form - Bolum Ekle.dc.html:145`) pozun
 * GERÇEK kotasını gösterir → `allocated + unallocated`. `quantity`den okunursa
 * ekran SESSİZCE yanlış sayı basar ve kimse fark etmez.
 *
 * Toplama `sumDecimalStrings` iledir: `Number()` toplaması miktar sınıfı bir
 * alanda IEEE-754 kalıntısı üretir (`0.1 + 0.2 = 0.30000000000000004`).
 *
 * 🔴 Bu kural bileşen İÇİNDE satır içi yazılmaz — tek kaynak burasıdır.
 */
export function siteQuotaOf(item: {
  readonly allocated_quantity: string | null;
  readonly unallocated_quantity: string | null;
}): string | null {
  // 🔴 KAPSAM MASKESİ (kullanıcı kararı 2026-09-19): `finance` kapsamındaki rol
  //    metrajı GÖREMEZ ve alanlar `null` gelir. `sumDecimalStrings` bunları
  //    yok sayıp "0" dönseydi ekran pozun şantiye kotasını SIFIR diye basar ve
  //    kullanıcı o sahte sayıya dayanarak tahsis yapardı — gizlemekten kötüdür.
  //    Bilinmeyen kota `null`dır; çağıran "—" basar.
  if (item.allocated_quantity === null || item.unallocated_quantity === null) return null;
  return sumDecimalStrings([item.allocated_quantity, item.unallocated_quantity]);
}
