import type { ProjectCounts, ProjectListFilter } from "@/lib/api/hooks/useProjects";

export type ProjectTab = "all" | "taahhut" | "kendi_yatirim" | "kat_karsiligi" | "completed";

export const PROJECT_TABS: Array<{ key: ProjectTab; label: string }> = [
  { key: "all", label: "Tümü" },
  { key: "taahhut", label: "Taahhüt" },
  { key: "kendi_yatirim", label: "Kendi Yatırım" },
  { key: "kat_karsiligi", label: "Kat Karşılığı" },
  { key: "completed", label: "Tamamlanan" },
];

export function parseProjectTab(value: string | null): ProjectTab {
  return PROJECT_TABS.some((tab) => tab.key === value) ? (value as ProjectTab) : "all";
}

export function tabToFilter(tab: ProjectTab): ProjectListFilter {
  if (tab === "all") return {};
  if (tab === "completed") return { status: "completed" };
  return { type: tab };
}

export function tabCount(tab: ProjectTab, counts: ProjectCounts): number {
  return counts[tab];
}
