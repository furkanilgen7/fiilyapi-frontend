import type { ProjectDetail } from "@/lib/api/hooks/useProjects";
import { pendingModuleLabel } from "@/lib/pending-modules";

import { ProjectDetailTabs } from "./ProjectDetailTabs";
import "./project-detail.css";

export interface ProjectHeroBarProps {
  project: ProjectDetail;
  /** DrillSidebar/ProjectDetailTabs deseni: aktif yol dışarıdan gelir. */
  activePath: string;
}

// "Konut Projesi · Ankara" — kategori/sehir bos olabilir, sadece dolu olanlar gosterilir.
function topLine(project: ProjectDetail): string {
  return [project.category, project.city].filter(Boolean).join(" · ");
}

// "📋 SZL-2025-001 · İşveren: Güneşkent Gayrimenkul A.Ş." — her iki parca da
// gercek P1 alani; ikisi de bos olabilir (spec §4.1, taahhut disi tiplerde
// employer_name hep null).
function metaParts(project: ProjectDetail): string[] {
  const parts: string[] = [];
  if (project.contract_no) parts.push(`📋 ${project.contract_no}`);
  if (project.employer_name) parts.push(`İşveren: ${project.employer_name}`);
  return parts;
}

export function ProjectHeroBar({ project, activePath }: ProjectHeroBarProps) {
  const meta = metaParts(project);

  return (
    <div className="project-hero">
      <div className="project-hero__top">
        <div>
          <p className="project-hero__breadcrumb">{topLine(project)}</p>
          <h1 className="project-hero__title">{project.name}</h1>
          {meta.length > 0 && (
            <div className="project-hero__meta">
              {meta.map((part, i) => (
                <span key={part}>
                  {i > 0 && <span aria-hidden="true"> · </span>}
                  {part}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="project-hero__contract">
          <div className="project-hero__contract-label">Toplam Sözleşme</div>
          {/* Yer tutucu (spec §7.1): backend contracts modulunu daha saglamiyor. */}
          <div
            className="project-hero__contract-value project-hero__contract-value--pending"
            title={pendingModuleLabel("contracts")}
          >
            —
          </div>
          <div className="project-hero__contract-note">{project.site_count} şantiye</div>
        </div>
      </div>
      <ProjectDetailTabs projectId={project.id} activePath={activePath} />
    </div>
  );
}
