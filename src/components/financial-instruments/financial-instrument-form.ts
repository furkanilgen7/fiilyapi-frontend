import { normalizeDecimalInput } from "@/lib/decimal";
import { formatDateDots } from "@/lib/format";
import type {
  FinancialInstrumentDirection,
  FinancialInstrumentKind,
} from "@/lib/api/hooks/useFinancialInstruments";
import type { FinancialInstrumentCreate } from "@/lib/api/hooks/useFinancialInstrumentMutations";

/**
 * F-CEK · **YENİ ÇEK / SENET** formunun SAF türev katmanı.
 * Kanonik mockup: `projedesign/Form - Cek Ekle.dc.html` ("FCE"); yorumlardaki
 * `FCE:n` O dosyanın SATIR numaralarıdır.
 *
 * 🔴 **SÖZLEŞME KISITI TİPTE YAŞAMAZ.** `openapi-typescript`
 * `FinancialInstrumentCreate.serial_no`yu `string` diye üretir; `maxLength:
 * 50` tipte İFADE EDİLEMEZ. `typecheck` yeşilken canlı **422** verir — bu
 * modülün kardeşi bordro tam bu sınıf yüzünden altı gün ölü kaldı. Korkuluk
 * bu yüzden BURADADIR ve sabitler `financial-instrument-contract.test.ts`
 * ile sözleşmeye ÇAKILIDIR (şema değişirse test kırmızı olur).
 *
 * 🔴 **MOCKUP'IN HTML YORUMU BAYAT — SÖZLEŞMEDEN ÖLÇÜLDÜ:** FCE:38 `POST
 * /checks` yazar; gerçek uç **`POST /financial-instruments`**tır (`/checks`
 * diye bir yol YOKTUR — `openapi/openapi.json`, 232 yol / 340 operasyon).
 *
 * 🔴 **DURUM ALANI FORMDA YOKTUR** (FCE:48, FCE:174-182). Şema
 * `additionalProperties: false`tır: `status` gövdeye girerse **422**. Yeni
 * kayıt HER ZAMAN `portfolio` doğar; tahsil/ödeme/ciro AYRI uçtur
 * (`POST /financial-instruments/{id}/status`) ve bu ekranda tetikleyicisi
 * yoktur.
 */

/* ── Sözleşmeden ölçülen sınırlar (kaynak: `FinancialInstrumentCreate`) ──── */

export const SERIAL_NO_MAX_LENGTH = 50;
export const DRAWER_NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 200;
export const BANK_NAME_MAX_LENGTH = 100;
/** `amount` string dalının deseni en fazla İKİ ondalık basamak kabul eder. */
export const AMOUNT_MAX_FRACTION_DIGITS = 2;

export interface InstrumentSegmentOption<TValue extends string> {
  value: TValue;
  label: string;
  /** FCE satır numarası — mockup izlenebilirliği. */
  line: number;
}

/** FCE:106-109 — KAPALI küme, sıra mockup'ın sırasıdır. */
export const INSTRUMENT_KIND_OPTIONS: readonly InstrumentSegmentOption<FinancialInstrumentKind>[] =
  [
    { value: "cheque", label: "Çek", line: 107 },
    { value: "promissory_note", label: "Senet", line: 108 },
  ];

/** FCE:114-117 — KAPALI küme. */
export const INSTRUMENT_DIRECTION_OPTIONS: readonly InstrumentSegmentOption<FinancialInstrumentDirection>[] =
  [
    { value: "received", label: "Alınan", line: 115 },
    { value: "issued", label: "Verilen", line: 116 },
  ];

/**
 * 🔴 FCE:41-45 (KARAR 2) — Tür ve Yön AYRI segmentlerdir, birleşik tek seçim
 * DEĞİL: dört bileşimin DÖRDÜ de geçerlidir (verilen senet dahil). Rozet
 * (FCE:120-124) seçili bileşimi CANLI gösterir ve iki segmentten TÜRETİLİR —
 * dördüncü bir etiket listesi yazılmaz.
 */
export function instrumentCompositionLabel(
  kind: FinancialInstrumentKind,
  direction: FinancialInstrumentDirection,
): string {
  const kindLabel = INSTRUMENT_KIND_OPTIONS.find((option) => option.value === kind)!.label;
  const directionLabel = INSTRUMENT_DIRECTION_OPTIONS.find(
    (option) => option.value === direction,
  )!.label;
  // `toLocaleUpperCase("tr-TR")`: "Verilen" → "VERİLEN" (noktalı İ). Varsayılan
  // yerel ayarla "VERILEN" basardı ve rozet Türkçe olmazdı.
  return `${directionLabel} ${kindLabel}`.toLocaleUpperCase("tr-TR");
}

/* ── Form durumu ─────────────────────────────────────────────────────────── */

export interface InstrumentFormValues {
  kind: FinancialInstrumentKind;
  direction: FinancialInstrumentDirection;
  serialNo: string;
  drawerName: string;
  /** Kullanıcının yazdığı ham metin (TR virgülü olabilir). */
  amountText: string;
  issueDate: string;
  dueDate: string;
  description: string;
  bankName: string;
  projectId: string;
  bankAccountId: string;
}

export const EMPTY_INSTRUMENT_FORM: InstrumentFormValues = {
  // FCE:107/115 — mockup'ta ETKİN olan bileşim "ALINAN ÇEK"tir.
  kind: "cheque",
  direction: "received",
  serialNo: "",
  drawerName: "",
  amountText: "",
  issueDate: "",
  dueDate: "",
  description: "",
  bankName: "",
  projectId: "",
  bankAccountId: "",
};

/* ── Korkuluklar ─────────────────────────────────────────────────────────── */

/**
 * 🔴 FCE:141-147 (KARAR 4) — vade hatası **ALANIN HEMEN ALTINDA** basılır,
 * modal altındaki genel bantta DEĞİL.
 *
 * 🔑 Bu kısıt **ALANLAR ARASIDIR** ve şemada ifade EDİLEMEZ; ama sunucu onu
 * GERÇEKTEN uygular (`POST /financial-instruments` açıklaması: *"`due_date <
 * issue_date` → 422"*). Yani buradaki denetim bir *kolaylık* değil, sunucu
 * kuralının AYNASIDIR — kaldırılırsa kullanıcı formu kaydedebilir ve 422 alır.
 */
export function dueDateError(issueDate: string, dueDate: string): string | undefined {
  if (issueDate === "" || dueDate === "") return undefined;
  if (dueDate >= issueDate) return undefined;
  // FCE:145 metni birebir; tarih `formatDateDots` ile TR biçiminde basılır.
  return `Vade, keşide tarihinden önce olamaz — en az ${formatDateDots(issueDate)} olmalı`;
}

/**
 * `amount` iki kapıdan geçer (`FinancialInstrumentCreate.amount`):
 *   · sayısal dal `exclusiveMinimum: 0` ⇒ 0 ve negatif **422**;
 *   · string dalının deseni en fazla İKİ ondalık basamak kabul eder ⇒
 *     `0.005` **422** (şema açıklaması: *"sessizce yuvarlanmaz"*).
 */
export function amountError(amountText: string): string | undefined {
  if (amountText.trim() === "") return undefined;
  const normalized = normalizeDecimalInput(amountText);
  if (normalized === null) return "Tutar sayı olmalıdır.";
  if (Number(normalized) <= 0) return "Tutar sıfırdan büyük olmalıdır.";
  const fraction = normalized.split(".")[1] ?? "";
  if (fraction.length > AMOUNT_MAX_FRACTION_DIGITS) {
    return `Tutar en fazla ${AMOUNT_MAX_FRACTION_DIGITS} ondalık basamak taşır (kuruş).`;
  }
  return undefined;
}

/** Uzunluk sınırı aşan METİN alanları — sözleşmenin `maxLength`i. */
export function lengthError(value: string, max: number): string | undefined {
  return value.length > max ? `En fazla ${max} karakter.` : undefined;
}

/**
 * Kaydet düğmesinin kapısı. `undefined` = gönderilebilir.
 *
 * 🔴 Gerekçe METNİ döner, boolean DEĞİL: FCE:196 modal altında *"neden
 * kaydedilemiyor"* yazar. Boolean dönseydi o satır elle yazılırdı ve
 * kuraldan koparak bayatlardı.
 */
export function instrumentFormBlockReason(values: InstrumentFormValues): string | undefined {
  if (values.serialNo.trim() === "") return "Çek / Senet no zorunludur.";
  if (values.drawerName.trim() === "") return "Keşideci zorunludur.";
  if (values.issueDate === "") return "Keşide tarihi zorunludur.";
  if (values.dueDate === "") return "Vade zorunludur.";
  if (values.amountText.trim() === "") return "Tutar zorunludur.";

  const serial = lengthError(values.serialNo.trim(), SERIAL_NO_MAX_LENGTH);
  if (serial !== undefined) return `Çek / Senet no: ${serial}`;
  const drawer = lengthError(values.drawerName.trim(), DRAWER_NAME_MAX_LENGTH);
  if (drawer !== undefined) return `Keşideci: ${drawer}`;
  const description = lengthError(values.description.trim(), DESCRIPTION_MAX_LENGTH);
  if (description !== undefined) return `Açıklama: ${description}`;
  const bank = lengthError(values.bankName.trim(), BANK_NAME_MAX_LENGTH);
  if (bank !== undefined) return `Banka: ${bank}`;

  const amount = amountError(values.amountText);
  if (amount !== undefined) return amount;

  // FCE:196 — vade hatası düzeltilmeden kaydedilemez.
  const due = dueDateError(values.issueDate, values.dueDate);
  if (due !== undefined) return "Vade tarihi düzeltilmeden kaydedilemez";

  return undefined;
}

/**
 * Gövdeyi kurar.
 *
 * 🔴 Boş bırakılan OPSİYONEL alan gövdeye **HİÇ eklenmez** (`EmployerFormModal`
 * / `PayrollPeriodFormModal` deseni): açıkça `null` göndermek "alanı temizle"
 * demektir ve bir OLUŞTURMA isteğinde anlamsızdır. `min_length: 1` yüzünden
 * boş dize göndermek ayrıca **422**dir.
 *
 * 🔴 `status` GÖVDEYE GİRMEZ — şema `additionalProperties: false`tır.
 */
export function buildInstrumentCreateBody(
  values: InstrumentFormValues,
): FinancialInstrumentCreate {
  const description = values.description.trim();
  const bankName = values.bankName.trim();
  return {
    instrument_kind: values.kind,
    direction: values.direction,
    serial_no: values.serialNo.trim(),
    drawer_name: values.drawerName.trim(),
    issue_date: values.issueDate,
    due_date: values.dueDate,
    // Ondalık AYRIŞTIRILIR ama YUVARLANMAZ: sunucu ölçeği kendi denetler.
    amount: normalizeDecimalInput(values.amountText) ?? values.amountText.trim(),
    ...(description === "" ? {} : { description }),
    ...(bankName === "" ? {} : { bank_name: bankName }),
    ...(values.projectId === "" ? {} : { project_id: values.projectId }),
    ...(values.bankAccountId === "" ? {} : { bank_account_id: values.bankAccountId }),
  };
}
