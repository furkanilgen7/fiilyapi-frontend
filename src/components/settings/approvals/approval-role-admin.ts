import { APPROVAL_ROLE_LABELS } from "@/components/approvals/approval-labels";
import type {
  ApprovalRole,
  ApprovalRoleAssignmentRead,
} from "@/lib/api/hooks/useApprovals";
import type { RoleResponse, UserResponse } from "@/lib/api/models";

/**
 * F-OKROL · `Ayarlar - Onay Rolleri` SAF katmanı.
 * Kanon: `projedesign/Ayarlar - Onay Rolleri.dc.html` (`:NN` = O dosyanın
 * satır numarası).
 */

/* --- Rol şeridi ---------------------------------------------------------- */

/**
 * Çip sırası (`:190-196`): Şantiye Şefi · Proje Müdürü · Muhasebe · Patron ·
 * Satınalma.
 *
 * Liste ELLE YAZILMAZ, `APPROVAL_ROLE_LABELS` (`Record<ApprovalRole, string>`)
 * anahtarlarından türetilir: sözlük TOTAL olduğu için enuma yeni bir üye
 * eklendiğinde `pnpm typecheck` sözlükte kırmızı döner ve çip şeridi
 * KENDİLİĞİNDEN büyür. Elle yazılmış bir dizi sessizce eksik kalırdı.
 */
export const APPROVAL_ROLE_ORDER: readonly ApprovalRole[] = Object.keys(
  APPROVAL_ROLE_LABELS,
) as ApprovalRole[];

/**
 * Çip tıklaması — atama bir KÜMEdir ve uç TAM KÜME yazar (`K1`). Sonuç her
 * zaman `APPROVAL_ROLE_ORDER` sırasındadır: iki ardışık tıklama gövde sırasını
 * değiştirmesin (sunucu tekrarları zaten sessizce tekilleştirir, ama sıra
 * kararsızlığı denetim günlüğünü gürültüye boğardı).
 */
export function toggleApprovalRole(
  current: readonly ApprovalRole[],
  role: ApprovalRole,
): ApprovalRole[] {
  const next = current.includes(role)
    ? current.filter((r) => r !== role)
    : [...current, role];
  return APPROVAL_ROLE_ORDER.filter((r) => next.includes(r));
}

/* --- Satır kümesi -------------------------------------------------------- */

export interface ApprovalRoleRow {
  userId: string;
  fullName: string;
  email: string;
  /** Sistem rolü — `GET /users.role_id` → `GET /roles`. Onay rolünden AYRIDIR. */
  systemRole: RoleResponse | undefined;
  approvalRoles: ApprovalRole[];
}

/**
 * 🔴 İKİ UÇ BİRLEŞTİRİLİR ve bu ZORUNLUDUR.
 *
 * ÖLÇÜM (`backend/app/modules/approvals/repository.py::assignment_page`):
 * `GET /approvals/roles` `UserApprovalRole` üzerinden `JOIN`ler, yani yalnız
 * EN AZ BİR onay rolü taşıyan kullanıcıları döner. Ekran yalnız o uçtan
 * beslenseydi rolü olmayan bir kullanıcıya rol VERİLEMEZDİ — ekranın tek işi
 * tam olarak budur.
 *
 * Bu yüzden SATIR KÜMESİ kullanıcı katalogundan (`GET /users`) gelir,
 * atamalar üzerine BİNDİRİLİR. Katalogda olmayan bir atama satırı da DÜŞMEZ
 * (sayfalama dışında kalmış bir kullanıcı imzasını sessizce kaybetmesin).
 *
 * Sıralama TR harmanıyla ada göre yapılır ve `userId` ile eşitlik bozulur:
 * kare determinizmi satır sırasına bağlıdır, `GET /users`ın ekleme sırası
 * bir garanti DEĞİLDİR.
 */
export function mergeApprovalRoleRows(
  users: readonly UserResponse[],
  roles: readonly RoleResponse[],
  assignments: readonly ApprovalRoleAssignmentRead[],
): ApprovalRoleRow[] {
  const byUserId = new Map(assignments.map((a) => [a.user_id, a]));
  const rows: ApprovalRoleRow[] = users.map((user) => ({
    userId: user.id,
    fullName: user.full_name,
    email: user.email,
    systemRole: roles.find((r) => r.id === user.role_id),
    approvalRoles: byUserId.get(user.id)?.approval_roles ?? [],
  }));

  const seen = new Set(rows.map((row) => row.userId));
  for (const assignment of assignments) {
    if (seen.has(assignment.user_id)) continue;
    rows.push({
      userId: assignment.user_id,
      fullName: assignment.full_name,
      email: assignment.email,
      systemRole: undefined,
      approvalRoles: assignment.approval_roles,
    });
  }

  return rows.sort(
    (a, b) =>
      a.fullName.localeCompare(b.fullName, "tr") || a.userId.localeCompare(b.userId),
  );
}

/**
 * `:186` sağ üstteki sayaç.
 *
 * 🔴 MOCKUP'TAKİ "8 kullanıcı" BİR ÇİZİM SAYISIDIR ve tabloyla ÇELİŞİR
 * (`grep -c '@fiil.com'` = 5 satır). Sayı VERİDEN türetilir: basılan SATIR
 * sayısı. Sunucunun `total`i BURADA KULLANILMAZ — o, atamaların toplamıdır,
 * basılan satırların değil.
 */
export function approvalRoleCountLabel(rowCount: number): string {
  return `${rowCount} kullanıcı`;
}

/* --- "Bekleyen" kolonu (`:191`) ------------------------------------------ */

/**
 * 🔴 KULLANICI BAŞINA BEKLEYEN ONAY SAYISI HİÇBİR UÇTAN GELMEZ — ölçüldü:
 * `ApprovalRoleAssignmentRead` yalnız `user_id · full_name · email ·
 * approval_roles` taşır (openapi.json, 232 yol). `GET /approvals` ise
 * YALNIZCA oturumun KENDİ kutusunu döner, başkasınınkini değil.
 *
 * Mockup'ın kolon toplamı (4+2+3+1+0 = 10) ayrıca bugünkü Onay Kutusu ve
 * Gösterge Paneli sayılarıyla (7 ↔ 7) da ÇELİŞİR.
 *
 * F-TH kanonu gereği kolon SİLİNMEZ: devre-dışı başlıkla, hücrelerinde
 * `UNKNOWN_VALUE` ile ve GÖRÜNÜR gerekçeyle basılır. Sayı UYDURULMAZ.
 */
export const APPROVAL_PENDING_COLUMN_LABEL = "Bekleyen";
export const APPROVAL_PENDING_COLUMN_REASON =
  "Kullanıcı başına bekleyen onay sayısı henüz hiçbir uçtan gelmiyor; bu kolon veri geldiğinde açılacak.";

/* --- Eşik kartı (`:139-176`) --------------------------------------------- */

export const APPROVAL_THRESHOLD_CARD_TITLE = "Onay Eşiği";
export const APPROVAL_THRESHOLD_ADMIN_BADGE = "YALNIZ YÖNETİCİ";
export const APPROVAL_THRESHOLD_FIELD_LABEL = "Patron Onay Eşiği";
export const APPROVAL_THRESHOLD_HINT =
  "Değiştirmek için Sistem Yöneticisi yetkisi gerekir. Değişiklik denetim günlüğüne işlenir.";
export const APPROVAL_THRESHOLD_LOCKED_NOTE =
  "Onay eşiği yalnız Sistem Yöneticisi tarafından değiştirilebilir — bu alan salt okunur.";
export const APPROVAL_THRESHOLD_SAVE_LABEL = "Eşiği Kaydet";
export const APPROVAL_THRESHOLD_SAVE_ERROR = "Eşik kaydedilemedi.";
export const APPROVAL_THRESHOLD_FLOW_TITLE = "Eşik nasıl çalışır?";

export const APPROVAL_ROLES_SAVE_ERROR = "Onay rolleri kaydedilemedi.";

/**
 * `:158` `< ₺500.000` · `:167` `≥ ₺500.000`.
 *
 * ⚠️ ONAYLI SAPMA — `≥` (U+2265) `src/styles/fonts.css`teki 7 `unicode-range`
 * kuralının HİÇBİRİNDE kapsanmıyor (ölçüldü); kapsanmayan glif tarayıcıyı
 * sistem yedeğine düşürür ve kare `ubuntu-latest`te turdan tura oynar.
 * Anlamı koruyan sözcük kullanılır (glif yasağı kanonu, F-MU2).
 */
export function approvalThresholdBelowLabel(formattedThreshold: string): string {
  return `${formattedThreshold} altı`;
}

export function approvalThresholdAboveLabel(formattedThreshold: string): string {
  return `${formattedThreshold} ve üstü`;
}
