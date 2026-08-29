/**
 * URL-3 · ÇÖZÜMLEME HATASININ GÖRÜNÜRLÜĞÜ.
 *
 * 🔴 KÖK OLAY — BU DİLİMİN AÇTIĞI VE KAPATTIĞI KUSUR SINIFI. URL artık slug
 * taşıdığı için ekranlar önce anahtarı kanonik kimliğe çözer:
 *
 *     const siteId = siteQuery.data?.id ?? "";
 *     const stockQuery = useSiteStock(siteId, …);   // `enabled: siteId.length > 0`
 *
 * Anahtar ÇÖZÜLEMEZSE (bilinmeyen slug / görünmeyen kayıt → **404**) `siteId`
 * boş kalır ve alt sorgu KENDİ boş-id kapısında DURUR. Sonuç: alt sorgunun
 * `isError`i **false**tur — çünkü o sorgu hiç koşmamıştır. Hata mesajını
 * yalnız alt sorgudan türeten bir ekran o an HİÇBİR ŞEY SÖYLEMEZ ve kullanıcı
 * boş bir tablo görür.
 *
 * Bu, ST §4b kanonunun ("görünmeyen şantiye 404 alır ve kullanıcıya Türkçe,
 * GÖRÜNÜR bir cümle basılır — sessiz boş tablo YOK") tam tersidir ve göç
 * sırasında ÖLÇÜLEREK yakalandı: `site-stock.spec.ts`in IDOR testi kırmızı verdi.
 *
 * ⚠️ Kusur GÖÇ ÖNCESİ YOKTU: eski hâlde bozuk `siteId` doğrudan alt uca
 * gidiyor, o uç 404 veriyor ve mesaj oradan doğuyordu. Yani çözümleme
 * basamağı eklemek, hata yüzeyini SESSİZCE bir katman yukarı taşır. Bu
 * modülün varlık sebebi o taşınmayı görünür ve zorunlu kılmaktır.
 *
 * 🔴 AYRICA (URL-2 notu): üç okuma ucunda bozuk bir yol değeri artık
 * `uuid_parsing` **422 değil 404** alır — slug uzayı tam olarak "UUID olmayan
 * metinler"dir. Hata yüzeyi bu yüzden 404'ü "bulunamadı" diye konuşmalıdır,
 * "geçersiz biçim" diye değil.
 */

/** Hata metnini üreten fonksiyon (`stockErrorMessage` vb. ile aynı imza). */
type ErrorFormatter = (error: unknown) => string;

/** Bir React Query sonucunun bu modülün ihtiyaç duyduğu dar yüzeyi. */
interface QueryLike {
  readonly isError: boolean;
  readonly error: unknown;
}

/**
 * Çözümleme sorgusunu ÖNCE, veri sorgusunu SONRA yoklar ve ilk hatayı metne
 * çevirir.
 *
 * ÇÖZÜMLEME ÖNCE GELİR ve bu sıra önemlidir: anahtar çözülemediyse veri
 * sorgusu zaten hiç koşmamıştır, dolayısıyla onun sessizliği bir "iyi haber"
 * değildir. Ters sıra (`data` önce) bugün aynı sonucu verirdi ama veri
 * sorgusunun bir gün önbellekten bayat hata taşıması hâlinde yanlış cümleyi
 * basardı.
 *
 * @returns hata metni; hiçbir sorgu hata vermediyse `undefined`.
 */
export function resolutionAwareError(
  resolution: QueryLike,
  data: QueryLike,
  format: ErrorFormatter,
): string | undefined {
  if (resolution.isError) return format(resolution.error);
  if (data.isError) return format(data.error);
  return undefined;
}
