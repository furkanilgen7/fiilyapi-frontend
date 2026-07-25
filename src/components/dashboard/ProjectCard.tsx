import type { components } from "@/lib/api/schema";
import { formatCompactCurrency, formatPercent } from "@/lib/format";

import "./dashboard.css";

type Project = components["schemas"]["DashboardProjectCard"];

// Mockup Ekran 1'de yalnizca Aktif/Beklemede var; Tamamlandi rozeti
// "Ekran 4 - Projeler.dc.html" satir 273'ten alindi (spec §3.4).
const STATUS_LABELS: Record<Project["status"], string> = {
  active: "Aktif",
  on_hold: "Beklemede",
  completed: "Tamamlandı",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className={`dash-project dash-project--${project.status}`}>
      <p className="dash-project__status">
        <span className="dash-project__dot" aria-hidden="true" />
        {STATUS_LABELS[project.status]}
      </p>
      <h3 className="dash-project__name">{project.name}</h3>
      <p className="dash-project__value">{formatCompactCurrency(project.budget)}</p>
      <p className="dash-project__value-label">Bütçe</p>
      <div className="dash-bar dash-bar--project">
        <div
          className="dash-bar__fill dash-project__fill"
          style={{ width: `${Math.min(Number(project.progress_pct), 100)}%` }}
        />
      </div>
      <p className="dash-project__progress">
        {formatPercent(project.progress_pct)} tamamlandı
      </p>
    </article>
  );
}
