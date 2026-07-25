import type { AuditAction, AuditActorRead } from "@/lib/api/audit-types";

// Rozet metinleri mockup'taki tablodan alınmıştır (Yedekleme dahil).
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  login: "Giriş",
  create: "Oluşturma",
  update: "Güncelleme",
  delete: "Silme",
  approve: "Onay",
  backup: "Yedekleme",
};

const EMPTY_CELL = "—";

// Aktörsüz (sistem kaynaklı) satırların mockup'taki karşılığı.
const SYSTEM_ACTOR_NAME = "Sistem";
const SYSTEM_ACTOR_ROLE = "Otomatik";

/** Mockup zaman biçimi: `17.07 09:14` (yerel saat). */
export function formatAuditTime(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) return EMPTY_CELL;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month} ${hours}:${minutes}`;
}

export function auditActorName(actor: AuditActorRead | null): string {
  return actor?.full_name ?? SYSTEM_ACTOR_NAME;
}

export function auditActorRole(actor: AuditActorRead | null): string {
  return actor?.role_name ?? SYSTEM_ACTOR_ROLE;
}

export function auditIpText(ipAddress: string | null): string {
  return ipAddress ?? EMPTY_CELL;
}
