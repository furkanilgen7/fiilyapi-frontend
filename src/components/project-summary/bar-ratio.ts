import { divideDecimalStrings, multiplyDecimalStrings } from "@/lib/decimal";

/**
 * F-PKK T2 · ÇUBUK GENİŞLİĞİ — tek türev noktası.
 *
 * 🔴 K4 (spec §6) para ve yüzde FORMÜLLERİNİ istemcide yeniden hesaplamayı
 * yasaklar: sunucunun verdiği toplamlar basılır. Bu modül o yasağın
 * İSTİSNASI DEĞİL, SINIRIDIR:
 *
 *   · KY 92/97/101 çubukları GÖRSEL bir orandır (`style.width`), ekrana
 *     BASILAN bir sayı DEĞİLDİR. Mockup'ın "%68 harcandı" METNİ basılmaz —
 *     kaynağı olmayan bir yüzdeyi metin olarak basmak K2'nin yasakladığı
 *     şeydir. Ekranda İKİ TUTAR da gerçek değeriyle durur.
 *   · Hesap `Number(`/`Math.` ile DEĞİL `src/lib/decimal.ts` ile yapılır: o
 *     BigInt tabanlıdır ve Python `decimal`ın ROUND_HALF_UP kuralını
 *     paylaşır. `Math.round` pozitif küçük tutarlarda AYNI sonucu verip bir
 *     değer testini geçerdi (F-FAT2 dersi); ayrışma noktaları testtedir.
 *
 * Sıfır (ya da girilmemiş) bütçede `null` döner: `0/0` bir oran DEĞİLDİR ve
 * `%0` basmak "bütçe girilmedi"yi "hiç harcanmadı" diye gösterirdi. Çağıran
 * `null` hâlinde çubuğu HİÇ çizmez.
 */

/** Bölme ölçeği — yüzdeye çevrildikten sonra iki hane kalır (`0.6825` → `68.25`). */
const RATIO_SCALE = 4;

/** İki ondalık basamaklı yüzde dizeleri; çubuk için yeterli çözünürlük. */
const PCT_SCALE = 2;

/**
 * KIRPMA SINIRLARI — kayan noktaya HİÇ uğramadan.
 *
 * İlk hâli `Math.round(Number.parseFloat(...))` kullanıyordu; ölçüldü ve
 * kaldırıldı. Sebep sonucun yanlış olması değil, YAPISAL YASAĞIN
 * DELİNMESİYDİ: dosyada tek bir kayan nokta çağrısı kalsaydı testin
 * "aritmetik decimal'de kalır" iddiası bir istisnayla yaşamak zorunda kalır
 * ve yasak zamanla aşınırdı. Dize üzerinde tamsayı karşılaştırması aynı işi
 * istisnasız yapar.
 */
function isAtOrBelowZero(pct: string): boolean {
  if (pct.startsWith("-")) return true;
  return /^0+(\.0*)?$/.test(pct);
}

function isAtOrAbove100(pct: string): boolean {
  if (pct.startsWith("-")) return false;
  const [integerPart] = pct.split(".");
  return BigInt(integerPart) >= 100n;
}

/**
 * Çubuk `width` yüzdesi, `0`–`100` arasına KIRPILMIŞ olarak.
 *
 * Taşma KIRPILIR ama GİZLENMEZ: bütçeyi aşan harcamada çubuk %100'de durur,
 * tutarlar ise ekranda gerçek değeriyle basılır — kullanıcı aşımı rakamdan
 * görür. Kırpılmasaydı `width: 180%` düzeni bozardı.
 */
export function barWidthPct(spent: string | null, budget: string | null): string | null {
  if (spent === null || budget === null) return null;

  const ratio = divideDecimalStrings(spent, budget, RATIO_SCALE);
  if (ratio === null) return null;

  const pct = multiplyDecimalStrings(ratio, "100");
  if (isAtOrBelowZero(pct)) return "0";
  if (isAtOrAbove100(pct)) return "100";

  // Ölçeği ikiye indir: `style.width` için dört hane gereksiz uzunluktur ve
  // anlık görüntülerde gürültü yaratır.
  return divideDecimalStrings(pct, "1", PCT_SCALE) ?? "0";
}
