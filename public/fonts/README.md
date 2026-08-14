# Yazı tipleri (F-TB2)

Bu klasördeki 13 `.woff2` dosyası **elle indirilmedi**. Bunlar `next/font/google`
eklentisinin (Next **15.5.20**) **2026-08-14** tarihli temiz bir `pnpm build`
koşusunda `.next/static/media/` altına yazdığı baytların birebir kopyasıdır —
yani Google'ın o gün gönderdiği dosyaların ta kendisi.

## Neden repoda duruyorlar

`next/font/google` yazı tiplerini **derleme anında** `fonts.gstatic.com`tan
indirir. Ağı kısıtlı CI koşucusunda bu çekim başarısız oluyor ve `pnpm build`
patlıyordu. Dosyalar repoya alınınca derleme hiçbir ağ çağrısı yapmıyor;
`@font-face` kuralları da `src/styles/fonts.css`e taşındı.

## Neden 13 dosya

Kaynak yapılandırma `Inter` için `subsets: ["latin", "latin-ext"]`,
`JetBrains Mono` için `subsets: ["latin"]` (ağırlıklar 400/600/700) diyordu.
Buna rağmen Google **istenmeyen alt kümeleri de** gönderiyor — cyrillic,
cyrillic-ext, greek, greek-ext, vietnamese. Bu dosyalar **silinmez**: her
birinin kendi `unicode-range`i vardır, tarayıcı o aralıktan bir karakter
gerekmedikçe dosyayı indirmez (çalışma zamanı maliyeti sıfır). Silmek, bu göçü
"sadık kopya" olmaktan çıkarıp davranış değişikliğine çevirir.

Dosya adları **içerik hash'i** taşır (`<hash>-s.woff2`, preload edilenlerde
`-s.p.woff2`). Bu yüzden yeniden adlandırılmazlar — ad, önbellek doğruluğunun
taşıyıcısıdır.

## Hangi dosya hangi aile + alt küme

| Dosya | Aile | Alt küme (`unicode-range`) |
| --- | --- | --- |
| `e4af272ccee01ff0-s.p.woff2` | Inter | latin |
| `8e9860b6e62d6359-s.p.woff2` | Inter | latin-ext (**Türkçe `ğ ş İ` burada**) |
| `19cfc7226ec3afaa-s.woff2` | Inter | greek |
| `c5fe6dc8356a8c31-s.woff2` | Inter | greek-ext |
| `21350d82a1f187e9-s.woff2` | Inter | cyrillic |
| `ba9851c3c22cd980-s.woff2` | Inter | cyrillic-ext |
| `df0a9ae256c0569c-s.woff2` | Inter | vietnamese |
| `558ca1a6aa3cb55e-s.p.woff2` | JetBrains Mono | latin |
| `6d831b18ae5b01dc-s.woff2` | JetBrains Mono | latin-ext (**Türkçe**) |
| `64d784ea54a4acde-s.woff2` | JetBrains Mono | greek |
| `ac0e76ddaeeb7981-s.woff2` | JetBrains Mono | cyrillic |
| `edc640959b0c7826-s.woff2` | JetBrains Mono | cyrillic-ext |
| `ff71da380fbe67dd-s.woff2` | JetBrains Mono | vietnamese |

Inter tek **değişken** dosya ailesidir (`font-weight: 100 900`), bu yüzden alt
küme başına tek dosya = 7 dosya. JetBrains Mono statiktir ama üç ağırlık
(400/600/700) **aynı altı dosyayı** paylaşır — 18 kural, 6 dosya. Toplam 13.

## Yenileme yöntemi

Yazı tipi sürümünü güncellemek gerekirse:

1. `src/app/layout.tsx`i **geçici olarak** eski hâline döndür (`next/font/google`
   ile `Inter` + `JetBrains_Mono` çağrıları, aynı `subsets`/`weight`/`display`).
2. Ağı açık bir makinede `pnpm build` koş.
3. `.next/static/media/` altındaki `.woff2` dosyalarını bu klasöre kopyala
   (adları değiştirme).
4. Üretilen CSS'teki `@font-face` kurallarını `.next/static/css/*.css`ten çıkar,
   `src/styles/fonts.css`e birebir taşı; **tek** değişiklik `src` yollarının
   `/_next/static/media/` → `/fonts/` olmasıdır.
5. `layout.tsx`i geri al; `<head>`teki üç `preload` bağlantısını yeni `-s.p.woff2`
   adlarıyla güncelle.
6. `src/styles/fonts.test.ts`teki sayıları/ölçüleri yeni çıktıya göre güncelle ve
   görsel baseline'ları yenile (tipografi değişmişse **değişecekler**).

## `unicode-range` dokunulmazdır

`fonts.css`teki 25 kural aynı aile+ağırlık+stil'i paylaşır; onları ayıran tek
şey `unicode-range`dir. Bir tanesi silinir ya da "sadeleştirilirse" kurallar
ayırt edilemez hâle gelir, CSS eşleştirmesinde sonuncusu öncekileri ölü bırakır
ve **Türkçe harfler sessizce yedek yazı tipine düşer**. `fonts.test.ts` bunu
kilitler.

## Lisans

Her iki aile de **SIL Open Font License 1.1** altındadır:
`OFL-Inter.txt` · `OFL-JetBrainsMono.txt`.
