/**
 * 🔴 KAPSAM MASKESİ SINIRI (kullanıcı kararı 2026-09-19).
 *
 * Backend `core/field_scope` para ve metraj alanlarını kapsam kısıtlı rollerde
 * `null` döndürür. YAZMA ve HESAPLAMA yüzeyleri bu değeri GÖRMEMELİDİR: o
 * ekranlar `full` yetki ister ve `full` izin matrisinde yalnız `Scope.all` ile
 * gelir. Tipler yine de `string | null`dır çünkü OKUMA şeması paylaşılır.
 *
 * Maskeli değer bir hesaba ya da gövdeye girerse **PATLARIZ**. Sessiz
 * alternatiflerin ikisi de veri bozar:
 *   * `?? "0"`  → kullanıcının GÖREMEDİĞİ bir değeri SIFIR sayarak yazar,
 *   * satırı at → kaydı sessizce SİLER.
 *
 * Şüphede DURMAK doğrudur: yanlış yazılan bir gövde geri alınamaz.
 *
 * ⚠️ GÖSTERİM yüzeyleri bunu KULLANMAZ — orada maskeli değer normaldir ve
 * biçimlendiriciler "—" basar (`lib/format.ts`).
 */
export function maskesiz(value: string | null, alan: string): string {
  if (value === null) {
    throw new Error(
      `Maskelenmiş alan bir yazma/hesaplama yoluna girdi (${alan}). Bu yüzey ` +
        "`full` yetki ister ve maskeli veri görmemelidir; işlem durduruldu.",
    );
  }
  return value;
}
