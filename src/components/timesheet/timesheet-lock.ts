import { splitDraftKey, type TimesheetDraft } from "./timesheet-draft";
import { TR_MONTHS_SHORT, WEEKDAY_LABELS } from "./week-derive";

/**
 * PLN-F2.4 · Puantajda KİLİTLİ GÜN (rapor onayı) — SAF katman, React yok.
 *
 * Kaynak: türetilmiş mockup `Şantiye - Puantaj (Kilitli Gün).dc.html` +
 * `PLANLAMA-SPEC.md` §3.14 P1–P5.
 *
 * ═══ §2.7 MODÜLERLİK ═══
 * Puantaj (çekirdek) planlamayı (`earned-value`) IMPORT ETMEZ. Kilit bilgisi
 * YALNIZ iki yerden gelir: `TimesheetWeek` (`locked_days` + EV-BORC-4'le
 * `day_locks`) ve kilit 409'unun gövdesi (`{detail, locked_days, day_locks}`).
 * İkisi de `toDayLocks`tan geçer — TEK dönüştürücü.
 *
 * ═══ RAPOR TARİHİ (CEO kararı 2026-09-25) ═══
 * Gün başına rapor tarihi EV-BORC-4'le `day_locks: [{day, report_date}]`
 * olarak gelir (backend PR'ı merge olana kadar yanıtlarda YOK → `null`).
 * Metin biçimleyicileri bu yüzden gün başına `reportDate` alır. Rapor tarihi
 * UYDURULMAZ: bilinmiyorsa metin "rapor onayıyla" der.
 */
export interface TimesheetDayLock {
  /** ISO gün (`YYYY-MM-DD`). */
  readonly day: string;
  /** Kilidi koyan raporun ISO tarihi; `null` = bilinmiyor (bugünkü sözleşme). */
  readonly reportDate: string | null;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function isoToUtc(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/** Biçimi VE takvimi doğrulanmış ISO gün (`2026-02-30` geçmez). */
function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
  return new Date(isoToUtc(value)).toISOString().slice(0, 10) === value;
}

function uniqueSorted(days: Iterable<string>): string[] {
  return [...new Set(days)].sort();
}

/* ── Dış veri → kilit ──────────────────────────────────────────────────── */

/**
 * 409 gövdesinin `locked_days`i — gövde DIŞ VERİDİR.
 *
 * KATI: dizi değilse, boşsa ya da TEK bir öğesi bile geçerli ISO gün değilse
 * `null` — o 409 kilit 409'u SAYILMAZ (kişi-gün çakışması dalına düşer).
 */
export function parseLockedDays(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every(isIsoDate)) return null;
  return uniqueSorted(value);
}

/**
 * Kilidin kaynağı — hafta yanıtı (`TimesheetWeek`) ya da kilit 409'unun
 * gövdesi. YAPISAL tiptir: EV-BORC-4 `day_locks`i openapi'ye ekleyince hafta
 * tipi buraya DEĞİŞİKLİKSİZ uyar; 409 gövdesi ise openapi'de yok, dış veri
 * olarak `unknown` alanlarla gelir.
 */
export interface DayLockSource {
  readonly locked_days?: unknown;
  /** EV-BORC-4: `[{day, report_date}]` — bugünkü şemada YOK. */
  readonly day_locks?: unknown;
}

/** `day_locks` öğesinden geçerli `{day, report_date}` çifti; bozuksa `null`. */
function parseDayLockItem(
  item: unknown,
): { day: string; reportDate: string } | null {
  if (item === null || typeof item !== "object") return null;
  const { day, report_date: reportDate } = item as {
    day?: unknown;
    report_date?: unknown;
  };
  return isIsoDate(day) && isIsoDate(reportDate) ? { day, reportDate } : null;
}

/**
 * TEK dönüştürücü: `{locked_days, day_locks?}` → gün başına kilit.
 *
 *   • Kilitli gün KÜMESİ `locked_days`tir (esas). Biçimsiz öğe sessizce
 *     atılır: bir çöp öğe bütün haftayı kilitsiz göstermemeli.
 *   • `day_locks`ta rapor tarihi olan gün o tarihi alır; yalnız
 *     `locked_days`te olan gün `reportDate: null` kalır (tarih UYDURULMAZ).
 *   • `day_locks`in bozuk öğesi atılır; `locked_days`te OLMAYAN günü kilit
 *     saymaz.
 */
export function toDayLocks(source: DayLockSource): TimesheetDayLock[] {
  const lockedDays = Array.isArray(source.locked_days)
    ? uniqueSorted(source.locked_days.filter(isIsoDate))
    : [];
  const reportDates = new Map<string, string>();
  if (Array.isArray(source.day_locks)) {
    for (const item of source.day_locks) {
      const parsed = parseDayLockItem(item);
      if (parsed !== null) reportDates.set(parsed.day, parsed.reportDate);
    }
  }
  return lockedDays.map((day) => ({
    day,
    reportDate: reportDates.get(day) ?? null,
  }));
}

/** Sunucu kilitleri ∪ 409'un getirdikleri — bilinen rapor tarihi bilinmeyene üstündür. */
export function mergeDayLocks(
  first: readonly TimesheetDayLock[],
  second: readonly TimesheetDayLock[],
): TimesheetDayLock[] {
  const byDay = new Map<string, TimesheetDayLock>();
  for (const lock of [...first, ...second]) {
    const existing = byDay.get(lock.day);
    if (
      existing === undefined ||
      (existing.reportDate === null && lock.reportDate !== null)
    ) {
      byDay.set(lock.day, lock);
    }
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/* ── Gün biçimleri ─────────────────────────────────────────────────────── */

function weekdayOf(iso: string): string {
  // `getUTCDay`: 0 = Pazar. Tablo Pazartesi başlar.
  const index = (new Date(isoToUtc(iso)).getUTCDay() + 6) % 7;
  return WEEKDAY_LABELS[index] ?? "";
}

function dayNumber(iso: string): number {
  return Number(iso.slice(8, 10));
}

function monthShort(iso: string): string {
  return TR_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1] ?? "";
}

/** "Pzt 21" ya da ay ile "Pzt 21 Eyl". */
function dayLabel(iso: string, withMonth: boolean): string {
  const base = `${weekdayOf(iso)} ${dayNumber(iso)}`;
  return withMonth ? `${base} ${monthShort(iso)}` : base;
}

function isConsecutive(sortedDays: readonly string[]): boolean {
  return sortedDays.every(
    (day, index) =>
      index === 0 ||
      isoToUtc(day) - isoToUtc(sortedDays[index - 1] ?? day) === DAY_MS,
  );
}

/**
 * Kilitli günlerin metni.
 *   • ARDIŞIK → aralık: "Pzt 21 – Per 24 Eyl"
 *   • ARDIŞIK DEĞİL → gün listesi: "Pzt 21, Çar 23, Per 24 Eyl"
 * Ay adı, günler aynı aydaysa YALNIZ sonda; ay değişiyorsa her günde yazılır.
 */
export function formatLockedDayList(days: readonly string[]): string {
  const sorted = uniqueSorted(days);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === undefined || last === undefined) return "";
  if (sorted.length === 1) return dayLabel(first, true);
  const sameMonth = sorted.every(
    (day) => day.slice(0, 7) === first.slice(0, 7),
  );
  if (isConsecutive(sorted)) {
    return `${dayLabel(first, !sameMonth)} – ${dayLabel(last, true)}`;
  }
  return sorted
    .map((day, index) =>
      dayLabel(day, !sameMonth || index === sorted.length - 1),
    )
    .join(", ");
}

/** Yalnız gün adları: ardışıksa "Cum–Paz", değilse "Pzt, Çar, Cum". */
function formatWeekdaySpan(days: readonly string[]): string {
  const sorted = uniqueSorted(days);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === undefined || last === undefined) return "";
  if (sorted.length === 1) return weekdayOf(first);
  if (isConsecutive(sorted)) return `${weekdayOf(first)}–${weekdayOf(last)}`;
  return sorted.map(weekdayOf).join(", ");
}

/** "2026-09-25" → "25.09.2026" (mockup biçimi); ISO değilse olduğu gibi. */
function formatReportDate(reportDate: string): string {
  if (!isIsoDate(reportDate)) return reportDate;
  const [year, month, day] = reportDate.split("-");
  return `${day}.${month}.${year}`;
}

/**
 * Kilidin nedeni — üç dal:
 *   • hepsi TEK rapor tarihine bağlı → "25.09.2026 raporuyla"
 *   • hepsi bilinmiyor (bugün)        → "rapor onayıyla"
 *   • birden çok tarih ya da bilinen/bilinmeyen karışık → "rapor onaylarıyla"
 *     (karışık hâlde tek tarih yazmak, bilinmeyen günü o rapora bağlamak =
 *     UYDURMAK olurdu).
 */
function lockReasonPhrase(locks: readonly TimesheetDayLock[]): string {
  const dates = new Set(locks.map((lock) => lock.reportDate));
  const [only] = [...dates];
  if (dates.size === 1 && only === null) return "rapor onayıyla";
  if (dates.size === 1 && only !== undefined && only !== null) {
    return `${formatReportDate(only)} raporuyla`;
  }
  return "rapor onaylarıyla";
}

/* ── Ekran metinleri ───────────────────────────────────────────────────── */

/** Kilit bandının KALIN ilk cümlesi (mockup M2). */
export function lockBannerHeadline(locks: readonly TimesheetDayLock[]): string {
  return `${formatLockedDayList(locks.map((lock) => lock.day))} ${lockReasonPhrase(locks)} kilitli.`;
}

/** Bandın sabit ikinci cümlesi — kilit puantajdan AÇILMAZ, günlükten açılır. */
export const LOCK_BANNER_HINT_PREFIX =
  "Bu günlerin hücreleri salt okunur · değişiklik için günlük kaydında";
export const LOCK_BANNER_HINT_ACTION = '"Kilidi aç (yetkili)"';

/** Bandın TAM metni — bileşen aynı parçaları kalın/ince basar. */
export function lockBannerText(locks: readonly TimesheetDayLock[]): string {
  return `${lockBannerHeadline(locks)} ${LOCK_BANNER_HINT_PREFIX} ${LOCK_BANNER_HINT_ACTION}.`;
}

function singleReason(reportDate: string | null): string {
  return reportDate === null
    ? "rapor onayı"
    : `${formatReportDate(reportDate)} raporu`;
}

/** Salt okunur popover'ın kilit notu (mockup M3). */
export function lockNoteText(reportDate: string | null): string {
  return `Bu gün kilitli · ${singleReason(reportDate)}`;
}

/** Kilitli gün başlığının `title`ı (mockup M1). */
export function lockTitleText(reportDate: string | null): string {
  return `Kilitli · ${singleReason(reportDate)}`;
}

/** Mockup (e) — kilit 409'u sonrası hata bandı. */
export function lockConflictText(discarded: readonly TimesheetDayLock[]): {
  title: string;
  body: string;
} {
  const days = uniqueSorted(discarded.map((lock) => lock.day));
  const title =
    days.length > 1
      ? "Bu günler kilitlendi; değişiklik kaydedilmedi."
      : "Bu gün kilitlendi; değişiklik kaydedilmedi.";
  const body = `${formatLockedDayList(days)}, siz düzenlerken ${lockReasonPhrase(discarded)} kilitlendi (409) · kilitli güne yapılan değişiklik geri alındı; diğer günler kaydedilmeye hazır.`;
  return { title, body };
}

/**
 * Mockup (b) — kısmen kilitli haftada kopyalama bildirimi. Haftada kilitli
 * gün yoksa `null`: çağıran eski ("N hücre kopyalandı") satırını basar.
 */
export function lockedCopyNotice({
  lockedDays,
  weekDays,
  sourceIsoWeek,
}: {
  lockedDays: readonly string[];
  weekDays: readonly string[];
  sourceIsoWeek: number;
}): string | null {
  const locked = new Set(lockedDays);
  const skipped = weekDays.filter((day) => locked.has(day));
  if (skipped.length === 0) return null;
  const filled = weekDays.filter((day) => !locked.has(day));
  return `Kopyalandı · kilitli ${skipped.length} gün atlandı (${formatLockedDayList(skipped)}). ${formatWeekdaySpan(filled)} ${sourceIsoWeek}. Hafta'dan dolduruldu.`;
}

/* ── Taslak ────────────────────────────────────────────────────────────── */

/**
 * §3.14 P4 — kilit 409'undan sonra: kilitli günlerdeki taslak ATILIR (hücre
 * sunucu değerine döner), kilitsiz günlerin taslağı AYNEN korunur. Girdi
 * değiştirilmez; yeni nesne döner.
 */
export function discardLockedDraft(
  draft: TimesheetDraft,
  lockedDays: ReadonlySet<string>,
): { draft: TimesheetDraft; discardedDays: string[] } {
  const kept: Record<string, TimesheetDraft[string]> = {};
  const discarded: string[] = [];
  for (const [key, value] of Object.entries(draft)) {
    const { workDate } = splitDraftKey(key);
    if (lockedDays.has(workDate)) discarded.push(workDate);
    else kept[key] = value;
  }
  return {
    draft: discarded.length === 0 ? draft : kept,
    discardedDays: uniqueSorted(discarded),
  };
}
