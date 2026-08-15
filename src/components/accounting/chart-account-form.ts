import type {
  ChartAccountResponse,
  ChartAccountType,
} from "@/lib/api/hooks/useChartOfAccounts";
import type { ChartAccountUpdate } from "@/lib/api/hooks/useChartOfAccountMutations";

import { ACCOUNT_TYPE_LABELS } from "./chart-of-accounts-rows";

/**
 * F-MU1 T4 · Hesap Ekle/Düzenle diyaloğunun SAF katmanı.
 *
 * 🔴 Form mockup'ı YOKTUR (S-FRM kanonu): alanlar `ChartAccountCreate`ten
 * BİREBİR türer ve DÖRTTÜR — `code` · `name` · `account_type` · `is_active`.
 * `balance`/`class_code`/`level` TÜREVDİR (`schemas.py`: `extra="forbid"`
 * yüzünden gövdeye girerlerse **422**), bu yüzden formda salt-okunur bile
 * gösterilmezler: kullanıcı düzenlediğini sanacağı bir sayı görmemelidir.
 */

export interface ChartAccountFormState {
  readonly code: string;
  readonly name: string;
  readonly accountType: ChartAccountType;
  readonly isActive: boolean;
}

/**
 * 🔴 Kod dilbilgisi — `backend/app/modules/accounting/codes.py`
 * `ACCOUNT_CODE_PATTERN` ile BİREBİR: `NN` (grup) · `NNN` (ana hesap) ·
 * `NNN.NN` (alt hesap). İlk hane `0` olamaz (sınıfsız hesap yoktur) ve üçüncü
 * kırılım (`NNN.NN.NNN`) hiçbir mockup'ta yoktur → AÇILMAZ.
 *
 * İstemcideki bu kopya bir KOLAYLIKTIR, kapı DEĞİLDİR: sunucu aynı deseni hem
 * şemada hem DB CHECK'inde tutar ve son sözü o söyler.
 */
export const CHART_ACCOUNT_CODE_PATTERN = /^(?:[1-9][0-9]|[1-9][0-9]{2}(?:\.[0-9]{2})?)$/;

export const CHART_ACCOUNT_FORM_BLOCKERS = {
  code: "Hesap kodu zorunludur.",
  codeFormat: "Hesap kodu 10 · 100 ya da 100.01 biçiminde olmalıdır; ilk hane 0 olamaz.",
  name: "Hesap adı zorunludur.",
} as const;

/** `Tür` açılırının seçenekleri — etiketler HP tablosunun kanonundan gelir. */
export const ACCOUNT_TYPE_OPTIONS: readonly {
  readonly value: ChartAccountType;
  readonly label: string;
}[] = (Object.keys(ACCOUNT_TYPE_LABELS) as ChartAccountType[]).map((value) => ({
  value,
  label: ACCOUNT_TYPE_LABELS[value],
}));

/** Yeni hesabın başlangıcı: `is_active` sunucu varsayılanıyla (`true`) aynı. */
export function emptyChartAccountForm(): ChartAccountFormState {
  return { code: "", name: "", accountType: "asset", isActive: true };
}

export function chartAccountFormOf(account: ChartAccountResponse): ChartAccountFormState {
  return {
    code: account.code,
    name: account.name,
    accountType: account.account_type,
    isActive: account.is_active,
  };
}

/**
 * Kaydet kapısı. Liste boş değilse düğme KAPALIdır ve gerekçe EKRANDA görünür
 * (`journalFormBlockers` ile aynı sözleşme).
 */
export function chartAccountFormBlockers(state: ChartAccountFormState): readonly string[] {
  const blockers: string[] = [];
  const code = state.code.trim();
  if (code.length === 0) blockers.push(CHART_ACCOUNT_FORM_BLOCKERS.code);
  else if (!CHART_ACCOUNT_CODE_PATTERN.test(code))
    blockers.push(CHART_ACCOUNT_FORM_BLOCKERS.codeFormat);
  if (state.name.trim().length === 0) blockers.push(CHART_ACCOUNT_FORM_BLOCKERS.name);
  return blockers;
}

/**
 * `PATCH` gövdesi yalnız DEĞİŞEN alanları taşır (`BoqItemFormModal` emsali).
 * Hiçbir alan değişmediyse istek ATILMAZ — `code` değişmemiş bir hesabı
 * göndermek, kod kilidi 409'unu (`ACCOUNT_CODE_LOCKED`) boş yere riske atardı.
 */
export function changedChartAccountFields(
  state: ChartAccountFormState,
  original: ChartAccountResponse,
): ChartAccountUpdate {
  const body: ChartAccountUpdate = {};
  const code = state.code.trim();
  const name = state.name.trim();
  if (code !== original.code) body.code = code;
  if (name !== original.name) body.name = name;
  if (state.accountType !== original.account_type) body.account_type = state.accountType;
  if (state.isActive !== original.is_active) body.is_active = state.isActive;
  return body;
}
