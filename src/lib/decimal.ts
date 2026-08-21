/**
 * Kullanıcının yazdığı sayıyı ondalık string'e indirger: TR virgülü noktaya
 * çevrilir, boşluk atılır. Boş/anlamsız girdi `null` döner — çağıran
 * "hesaplama yok" dalını seçer, `NaN` ekrana ya da gövdeye KAÇMAZ.
 *
 * ⚠️ TEK KAYNAK (F-SA T3): aynı gövde daha önce `stock-entry-form/form-state`
 * ve `sales-form/form-state` içinde İKİ KEZ kopyalanmıştı. Üçüncü kopya
 * yazmak yerine kanon buraya taşındı; iki eski yer artık BURADAN yeniden
 * dışa verir (davranış birebir aynı, çağıranların ithalatı değişmedi).
 */
export function normalizeDecimalInput(raw: string): string | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  if (!/^[-+]?\d*\.?\d*$/.test(trimmed)) return null;
  if (!Number.isFinite(Number(trimmed))) return null;
  return trimmed;
}

/**
 * Ondalık string'leri KAYIPSIZ toplar (kuruş hassasiyeti korunur). `Number()`
 * ile toplama YASAK — büyük tutarlarda / çok terimli toplamlarda float
 * yuvarlama hatası üretir (IEEE-754). Bunun yerine her terim ortak bir
 * ondalık basamak sayısına (dizideki en uzun kesir) ölçeklenip `BigInt`
 * tamsayı olarak toplanır, sonra aynı basamak sayısıyla string'e geri döner.
 *
 * P7 T3 fix (Ara Toplam satırı, review bulgusu): backend `groups[]` içindeki
 * dört tutar alanını (contract/previous/this/cumulative_amount) tfoot
 * satırında toplamak için kullanılır.
 */
export function sumDecimalStrings(values: string[]): string {
  if (values.length === 0) return "0";
  const scale = values.reduce((max, value) => Math.max(max, fractionLength(value)), 0);
  const total = values.reduce((sum, value) => sum + toScaledBigInt(value, scale), 0n);
  return fromScaledBigInt(total, scale);
}

/**
 * İki ondalık string'i KAYIPSIZ çarpar (F-ST T4 · SG 116 "Tutar" sütunu).
 *
 * `Number(q) * Number(p)` YASAK: 0.1 × 3 gibi terimlerde IEEE-754 kalıntısı
 * ekrana kaçar (`322500.00000000006`) ve satır tutarı ile alt toplam
 * TUTMAZ. Ölçekler toplanır, tamsayı çarpımı `BigInt` ile yapılır.
 *
 * ⚠️ Sonuç TÜREVDİR — sunucuya GÖNDERİLMEZ (backend spec §2: satır tutarı
 * kolonu AÇILMAZ). Yalnız gösterim içindir.
 */
export function multiplyDecimalStrings(a: string, b: string): string {
  const scaleA = fractionLength(a);
  const scaleB = fractionLength(b);
  const product = toScaledBigInt(a, scaleA) * toScaledBigInt(b, scaleB);
  return fromScaledBigInt(product, scaleA + scaleB);
}

/**
 * İki ondalık string'i KAYIPSIZ çıkarır (F-MU1 T4 · yevmiye fişinin DENGE
 * göstergesi: `Σ borç − Σ alacak`).
 *
 * 🔴 `Number(a) - Number(b)` YASAK. Denge kapısı bir EŞİKTİR: `0.1 + 0.2` float
 * toplamı `0.30000000000000004` verir ve `0.3`e eşit ÇIKMAZ — kullanıcı ekranda
 * dengeli bir fiş görürken "Kaydet" sessizce kapalı kalırdı (ya da ters yönde,
 * bir kuruşluk kaçak dengeli sayılırdı). Sunucu karşılaştırmayı `Decimal`
 * üzerinde TOLERANSSIZ yapar (`validation.py` K1/HZ-1 K6); istemci aynı
 * aritmetiği kullanmazsa iki taraf farklı cevap verir.
 */
export function subtractDecimalStrings(a: string, b: string): string {
  const scale = Math.max(fractionLength(a), fractionLength(b));
  return fromScaledBigInt(toScaledBigInt(a, scale) - toScaledBigInt(b, scale), scale);
}

/**
 * İki ondalık string'i KAYIPSIZ böler ve `scale` basamağa **ROUND_HALF_UP**
 * ile yuvarlar (F-UNIT1 T2 · UE 89 "m² Birim Fiyat").
 *
 * 🔴 `Number(a) / Number(b)` YASAK — T1 bunu adıyla ölçtü: 1480000 / 178 float
 * bölmesi `8314.610000000001` verir ve kalıntı hem salt-okunur kutuya hem de
 * sunucu paritesine sızar. Sunucu aynı hesabı `Decimal`de yapıp
 * `_quantize_money` (iki basamak, ROUND_HALF_UP) uygular; istemci farklı
 * yuvarlarsa kullanıcı kaydetmeden önce bir sayı, kaydettikten sonra BAŞKA bir
 * sayı görür.
 *
 * ROUND_HALF_UP = Python `decimal`ın kuralı: tam yarım SIFIRDAN UZAĞA yuvarlar
 * (JS'in `Math.round`u negatifte YUKARI yuvarlar, aynı şey değildir).
 *
 * Bölen SIFIRSA `null` döner — sunucu da `not self.gross_area_m2` dalında
 * `None` verir; çağıran "hesap yok" dalını seçer.
 */
export function divideDecimalStrings(
  dividend: string,
  divisor: string,
  scale: number,
): string | null {
  const dividendScale = fractionLength(dividend);
  const divisorScale = fractionLength(divisor);
  const scaledDivisor = toScaledBigInt(divisor, divisorScale);
  if (scaledDivisor === 0n) return null;

  // (A / 10^sa) / (B / 10^sb) * 10^scale  =  A * 10^(sb + scale) / (B * 10^sa)
  const numerator = toScaledBigInt(dividend, dividendScale) * 10n ** BigInt(divisorScale + scale);
  const denominator = scaledDivisor * 10n ** BigInt(dividendScale);

  const isNegative = numerator < 0n !== denominator < 0n;
  const absNumerator = numerator < 0n ? -numerator : numerator;
  const absDenominator = denominator < 0n ? -denominator : denominator;

  let quotient = absNumerator / absDenominator;
  // Tam yarım ve üzeri YUKARI (sıfırdan uzağa) — `2 * kalan >= bölen`.
  if ((absNumerator % absDenominator) * 2n >= absDenominator) quotient += 1n;

  return fromScaledBigInt(isNegative ? -quotient : quotient, scale);
}

/**
 * Kullanıcının yazdığı TAM SAYIYI okur (F-UNIT1 T2 · BE 78/79/81/83/85 kat ve
 * adet kutuları, UE 80 banyo sayısı).
 *
 * `normalizeDecimalInput`in tamsayı ikizidir ve aynı gerekçeyle BURADADIR:
 * ondan önce her form kendi `Number(values.x)`ini yazıyordu ve boş kutu sessizce
 * `0`a düşüyordu — yani "girilmedi" ile "sıfır girildi" veriye AYNI yazılıyordu.
 * Boş/anlamsız/ondalıklı girdi `null` döner; çağıran anahtarı HİÇ kurmaz.
 */
export function parseCountInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^[-+]?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Ondalık string SIFIR mı? `"0"` · `"0.00"` · `"-0.000"` hepsi sıfırdır.
 *
 * Metin karşılaştırması (`value === "0"`) YETMEZ: `sumDecimalStrings` ölçeği
 * girdilerin en uzun kesrinden alır, yani aynı sıfır bir fişte `"0"`, ötekinde
 * `"0.00"` yazılır. Sayıya çevirmek de aynı float tuzağını geri getirirdi.
 */
export function isZeroDecimalString(value: string): boolean {
  const trimmed = value.trim();
  if (!/\d/.test(trimmed) || !/^[-+]?\d*\.?\d*$/.test(trimmed)) return false;
  return toScaledBigInt(trimmed, fractionLength(trimmed)) === 0n;
}

function fractionLength(value: string): number {
  const [, fraction = ""] = value.trim().split(".");
  return fraction.length;
}

/** "-12.5" @ scale 3 → -12500n */
function toScaledBigInt(value: string, scale: number): bigint {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = trimmed.replace(/^[-+]/, "");
  const [intPart = "0", fractionPart = ""] = unsigned.split(".");
  const paddedFraction = fractionPart.padEnd(scale, "0").slice(0, scale);
  const digits = `${intPart || "0"}${paddedFraction}`;
  const magnitude = BigInt(digits);
  return negative ? -magnitude : magnitude;
}

/** -12500n @ scale 3 → "-12.500" */
function fromScaledBigInt(scaled: bigint, scale: number): string {
  const negative = scaled < 0n;
  const magnitude = negative ? -scaled : scaled;
  const digits = magnitude.toString().padStart(scale + 1, "0");
  const intPart = digits.slice(0, digits.length - scale) || "0";
  const fractionPart = digits.slice(digits.length - scale);
  const unsigned = scale > 0 ? `${intPart}.${fractionPart}` : intPart;
  return negative && magnitude !== 0n ? `-${unsigned}` : unsigned;
}
