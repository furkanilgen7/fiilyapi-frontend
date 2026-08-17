import type { TimelineProject, TimelineSection } from "@/lib/api/hooks/useProjectTimeline";
import { projectPalette, type TimelinePalette } from "./palette";
import type { DateRange } from "./timeline-scale";

/**
 * Gantt satır listesi — SOL sütun ve SAĞ ızgara AYNI diziyi gezer (iki ayrı
 * liste kurulsaydı katlama/sıralama farkı satırları hizasından kaydırırdı).
 */

export interface ProjectRowModel {
  kind: "project";
  key: string;
  project: TimelineProject;
  palette: TimelinePalette;
  sectionCount: number;
  isCollapsed: boolean;
}

export interface SectionRowModel {
  kind: "section";
  key: string;
  project: TimelineProject;
  section: TimelineSection;
  palette: TimelinePalette;
}

export type TimelineRowModel = ProjectRowModel | SectionRowModel;

/** Bölümler `sort_order`a göre — sunucunun sırasına GÜVENİLMEZ, kopyada sıralanır. */
export function orderedSections(project: TimelineProject): TimelineSection[] {
  return [...project.sections].sort((a, b) => a.sort_order - b.sort_order);
}

export function buildRows(
  items: readonly TimelineProject[],
  collapsed: ReadonlySet<string>,
): TimelineRowModel[] {
  const rows: TimelineRowModel[] = [];
  items.forEach((project, index) => {
    const palette = projectPalette(index);
    const sections = orderedSections(project);
    const isCollapsed = collapsed.has(project.id);
    rows.push({
      kind: "project",
      key: `p:${project.id}`,
      project,
      palette,
      sectionCount: sections.length,
      isCollapsed,
    });
    if (isCollapsed) return;
    for (const section of sections) {
      rows.push({ kind: "section", key: `s:${section.id}`, project, section, palette });
    }
  });
  return rows;
}

/**
 * K8 — pencereyi kuran aralıklar. KATLANMIŞ projelerin bölümleri de sayılır:
 * ızgara penceresi katlama durumuna göre DEĞİŞSEYDİ, bir satırı kapatmak
 * bütün barları yerinden oynatırdı.
 */
export function windowRanges(items: readonly TimelineProject[]): DateRange[] {
  const ranges: DateRange[] = [];
  for (const project of items) {
    ranges.push({ start: project.start_date, end: project.end_date });
    for (const section of project.sections) {
      ranges.push({ start: section.start_date, end: section.end_date });
      for (const milestone of section.milestones) {
        ranges.push({ start: milestone.milestone_date, end: milestone.milestone_date });
      }
    }
  }
  return ranges;
}
