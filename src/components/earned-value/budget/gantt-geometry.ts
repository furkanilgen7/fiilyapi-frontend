import type { EvScheduleOut } from "@/lib/api/models";
import type { EvWindowIn } from "@/lib/api/hooks/useEvBudgetMutations";

import { formatDateShort } from "./budget-format";

/**
 * PLN-F1.6 · Adım 2 Gantt'ının SAF geometri katmanı — Adam-Saat Bütçesi.dc.html
 * :682-697 `gantt()` ölçüleri (viewBox 1000 geniş, L=190, W=790; satır adımları
 * bölüm 20 · çubuk 18 · grup arası 6). Veriden türeyen HER koordinat
 * `Math.round`lanır (görsel spec 4. parça — `cash-flow-geometry.ts` emsali).
 * Tarihler UTC gün sayısına çevrilir; `new Date(iso)` yerel saatte kaymaz.
 */

export const GANTT_VIEW_WIDTH = 1000;
export const GANTT_LEFT = 190;
export const GANTT_WIDTH = 790;
const TOP = 26;
const SECTION_STEP = 20;
const BAR_STEP = 18;
const GROUP_GAP = 6;
const SECTION_BAR_H = 12;
const BAR_H = 11;
const DATES_GAP = 6;
const DATES_MAX_X = 900;
const MS_PER_DAY = 86_400_000;
const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

type Bar = EvScheduleOut["bars"][number];
type Section = EvScheduleOut["sections"][number];

export interface GanttRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GanttRow {
  key: string;
  kind: "section" | "bar";
  label: string;
  labelX: number;
  textY: number;
  lineY: number;
  bar: GanttRect | null;
  /** Ezilmiş pencerenin arkasındaki bölüm varsayılanı (M3 gölge). */
  ghost: GanttRect | null;
  color: string | null;
  dates: string;
  datesX: number;
  override: boolean;
  outside: boolean;
  sectionId: string | null;
  disciplineId: string | null;
  start: string | null;
  end: string | null;
}

export interface GanttGeometry {
  rows: GanttRow[];
  holidays: { x: number; w: number }[];
  months: { x: number; label: string }[];
  todayX: number | null;
  height: number;
}

export interface DisciplineStyle {
  name: string;
  color: string;
}

export function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function isoFromDayNumber(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

interface Scale {
  start: number;
  span: number;
  x: (day: number) => number;
}

function scaleOf(schedule: EvScheduleOut): Scale | null {
  const dates = [
    ...schedule.sections.flatMap((s) => [s.start_date, s.end_date]),
    ...schedule.bars.flatMap((b) => [b.start_date, b.end_date]),
  ].filter((d): d is string => Boolean(d));
  if (dates.length === 0) return null;
  const days = dates.map(dayNumber);
  const start = Math.min(...days);
  // Son gün DAHİL: bitiş günü çubuğun sağ kenarıdır (+1).
  const span = Math.max(1, Math.max(...days) + 1 - start);
  return { start, span, x: (day) => Math.round(GANTT_LEFT + ((day - start) / span) * GANTT_WIDTH) };
}

function rect(scale: Scale, start: string, end: string, y: number, h: number): GanttRect {
  const x = scale.x(dayNumber(start));
  return { x, y, w: Math.max(1, scale.x(dayNumber(end) + 1) - x), h };
}

function datesText(start: string | null, end: string | null): string {
  return start && end ? `${formatDateShort(start)}–${formatDateShort(end)}` : "pencere yok";
}

function sectionRow(section: Pick<Section, "id" | "name" | "start_date" | "end_date"> | null, scale: Scale, y: number, key: string): GanttRow {
  const start = section?.start_date ?? null;
  const end = section?.end_date ?? null;
  const bar = start && end ? rect(scale, start, end, y + 2, SECTION_BAR_H) : null;
  return {
    key,
    kind: "section",
    label: section?.name ?? "Bölümsüz",
    labelX: 8,
    textY: y + 11,
    lineY: y - 4,
    bar,
    ghost: null,
    color: null,
    dates: section ? datesText(start, end) : "",
    datesX: Math.min((bar ? bar.x + bar.w : GANTT_LEFT) + DATES_GAP, DATES_MAX_X),
    override: false,
    outside: false,
    sectionId: section?.id ?? null,
    disciplineId: null,
    start,
    end,
  };
}

function barRow(bar: Bar, section: Section | undefined, scale: Scale, y: number, style: DisciplineStyle | undefined): GanttRow {
  const box = bar.start_date && bar.end_date ? rect(scale, bar.start_date, bar.end_date, y + 1, BAR_H) : null;
  const override = bar.source === "override";
  const hasSectionDates = Boolean(section?.start_date && section?.end_date);
  const ghost =
    override && hasSectionDates ? rect(scale, section!.start_date!, section!.end_date!, y + 1, BAR_H) : null;
  return {
    key: `${bar.discipline_node_id}:${bar.section_id ?? "none"}`,
    kind: "bar",
    label: style?.name ?? "Disiplinsiz",
    labelX: 22,
    textY: y + 10,
    lineY: y - 3,
    bar: box,
    ghost,
    color: style?.color ?? null,
    dates: datesText(bar.start_date, bar.end_date),
    datesX: Math.min((box ? box.x + box.w : GANTT_LEFT) + DATES_GAP, DATES_MAX_X),
    override,
    outside: bar.outside_section_dates,
    sectionId: bar.section_id,
    disciplineId: bar.discipline_id,
    start: bar.start_date,
    end: bar.end_date,
  };
}

function buildRows(schedule: EvScheduleOut, scale: Scale, styles: ReadonlyMap<string, DisciplineStyle>) {
  const rows: GanttRow[] = [];
  let y = TOP;
  const groups: [Section | null, Bar[]][] = schedule.sections.map((s) => [s, schedule.bars.filter((b) => b.section_id === s.id)]);
  const unsectioned = schedule.bars.filter((b) => b.section_id === null);
  if (unsectioned.length > 0) groups.push([null, unsectioned]);
  for (const [section, bars] of groups) {
    if (section !== null && bars.length === 0) continue;
    rows.push(sectionRow(section, scale, y, `s:${section?.id ?? "none"}`));
    y += SECTION_STEP;
    for (const bar of bars) {
      rows.push(barRow(bar, section ?? undefined, scale, y, styles.get(bar.discipline_node_id)));
      y += BAR_STEP;
    }
    y += GROUP_GAP;
  }
  return { rows, bottom: y };
}

function offDays(schedule: EvScheduleOut, scale: Scale) {
  const holidays = new Set(schedule.holidays.map(dayNumber));
  const weekly = new Set(schedule.weekly_off_days);
  const width = Math.max(1, Math.round(GANTT_WIDTH / scale.span));
  const out: { x: number; w: number }[] = [];
  for (let day = scale.start; day < scale.start + scale.span; day += 1) {
    // Python `weekday()`: Pazartesi 0 … Pazar 6; JS `getUTCDay()`: Pazar 0.
    const weekday = (new Date(day * MS_PER_DAY).getUTCDay() + 6) % 7;
    if (holidays.has(day) || weekly.has(weekday)) out.push({ x: scale.x(day), w: width });
  }
  return out;
}

function monthTicks(scale: Scale) {
  const first = new Date(scale.start * MS_PER_DAY);
  const startYear = first.getUTCFullYear();
  const ticks: { x: number; label: string }[] = [];
  let cursor = Date.UTC(startYear, first.getUTCMonth(), 1);
  for (let guard = 0; guard < 240; guard += 1) {
    const day = Math.round(cursor / MS_PER_DAY);
    if (day >= scale.start + scale.span) break;
    const date = new Date(cursor);
    const year = date.getUTCFullYear();
    const suffix = ticks.length === 0 || year !== startYear ? ` ${String(year).slice(2)}` : "";
    ticks.push({ x: scale.x(Math.max(day, scale.start)), label: `${MONTHS[date.getUTCMonth()]}${suffix}` });
    cursor = Date.UTC(year, date.getUTCMonth() + 1, 1);
  }
  return ticks;
}

export function ganttGeometry(
  schedule: EvScheduleOut,
  styles: ReadonlyMap<string, DisciplineStyle>,
  todayIso: string,
): GanttGeometry {
  const scale = scaleOf(schedule);
  if (scale === null) return { rows: [], holidays: [], months: [], todayX: null, height: TOP };
  const { rows, bottom } = buildRows(schedule, scale, styles);
  const today = dayNumber(todayIso);
  const inRange = today >= scale.start && today < scale.start + scale.span;
  return {
    rows,
    holidays: offDays(schedule, scale),
    months: monthTicks(scale),
    todayX: inRange ? scale.x(today) : null,
    height: bottom + GROUP_GAP,
  };
}

/**
 * `PUT …/windows` TAM DEĞİŞTİRMEDİR: gönderilmeyen ezme silinir. Bu yüzden
 * gövde = mevcut ezmeler (hedef hariç) + hedefin yeni aralığı; `range` null
 * ise hedef düşer ("Bölüm tarihine dön").
 */
export function nextWindows(
  bars: readonly Bar[],
  disciplineId: string,
  sectionId: string | null,
  range: { start: string; end: string } | null,
): EvWindowIn[] {
  const kept = bars
    .filter((b) => b.source === "override" && b.start_date && b.end_date)
    .filter((b) => !(b.discipline_id === disciplineId && b.section_id === sectionId))
    .map((b) => ({ discipline_id: b.discipline_id, section_id: b.section_id, start_date: b.start_date!, end_date: b.end_date! }));
  if (range === null) return kept;
  return [...kept, { discipline_id: disciplineId, section_id: sectionId, start_date: range.start, end_date: range.end }];
}
