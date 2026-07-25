import type { AuditAction, AuditExportQuery, AuditLogQuery } from "@/lib/api/models";
import { AUDIT_TIME_ZONE } from "@/lib/settings/audit-format";

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
  /** Serbest metin araması (`detail` veya aktör adı); boş/whitespace = filtre yok. */
  search: string;
}

export const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  actorUserId: null,
  action: null,
  datePreset: "last7",
  search: "",
};

const LAST_7_DAYS_SPAN = 7;
const LAST_30_DAYS_SPAN = 30;
const MS_PER_DAY = 86_400_000;

// Backend `date_from`/`date_to`'yu Europe/Istanbul gününe göre yorumlar; preset'ler de
// bu yüzden tarayıcının yerel saatiyle değil TR takvim günüyle hesaplanır.
const trDateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: AUDIT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** `now` anındaki Europe/Istanbul takvim gününü `YYYY-MM-DD` olarak döner. */
export function trToday(now: Date = new Date()): string {
  // en-CA biçimi zaten YYYY-MM-DD üretir.
  return trDateParts.format(now);
}

function parseIsoDate(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function toIsoDate(utcMillis: number): string {
  return new Date(utcMillis).toISOString().slice(0, 10);
}

/** TR takvim gününden `span - 1` gün geriye giderek yine `YYYY-MM-DD` döner. */
function shiftDays(isoDate: string, days: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  return toIsoDate(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);
}

/**
 * Preset'i backend'in anladığı `date_from` değerine çevirir (TR gününün 00:00'ı).
 * Preset'ler backend'de yoktur; çeviri tamamen frontend sorumluluğudur.
 */
export function auditDateFrom(preset: AuditDatePreset, now: Date = new Date()): string {
  const today = trToday(now);
  if (preset === "thisMonth") return `${today.slice(0, 7)}-01`;
  const span = preset === "last7" ? LAST_7_DAYS_SPAN : LAST_30_DAYS_SPAN;
  // "Son N gün" bugünü de kapsar → N-1 gün geriye gidilir.
  return shiftDays(today, -(span - 1));
}

/** Boş/whitespace arama metni "filtre uygulanmadı" demektir (backend de böyle sayar). */
function normalizeSearch(search: string): string | null {
  const trimmed = search.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Filtreleri backend query parametrelerine çevirir.
 *
 * `date_to` bilinçli olarak GÖNDERİLMEZ. Backend semantiği artık net (TR gününün
 * 23:59:59.999999'u, dahil), yani `date_to = bugün` göndermek kayıt kırpmazdı; ama üç
 * preset de "… bugüne kadar" anlamına geldiğinden üst sınır hiçbir kaydı elemez. Buna
 * karşılık sabit bir üst sınır, ekran TR gece yarısını geçerek açık kaldığında yeni
 * kayıtları görünmez yapardı. Üst sınır yok = her zaman "şu ana kadar".
 */
export function buildAuditQuery(
  filters: AuditFilters,
  page: { limit: number; offset: number },
  now: Date = new Date(),
): AuditLogQuery {
  return {
    ...buildAuditFilterQuery(filters, now),
    limit: page.limit,
    offset: page.offset,
  };
}

/** Excel dışa aktarımı aynı filtreleri kullanır; `limit`/`offset` yoktur. */
export function buildAuditFilterQuery(filters: AuditFilters, now: Date = new Date()): AuditExportQuery {
  const query: AuditExportQuery = { date_from: auditDateFrom(filters.datePreset, now) };
  if (filters.actorUserId) query.actor_user_id = filters.actorUserId;
  if (filters.action) query.action = filters.action;
  const search = normalizeSearch(filters.search);
  if (search) query.q = search;
  return query;
}

/** Ham `fetch` ile kullanılan URL'ler için sorguyu string çiftlerine indirger. */
export function toSearchParams(query: AuditExportQuery | AuditLogQuery): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}
