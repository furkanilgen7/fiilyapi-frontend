import type { AccountingPeriodListItem } from "@/lib/api/hooks/useAccountingPeriods";
import { formatDateDots, formatPeriod } from "@/lib/format";

/**
 * F-DKAP T2 · Dönem Kapanışı ekranının SAF katmanı: on iki aylık ızgarayı
 * kurar, satır durumunu türetir, özet şeridini sayar.
 *
 * Kanonik mockup: `Muhasebe - Dönem Kapanışı.dc.html` (DK). Yorumlardaki
 * sayılar O dosyanın SATIR numaralarıdır. Bu modülde AĞ ve DOM yoktur.
 *
 * 🔴 K2 — "ENGELLİ" durumu backend'den GELMEZ (`can_close` gibi bir karar
 * alanı yoktur, bilinçli): `draft_count > 0` OLGUSUNDAN burada türetilir.
 * Karar mantığı TEK bir yerdedir (`derivePeriodRowStatus`) — üç yerde `if`
 * yazmak YASAK, ekran ve testler bu fonksiyonu çağırır.
 *
 * 🔴 K3 — "KAYIT YOK" ayları backend HİÇ döndürmez (dönem kaydı proaktif
 * açılmaz). 12 ay − gelen kayıtlar = "kayıt yok"; bu ayların `id`si YOKTUR ve
 * eylemsizdir.
 */

export type PeriodRowStatus = "closed" | "closable" | "blocked" | "no_record";

export interface PeriodRow {
  readonly year: number;
  readonly month: number;
  readonly status: PeriodRowStatus;
  /** Kaydı olan aylarda backend satırı; "kayıt yok" ayında `undefined`. */
  readonly item: AccountingPeriodListItem | undefined;
}

/**
 * Bir backend satırından + "kayıt var mı" olgusundan durum türetir.
 *
 * 🔴 TEK KARAR NOKTASI — bu fonksiyonun DIŞINDA hiçbir yerde `draft_count`/
 * `status` okunarak ikinci bir "kapatılabilir mi" kararı YAZILMAZ.
 */
export function derivePeriodRowStatus(item: AccountingPeriodListItem | undefined): PeriodRowStatus {
  if (item === undefined) return "no_record";
  if (item.status === "closed") return "closed";
  return item.draft_count > 0 ? "blocked" : "closable";
}

/** DK:57-92 — on iki aylık ızgara, Ocak→Aralık (mockup sırası). */
export function buildPeriodRows(
  year: number,
  items: readonly AccountingPeriodListItem[],
): PeriodRow[] {
  const byMonth = new Map(items.map((item) => [item.month, item]));
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const item = byMonth.get(month);
    return { year, month, status: derivePeriodRowStatus(item), item };
  });
}

export interface PeriodSummary {
  readonly closed: number;
  readonly closable: number;
  readonly blocked: number;
  readonly noRecord: number;
}

/**
 * DK:69 — "6 kapalı · 1 kapatılabilir · 1 engelli · 4 kayıt yok". Dört sayı
 * da satırlardan SAYILIR; hiçbiri sabit yazılmaz (K4).
 */
export function summarizePeriodRows(rows: readonly PeriodRow[]): PeriodSummary {
  let closed = 0;
  let closable = 0;
  let blocked = 0;
  let noRecord = 0;
  for (const row of rows) {
    if (row.status === "closed") closed += 1;
    else if (row.status === "closable") closable += 1;
    else if (row.status === "blocked") blocked += 1;
    else noRecord += 1;
  }
  return { closed, closable, blocked, noRecord };
}

export function periodSummaryText(summary: PeriodSummary): string {
  return `${summary.closed} kapalı · ${summary.closable} kapatılabilir · ${summary.blocked} engelli · ${summary.noRecord} kayıt yok`;
}

export function periodRowLabel(row: PeriodRow): string {
  return formatPeriod(row.year, row.month);
}

/**
 * DK:99/107/117/... — durum rozetinin METNİ. Mockup'ın 🔒 emojisi burada
 * TAŞINMAZ: ekran onu `LockIcon` (`ui/icons`) olarak ayrı basar — çıplak
 * glif yasağının (F-SEM) sembol bekçisi hiçbir yerde delinmez.
 */
export function periodStatusLabel(status: PeriodRowStatus): string {
  if (status === "closed") return "Kapalı";
  if (status === "no_record") return "Kayıt yok";
  // "blocked" ve "closable" backend'de AYNI statüdür (`open`); mockup ikisine
  // de "Açık" yazar — ayrım satır zemininde/eylemde yaşar, rozette DEĞİL.
  return "Açık";
}

/** DK:66 — "Geri Aç" düğmesinin sabit gerekçesi (K1: yalnız `admin`). */
export const REOPEN_DISABLED_REASON = "Geri açma yetkisi yalnızca Sistem Yöneticisinde";

/** DK:236/246 — "kayıt yok" ayında kapatma düğmesinin gerekçesi. */
export const NO_RECORD_CLOSE_REASON = "Kaydı olmayan dönem zaten açıktır, kapatmaya gerek yok";

/** DK:44 — yazma yetkisi yoksa (K1: `full` altı). */
export const WRITE_DISABLED_REASON = "Muhasebe modülünde dönem kapatma yetkiniz yok.";

/**
 * "Dönemi Kapat" düğmesinin durumu — `undefined` ⇒ aktif, string ⇒ devre-dışı
 * gerekçesi (K6: silinmez, devre-dışı + görünür gerekçe).
 */
export function closeButtonDisabledReason(
  row: PeriodRow,
  canClose: boolean,
): string | undefined {
  if (row.status === "no_record") return NO_RECORD_CLOSE_REASON;
  if (row.status === "blocked") {
    const count = row.item?.draft_count ?? 0;
    return `Dönem kapatılamıyor — ${count} taslak fiş var`;
  }
  if (row.status === "closed") return undefined; // düğme zaten basılmaz
  if (!canClose) return WRITE_DISABLED_REASON;
  return undefined;
}

/**
 * "Geri Aç" düğmesinin durumu — yalnız kapalı satırlarda anlamlıdır.
 * `canReopen` `admin` eşiğinin (K1) kapı sonucudur, çağıran türetmez.
 */
export function reopenButtonDisabledReason(canReopen: boolean): string | undefined {
  return canReopen ? undefined : REOPEN_DISABLED_REASON;
}

/**
 * K5 — `closed_by_name` NULL olabilir (kapatılmamış dönem · silinmiş
 * kullanıcı). `"Bilinmiyor"` gibi bir metin UYDURULMAZ; tire basılır (mockup
 * DK:98/107 kapalı olmayan satırlarda zaten `—` kullanıyor — aynı kural).
 */
export function periodClosedByText(item: AccountingPeriodListItem | undefined): string {
  return item?.closed_by_name ?? "—";
}

/**
 * `closed_at` bir `date-time`dir (`2026-02-05T10:23:00Z` biçiminde); yalnız
 * TARİH kısmı basılır (mockup DK:99 `05.02.2026`, saat çizilmiyor).
 * `formatDateDots` `YYYY-MM-DD` bekler — `slice(0, 10)` ile budanır
 * (`payroll-sgk-derive.ts`teki aynı desenin kanonu).
 */
export function periodClosedAtText(item: AccountingPeriodListItem | undefined): string {
  if (item?.closed_at === null || item?.closed_at === undefined) return "—";
  return formatDateDots(item.closed_at.slice(0, 10));
}

/** DK:63 — "Fiş" sütunu: kaydı olmayan ayda `0` YAZILIR, `—` DEĞİL (mockup). */
export function periodEntryCountText(item: AccountingPeriodListItem | undefined): string {
  return String(item?.entry_count ?? 0);
}
