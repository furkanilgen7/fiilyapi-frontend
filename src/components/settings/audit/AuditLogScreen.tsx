import { Button } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { cx } from "@/lib/cx";
import "./audit-screen.css";

type ActionType = "login" | "create" | "approve" | "update" | "delete" | "backup";

type AuditRow = {
  time: string;
  userName: string;
  userRole: string;
  actionType: ActionType;
  actionLabel: string;
  detail: string;
  ip: string;
  danger?: boolean;
};

const ACTION_BADGE_LABEL: Record<ActionType, string> = {
  login: "Giriş",
  create: "Oluşturma",
  approve: "Onay",
  update: "Güncelleme",
  delete: "Silme",
  backup: "Yedekleme",
};

// Sabit ornek veri; canli denetim gunlugu henuz aktif degil (informational-only).
const ROWS: AuditRow[] = [
  {
    time: "17.07 09:14",
    userName: "Ahmet Yılmaz",
    userRole: "Patron",
    actionType: "login",
    actionLabel: ACTION_BADGE_LABEL.login,
    detail: "Sisteme giriş yapıldı",
    ip: "192.168.1.100",
  },
  {
    time: "17.07 08:52",
    userName: "Sercan Öztürk",
    userRole: "Şantiye Şefi",
    actionType: "create",
    actionLabel: ACTION_BADGE_LABEL.create,
    detail: "Günlük kayıt oluşturuldu · A-Blok · 17 Tem",
    ip: "10.0.0.45",
  },
  {
    time: "17.07 08:30",
    userName: "Ayşe Demir",
    userRole: "Muhasebe",
    actionType: "approve",
    actionLabel: ACTION_BADGE_LABEL.approve,
    detail: "Hakediş #47 onaylandı · ₺1.240.000",
    ip: "192.168.1.55",
  },
  {
    time: "16.07 17:20",
    userName: "Ahmet Yılmaz",
    userRole: "Patron",
    actionType: "update",
    actionLabel: ACTION_BADGE_LABEL.update,
    detail: "Kullanıcı rolü değiştirildi: Kadir Arslan → PM",
    ip: "192.168.1.100",
  },
  {
    time: "15.07 14:05",
    userName: "Yusuf Kaya",
    userRole: "Satınalma",
    actionType: "delete",
    actionLabel: ACTION_BADGE_LABEL.delete,
    detail: "Taslak satın alma talebi silindi · SAT-2026-0041",
    ip: "10.0.0.88",
    danger: true,
  },
  {
    time: "15.07 09:00",
    userName: "Sistem",
    userRole: "Otomatik",
    actionType: "backup",
    actionLabel: ACTION_BADGE_LABEL.backup,
    detail: "Otomatik yedekleme tamamlandı · 2,3 GB",
    ip: "—",
  },
];

export function AuditLogScreen() {
  return (
    <>
      <div className="audit-filters">
        <input type="search" placeholder="Kullanıcı veya işlem ara..." disabled />
        <select disabled defaultValue="all-users">
          <option value="all-users">Tüm Kullanıcılar</option>
        </select>
        <select disabled defaultValue="all-actions">
          <option value="all-actions">Tüm İşlemler</option>
        </select>
        <select disabled defaultValue="last-7-days">
          <option value="last-7-days">Son 7 Gün</option>
        </select>
        <span className="audit-filters__spacer" />
        <Button variant="ghost" size="sm" disabled>
          Excel
        </Button>
      </div>

      <SettingsCard bodyPad="flush">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Kullanıcı</th>
              <th>İşlem</th>
              <th>Detay</th>
              <th>IP Adresi</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={`${row.time}-${row.userName}`} className={cx(row.danger && "audit-row--danger")}>
                <td className="is-mono">{row.time}</td>
                <td>
                  <div className="audit-user__name">{row.userName}</div>
                  <div className="audit-user__role">{row.userRole}</div>
                </td>
                <td>
                  <span className={cx("audit-badge", `audit-badge--${row.actionType}`)}>{row.actionLabel}</span>
                </td>
                <td>{row.detail}</td>
                <td className="is-mono">{row.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingsCard>

      <p className="settings-note">Örnek kayıtlar (canlı denetim günlüğü henüz aktif değil).</p>
    </>
  );
}
