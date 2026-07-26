"use client";

import { cx } from "@/lib/cx";
import type { ProjectCounts } from "@/lib/api/hooks/useProjects";

import { PROJECT_TABS, tabCount, type ProjectTab } from "./tabs";
import "./projects.css";

interface ProjectTabsProps {
  active: ProjectTab;
  counts: ProjectCounts;
  onChange: (tab: ProjectTab) => void;
}

// Sayaclar daima tam `counts`tan basilir — aktif filtreden etkilenmez (spec §4.3).
export function ProjectTabs({ active, counts, onChange }: ProjectTabsProps) {
  return (
    <div className="prj-tabs" role="tablist" aria-label="Proje sekmeleri">
      {PROJECT_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          className={cx("prj-tabs__tab", tab.key === active && "prj-tabs__tab--active")}
          onClick={() => onChange(tab.key)}
        >
          {tab.label} ({tabCount(tab.key, counts)})
        </button>
      ))}
    </div>
  );
}
