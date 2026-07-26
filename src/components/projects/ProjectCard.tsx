import type { ReactNode } from "react";

import { cx } from "@/lib/cx";
import type { ProjectListItem } from "@/lib/api/hooks/useProjects";
import { formatCompactCurrency, formatMonthYear, formatPercent } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";

import { ShareBar } from "./ShareBar";
import "./projects.css";

type Project = ProjectListItem;
// NOT: gercek semada tip-basi metrikler duz alanlar degil, ContractingCard /
// InvestmentCard / LandShareCard icine gomulu MetricPlaceholder'lar (plan Task 4
// duz `project.spent`/`project.sales`/`project.profit` varsaymisti — bunlar yerine
// `project.contracting.spent`, `project.investment.sold_amount` vb. kullanildi).
type Metric = NonNullable<Project["contracting"]>["spent"];

const TYPE_LABELS: Record<Project["project_type"], string> = {
  taahhut: "TAAHHÜT",
  kendi_yatirim: "KENDİ YATIRIM",
  kat_karsiligi: "KAT KARŞILIĞI",
};

const STATUS_LABELS: Record<Project["status"], string> = {
  active: "Aktif",
  on_hold: "Beklemede",
  completed: "Tamamlandı",
};

// Mockup kendi yatirimda "Satış Oranı" der; satis verisi units modulunde —
// o gelene kadar cubuk progress_pct bastigi icin etiket de onu soyler (spec §7.5).
const PROGRESS_LABELS: Record<Project["project_type"], string> = {
  taahhut: "Fiziksel İlerleme",
  kendi_yatirim: "İnşaat İlerlemesi",
  kat_karsiligi: "İnşaat İlerlemesi",
};

function metaLine(project: Project): string {
  const base = [project.category, project.city].filter(Boolean).join(" · ");
  if (project.project_type === "taahhut" && project.employer_name) {
    return `${base} · İşveren: ${project.employer_name}`;
  }
  if (project.project_type === "kat_karsiligi" && project.land_share) {
    return `${base} · Arsa Sahibi: ${project.land_share.landowner_name}`;
  }
  return base;
}

function KpiCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="prj-kpi__label">{label}</div>
      {children}
    </div>
  );
}

// available:false → etiket kalir, deger "—", ipucu title'da (spec §7.2).
function MetricValue({
  metric,
  tone,
}: {
  metric: Metric | undefined;
  tone?: "success" | "danger" | "profit";
}) {
  if (metric?.available && metric.value !== null && metric.value !== undefined) {
    return (
      <span className={cx("prj-kpi__value", tone && `prj-kpi__value--${tone}`)}>
        {formatCompactCurrency(metric.value)}
      </span>
    );
  }
  return (
    <span
      className="prj-kpi__value prj-kpi__value--pending"
      title={pendingModuleLabel(metric?.pending_module ?? "")}
    >
      —
    </span>
  );
}

function TaahhutKpis({ project }: { project: Project }) {
  const contracting = project.contracting;
  if (project.status === "completed") {
    return (
      <div className="prj-kpis">
        <KpiCell label="Sözleşme Bedeli">
          <span className="prj-kpi__value">
            {project.contract_amount ? formatCompactCurrency(project.contract_amount) : "—"}
          </span>
        </KpiCell>
        <KpiCell label="Final Hakediş">
          <MetricValue metric={contracting?.final_progress_payment} />
        </KpiCell>
      </div>
    );
  }
  return (
    <div className="prj-kpis">
      <KpiCell label="Sözleşme Bedeli">
        <span className="prj-kpi__value">
          {project.contract_amount ? formatCompactCurrency(project.contract_amount) : "—"}
        </span>
      </KpiCell>
      <KpiCell label="Harcanan">
        <MetricValue metric={contracting?.spent} />
      </KpiCell>
      <KpiCell label="Başlangıç">
        <span className="prj-kpi__value prj-kpi__value--date">
          {project.start_date ? formatMonthYear(project.start_date) : "—"}
        </span>
      </KpiCell>
      <KpiCell label="Bitiş">
        <span className="prj-kpi__value prj-kpi__value--date">
          {project.end_date ? formatMonthYear(project.end_date) : "—"}
        </span>
      </KpiCell>
    </div>
  );
}

function KendiYatirimKpis({ project }: { project: Project }) {
  const investment = project.investment;
  return (
    <div className="prj-kpis">
      <KpiCell label="Satış Hedefi">
        <span className="prj-kpi__value">
          {investment?.sales_target ? formatCompactCurrency(investment.sales_target) : "—"}
        </span>
      </KpiCell>
      <KpiCell label="Satılan">
        <MetricValue metric={investment?.sold_amount} tone="success" />
      </KpiCell>
      <KpiCell label="Toplam Maliyet">
        <MetricValue metric={investment?.total_cost} tone="danger" />
      </KpiCell>
      <KpiCell label="Tahmini Kâr">
        <MetricValue metric={investment?.estimated_profit} tone="profit" />
      </KpiCell>
    </div>
  );
}

function KatKarsiligiKpis({ project }: { project: Project }) {
  const landShare = project.land_share;
  return (
    <div className="prj-kpis">
      <KpiCell label="Kendi Pay Değeri">
        <MetricValue metric={landShare?.our_share_value} />
      </KpiCell>
      <KpiCell label="Arsa Maliyeti">
        {/* Tipin tanimsal gercegi: backend land_share.land_cost hep 0 doner, yer tutucu degil (spec §7.3) */}
        <span className="prj-kpi__value prj-kpi__value--success">
          {formatCompactCurrency(landShare?.land_cost ?? 0)}
        </span>
      </KpiCell>
      <KpiCell label="İnşaat Maliyeti">
        <MetricValue metric={landShare?.construction_cost} tone="danger" />
      </KpiCell>
      <KpiCell label="Tahmini Kâr">
        <MetricValue metric={landShare?.estimated_profit} tone="profit" />
      </KpiCell>
    </div>
  );
}

// Kart tiklanmaz: link/onClick yok, mockup'taki cursor:pointer susu uygulanmaz (spec §9).
export function ProjectCard({ project }: { project: Project }) {
  const isCompleted = project.status === "completed";
  return (
    <article
      className={cx(
        "prj-card",
        `prj-card--${project.project_type}`,
        isCompleted && "prj-card--completed",
      )}
    >
      <div className="prj-card__strip" aria-hidden="true" />
      <div className="prj-card__body">
        <div className="prj-card__head">
          <div>
            <span className="prj-type-badge prj-type-badge--card">
              {TYPE_LABELS[project.project_type]}
            </span>
            <h3 className="prj-card__name">{project.name}</h3>
            <p className="prj-card__meta">{metaLine(project)}</p>
          </div>
          <span className={`prj-status prj-status--${project.status}`}>
            {STATUS_LABELS[project.status]}
          </span>
        </div>
        {project.project_type === "kat_karsiligi" && project.land_share && (
          <ShareBar share={project.land_share} />
        )}
        {project.project_type === "taahhut" && <TaahhutKpis project={project} />}
        {project.project_type === "kendi_yatirim" && <KendiYatirimKpis project={project} />}
        {project.project_type === "kat_karsiligi" && <KatKarsiligiKpis project={project} />}
        <div className="prj-progress">
          <div className="prj-progress__labels">
            <span>{PROGRESS_LABELS[project.project_type]}</span>
            <span className="prj-progress__pct">{formatPercent(project.progress_pct)}</span>
          </div>
          <div className="prj-progress__bar">
            <div
              className="prj-progress__fill"
              style={{ width: `${Math.min(Number(project.progress_pct), 100)}%` }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
