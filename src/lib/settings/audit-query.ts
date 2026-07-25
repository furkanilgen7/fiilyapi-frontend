import type { AuditAction } from "@/lib/api/audit-types";

// Mockup'taki tarih seçicisinin üç seçeneği (../projedesign/Ayarlar - Denetim Günlüğü.dc.html).
export type AuditDatePreset = "last7" | "last30" | "thisMonth";

export const AUDIT_DATE_PRESETS: ReadonlyArray<{ value: AuditDatePreset; label: string }> = [
  { value: "last7", label: "Son 7 Gün" },
  { value: "last30", label: "Son 30 Gün" },
  { value: "thisMonth", label: "Bu Ay" },
];

export interface AuditFilters {
  actorUserId: string | null;
  action: AuditAction | null;
  datePreset: AuditDatePreset;
}

export const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  actorUserId: null,
  action: null,
  datePreset: "last7",
};

const LAST_7_DAYS_SPAN = 7;
const LAST_30_DAYS_SPAN = 30;

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Preset'i backend'in anladığı `date_from` değerine çevirir (yerel gün başlangıcı).
 * Preset'ler backend'de yoktur; çeviri tamamen frontend sorumluluğudur.
 */
export function auditDateFrom(preset: AuditDatePreset, now: Date = new Date()): string {
  if (preset === "thisMonth") {
    return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }
  const span = preset === "last7" ? LAST_7_DAYS_SPAN : LAST_30_DAYS_SPAN;
  // "Son N gün" bugünü de kapsar → N-1 gün geriye gidilir.
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (span - 1)));
}

/**
 * Filtreleri backend query parametrelerine çevirir.
 *
 * `date_to` bilinçli olarak GÖNDERİLMEZ: üç preset de "şu ana kadar" anlamına gelir ve
 * gün-hassasiyetli bir `date_to` değeri bugünün kayıtlarını kırpma riski taşır.
 */
export function buildAuditQuery(
  filters: AuditFilters,
  page: { limit: number; offset: number },
  now: Date = new Date(),
): Record<string, string> {
  return {
    ...buildAuditFilterQuery(filters, now),
    limit: String(page.limit),
    offset: String(page.offset),
  };
}

/** Excel dışa aktarımı aynı filtreleri kullanır; `limit`/`offset` yoktur. */
export function buildAuditFilterQuery(filters: AuditFilters, now: Date = new Date()): Record<string, string> {
  const query: Record<string, string> = { date_from: auditDateFrom(filters.datePreset, now) };
  if (filters.actorUserId) query.actor_user_id = filters.actorUserId;
  if (filters.action) query.action = filters.action;
  return query;
}
