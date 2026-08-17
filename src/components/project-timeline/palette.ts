import type { components } from "@/lib/api/schema";

/**
 * F-TKV — proje rengi (K3) ve bölüm durumu (K2) tek kaynak.
 *
 * 🔴 K3: şemada renk YOKTUR. Renk `sort` sırasına göre DÖRTLÜ SABİT paletten
 * atanır, dördü aşarsa döngüsel devam eder. **Rastgele/hash YASAK** — kare
 * determinizmini bozar (aynı veri iki turda iki farklı renk verirdi).
 * Palet sırası mockup'ın dört proje bloğundan gelir: mavi (68-79) · yeşil
 * (82-91) · amber (94-103) · mor (106-114).
 */
export const TIMELINE_PALETTES = ["blue", "green", "amber", "violet"] as const;

export type TimelinePalette = (typeof TIMELINE_PALETTES)[number];

export function projectPalette(index: number): TimelinePalette {
  const size = TIMELINE_PALETTES.length;
  const normalized = ((index % size) + size) % size;
  return TIMELINE_PALETTES[normalized] as TimelinePalette;
}

export type SectionStatus = components["schemas"]["SectionStatus"];

export interface StatusLegendEntry {
  status: SectionStatus;
  /** Mockup 49-51 lejant metinleri. */
  label: string;
}

/**
 * Bar renginin TEK kaynağı — lejant da barlar da bunu okur, iki liste
 * kopyalanmaz (kopyalanan lejant, bir enum üyesi eklendiğinde sessizce
 * bayatlardı).
 *
 * 🔴 ONAYLI SAPMA — `on_hold`: mockup lejantı ÜÇ durum çiziyor (49-51:
 * Tamamlandı · Devam Ediyor · Planlandı) ama `SectionStatus` DÖRT üyelidir.
 * Dördüncüsünü "Planlandı" gibi boyamak durumu SESSİZCE yutardı; kendi
 * lejant satırıyla basılır.
 */
export const STATUS_LEGEND: readonly StatusLegendEntry[] = [
  { status: "completed", label: "Tamamlandı" },
  { status: "active", label: "Devam Ediyor" },
  { status: "planned", label: "Planlandı" },
  { status: "on_hold", label: "Beklemede" },
];

export function sectionStatusLabel(status: SectionStatus): string {
  return STATUS_LEGEND.find((entry) => entry.status === status)?.label ?? status;
}

export type ProjectStatus = components["schemas"]["ProjectStatus"];

/** Proje satırı rozeti (`ProjectStatus` — bölüm durumundan AYRI bir enum). */
const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planlama",
  active: "Aktif",
  on_hold: "Beklemede",
  completed: "Tamamlandı",
};

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[status];
}
