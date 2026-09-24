"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ErrorCard, Skeleton, SkeletonBlock } from "@/components/earned-value/common/state";
import { Button, Segmented } from "@/components/ui";
import { formatDateDots } from "@/lib/format";
import { useEvBudgetSchedule } from "@/lib/api/hooks/useEvBudget";
import type { EvBudgetView, EvScheduleOut } from "@/lib/api/models";

import { formatDateShort, formatMhr, localTodayIso } from "./budget-format";
import type { DisciplineOut } from "./budget-tree";
import { BudgetFlash } from "./BudgetFlash";
import type { BudgetStep } from "./freeze-findings";
import { GanttChart } from "./GanttChart";
import { ganttGeometry, nextWindows, type DisciplineStyle, type GanttRow } from "./gantt-geometry";
import type { ScreenState } from "./revision-state";
import type { BudgetActions } from "./useBudgetScreenHooks";
import { WindowPopover } from "./WindowPopover";

type Distribution = DisciplineOut["distribution"];

/** BÜT:673 — dört dağılım ve 22×12 eğri ikonları. */
export const DISTRIBUTIONS: readonly { value: Distribution; label: string; path: string }[] = [
  { value: "linear", label: "Doğrusal", path: "M1 6H21" },
  { value: "bell", label: "Çan", path: "M1 11C6 11 7 1 11 1S16 11 21 11" },
  { value: "front", label: "Ön yüklü", path: "M1 2C7 2 12 9 21 11" },
  { value: "back", label: "Arka yüklü", path: "M1 11C10 9 15 2 21 2" },
];

export const DISTRIBUTION_LABEL: Record<Distribution, string> = Object.fromEntries(
  DISTRIBUTIONS.map((d) => [d.value, d.label]),
) as Record<Distribution, string>;

const DIST_OPTIONS = DISTRIBUTIONS.map((d) => ({
  value: d.value,
  label: (
    <>
      <svg width={22} height={12} viewBox="0 0 22 12" aria-hidden="true" className="ev-budget-dist-icon">
        <path d={d.path} />
      </svg>
      {d.label}
    </>
  ),
}));

interface ScheduleStepProps {
  siteId: string;
  view: EvBudgetView;
  state: ScreenState;
  actions: BudgetActions;
  sectionsHref: string | null;
  onStep: (step: BudgetStep) => void;
}

function disciplineStyles(view: EvBudgetView): Map<string, DisciplineStyle> {
  return new Map(view.disciplines.map((d) => [d.id, { name: d.name ?? "Disiplinsiz", color: d.color ?? "" }]));
}

function spanOf(schedule: EvScheduleOut, disciplineId: string): string {
  const bars = schedule.bars.filter((b) => b.discipline_id === disciplineId && b.start_date && b.end_date);
  if (bars.length === 0) return "pencere yok";
  const start = bars.map((b) => b.start_date!).sort()[0];
  const end = bars.map((b) => b.end_date!).sort().at(-1)!;
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

/** Adım 2 · Zamanlama — Adam-Saat Bütçesi.dc.html:282-329 + Ek Formlar M3, M4 (b). */
export function ScheduleStep({ siteId, view, state, actions, sectionsHref, onStep }: ScheduleStepProps) {
  const schedule = useEvBudgetSchedule(siteId, view.revision?.id ?? null);
  const [picked, setPicked] = useState<GanttRow | null>(null);
  const styles = useMemo(() => disciplineStyles(view), [view]);
  const geometry = useMemo(
    () => (schedule.data ? ganttGeometry(schedule.data, styles, localTodayIso()) : null),
    [schedule.data, styles],
  );

  return (
    <section className="ev-budget-card" aria-label="Adım 2 · Zamanlama">
      <ScheduleHeader editable={state.editable} sectionsHref={sectionsHref} />
      <GanttLegend view={view} />
      <BudgetFlash flash={actions.flash} />
      {schedule.isPending && (
        <Skeleton label="Zamanlama yükleniyor">
          <SkeletonBlock height={160} variant="outlined" />
        </Skeleton>
      )}
      {schedule.isError && (
        <ErrorCard title="Zamanlama alınamadı" onRetry={() => void schedule.refetch()} retrying={schedule.isFetching} />
      )}
      {schedule.data && geometry && (
        <GanttChart
          geometry={geometry}
          editable={state.editable}
          onPick={setPicked}
          popover={picked ? { row: picked, node: <PickedWindow row={picked} schedule={schedule.data} actions={actions} onClose={() => setPicked(null)} /> } : null}
        />
      )}
      {schedule.data && <DistributionRows view={view} schedule={schedule.data} editable={state.editable} actions={actions} />}
      <div className="ev-budget-card__nav">
        <Button variant="secondary" onClick={() => onStep(1)}>
          ← Oranlar
        </Button>
        <Button className="ev-budget-card__next" onClick={() => onStep(3)}>
          İleri: Önizleme →
        </Button>
      </div>
    </section>
  );
}

function GanttLegend({ view }: { view: EvBudgetView }) {
  const today = localTodayIso();
  return (
    <div className="ev-budget-legend">
      {view.disciplines
        .filter((d) => d.discipline_id !== null)
        .map((d) => (
          <span key={d.id} className="ev-budget-legend__item">
            <span className="ev-budget-legend__swatch" style={{ background: d.color ?? undefined }} />
            {d.name}
          </span>
        ))}
      <span className="ev-budget-legend__item">
        <span className="ev-budget-legend__swatch ev-budget-legend__swatch--holiday" />
        Tatil / çalışılmayan gün
      </span>
      <span className="ev-budget-legend__item">
        <span className="ev-budget-legend__today" />
        Bugün {formatDateDots(today).slice(0, 5)}
      </span>
      <span className="ev-budget-legend__item">
        <span className="ev-budget-legend__swatch ev-budget-legend__swatch--section" />
        Bölüm varsayılanı
      </span>
      <span className="ev-budget-legend__item">
        <span className="ev-budget-legend__dot" />
        Ezilmiş pencere
      </span>
    </div>
  );
}

interface PickedWindowProps {
  row: GanttRow;
  schedule: EvScheduleOut;
  actions: BudgetActions;
  onClose: () => void;
}

/** M3 (a)/(c): Uygula → tam değiştirme PUT; "Bölüm tarihine dön" → ezme düşer. */
function PickedWindow({ row, schedule, actions, onClose }: PickedWindowProps) {
  const section = schedule.sections.find((s) => s.id === row.sectionId);
  const sectionName = section?.name ?? "Bölümsüz";
  const save = async (range: { start: string; end: string } | null) => {
    onClose();
    if (!row.disciplineId) return;
    const done = await actions.saveWindows(nextWindows(schedule.bars, row.disciplineId, row.sectionId, range));
    if (done && range === null && section?.start_date && section.end_date) {
      actions.showFlash(
        `${row.label} · ${sectionName} penceresi bölüm tarihine döndü (${formatDateDots(section.start_date).slice(0, 5)}–${formatDateDots(section.end_date)})`,
      );
    }
  };
  return (
    <WindowPopover
      row={row}
      sectionName={sectionName}
      sectionStart={section?.start_date ?? null}
      sectionEnd={section?.end_date ?? null}
      onApply={(start, end) => void save({ start, end })}
      onRevert={() => void save(null)}
      onClose={onClose}
    />
  );
}

interface DistributionRowsProps {
  view: EvBudgetView;
  schedule: EvScheduleOut;
  editable: boolean;
  actions: BudgetActions;
}

/** BÜT:308-323 — disiplin başına dağılım tipi (B1-2: varsayılan doğrusal). */
function DistributionRows({ view, schedule, editable, actions }: DistributionRowsProps) {
  const disciplines = view.disciplines.filter((d) => d.discipline_id !== null);
  return (
    <div className="ev-budget-dist">
      <div className="ev-budget-caption">Disiplin başına dağılım tipi</div>
      {disciplines.map((d) => (
        <div key={d.id} className="ev-budget-dist__row">
          <span className="ev-budget-dist__name">
            <span className="ev-budget-swatch" style={{ background: d.color ?? undefined }} aria-hidden="true" />
            {d.name}
          </span>
          <Segmented
            size="sm"
            aria-label={`${d.name} dağılım tipi`}
            value={d.distribution}
            disabled={!editable}
            options={DIST_OPTIONS}
            onChange={(distribution) => void actions.setDistribution({ discipline_id: d.discipline_id!, distribution })}
          />
          <span className="ev-budget-dist__meta">
            {formatMhr(d.direct_budget_mhr)} a-s · {spanOf(schedule, d.discipline_id!)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScheduleHeader({ editable, sectionsHref }: { editable: boolean; sectionsHref: string | null }) {
  return (
    <div className="ev-budget-toolbar">
      <h2 className="ev-budget-card__title">Adım 2 · Zamanlama</h2>
      <span className="ev-budget-toolbar__sub">
        {editable
          ? "Pencere varsayılanı bölüm tarihi · çubuğa tıklayıp bu revizyon için ezin"
          : "Bölüm tarihleri Bölümler'den okunur · burada yalnız dağılım tipi seçilir"}
      </span>
      {sectionsHref && (
        <Link href={sectionsHref} className="ev-budget-toolbar__link">
          Bölüm tarihlerini düzenle →
        </Link>
      )}
    </div>
  );
}
