/**
 * F-SA T3 · İstemci doğrulaması — backend'in İKİ katmanının AYNADAKİ karşılığı:
 *
 * · `PurchaseRequestLineCreate` şeması: XOR, `quantity > 0`, uzunluk tavanları
 *   (HER ZAMAN koşar, taslakta bile);
 * · `procurement/validation.py: submit_blockers`: ihtiyaç tarihi · en az bir
 *   kalem · her kalemin kaynağı · **her kalemin tahmini birim fiyatı**
 *   (YALNIZ "Onaya Gönder"de koşar).
 *
 * ⚠️ **TASLAK GEVŞEKTİR** (`PurchaseRequestCreate` açıklaması): zorunlu TEK
 * alan `project_id`dir. FST'nin "Öncelik"/"İhtiyaç Tarihi" yıldızları (55, 58)
 * "Onaya Gönder" içindir; "Taslak Kaydet" yarım formu saklayabilmelidir.
 *
 * Amaç sunucuyu taklit etmek değil, kullanıcıya beklemeden Türkçe geri
 * bildirim vermektir; kural yine SUNUCUDA bağlayıcıdır ve sunucu 422'si ayrıca
 * basılır.
 */

import { normalizeDecimalInput } from "@/lib/decimal";

import { purchaseApprovalThresholdLabel } from "./purchase-request-approval";
import { MAX_LENGTH } from "./purchase-request-form-constants";
import type {
  PurchaseRequestFormValues,
  PurchaseRequestLineValues,
} from "./purchase-request-form-state";

/** "Taslak Kaydet" mi "Onaya Gönder" mi — sıkı kurallar yalnız `submit`te koşar. */
export type PurchaseRequestFormMode = "draft" | "submit";

export const PURCHASE_REQUEST_MESSAGES = {
  projectRequired: "Proje seçimi zorunludur.",
  neededByRequired: "İhtiyaç tarihi zorunludur.", // submit_blockers.NEEDED_BY_REQUIRED
  linesRequired: "En az bir malzeme kalemi gereklidir.", // submit_blockers.LINES_REQUIRED
  stockItemRequired: "Stok kartı seçilmedi.",
  freeTextNameRequired: "Malzeme adı zorunludur.",
  freeTextUnitRequired: "Birim zorunludur.",
  quantityRequired: "Talep miktarı zorunludur.",
  quantityInvalid: "Talep miktarı geçerli bir sayı olmalıdır.",
  quantityNotPositive: "Talep miktarı sıfırdan büyük olmalıdır.",
  unitPriceInvalid: "Tahmini birim fiyat geçerli bir sayı olmalıdır.",
  unitPriceNegative: "Tahmini birim fiyat negatif olamaz.",
  // 🔴 NULL-EŞİK KANONU'nun kullanıcıya dönük yüzü: fiyat, ONAY EŞİĞİNİN
  // girdisidir — boş bırakılan bir fiyat büyük bir talebi "toplam 0"
  // gösterirdi (backend `LINE_PRICE_REQUIRED` ile aynı gerekçe). Eşik metni
  // BURAYA DA yazılmaz, tek kaynaktan TÜRETİLİR (spec K6).
  unitPriceRequired: `Tahmini birim fiyat zorunludur — onay eşiği (${purchaseApprovalThresholdLabel()}) tahmini toplamdan hesaplanır.`,
  freeTextNameTooLong: `Malzeme adı en fazla ${MAX_LENGTH.freeTextName} karakter olabilir.`,
  freeTextUnitTooLong: `Birim en fazla ${MAX_LENGTH.freeTextUnit} karakter olabilir.`,
  justificationTooLong: `Talep gerekçesi en fazla ${MAX_LENGTH.justification} karakter olabilir.`,
} as const;

export interface PurchaseRequestLineErrors {
  stockItemId?: string;
  freeTextName?: string;
  freeTextUnit?: string;
  quantity?: string;
  unitPrice?: string;
}

export interface PurchaseRequestFormErrors {
  projectId?: string;
  neededBy?: string;
  justification?: string;
  /** Tablonun tamamına ait hata (hiç kalem yok). */
  lines?: string;
  /** Satır anahtarı → alan hataları. */
  lineErrors: Record<string, PurchaseRequestLineErrors>;
}

function validateQuantity(raw: string, mode: PurchaseRequestFormMode): string | undefined {
  if (!raw.trim()) return mode === "submit" ? PURCHASE_REQUEST_MESSAGES.quantityRequired : undefined;
  const normalized = normalizeDecimalInput(raw);
  if (normalized === null) return PURCHASE_REQUEST_MESSAGES.quantityInvalid;
  // Şema `exclusiveMinimum: 0` — sıfır ve negatif HER ZAMAN reddedilir.
  if (Number(normalized) <= 0) return PURCHASE_REQUEST_MESSAGES.quantityNotPositive;
  return undefined;
}

function validateUnitPrice(raw: string, mode: PurchaseRequestFormMode): string | undefined {
  if (!raw.trim()) {
    return mode === "submit" ? PURCHASE_REQUEST_MESSAGES.unitPriceRequired : undefined;
  }
  const normalized = normalizeDecimalInput(raw);
  if (normalized === null) return PURCHASE_REQUEST_MESSAGES.unitPriceInvalid;
  if (Number(normalized) < 0) return PURCHASE_REQUEST_MESSAGES.unitPriceNegative;
  return undefined;
}

function validateLine(
  line: PurchaseRequestLineValues,
  mode: PurchaseRequestFormMode,
): PurchaseRequestLineErrors {
  const errors: PurchaseRequestLineErrors = {};

  if (line.source === "stock") {
    if (!line.stockItemId && mode === "submit") {
      errors.stockItemId = PURCHASE_REQUEST_MESSAGES.stockItemRequired;
    }
  } else {
    const name = line.freeTextName.trim();
    const unit = line.freeTextUnit.trim();
    if (!name && mode === "submit") {
      errors.freeTextName = PURCHASE_REQUEST_MESSAGES.freeTextNameRequired;
    }
    if (name.length > MAX_LENGTH.freeTextName) {
      errors.freeTextName = PURCHASE_REQUEST_MESSAGES.freeTextNameTooLong;
    }
    if (!unit && mode === "submit") {
      errors.freeTextUnit = PURCHASE_REQUEST_MESSAGES.freeTextUnitRequired;
    }
    if (unit.length > MAX_LENGTH.freeTextUnit) {
      errors.freeTextUnit = PURCHASE_REQUEST_MESSAGES.freeTextUnitTooLong;
    }
  }

  const quantityError = validateQuantity(line.quantity, mode);
  if (quantityError) errors.quantity = quantityError;
  const unitPriceError = validateUnitPrice(line.unitPrice, mode);
  if (unitPriceError) errors.unitPrice = unitPriceError;

  return errors;
}

export function validatePurchaseRequestForm(
  values: PurchaseRequestFormValues,
  mode: PurchaseRequestFormMode,
): PurchaseRequestFormErrors {
  const errors: PurchaseRequestFormErrors = { lineErrors: {} };

  if (!values.projectId) errors.projectId = PURCHASE_REQUEST_MESSAGES.projectRequired;
  if (values.justification.trim().length > MAX_LENGTH.justification) {
    errors.justification = PURCHASE_REQUEST_MESSAGES.justificationTooLong;
  }
  if (mode === "submit" && !values.neededBy) {
    errors.neededBy = PURCHASE_REQUEST_MESSAGES.neededByRequired;
  }
  if (mode === "submit" && values.lines.length === 0) {
    errors.lines = PURCHASE_REQUEST_MESSAGES.linesRequired;
  }

  for (const line of values.lines) {
    const lineErrors = validateLine(line, mode);
    if (Object.keys(lineErrors).length > 0) errors.lineErrors[line.key] = lineErrors;
  }

  return errors;
}

/** İlk hata cümlesi — genel uyarı bandında gösterilir. */
export function firstPurchaseRequestError(errors: PurchaseRequestFormErrors): string | null {
  const top = [errors.projectId, errors.neededBy, errors.justification, errors.lines].find(
    Boolean,
  );
  if (top) return top;
  for (const lineErrors of Object.values(errors.lineErrors)) {
    const message =
      lineErrors.stockItemId ??
      lineErrors.freeTextName ??
      lineErrors.freeTextUnit ??
      lineErrors.quantity ??
      lineErrors.unitPrice;
    if (message) return message;
  }
  return null;
}

export function hasPurchaseRequestErrors(errors: PurchaseRequestFormErrors): boolean {
  return firstPurchaseRequestError(errors) !== null;
}
