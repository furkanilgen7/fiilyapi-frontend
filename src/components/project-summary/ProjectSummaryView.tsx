"use client";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { ProjectDetailTabs } from "@/components/project-detail/ProjectDetailTabs";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useProjectCosts } from "@/lib/api/hooks/useProjectCosts";
import { useProjectUnits } from "@/lib/api/hooks/useProjectUnits";
import { isForbidden } from "@/lib/api/unwrap";

import { CostBreakdownCard } from "./CostBreakdownCard";
import { ProfitProjectionCard } from "./ProfitProjectionCard";
import { ProjectSummaryHero } from "./ProjectSummaryHero";
import { SubcontractorCostTable } from "./SubcontractorCostTable";
import "./project-summary.css";

/**
 * F-PKK T2 · Proje Özeti — İKİ MOCKUP, TEK EKRAN.
 *
 * `Proje - Kendi Yatırım.dc.html` ve `Proje - Kat Karşılığı.dc.html` aynı
 * iskeleti paylaşır (hero + maliyet kırılımı + kâr projeksiyonu + taşeron
 * tablosu); ayrışan yerler proje TÜRÜNE göre dallanır. İki ayrı bileşen
 * ağacı yazmak, ortak dört kartı iki kopyada yaşatır ve zamanla ayrıştırırdı.
 *
 * 🔴 TÜR AYRIMI `project_type` ALANINDANDIR (ölçüldü) — `contracting` /
 * `investment` / `land_share` kartlarının doluluğundan DEĞİL: üçü de
 * `… | null`dır ve boş bir kart, ekranı sessizce yanlış düzene düşürürdü.
 *
 * Taahhüt projesinde bu ekranın sekmesi hiç basılmaz (K1); yine de doğrudan
 * URL ile gelinebildiği için tür denetimi BURADA da yapılır — aksi hâlde
 * kullanıcı kâr bloğu tamamen boş bir ekran görürdü.
 */
export interface ProjectSummaryViewProps {
  projectId: string;
  /** Aktif yol dışarıdan verilir (ProjectDetailTabs deseni). */
  activePath: string;
}

export function ProjectSummaryView({ projectId, activePath }: ProjectSummaryViewProps) {
  const projectQuery = useProject(projectId);
  const costsQuery = useProjectCosts(projectId);
  // Ünite sayaçları AYRI bir uçtur ve BAĞIMSIZ başarısız olabilir; hero onsuz
  // da basılır (F-P6 dersi: tek `.data` dallanması 403'te sonsuz "Yükleniyor").
  const unitsQuery = useProjectUnits(projectId);

  if (isForbidden(projectQuery.error) || isForbidden(costsQuery.error)) return <AccessDenied />;
  if (projectQuery.isError) {
    return <p className="psum-message">Proje yüklenemedi</p>;
  }
  if (costsQuery.isError) {
    return <p className="psum-message">Proje maliyetleri yüklenemedi</p>;
  }
  if (projectQuery.isLoading || !projectQuery.data || costsQuery.isLoading || !costsQuery.data) {
    return <p className="psum-message">Yükleniyor…</p>;
  }

  const project = projectQuery.data;
  const costs = costsQuery.data;

  if (project.project_type === "taahhut") {
    return (
      <div className="psum">
        <ProjectDetailTabs
          projectId={projectId}
          activePath={activePath}
          projectType={project.project_type}
        />
        <p className="psum-message">
          Proje özeti yalnız kendi yatırım ve kat karşılığı projelerinde tutulur; taahhüt
          projesinin özeti proje detay ekranındadır.
        </p>
      </div>
    );
  }

  return (
    <div className="psum">
      <ProjectDetailTabs
        projectId={projectId}
        activePath={activePath}
        projectType={project.project_type}
      />
      <ProjectSummaryHero
        project={project}
        costs={costs}
        totals={unitsQuery.data?.totals ?? null}
      />
      <div className="psum-grid">
        <CostBreakdownCard breakdown={costs.breakdown} />
        <ProfitProjectionCard profit={costs.profit} />
      </div>
      <SubcontractorCostTable
        rows={costs.subcontractors}
        total={costs.subcontractor_total}
        projectType={project.project_type}
      />
    </div>
  );
}
