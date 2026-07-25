"use client";

import { useDashboardSummary } from "@/lib/api/hooks/useDashboardSummary";

import { KpiCard } from "./KpiCard";
import { PendingApprovalsCard } from "./PendingApprovalsCard";
import { PortfolioCard } from "./PortfolioCard";
import { ProjectGrid } from "./ProjectGrid";
import { RisksCard } from "./RisksCard";
import "./dashboard.css";

export function DashboardView() {
  const { data, isLoading, isError } = useDashboardSummary();

  if (isError) {
    return <p className="dash-message">Gösterge paneli yüklenemedi</p>;
  }
  if (isLoading || !data) {
    return <p className="dash-message">Yükleniyor…</p>;
  }

  return (
    <div className="dash">
      <p className="dash__breadcrumb">
        <span>{data.role_name} Görünümü</span>
        <span aria-hidden="true">·</span>
        <span>{data.active_project_count} Aktif Proje</span>
      </p>
      <h1 className="dash__title">Gösterge Paneli</h1>

      <div className="dash__top-row">
        <PortfolioCard metric={data.portfolio} />
        <KpiCard
          label="Tahsil Edilecek"
          emptyTitle="Henüz fatura verisi yok"
          metric={data.receivables}
        />
        <KpiCard
          label="Ortalama Marj"
          emptyTitle="Henüz marj hesabı yok"
          metric={data.average_margin}
        />
      </div>

      <ProjectGrid projects={data.projects} />

      <div className="dash__bottom-row">
        <PendingApprovalsCard data={data.pending_approvals} />
        <RisksCard data={data.risks} />
      </div>
    </div>
  );
}
