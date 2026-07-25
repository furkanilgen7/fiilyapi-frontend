/**
 * GEÇİCİ: backend B5 Task 6'da `/audit-log` uçları OpenAPI şemasına girince bu dosya
 * silinecek ve tipler `pnpm gen:api` ile üretilen `src/lib/api/schema.d.ts`
 * (`components["schemas"]["AuditItem"]` vb.) üzerinden alınacak.
 *
 * Kaynak sözleşme: backend/docs/superpowers/plans/2026-07-25-backend-b5-denetim-gunlugu.md
 * Task 4 ve Task 5. Buradaki tipler o sözleşmeye birebir uyar; serbestçe genişletilmez.
 */

export const AUDIT_ACTIONS = ["login", "create", "update", "delete", "approve", "backup"] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditActorRead {
  id: string;
  full_name: string;
  role_name: string;
}

export interface AuditItem {
  id: string;
  /** ISO 8601 zaman damgası (backend `occurred_at DESC` sıralar). */
  occurred_at: string;
  action: AuditAction;
  detail: string;
  ip_address: string | null;
  actor: AuditActorRead | null;
}

export interface AuditListResponse {
  items: AuditItem[];
  total: number;
  limit: number;
  offset: number;
}

export function isAuditAction(value: string): value is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(value);
}
