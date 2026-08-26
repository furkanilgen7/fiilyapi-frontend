/**
 * İstemci doğrulaması (spec §4.10, §5.2). Sunucununkini (§3.6) **taklit eder,
 * yerine geçmez** — her ikisi de uygulanır.
 *
 * Mesajlar §4.10 tablosundan birebir alınmıştır; yeniden yazılmaz.
 */

import type { BudgetValues } from "./BudgetCard";
import type { ContractValues } from "./ContractCard";
import { durationDays } from "./derive";
import type { ProjectFormValues } from "./form-state";
import { numberOrNull } from "./form-state";
import { siteRowError } from "./SiteRepeaterCard";
import type { InvestmentValues, LandShareValues } from "./TypeFieldGroups";
import type { BasicInfoValues } from "./types";

/** §4.10 mesaj tablosu — metinler birebir. */
export const MESSAGES = {
  nameRequired: "Proje adı zorunludur.",
  categoryRequired: "Tür seçiniz.",
  cityRequired: "İl / ilçe zorunludur.",
  employerRequired: "İşveren firma seçiniz.",
  contractNoRequired: "Sözleşme no zorunludur.",
  signatureDateRequired: "İmza tarihi zorunludur.",
  amountInvalid: "Sözleşme bedeli sayı olmalıdır.",
  datesRequired: "Başlangıç ve bitiş tarihi zorunludur.",
  endBeforeStart: "Bitiş tarihi başlangıçtan önce olamaz.",
  pctOutOfRange: "Oran 0 ile 100 arasında olmalıdır.",
  negativeAmount: "Tutar negatif olamaz.",
  escalationRequired: "Endeks tipi ve baz endeks değeri zorunludur.",
  siteNameRequired: "Şantiye adı zorunludur.",
  taxNumberFormat: "VKN 10 veya 11 haneli rakam olmalıdır.",
  landSharePctRequired: "Paylaşım oranı zorunludur.",
  landSharePctRange: "Oran 0'dan büyük, 100'den küçük olmalıdır.",
  shareholderPctRequired: "Hissedar payı zorunludur.",
  shareholderPctRange: "Pay 0'dan büyük, en fazla 100 olmalıdır.",
  duplicateTaxNumber: "Bu VKN ile kayıtlı bir işveren zaten var.",
  projectCodeConflict: "Proje kodu üretilemedi, tekrar deneyin.",
} as const;

/* ── SÖZLEŞME SINIRLARI ────────────────────────────────────────────────────
 * 🔴 Bu üç alan `ProjectLandShareInput`/`ShareholderInput` içinde ZORUNLUDUR
 * ve sınırları `openapi.json`dan ÖLÇÜLMÜŞTÜR (`form-limits.contract.test.ts`
 * ikisini karşılaştırır). Boş bırakılan yüzde eskiden gövdeye `0` olarak
 * giriyordu — üçünde de `exclusiveMinimum: 0` olduğu için sunucu bunu
 * REDDEDER: kullanıcı alanı boş bıraktığında form UYARISIZ 422 alıyordu.
 *
 * ⚠️ İKİ ALAN AYNI DEĞİLDİR — üst sınır farklıdır:
 *   `our_share_pct` / `owner_share_pct` : exclusiveMaximum 100 ⇒ 100 GEÇERSİZ
 *   `share_pct` (hissedar)              : maximum 100          ⇒ 100 GEÇERLİ
 * Genel `pctError` (0..100 kapsayıcı) ikisi için de YANLIŞTIR.
 * ------------------------------------------------------------------------ */

/** `ProjectLandShareInput.our_share_pct` · `owner_share_pct` — 0 < x < 100. */
export const LAND_SHARE_PCT_EXCLUSIVE_MIN = 0;
export const LAND_SHARE_PCT_EXCLUSIVE_MAX = 100;

/** `ShareholderInput.share_pct` — 0 < x ≤ 100 (üst sınır KAPSAYICI). */
export const SHAREHOLDER_PCT_EXCLUSIVE_MIN = 0;
export const SHAREHOLDER_PCT_MAX = 100;

type TextErrors<T> = Partial<Record<keyof T, string>>;

export interface ProjectFormErrors {
  basic: TextErrors<BasicInfoValues>;
  /** İşveren seçici tek alandır; kart bunu Field'e geçirir. */
  employer?: string;
  contract: TextErrors<ContractValues>;
  investment: TextErrors<InvestmentValues>;
  landShare: TextErrors<Omit<LandShareValues, "shareholders">>;
  /** Satır index'ine hizalı hissedar payı hataları (`sites` deseniyle aynı). */
  shareholders: (string | null)[];
  budget: TextErrors<BudgetValues>;
  /** Satır index'ine hizalı şantiye hataları. */
  sites: (string | null)[];
}

export function emptyProjectFormErrors(): ProjectFormErrors {
  return {
    basic: {},
    contract: {},
    investment: {},
    landShare: {},
    shareholders: [],
    budget: {},
    sites: [],
  };
}

export function hasErrors(errors: ProjectFormErrors): boolean {
  return (
    Object.keys(errors.basic).length > 0 ||
    Boolean(errors.employer) ||
    Object.keys(errors.contract).length > 0 ||
    Object.keys(errors.investment).length > 0 ||
    Object.keys(errors.landShare).length > 0 ||
    errors.shareholders.some(Boolean) ||
    Object.keys(errors.budget).length > 0 ||
    errors.sites.some(Boolean)
  );
}

/**
 * Arsa payı oranı: ZORUNLU, `0 < x < 100`. Boş bırakmak `0` göndermek demekti.
 */
function landSharePctError(value: string): string | undefined {
  if (!value.trim()) return MESSAGES.landSharePctRequired;
  const parsed = numberOrNull(value);
  if (
    parsed === null ||
    parsed <= LAND_SHARE_PCT_EXCLUSIVE_MIN ||
    parsed >= LAND_SHARE_PCT_EXCLUSIVE_MAX
  ) {
    return MESSAGES.landSharePctRange;
  }
  return undefined;
}

/** Hissedar payı: ZORUNLU, `0 < x ≤ 100` (arsa payından FARKLI üst sınır). */
export function shareholderPctError(value: string): string | undefined {
  if (!value.trim()) return MESSAGES.shareholderPctRequired;
  const parsed = numberOrNull(value);
  if (
    parsed === null ||
    parsed <= SHAREHOLDER_PCT_EXCLUSIVE_MIN ||
    parsed > SHAREHOLDER_PCT_MAX
  ) {
    return MESSAGES.shareholderPctRange;
  }
  return undefined;
}

/** Yüzde alanı: boş geçerli, dolu ise 0..100 arası sayı olmalı. */
function pctError(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const parsed = numberOrNull(value);
  if (parsed === null || parsed < 0 || parsed > 100) {
    return MESSAGES.pctOutOfRange;
  }
  return undefined;
}

/**
 * Para alanı: boş geçerli, negatif hata. Sayıya çevrilemeyen giriş için §4.10'da
 * (sözleşme bedeli dışında) mesaj yok — sunucu 422'si kullanıcıya iletilir.
 */
function moneyError(value: string): string | undefined {
  const parsed = numberOrNull(value);
  if (parsed !== null && parsed < 0) return MESSAGES.negativeAmount;
  return undefined;
}

function assign<T extends object>(
  target: Partial<Record<keyof T, string>>,
  key: keyof T,
  message: string | undefined,
): Partial<Record<keyof T, string>> {
  return message ? { ...target, [key]: message } : target;
}

function validateContract(
  values: ContractValues,
  isDraft: boolean,
): TextErrors<ContractValues> {
  let errors: TextErrors<ContractValues> = {};

  // Zorunluluk kuralları — taslakta atlanır (§5.2).
  if (!isDraft) {
    if (!values.contractNo.trim()) {
      errors = { ...errors, contractNo: MESSAGES.contractNoRequired };
    }
    if (!values.signatureDate.trim()) {
      errors = { ...errors, signatureDate: MESSAGES.signatureDateRequired };
    }
    if (!values.amount.trim()) {
      errors = { ...errors, amount: MESSAGES.amountInvalid };
    }
    if (!values.startDate.trim()) {
      errors = { ...errors, startDate: MESSAGES.datesRequired };
    }
    if (!values.endDate.trim()) {
      errors = { ...errors, endDate: MESSAGES.datesRequired };
    }
    if (values.hasPriceEscalation && !values.baseIndexValue.trim()) {
      errors = { ...errors, baseIndexValue: MESSAGES.escalationRequired };
    }
    if (values.hasPriceEscalation && !values.indexType) {
      errors = { ...errors, indexType: MESSAGES.escalationRequired };
    }
  }

  // Tutarlılık kuralları — taslakta DA uygulanır (§5.2: eksik değil, yanlış veri).
  const amount = numberOrNull(values.amount);
  if (values.amount.trim() && amount === null) {
    errors = { ...errors, amount: MESSAGES.amountInvalid };
  } else if (amount !== null && amount < 0) {
    errors = { ...errors, amount: MESSAGES.negativeAmount };
  }
  if (
    values.startDate.trim() &&
    values.endDate.trim() &&
    durationDays(values.startDate, values.endDate) === null
  ) {
    errors = { ...errors, endDate: MESSAGES.endBeforeStart };
  }
  errors = assign(errors, "advancePct", pctError(values.advancePct));
  errors = assign(errors, "retainagePct", pctError(values.retainagePct));
  errors = assign(errors, "vatPct", pctError(values.vatPct));
  errors = assign(
    errors,
    "latePenaltyDaily",
    moneyError(values.latePenaltyDaily),
  );

  return errors;
}

/**
 * `investment` / `land_share` gruplarında yalnız tutarlılık kuralları denetlenir.
 * Bu grupların zorunlu alanları §4.10 tablosunda YOK; kendi kelimelerimizle
 * mesaj uydurmak yerine sunucu 422'si `backendErrorMessage()` ile gösterilir.
 */
function validateInvestment(values: InvestmentValues): TextErrors<InvestmentValues> {
  let errors: TextErrors<InvestmentValues> = {};
  errors = assign(errors, "salesTarget", moneyError(values.salesTarget));
  errors = assign(errors, "landCost", moneyError(values.landCost));
  return errors;
}

function validateLandShare(
  values: LandShareValues,
): TextErrors<Omit<LandShareValues, "shareholders">> {
  let errors: TextErrors<Omit<LandShareValues, "shareholders">> = {};
  errors = assign(errors, "ourSharePct", landSharePctError(values.ourSharePct));
  errors = assign(errors, "ownerSharePct", landSharePctError(values.ownerSharePct));
  errors = assign(errors, "dailyPenalty", moneyError(values.dailyPenalty));
  errors = assign(errors, "guaranteeAmount", moneyError(values.guaranteeAmount));
  if (
    values.notaryDate.trim() &&
    values.deliveryDate.trim() &&
    durationDays(values.notaryDate, values.deliveryDate) === null
  ) {
    errors = { ...errors, deliveryDate: MESSAGES.endBeforeStart };
  }
  return errors;
}

function validateBudget(values: BudgetValues): TextErrors<BudgetValues> {
  let errors: TextErrors<BudgetValues> = {};
  errors = assign(errors, "material", moneyError(values.material));
  errors = assign(errors, "labor", moneyError(values.labor));
  errors = assign(errors, "subcontractor", moneyError(values.subcontractor));
  errors = assign(errors, "overhead", moneyError(values.overhead));
  return errors;
}

export interface ValidateOptions {
  /** Taslak: yalnız `name` zorunlu; tutarlılık kuralları yine uygulanır (§5.2). */
  isDraft: boolean;
}

export function validateProjectForm(
  values: ProjectFormValues,
  { isDraft }: ValidateOptions,
): ProjectFormErrors {
  const isContracting = values.projectType === "taahhut";

  let basic: TextErrors<BasicInfoValues> = {};
  if (!values.basic.name.trim()) {
    basic = { ...basic, name: MESSAGES.nameRequired };
  }
  if (!isDraft) {
    if (!values.basic.category.trim()) {
      basic = { ...basic, category: MESSAGES.categoryRequired };
    }
    if (!values.basic.city.trim()) {
      basic = { ...basic, city: MESSAGES.cityRequired };
    }
  }

  const employer =
    !isDraft && isContracting && !values.employer.employerId
      ? MESSAGES.employerRequired
      : undefined;

  return {
    basic,
    ...(employer ? { employer } : {}),
    contract: isContracting ? validateContract(values.contract, isDraft) : {},
    investment:
      values.projectType === "kendi_yatirim"
        ? validateInvestment(values.investment)
        : {},
    landShare:
      values.projectType === "kat_karsiligi"
        ? validateLandShare(values.landShare)
        : {},
    // Yalnız ADI DOLU satırlar gövdeye girer (`form-state.ts`) — doğrulama da
    // aynı satırları hedefler, boş şablon satırı hata BASMAZ.
    shareholders:
      values.projectType === "kat_karsiligi"
        ? values.landShare.shareholders.map((row) =>
            row.name.trim() ? (shareholderPctError(row.sharePct) ?? null) : null,
          )
        : [],
    budget: validateBudget(values.budget),
    sites: values.sites.map((row) => siteRowError(row)),
  };
}

/** VKN biçimi (§4.10): 10 veya 11 haneli rakam; boş geçerli. */
export function taxNumberError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^\d{10,11}$/.test(trimmed) ? undefined : MESSAGES.taxNumberFormat;
}
