import type { AuditAction, AuditActorRead } from "@/lib/api/models";

// Rozet metinleri mockup'taki tablodan alınmıştır (Yedekleme dahil).
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  login: "Giriş",
  create: "Oluşturma",
  update: "Güncelleme",
  delete: "Silme",
  approve: "Onay",
  backup: "Yedekleme",
  // AI-0b — FİİL AI'ın bir TURUNUN özet satırı. Üreticisi AI-1'de gelir
  // (`POST /ai/chat`); enum üyesi şimdi açıldı ki ikinci bir enum takas
  // migration'ı gerekmesin.
  //
  // 🔴 Bu haritanın tipi `Record<AuditAction, string>`tir, yani TÜKETİCİDİR:
  // backend enum'una üye eklendiğinde `tsc` **TS2741 ile patlar** ve etiket
  // eklenmesini ZORLAR. (Bu satır bir "unutulmasın" notu değil, ölçülmüş bir
  // olgunun sonucudur — devirde tam olarak öyle oldu.)
  ai_turn: "AI Turu",
};

export function isAuditAction(value: string): value is AuditAction {
  return Object.hasOwn(AUDIT_ACTION_LABEL, value);
}

const EMPTY_CELL = "—";

// Aktörsüz (sistem kaynaklı) satırların mockup'taki karşılığı.
const SYSTEM_ACTOR_NAME = "Sistem";
const SYSTEM_ACTOR_ROLE = "Otomatik";

// Backend `occurred_at`'i UTC saklar ve Excel dışa aktarımını Europe/Istanbul'a
// çevirerek yazar; ekran da aynı saati göstermek zorunda (aksi halde aynı kayıt
// ekranda ve Excel'de farklı saatte görünür). Bu yüzden biçimlendirme tarayıcının
// yerel saatine değil, sabit TR saatine göre yapılır.
export const AUDIT_TIME_ZONE = "Europe/Istanbul";

const trParts = new Intl.DateTimeFormat("tr-TR", {
  timeZone: AUDIT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  // h23: gece yarısı "24:30" değil "00:30" yazılır.
  hourCycle: "h23",
});

const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Zaman damgasını Date'e çevirir. Ofset taşımayan (naive) değerler UTC kabul edilir —
 * backend UTC saklar, dolayısıyla ofsetsiz bir değeri tarayıcının yerel saati saymak
 * kullanıcının bulunduğu zaman dilimine göre kayan bir sonuç üretirdi.
 */
function parseOccurredAt(occurredAt: string): Date {
  return new Date(HAS_OFFSET.test(occurredAt) ? occurredAt : `${occurredAt}Z`);
}

/** Mockup zaman biçimi: `17.07 09:14` (Europe/Istanbul). */
export function formatAuditTime(occurredAt: string): string {
  const date = parseOccurredAt(occurredAt);
  if (Number.isNaN(date.getTime())) return EMPTY_CELL;
  const parts = Object.fromEntries(trParts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.day}.${parts.month} ${parts.hour}:${parts.minute}`;
}

export function auditActorName(actor: AuditActorRead | null | undefined): string {
  return actor?.full_name ?? SYSTEM_ACTOR_NAME;
}

export function auditActorRole(actor: AuditActorRead | null | undefined): string {
  return actor?.role_name ?? SYSTEM_ACTOR_ROLE;
}

export function auditIpText(ipAddress: string | null | undefined): string {
  return ipAddress ?? EMPTY_CELL;
}
