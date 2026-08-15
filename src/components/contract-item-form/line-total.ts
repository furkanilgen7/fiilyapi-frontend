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

export function lineTotalPreview(quantity: string, unitPrice: string): number | null {
  const q = quantity.trim();
  const p = unitPrice.trim();
  if (!q || !p) return null;
  if (!isDecimalString(q) || !isDecimalString(p)) return null;
  const product = Number(q) * Number(p);
  return Number.isFinite(product) ? product : null;
}
