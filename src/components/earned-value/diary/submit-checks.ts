/**
 * PLN-F2.3 · Gönder kontrol çubuğu (İ:493-510, Ek Formlar "(b) Gerekçe boş ·
 * Gönder engelli") + çekirdeğe verilen `submitGate` — SAF.
 *
 * TEK KAYNAK backend'dir: `days/{day}.submit` (`can_submit` + `reasons[]`,
 * B2 `submit_blockers`). Backend kaydedilmiş hâli bilir; bu yüzden istemci
 * yalnız KENDİ bildiğini ekler: kilitli gün ve — taslak kirliyken — önizlenen
 * saat gerekçesi (kayıt `onBeforeSave` ile gönderimden önce yazılır, S1).
 *
 * ⚠️ Çiplerin sınıflandırması backend METNİNE bakar (yapısal kod yok —
 * raporda istek). Tanınmayan gerekçe kaybolmaz: ayrı bir uyarı çipi olur.
 */
import type { EvSubmitCheck } from "@/lib/api/models";
import type { AccessLevel } from "@/lib/auth/permissions";
import { hasAtLeast } from "@/lib/auth/permissions";

import { formatHours, type Centi } from "./hours";

export type CheckTone = "ok" | "warn";

export interface SubmitCheck {
  key: string;
  tone: CheckTone;
  label: string;
  /** "gerekçe yaz" bağlantısı (İ:500) — yalnız saat çipinde. */
  canWriteReason: boolean;
}

export interface SubmitInput {
  submit: EvSubmitCheck | null;
  /** Önizlenen dağıtılmamış saat (K14). */
  unallocated: Centi;
  reason: string;
  isDirty: boolean;
  isLocked: boolean;
  isForeman: boolean;
}

export interface SubmitState {
  checks: SubmitCheck[];
  note: { text: string; tone: CheckTone };
  /** S4: gerekçeler yalnız kontrol çubuğunda — çekirdek kendi kutusunda listelemez. */
  gate: { canSubmit: boolean; reasons: readonly string[]; showReasonsInCore: false } | null;
}

export const LOCKED_DAY_REASON = "Gün kilitli";

export type ReasonKind = "quantity" | "overrun" | "weather" | "hours" | "other";

/**
 * Backend gerekçesinin TÜRÜ — çip ayrımının TEK yeri. Backend bugün yalnız
 * metin döner (`SubmitCheckOut.reasons: string[]`, B2 `submit_blockers`);
 * ⚠️ `reasons[].code` gelince bu fonksiyon koda bakacak şekilde değişir,
 * çağıranlar değişmez (raporda backend isteği).
 */
export function classifyReason(reason: string): ReasonKind {
  if (/^Miktar girilmedi/.test(reason)) return "quantity";
  if (/aşan satır/.test(reason)) return "overrun";
  if (/^Hava/.test(reason)) return "weather";
  if (/dağıtılmamış/.test(reason)) return "hours";
  return "other";
}

function check(key: string, tone: CheckTone, label: string, canWriteReason = false): SubmitCheck {
  return { key, tone, label, canWriteReason };
}

function hoursCheck(unallocated: Centi, reason: string): SubmitCheck {
  if (unallocated === 0) return check("hours", "ok", "Bütün saatler dağıtıldı");
  const direction = unallocated > 0 ? "dağıtılmamış" : "fazla dağıtılmış";
  const hasReason = reason.trim() !== "";
  const tail = hasReason ? "gerekçe yazıldı" : "gönderim engelli";
  return check("hours", "warn", `${formatHours(Math.abs(unallocated))} a-s ${direction} · ${tail}`, !hasReason);
}

function buildChecks(reasons: readonly string[], input: SubmitInput): SubmitCheck[] {
  const quantity = reasons.find((r) => ["quantity", "overrun"].includes(classifyReason(r)));
  const weather = reasons.find((r) => classifyReason(r) === "weather");
  const others = reasons.filter((r) => classifyReason(r) === "other");
  return [
    quantity ? check("quantity", "warn", quantity) : check("quantity", "ok", "Miktarlar girildi"),
    hoursCheck(input.unallocated, input.reason),
    weather ? check("weather", "warn", "Hava eksik") : check("weather", "ok", "Hava girildi"),
    ...others.map((r, i) => check(`other-${i}`, "warn", r)),
  ];
}

/**
 * Kaydedilmemiş dağıtım kapıyı KAPATMAZ: "Kaydet & Gönder" önce `onBeforeSave`
 * ile dağıtımı yazar (S1). Backend'in saat gerekçesi KAYDEDİLMİŞ hâle aittir;
 * taslak kirliyken o gerekçe yerine önizlemeden kurulan saat gerekçesi konur
 * (gerekçe yazıldıysa açılır). Backend gönderimde yine 422 ile doğrular.
 */
function buildGate(input: SubmitInput): SubmitState["gate"] {
  if (input.submit === null) return null;
  const reasons = input.isDirty
    ? input.submit.reasons.filter((r) => classifyReason(r) !== "hours")
    : [...input.submit.reasons];
  const hoursBlocked = input.unallocated !== 0 && input.reason.trim() === "";
  if (input.isDirty && hoursBlocked) reasons.push(`${formatHours(input.unallocated)} a-s dağıtılmamış; gerekçe gerekli`);
  if (input.isLocked) reasons.push(LOCKED_DAY_REASON);
  const backendAllows = input.isDirty || input.submit.can_submit;
  return { canSubmit: backendAllows && reasons.length === 0, reasons, showReasonsInCore: false };
}

function buildNote(input: SubmitInput, gate: SubmitState["gate"]): SubmitState["note"] {
  if (input.isLocked) return { text: "Gün kilitli", tone: "warn" };
  if (input.isForeman) return { text: "Gönderim mühendiste", tone: "warn" };
  const reasons = gate?.reasons ?? [];
  if (input.unallocated !== 0 && input.reason.trim() === "") {
    return { text: "Dağıtılmamış saat gönderimi engelliyor", tone: "warn" };
  }
  if (reasons.some((r) => classifyReason(r) === "overrun")) return { text: "Aşım gerekçesi gönderimi engelliyor", tone: "warn" };
  if (gate !== null && !gate.canSubmit) return { text: "Gönderim engelli", tone: "warn" };
  return { text: input.unallocated !== 0 ? "Gerekçeyle gönderilebilir" : "Gönderime hazır", tone: "ok" };
}

export function buildSubmitState(input: SubmitInput): SubmitState {
  const gate = buildGate(input);
  return { checks: buildChecks(input.submit?.reasons ?? [], input), note: buildNote(input, gate), gate };
}

export interface AccessInput {
  evLevel: AccessLevel | undefined;
  diaryCanWrite: boolean;
  isLocked: boolean;
  isSiteCompleted: boolean;
}

export interface AllocationAccess {
  canEdit: boolean;
  /** İ:401 "Salt okunur · …" metni; düzenlenebilirse `null`. */
  readOnlyText: string | null;
  isForeman: boolean;
  /** İ:150-155 formen bandı: günlüğü yazar ama planlamayı yazamaz. */
  showForemanBand: boolean;
  /** "Kilidi aç (yetkili)" — `earned_value` approve (K17, B2 uç tablosu). */
  canUnlock: boolean;
}

/**
 * K17: dağıtımı düzenleme = `earned_value` draft+; altı (formen) salt okur.
 * Kilitli gün ve tamamlanmış şantiye (backend 409, F1.6.2 deseni) herkese
 * salt okunur. Bilinmeyen seviye `hasAtLeast` kuralıyla yetkili sayılır.
 */
export function resolveAllocationAccess(input: AccessInput): AllocationAccess {
  const isForeman = !hasAtLeast(input.evLevel, "draft");
  const readOnlyText = input.isLocked
    ? "gün kilitli"
    : input.isSiteCompleted
      ? "şantiye tamamlandı"
      : isForeman
        ? "Saat Dağıtımı mühendis tarafından yapılır"
        : null;
  return {
    canEdit: readOnlyText === null,
    readOnlyText,
    isForeman,
    showForemanBand: isForeman && input.diaryCanWrite && !input.isLocked,
    canUnlock: hasAtLeast(input.evLevel, "approve") && !input.isSiteCompleted,
  };
}
