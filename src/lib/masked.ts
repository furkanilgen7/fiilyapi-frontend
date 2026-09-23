/**
 * 🔴 KAPSAM MASKESİ SINIRI (kullanıcı kararı 2026-09-19).
 *
 * Backend `core/field_scope` para ve metraj alanlarını kapsam kısıtlı rollerde
 * `null` döndürür: `limited` rol PARAYI, `finance` rol METRAJI göremez.
 * Tipler yine de `string | null`dır çünkü OKUMA şeması paylaşılır.
 *
 * ## 🔴🔴 KURAL: `maskesiz()` YALNIZ YAZMA/HESAPLAMA YOLUNDADIR — GÖSTERİMDE ASLA
 *
 * Sınıflandırma sorusu TEK cümledir: **bu değer bir SUNUCU GÖVDESİNE mi giriyor,
 * yoksa bir EKRANA mı?**
 *
 *   · gövdeye / hesaba → `maskesiz()`. Şüphede DURMAK doğrudur; yanlış yazılan
 *     bir gövde geri alınamaz. Sessiz alternatiflerin ikisi de veri bozar:
 *       `?? "0"`  → kullanıcının GÖREMEDİĞİ bir değeri SIFIR sayarak yazar,
 *       satırı at → kaydı sessizce SİLER.
 *   · ekrana → `maskeli()` ile ayır; biçimlendiriciler zaten "—" basar
 *     (`lib/format.ts`), aritmetik zaten `null` yayar (`lib/decimal.ts`).
 *
 * ## Bu kuralın HİKÂYESİ (2026-09-19 denetimi, KRİTİK)
 *
 * `maskesiz()` yazıldığı gün GÖSTERİM yoluna da kondu:
 * `components/boq-assignment/rows.ts::sectionQuantityMap` `BoqAssignmentCard`ın
 * RENDER GÖVDESİNDEN çağrılıyordu (olay işleyicisinden değil). Frontend'de
 * hiçbir error boundary YOKTUR (`src/app` altında `error.tsx` yok) — yani
 * `boq` kapsamı `finance` olan rol (muhasebe) "Bölüm Düzenle" ekranını
 * açtığında `quantity` `null` geliyor, bu fonksiyon atıyor ve kullanıcı
 * **BEYAZ EKRAN** görüyordu.
 *
 * 🔴 O yüzeyin "`full` yetki ister, maskeli veri görmez" varsayımı da YANLIŞTI
 * ve ölçüldü: `SectionForm` yazma kapısını **`sites`** modülünden okur, `boq`dan
 * DEĞİL (`useModulePermission("sites")`), ve `/auth/me` yükü kapsam TAŞIMAZ
 * (`auth/schemas.py`: `dict[str, AccessLevel]`). `roles/service.py`nin freni
 * maskeleyen kapsam + yazan seviyeyi aynı HÜCREDE yasaklar ama hücreler MODÜL
 * BAŞINADIR: `sites = full/all` + `boq = view/finance` bugün atanabilir bir
 * bileşimdir. Yani "maskeli veri buraya gelemez" diye YAZILI bir varsayıma
 * dayanan her gösterim yüzeyi savunmasızdır — ekran kendini savunmalıdır.
 *
 * Bekçileri: `lib/masked.test.ts` ve
 * `components/boq-assignment/masked-render.test.tsx`.
 */

/** Maskelenebilir okuma değeri — `null`/`undefined` maskelidir. */
export type MaskeliDeger = string | null | undefined;

/**
 * GÖSTERİM yolunun ayıracı: değer gizlendi mi?
 *
 * 🔴 `!value` ya da `Boolean(value)` ile YAZILMAZ: `"0"` ve `""` de maskeli
 * sayılırdı ve ekran GERÇEK bir sıfırı "—" diye basardı. Sıfır maskeli
 * DEĞİLDİR — `lib/format.ts`in aynı ayrımı.
 */
export function maskeli(value: MaskeliDeger): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * YAZMA/HESAPLAMA yolunun freni: maskeli değer gövdeye giremez, DURUR.
 *
 * ⚠️ Bunu bir JSX gövdesinde ya da render'dan çağrılan bir yardımcıda görürsen
 * o bir KUSURDUR (yukarıdaki hikâye): orada `maskeli()` kullanılır.
 */
export function maskesiz(value: string | null, alan: string): string {
  if (maskeli(value)) {
    throw new Error(
      `Maskelenmiş alan bir yazma/hesaplama yoluna girdi (${alan}). Bu yüzey ` +
        "`full` yetki ister ve maskeli veri görmemelidir; işlem durduruldu.",
    );
  }
  return value;
}
