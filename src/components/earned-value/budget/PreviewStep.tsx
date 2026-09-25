"use client";

import { ErrorCard, Skeleton, SkeletonBlock } from "@/components/earned-value/common/state";
import { Button } from "@/components/ui";
import { formatPercent01 } from "@/lib/earned-value";
import { EMPTY_CELL } from "@/lib/format";
import type { UseQueryResult } from "@tanstack/react-query";
import type { EvPreviewOut } from "@/lib/api/models";

import { formatDateShort, formatMhr } from "./budget-format";
import type { BudgetStep } from "./freeze-findings";
import { SCurveChart, WorkerHistogram } from "./PreviewCharts";
import { DISTRIBUTION_LABEL } from "./ScheduleStep";

interface PreviewStepProps {
  preview: UseQueryResult<EvPreviewOut, Error>;
  revisionNumber: number | null;
  onStep: (step: BudgetStep) => void;
}

function peopleText(value: string | null | undefined): string {
  return value === null || value === undefined ? EMPTY_CELL : `${formatMhr(value)} kişi`;
}

/** Disiplin toplamları — Adam-Saat Bütçesi.dc.html:385-405. */
function DisciplineTotals({ preview }: { preview: EvPreviewOut }) {
  return (
    <table className="ev-budget-totals">
      <thead>
        <tr>
          <th scope="col">Disiplin</th>
          <th scope="col">Bütçe a-s</th>
          <th scope="col">Pay %</th>
          <th scope="col">Dağılım</th>
          <th scope="col">Başlangıç</th>
          <th scope="col">Bitiş</th>
          <th scope="col">Tepe işçi</th>
        </tr>
      </thead>
      <tbody>
        {preview.disciplines.map((d) => (
          <tr key={d.discipline_node_id}>
            <th scope="row">
              <span className="ev-budget-swatch" style={{ background: d.color ?? undefined }} aria-hidden="true" />
              {d.name ?? "Disiplinsiz"}
            </th>
            <td>{formatMhr(d.series.budget_mhr)}</td>
            <td>{formatPercent01(d.share)}</td>
            <td>{DISTRIBUTION_LABEL[d.distribution]}</td>
            <td>{formatDateShort(d.series.start)}</td>
            <td>{formatDateShort(d.series.end)}</td>
            <td>{peopleText(d.series.peak_week?.required_people)}</td>
          </tr>
        ))}
        <tr className="ev-budget-totals__sum">
          <th scope="row">Toplam doğrudan</th>
          <td>{formatMhr(preview.total.budget_mhr)}</td>
          <td>%100,0</td>
          <td />
          <td>{formatDateShort(preview.start)}</td>
          <td>{formatDateShort(preview.end)}</td>
          <td>{peopleText(preview.total.peak_week?.required_people)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Adım 3 · Önizleme — Adam-Saat Bütçesi.dc.html:331-407. Eğri backend
 * önizleme ucundan gelir (KALICI DEĞİL); disiplin renkleri disiplin kaydından (K2).
 */
export function PreviewStep({ preview, revisionNumber, onStep }: PreviewStepProps) {
  if (preview.isPending) {
    return (
      <Skeleton label="Önizleme yükleniyor">
        <SkeletonBlock height={250} variant="outlined" />
      </Skeleton>
    );
  }
  if (preview.isError) {
    return <ErrorCard title="Önizleme alınamadı" onRetry={() => void preview.refetch()} retrying={preview.isFetching} />;
  }
  const data = preview.data;
  return (
    <div className="ev-budget-preview">
      {data.unspreadable.length > 0 && (
        <p className="ev-budget-warn-chip" role="note">
          {data.unspreadable.length} yaprak iş günü olmadığı için eğriye girmedi (dondurmada engel).
        </p>
      )}
      <ChartsRow preview={data} revisionNumber={revisionNumber} />
      <section className="ev-budget-card" aria-label="Disiplin toplamları">
        <h2 className="ev-budget-card__title ev-budget-card__title--bar">Disiplin toplamları</h2>
        <DisciplineTotals preview={data} />
        <div className="ev-budget-card__nav">
          <Button variant="secondary" onClick={() => onStep(2)}>
            ← Zamanlama
          </Button>
          <Button className="ev-budget-card__next" onClick={() => onStep(4)}>
            İleri: Baseline →
          </Button>
        </div>
      </section>
    </div>
  );
}

function PreviewLegend({ preview }: { preview: EvPreviewOut }) {
  return (
    <div className="ev-budget-legend ev-budget-legend--end">
      {preview.disciplines.map((d) => (
        <span key={d.discipline_node_id} className="ev-budget-legend__item">
          <span className="ev-budget-legend__swatch" style={{ background: d.color ?? undefined }} />
          {d.name ?? "Disiplinsiz"}
        </span>
      ))}
      <span className="ev-budget-legend__item">
        <span className="ev-budget-legend__dash" />
        Toplam planlı %
      </span>
    </div>
  );
}

function ChartsRow({ preview, revisionNumber }: { preview: EvPreviewOut; revisionNumber: number | null }) {
  return (
    <div className="ev-budget-preview__charts">
      <section className="ev-budget-card ev-budget-preview__curve" aria-label="Planlı S-eğrisi">
        <div className="ev-budget-chart__head">
          <h2 className="ev-budget-card__title">Planlı S-eğrisi · disiplin bazında</h2>
          <PreviewLegend preview={preview} />
        </div>
        <SCurveChart preview={preview} revisionNumber={revisionNumber} />
      </section>
      <section className="ev-budget-card ev-budget-preview__hist" aria-label="Gereken işçi">
        <div className="ev-budget-chart__head ev-budget-chart__head--stack">
          <h2 className="ev-budget-card__title">Gereken işçi · haftalık</h2>
          <div className="ev-budget-legend">
            <span className="ev-budget-legend__item">
              <span className="ev-budget-legend__swatch ev-budget-legend__swatch--need" />
              Gereken (a-s ÷ iş günü × günlük saat)
            </span>
            <span className="ev-budget-legend__item">
              <span className="ev-budget-legend__line" />
              Bölümlerin planlı işçi sayısı
            </span>
          </div>
        </div>
        <WorkerHistogram preview={preview} />
      </section>
    </div>
  );
}
