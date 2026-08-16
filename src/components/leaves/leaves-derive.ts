import { formatDateDots, formatDecimal, formatPercent } from "@/lib/format";
import type { LeaveBalanceResponse, LeaveRequestResponse } from "@/lib/api/hooks/useLeaves";

import {
  CARRYOVER_RISK_LABEL,
  NO_ENTITLEMENT_HINT,
  NO_ENTITLEMENT_LABEL,
  NOT_DEDUCTED_LABEL,
  PENDING_TABLE_TITLE,
  UNKNOWN_VALUE,
  UNIT_DAYS,
} from "./leaves-labels";

/**
 * F-IZN T3 · İZ ekranının SAF türetmeleri (React YOK, DOM YOK).
 * Yorumlardaki sayılar `İK - İzin Yönetimi.dc.html`in SATIR numaralarıdır.
 *
 * Ekranın bütün "karar"ları burada yaşar ki ikiz test dosyası onları
 * bileşen kurmadan, ayrıştırıcı kurulumlarla ölçebilsin.
 */

export { formatDateDots };

/** Gün sayısı gösterimi — Decimal alanlar string gelir ("9.00" → "9"). */
const DAY_FRACTION_DIGITS = 1;

export function formatDays(value: string | number): string {
  return formatDecimal(value, DAY_FRACTION_DIGITS);
}

/* ── K4 · istemci tarafı JOIN ───────────────────────────────────────────── */

/**
 * 🔴 K4: `LeaveRequestResponse`ta "Kalan Hak" (66/77) YOKTUR. Sütunun tek
 * kaynağı özet ucunun `balances[]` dizisidir ve eşleşme `personnel_id`
 * üzerinden İSTEMCİDE kurulur (satır başına ikinci istek atılmaz).
 */
export function buildBalanceIndex(
  balances: readonly LeaveBalanceResponse[] | undefined,
): ReadonlyMap<string, LeaveBalanceResponse> {
  return new Map((balances ?? []).map((balance) => [balance.personnel_id, balance]));
}

/** "Kalan Hak" hücresinin görünümünü belirleyen üç ayrı anlam. */
export type RemainingTone = "ok" | "unknown" | "exceeded" | "not-deducted";

export interface RemainingCell {
  label: string;
  tone: RemainingTone;
}

/**
 * 66/77/87/97 — talep satırının "Kalan Hak" hücresi.
 *
 * ÜÇ ayrı hâl, üç ayrı metin (birbirinin yerine geçmezler):
 *  1. 🔴 K9 — `deducts_from_annual === false`: yıllık bakiye bu satır için
 *     ANLAMSIZDIR (mockup 87 "Rapor" der ama o sözcük yalnız hastalık iznine
 *     özgüdür; "Ücretsiz İzin"e basılsa yalan olurdu) → "Düşmez".
 *  2. 🔴 K4 — eşleşen bakiye YOK ya da `remaining === null`: hak
 *     HESAPLANAMAZ → "—". `0` BASILMAZ (0 "hakkı bitti" der).
 *  3. Sayı var: "N gün"; `days` kalanı aşıyorsa hücre uyarı tonuna geçer (97).
 */
export function deriveRemainingCell(
  request: Pick<LeaveRequestResponse, "personnel_id" | "days" | "deducts_from_annual">,
  balances: ReadonlyMap<string, LeaveBalanceResponse>,
): RemainingCell {
  if (!request.deducts_from_annual) return { label: NOT_DEDUCTED_LABEL, tone: "not-deducted" };

  const remaining = balances.get(request.personnel_id)?.remaining;
  if (remaining === undefined || remaining === null) {
    return { label: UNKNOWN_VALUE, tone: "unknown" };
  }

  const label = `${formatDays(remaining)} ${UNIT_DAYS}`;
  return { label, tone: request.days > Number(remaining) ? "exceeded" : "ok" };
}

/**
 * 99 — onay düğmesi hak aşımında PASİFtir.
 *
 * 🔴 Red HER ZAMAN AKTİFtir; şema bunu açıkça yazar ("hak aşımı ya da çakışma
 * yüzünden onaylanamayan talep REDDEDİLEBİLİR") — bu yüzden bu fonksiyonun
 * red için bir ikizi YOKTUR, olsaydı yanlış bir kapı doğardı.
 *
 * Bilinmeyen kalan (K4) onayı ENGELLEMEZ: eşik NULL'sa aşım İDDİA EDİLEMEZ,
 * karar sunucunun (409) işidir.
 */
export function isApprovalBlocked(
  request: Pick<LeaveRequestResponse, "personnel_id" | "days" | "deducts_from_annual">,
  balances: ReadonlyMap<string, LeaveBalanceResponse>,
): boolean {
  return deriveRemainingCell(request, balances).tone === "exceeded";
}

/** 98 — hak aşan satırın açıklama hücresine eklenen fazlalık ("4 gün fazla"). */
export function overrunDays(
  request: Pick<LeaveRequestResponse, "personnel_id" | "days" | "deducts_from_annual">,
  balances: ReadonlyMap<string, LeaveBalanceResponse>,
): number | null {
  if (!isApprovalBlocked(request, balances)) return null;
  const remaining = Number(balances.get(request.personnel_id)?.remaining);
  return request.days - remaining;
}

/* ── K5 · tablo başlığı ─────────────────────────────────────────────────── */

/**
 * 🔴 K5: 56'daki sayı SATIR SAYISI DEĞİLDİR — mockup "(6)" der ve 4 satır
 * çizer, çünkü liste SAYFALIDIR.
 *
 * `total` seçildi (`pending_requests` değil): `total` tabloyu dolduran ucun
 * KENDİ sayacıdır ve tabloyla AYNI süzgeci (`status=pending`) paylaşır. KPI'ın
 * `pending_requests`i AYRI bir uçtan gelir; iki uç arasındaki yarışta başlık
 * ile tablo çelişebilirdi.
 */
export function pendingTableHeading(total: number | undefined): string {
  return total === undefined ? PENDING_TABLE_TITLE : `${PENDING_TABLE_TITLE} (${total})`;
}

/* ── Bakiye tablosu türevleri (122-171) ─────────────────────────────────── */

/**
 * 135 "2 yıl 1 ay" · 162 "5 ay" — `hire_date` NULL ise ikisi de NULL gelir ve
 * kıdem BİLİNMEZ ("—"). Yıl 0 ise yalnız ay, ay 0 ise yalnız yıl yazılır.
 */
export function seniorityText(years: number | null, months: number | null): string {
  if (years === null && months === null) return UNKNOWN_VALUE;
  const y = years ?? 0;
  const m = months ?? 0;
  // İşe yeni giren personel: kıdem BİLİNİYOR ve sıfırdır — "—" (bilinmiyor)
  // ile karışmasın diye açıkça "0 ay" yazılır.
  if (y === 0 && m === 0) return "0 ay";
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} yıl`);
  if (m > 0) parts.push(`${m} ay`);
  return parts.join(" ");
}

/** 126/136/163 — "Yıllık Hak"; NULL hak HESAPLANAMAZ demektir → "—". */
export function entitlementText(annualEntitlement: number | null): string {
  return annualEntitlement === null ? UNKNOWN_VALUE : formatDays(annualEntitlement);
}

/**
 * 137/146/155/164 — "Devreden".
 *
 * Alan şemada NULL OLAMAZ (string decimal), ama mockup 164'te "—" yazar: hakkı
 * hesaplanamayan personelin devir hesabı da YOKTUR. Ayrım hakka bağlanır
 * (`annual_entitlement === null`), sayının kendisine değil — 146 "0" basar ve
 * o 0 GERÇEKtir (devir yok), 164'ün "—"si ise BİLİNMİYORdur.
 */
export function carriedOverText(balance: LeaveBalanceResponse): string {
  if (balance.annual_entitlement === null) return UNKNOWN_VALUE;
  return formatDays(balance.carried_over);
}

/**
 * 129/139/166 — "Kalan".
 *
 * 🔴 NULL → "Hak yok" (166). `0` BASILMAZ: 0 "hakkını bitirdi" demektir ve
 * kıdemi 1 yılı doldurmamış personel için YALAN olurdu. Sıfır GERÇEKTEN
 * sıfırsa "0" basılır — iki hâl ayrı metin verir.
 */
export function remainingBalanceText(remaining: string | null): string {
  return remaining === null ? NO_ENTITLEMENT_LABEL : formatDays(remaining);
}

/**
 * 151/155/158 — devreden günün yıl sonunda yanma riski.
 *
 * 🔴 Sunucu SATIR BAŞINA bayrak VERMEZ (`carryover_risk_personnel` yalnız
 * KPI sayacıdır). Eşik icat etmemek için risk, elde olan tek dürüst sinyale
 * bağlandı: devreden gün varsa o günler yıl sonunda yanabilir. Açık borç:
 * sunucunun saydığı eşik satır düzeyinde açılırsa bu türetme onunla değişir.
 */
export function hasCarryoverRisk(balance: LeaveBalanceResponse): boolean {
  return Number(balance.carried_over) > 0;
}

export interface UsageCell {
  /** İlerleme çubuğunun genişliği (%) — hesaplanamıyorsa `null`. */
  pct: number | null;
  text: string;
}

/**
 * 130/140/158/167 — "Kullanım" sütunu.
 *
 * `usage_pct` NULL ise çubuk HİÇ çizilmez ve 167'nin cümlesi yazılır. Risk
 * satırında yüzde yerine 158'in uyarısı basılır (mockup aynı hücrede yüzdeyi
 * gizler), çubuk kalır.
 */
export function usageCell(balance: LeaveBalanceResponse): UsageCell {
  if (balance.usage_pct === null) return { pct: null, text: NO_ENTITLEMENT_HINT };
  const pct = Math.min(Math.max(balance.usage_pct, 0), 100);
  if (hasCarryoverRisk(balance)) return { pct, text: CARRYOVER_RISK_LABEL };
  return { pct, text: `${formatPercent(balance.usage_pct)} kullanıldı` };
}
