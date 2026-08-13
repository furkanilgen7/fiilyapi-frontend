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
