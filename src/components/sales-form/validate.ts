/**
 * F-P8 T3 · İstemci doğrulaması — mockup'ın `req` yıldızlarının (55 · 71 · 72 ·
 * 73 · 86) aynadaki karşılığı. Amaç sunucuyu taklit etmek değil, kullanıcıya
 * beklemeden Türkçe geri bildirim vermektir; kurallar yine SUNUCUDA bağlayıcıdır.
 *
 * ⚠️ `min_sale_price` HİÇBİR katmanda zorlanmaz (P8 kararı) — burada da satış
 * bedeli için alt sınır YOKTUR, yalnız "boş/geçersiz sayı" reddedilir.
 *
 * Alıcı alanlarının zorunluluğu KİPE bağlıdır: kayıtlı müşteri seçildiyse inline
 * alanlar aranmaz (id yeterli); "yeni müşteri" kipinde mockup yıldızları (ad,
 * TCKN/VKN, telefon) istenir.
 */

import { normalizeDecimalInput, type SaleFormValues } from "./form-state";

export const MESSAGES = {
  projectRequired: "Proje seçiniz.",
  unitRequired: "Blok / ünite seçiniz.",
  customerRequired: "Kayıtlı bir müşteri seçin ya da yeni müşteri bilgilerini girin.",
  buyerNameRequired: "Alıcı adı / ünvanı zorunludur.",
  buyerIdRequired: "TCKN / VKN zorunludur.",
  buyerPhoneRequired: "Telefon zorunludur.",
  salePriceRequired: "Satış bedeli zorunludur.",
  salePriceInvalid: "Satış bedeli geçerli bir sayı olmalıdır.",
  installmentCountInvalid: "Taksit sayısı geçerli bir tam sayı olmalıdır.",
  discountAmountInvalid: "İndirim geçerli bir sayı olmalıdır.",
  downPaymentInvalid: "Peşinat geçerli bir sayı olmalıdır.",
  termInterestPctInvalid: "Vade farkı geçerli bir sayı olmalıdır.",
} as const;

export interface SaleFormErrors {
  projectId?: string;
  unitId?: string;
  existingCustomerId?: string;
  buyerName?: string;
  buyerNationalOrTaxId?: string;
  buyerPhone?: string;
  salePrice?: string;
  installmentCount?: string;
  discountAmount?: string;
  downPayment?: string;
  termInterestPct?: string;
}

export function validateSaleForm(values: SaleFormValues): SaleFormErrors {
  const errors: SaleFormErrors = {};

  if (!values.projectId) errors.projectId = MESSAGES.projectRequired;
  if (!values.unitId) errors.unitId = MESSAGES.unitRequired;

  if (values.customerMode === "existing") {
    if (!values.existingCustomerId) errors.existingCustomerId = MESSAGES.customerRequired;
  } else {
    if (!values.buyerName.trim()) errors.buyerName = MESSAGES.buyerNameRequired;
    // 72/73 — mockup yıldızları yeni müşteri kipinde istemcide zorunlu tutulur;
    // sunucu sözleşmesi yalnız ad+tip ister, bu ek bir istemci nezaketidir.
    if (!values.buyerNationalOrTaxId.trim()) {
      errors.buyerNationalOrTaxId = MESSAGES.buyerIdRequired;
    }
    if (!values.buyerPhone.trim()) errors.buyerPhone = MESSAGES.buyerPhoneRequired;
  }

  const salePrice = values.salePrice.trim();
  if (!salePrice) {
    errors.salePrice = MESSAGES.salePriceRequired;
  } else if (normalizeDecimalInput(salePrice) === null) {
    errors.salePrice = MESSAGES.salePriceInvalid;
  }

  // Taksit sayısı isteğe bağlıdır ama DOLUYSA tam sayı olmak ZORUNDADIR: kutu
  // `type="text"` olduğu için "12,5" / "12 ay" gibi girdi `Number(...)` ile NaN'a,
  // gövdede `null`a düşer ve sunucu (`installment_count: int | None`) 422 DÖNMEZ —
  // plan sessizce yalnız peşinat satırından kurulur. Kapı burada.
  const installmentCount = values.installmentCount.trim();
  if (installmentCount) {
    const parsed = Number(installmentCount);
    if (!Number.isInteger(parsed) || parsed < 0) {
      errors.installmentCount = MESSAGES.installmentCountInvalid;
    }
  }

  // no 250 · Bu üç alan isteğe bağlıdır ama DOLUYSA `build-body.ts`in
  // `optionalDecimal`i `normalizeDecimalInput() === null` döndüğünde anahtarı
  // SESSİZCE gövdeden düşürür ("40.000,50" gibi iki ayraçlı bir girdi bunu
  // tetikler). Kullanıcı hiçbir uyarı görmeden bedeli eksik gönderirdi —
  // kapı burada, `salePrice`in aynı deseniyle.
  if (values.discountAmount.trim() && normalizeDecimalInput(values.discountAmount) === null) {
    errors.discountAmount = MESSAGES.discountAmountInvalid;
  }
  if (values.downPayment.trim() && normalizeDecimalInput(values.downPayment) === null) {
    errors.downPayment = MESSAGES.downPaymentInvalid;
  }
  if (values.termInterestPct.trim() && normalizeDecimalInput(values.termInterestPct) === null) {
    errors.termInterestPct = MESSAGES.termInterestPctInvalid;
  }

  return errors;
}

/** İlk hata cümlesi — genel uyarı bandı ve odaklama için. */
export function firstSaleFormError(errors: SaleFormErrors): string | null {
  return (
    errors.projectId ??
    errors.unitId ??
    errors.existingCustomerId ??
    errors.buyerName ??
    errors.buyerNationalOrTaxId ??
    errors.buyerPhone ??
    errors.salePrice ??
    errors.discountAmount ??
    errors.downPayment ??
    errors.termInterestPct ??
    errors.installmentCount ??
    null
  );
}

export function hasSaleFormErrors(errors: SaleFormErrors): boolean {
  return firstSaleFormError(errors) !== null;
}
