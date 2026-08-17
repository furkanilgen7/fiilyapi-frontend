import { isIsoDate } from "@/components/site-planning/week";
import { formatMonthShort, formatPeriodShort } from "@/lib/format";

/**
 * Proje Takvimi (Gantt) zaman ızgarasının SAF aritmetiği — F-TKV T2.
 *
 * 🔴 KANON (görev emri, MK-1 K15'in kardeşi): **bar geometrisi TARİHTEN
 * hesaplanır, mockup'ın yüzde sabitlerinden KOPYALANMAZ; HTML yorumları da
 * kopyalanmaz.** `Proje Takvimi.dc.html` ölçüldü: yedi bar konumu kendi
 * yorumuyla çelişiyor (ör. 158 "Oca 25 → Ara 26 = tüm 24 ay" derken 167'deki
 * Temel barı `left:12.5%`ten başlıyor), bir proje ızgaranın dışına taşıyor
 * (242: Liman `Mar 27`e kadar ama ızgara `Ara 26`da bitiyor) ve iki yüzde
 * etiketi kendi çizdiği dolu oranla tutmuyor. Mockup'tan yalnız BİÇİM alınır.
 *
 * 🔴 K8 — IZGARA PENCERESİ VERİDEN TÜRER: mockup'ın sabit "Oca 25 – Ara 26"sı
 * KULLANILMAZ; pencere min(`start_date`) … max(`end_date`) aralığından, ay
 * başına/sonuna yuvarlanarak kurulur. Böylece hiçbir proje sessizce kırpılmaz.
 * Yine de kırpma İMKÂNSIZ değildir (yalnız bir ucu dolu satırlar pencereyi
 * kurar) — kırpılan aralık `clippedStart`/`clippedEnd` ile İŞARETLENİR.
 *
 * EKSEN BİRİMİ = AY (gün değil). Mockup ızgarası `repeat(24,1fr)` ile EŞİT
 * genişlikte ay sütunları çizer (120-147); bar konumu güne göre hesaplansaydı
 * (aylar 28-31 gün) barlar ay sınırlarından KAYARDI. Bu yüzden eksen
 * "ay endeksi + ay içi gün oranı"dır ve sütun kenarlarıyla birebir hizalanır.
 *
 * SAAT DİLİMİ DİSİPLİNİ: tüm aritmetik `Date.UTC` üzerinden yürür
 * (`site-planning/week.ts` deseni). Girdi hep `YYYY-MM-DD`dir.
 */

/** Ekranı besleyen her satırın (proje ya da bölüm) ham tarih aralığı. */
export interface DateRange {
  start: string | null;
  end: string | null;
}

/** Görünüm anahtarı (mockup 31-33). `Haftalık` K4 gereği YAZILMAZ. */
export type TimelineZoom = "monthly" | "yearly";

export interface TimelineWindow {
  /** Pencerenin ilk günü — ay başına yuvarlanmış. */
  startIso: string;
  /** Pencerenin son günü — ay sonuna yuvarlanmış. */
  endIso: string;
  startYear: number;
  /** 1-12 */
  startMonth: number;
  /** Penceredeki toplam ay sayısı — eksenin uzunluğu. */
  monthCount: number;
}

export interface TimelineColumn {
  /** Aylık kipte "2025-11", yıllık kipte "2025". */
  key: string;
  /** Aylık kipte "Kas" (mockup 123-146), yıllık kipte "2025". */
  label: string;
  year: number;
  /** Aylık kipte 1-12; yıllık kipte `null`. */
  month: number | null;
  /** Sütunun eksendeki payı (%). Aylık kipte eşit, yıllık kipte ay sayısıyla orantılı. */
  widthPct: number;
  /** Aralık sütunu — mockup 134'teki kalın yıl ayracı. */
  isYearEnd: boolean;
}

export interface BarGeometry {
  leftPct: number;
  widthPct: number;
  /** Aralık pencerenin SOLUNA taşıyordu ve kırpıldı (K8: sessizce yutulmaz). */
  clippedStart: boolean;
  /** Aralık pencerenin SAĞINA taşıyordu ve kırpıldı. */
  clippedEnd: boolean;
}

interface YearMonth {
  year: number;
  month: number;
  day: number;
}

function parseIso(value: string | null | undefined): YearMonth | null {
  if (!value || !isIsoDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return null;
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Pencerenin başlangıcından itibaren kaçıncı ay (0 tabanlı, negatif olabilir). */
function monthIndex(win: TimelineWindow, point: YearMonth): number {
  return (point.year - win.startYear) * 12 + (point.month - win.startMonth);
}

/**
 * Eksendeki konum (ay birimi). `dayOffset` 0 → günün BAŞI, 1 → günün SONU.
 * Bar başlangıcı 0, bar bitişi 1 kullanır; böylece tek günlük aralık bile
 * sıfır genişlikte olmaz.
 */
function axisMonths(win: TimelineWindow, point: YearMonth, dayOffset: 0 | 1): number {
  const span = daysInMonth(point.year, point.month);
  return monthIndex(win, point) + (point.day - 1 + dayOffset) / span;
}

function toPct(win: TimelineWindow, months: number): number {
  return (months / win.monthCount) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * K8 — pencereyi VERİDEN kurar. Geçersiz/eksik tarihler sessizce atlanır
 * (sistem sınırı = doğrulama sınırı, `site-planning/week.ts:26` emsali);
 * hiç geçerli tarih yoksa `null` döner ve ekran BOŞ PORTFÖY dalına girer.
 */
export function timelineWindow(ranges: readonly DateRange[]): TimelineWindow | null {
  let min: YearMonth | null = null;
  let max: YearMonth | null = null;

  for (const range of ranges) {
    for (const raw of [range.start, range.end]) {
      const point = parseIso(raw);
      if (point === null) continue;
      if (min === null || compare(point, min) < 0) min = point;
      if (max === null || compare(point, max) > 0) max = point;
    }
  }
  if (min === null || max === null) return null;

  const monthCount = (max.year - min.year) * 12 + (max.month - min.month) + 1;
  return {
    startIso: `${min.year}-${pad2(min.month)}-01`,
    endIso: `${max.year}-${pad2(max.month)}-${pad2(daysInMonth(max.year, max.month))}`,
    startYear: min.year,
    startMonth: min.month,
    monthCount,
  };
}

function compare(a: YearMonth, b: YearMonth): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** Araç çubuğu başlığı (mockup 44 BİÇİMİ; değeri K8 gereği veriden). */
export function timelineWindowLabel(win: TimelineWindow): string {
  const end = parseIso(win.endIso);
  const endLabel = end ? formatPeriodShort(end.year, end.month) : win.endIso;
  return `${formatPeriodShort(win.startYear, win.startMonth)} – ${endLabel}`;
}

/** Ay başlıkları şeridi (mockup 120-147). Yıllık kipte sütun YIL'a toplanır. */
export function timelineColumns(win: TimelineWindow, zoom: TimelineZoom): TimelineColumn[] {
  const months: { year: number; month: number }[] = [];
  for (let index = 0; index < win.monthCount; index += 1) {
    const absolute = win.startMonth - 1 + index;
    months.push({ year: win.startYear + Math.floor(absolute / 12), month: (absolute % 12) + 1 });
  }

  if (zoom === "monthly") {
    return months.map(({ year, month }) => ({
      key: `${year}-${pad2(month)}`,
      label: formatMonthShort(month),
      year,
      month,
      widthPct: 100 / win.monthCount,
      isYearEnd: month === 12,
    }));
  }

  const perYear = new Map<number, number>();
  for (const { year } of months) perYear.set(year, (perYear.get(year) ?? 0) + 1);
  return [...perYear.entries()].map(([year, count], index, all) => ({
    key: String(year),
    label: String(year),
    year,
    month: null,
    widthPct: (count / win.monthCount) * 100,
    isYearEnd: index < all.length - 1,
  }));
}

/**
 * Bir aralığın bar geometrisi. İki tarih de gerekir: bir ucu eksik satır BAR
 * ÇİZMEZ ama satırı ekrandan SİLMEZ (çağıranın sorumluluğu — mockup'ta her
 * bölüm bir satırdır).
 */
export function barGeometry(
  win: TimelineWindow,
  start: string | null,
  end: string | null,
): BarGeometry | null {
  const from = parseIso(start);
  const to = parseIso(end);
  if (from === null || to === null) return null;
  if (compare(from, to) > 0) return null;

  const rawLeft = toPct(win, axisMonths(win, from, 0));
  const rawRight = toPct(win, axisMonths(win, to, 1));

  const leftPct = clamp(rawLeft, 0, 100);
  const rightPct = clamp(rawRight, 0, 100);
  const widthPct = rightPct - leftPct;
  if (widthPct <= 0) return null;

  return {
    leftPct,
    widthPct,
    clippedStart: rawLeft < 0,
    clippedEnd: rawRight > 100,
  };
}

/**
 * Tek bir günün eksendeki konumu — milestone elması (mockup 18) ve bugün
 * çizgisi (mockup 20) için. Pencere dışındaki gün ÇİZİLMEZ (`null`).
 */
export function pointPct(win: TimelineWindow, iso: string | null): number | null {
  const point = parseIso(iso);
  if (point === null) return null;
  const pct = toPct(win, axisMonths(win, point, 0));
  if (pct < 0 || pct >= 100) return null;
  return pct;
}
