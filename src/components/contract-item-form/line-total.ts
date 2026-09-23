/**
 * "Bu Pozun Sözleşme Bedeli" ÖNİZLEMESİ (TAŞ 150-156 · İŞV 169-175).
 *
 * Yalnız GÖRÜNTÜdür: forma girmez, hiçbir isteğe konmaz. Tek doğru kaynak
 * backend'in kaydettikten sonra döndürdüğü `line_total`dır
 * (`BoqItemFormModal` `amountPreview` emsali). Girdilerden biri eksik/geçersiz
 * ise `null` döner — çağıran mockup'ın kendi boş gösterimini basar
 * (TAŞ 153 "— Fiyatsız", İŞV 172 "₺ 0").
 */

import { isDecimalString } from "./validate";

/**
 * no 49 · ondalık dizeyi TAM (kayan-nokta hatası olmadan) `BigInt`e çevirir.
 * `isDecimalString` zaten `[+-]?0*\d*\.?\d*` biçimini doğruladığı için burada
 * yalnız işaret/tamsayı/kesir parçalarına AYRILIR — yeniden doğrulama yok.
 */
function parseDecimalToBigInt(raw: string): { value: bigint; scale: number } | null {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(raw);
  if (!match) return null;
  const [, sign, intPart, fracPart = ""] = match;
  if (intPart === "" && fracPart === "") return null;
  const digits = `${intPart}${fracPart}` || "0";
  const value = BigInt(`${sign === "-" ? "-" : ""}${digits}`);
  return { value, scale: fracPart.length };
}

/**
 * `a × b`yi TAM ondalık aritmetikle çarpar — `Number(a) * Number(b)`nin
 * kayan-nokta yuvarlama hatası (ör. `0.1 × 0.2` → `0.020000000000000004`)
 * BURADA yoktur: çarpım `BigInt` üzerinde yapılır, ondalık nokta metinsel
 * olarak geri yerleştirilir; `Number()` dönüşü YALNIZ son adımda, tek bir
 * kez olur (birikimli hata yoktur).
 */
function multiplyDecimalStrings(a: string, b: string): number | null {
  const pa = parseDecimalToBigInt(a);
  const pb = parseDecimalToBigInt(b);
  if (!pa || !pb) return null;
  const product = pa.value * pb.value;
  const scale = pa.scale + pb.scale;
  if (scale === 0) {
    const result = Number(product.toString());
    return Number.isFinite(result) ? result : null;
  }
  const negative = product < 0n;
  const absProduct = negative ? -product : product;
  const digits = absProduct.toString().padStart(scale + 1, "0");
  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale);
  const numStr = `${negative ? "-" : ""}${whole}.${fraction}`;
  const result = Number(numStr);
  return Number.isFinite(result) ? result : null;
}

export function lineTotalPreview(quantity: string, unitPrice: string): number | null {
  const q = quantity.trim();
  const p = unitPrice.trim();
  if (!q || !p) return null;
  if (!isDecimalString(q) || !isDecimalString(p)) return null;
  return multiplyDecimalStrings(q, p);
}
