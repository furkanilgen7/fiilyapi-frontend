"use client";

import { useState } from "react";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useModules } from "@/lib/api/hooks/useModules";
import { useAllRolePermissions } from "@/lib/api/hooks/useRolePermissions";
import { useCreateRole, useDeleteRole } from "@/lib/api/hooks/useRoleMutations";
import { usePermissionMutation } from "@/lib/api/hooks/usePermissionMutation";
import { useUsers } from "@/lib/api/hooks/useUsers";
import { RoleFormModal } from "@/components/settings/RoleFormModal";
import { ConfirmDialog } from "@/components/settings/ConfirmDialog";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { CheckCircleIcon } from "@/components/ui/icons";
import { matchPreset } from "@/lib/api/permission-presets";
import { roleModuleSummary } from "./role-summary";
import { isForbidden } from "@/lib/api/unwrap";
import { cx } from "@/lib/cx";
import type { PermissionCell, RoleResponse } from "@/lib/api/models";
import "./roles-screen.css";

// SİSTEM vurgulu modül anahtarları (ref §A.6 — koyu/ters badge):
const EMPH_MODULES = new Set(["settings", "user_management"]);

// Modül anahtarı -> emoji (ref görsel eşleşme; backend ModuleResponse'ta emoji alanı yok).
const MODULE_EMOJI: Record<string, string> = {
  dashboard: "🏠",
  approvals: "✅",
  site_diary: "📝",
  timesheet: "👷",
  personnel: "👥",
  payroll: "💰",
  inventory: "📦",
  procurement: "🛒",
  progress_payments: "💼",
  accounting: "📒",
  treasury: "🏦",
  settings: "⚙️",
  user_management: "👤",
};

const USERS_PAGE_SIZE = 200;

export function RolesScreen() {
  const rolesQuery = useRoles();
  const modulesQuery = useModules();
  const usersQuery = useUsers({ limit: USERS_PAGE_SIZE, offset: 0 });
  const roles = rolesQuery.data ?? [];
  const permQueries = useAllRolePermissions(roles.map((r) => r.id));
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const permMutation = usePermissionMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<
    { type: "create" } | { type: "edit"; role: RoleResponse } | { type: "delete"; id: string; name: string } | null
  >(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (rolesQuery.isLoading || modulesQuery.isLoading) {
    return <p className="settings-note">Yükleniyor…</p>;
  }
  if (isForbidden(rolesQuery.error) || isForbidden(modulesQuery.error)) {
    return <AccessDenied />;
  }
  if (rolesQuery.isError || modulesQuery.isError || !modulesQuery.data) {
    return <p className="settings-note settings-note--error">Roller yüklenemedi.</p>;
  }

  const modules = modulesQuery.data;
  const cellsByRole: Record<string, PermissionCell[]> = {};
  roles.forEach((r, i) => {
    cellsByRole[r.id] = permQueries[i]?.data ?? [];
  });
  const userCountByRoleId: Record<string, number> = {};
  for (const user of usersQuery.data?.items ?? []) {
    userCountByRoleId[user.role_id] = (userCountByRoleId[user.role_id] ?? 0) + 1;
  }
  const selected = roles.find((r) => r.id === (selectedId ?? roles[0]?.id));

  async function handleCopy() {
    if (!selected) return;
    setCopyError(null);
    setIsCopying(true);
    let created: RoleResponse | null = null;
    try {
      created = await createRole.mutateAsync({
        key: `${selected.key}_kopya_${Date.now()}`,
        name: `${selected.name} (Kopya)`,
        emoji: selected.emoji,
        description: selected.description,
      });
      // 13 izin satırını replike et (ref §C.2)
      for (const cell of cellsByRole[selected.id] ?? []) {
        await permMutation.mutateAsync({
          roleId: created.id,
          moduleKey: cell.module_key,
          update: { access_level: cell.access_level, scope: cell.scope },
        });
      }
    } catch {
      // Rol oluşturuldu ama izin replikasyonu başarısız oldu → yetim rolü temizlemeyi dene (en iyi çaba).
      if (created) {
        try {
          await deleteRole.mutateAsync(created.id);
        } catch {
          // Temizlik de başarısız oldu; kullanıcıya yine de hata gösterilecek.
        }
      }
      setCopyError("Rol kopyalanamadı.");
    } finally {
      setIsCopying(false);
    }
  }

  function handleDeleteConfirm(id: string) {
    deleteRole.mutate(id, {
      onSuccess: () => {
        setModal(null);
        const remaining = roles.filter((r) => r.id !== id);
        setSelectedId(remaining[0]?.id ?? null);
      },
    });
  }

  return (
    <div className="roles-grid">
      <div className="roles-list">
        {roles.map((r, i) => {
          const cells = permQueries[i]?.data ?? [];
          const active = r.id === selected?.id;
          const isGradient = r.key === "system_admin";
          const userCount = userCountByRoleId[r.id] ?? 0;
          return (
            <button
              key={r.id}
              type="button"
              className={cx(
                "role-card",
                isGradient ? "role-card--system" : "role-card--plain",
                active && "role-card--active",
              )}
              onClick={() => setSelectedId(r.id)}
            >
              <span className="role-card__head">
                <span className="role-card__emoji" aria-hidden="true">
                  {r.emoji}
                </span>
                <span>
                  <span className="role-card__name">{r.name}</span>
                  <span className="role-card__count">{userCount} kullanıcı</span>
                </span>
                {r.is_system && <span className="role-card__tag">SİSTEM</span>}
              </span>
              <span className="role-card__summary">{roleModuleSummary(cells, modules)}</span>
            </button>
          );
        })}
        <button type="button" className="role-create" onClick={() => setModal({ type: "create" })}>
          + Özel Rol Oluştur
        </button>
      </div>

      {selected && (
        <SettingsCard>
          <div className="role-detail__head">
            <span className="role-detail__emoji" aria-hidden="true">
              {selected.emoji}
            </span>
            <div>
              <div className="role-detail__name">{selected.name}</div>
              <div className="role-detail__sub">{selected.description}</div>
            </div>
            <div className="role-detail__actions">
              {!selected.is_system && (
                <>
                  <button
                    type="button"
                    className="role-detail__action"
                    onClick={() => setModal({ type: "edit", role: selected })}
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    className="role-detail__action role-detail__action--danger"
                    onClick={() => setModal({ type: "delete", id: selected.id, name: selected.name })}
                  >
                    Sil
                  </button>
                </>
              )}
              <button type="button" className="role-detail__copy" onClick={handleCopy} disabled={isCopying}>
                Kopyala
              </button>
            </div>
          </div>
          {copyError && <p className="settings-note settings-note--error role-detail__copy-error">{copyError}</p>}
          {selected.is_system && (
            <div className="role-banner">
              <CheckCircleIcon className="role-banner__icon" aria-hidden="true" />
              <span>Bu rol tüm modüllere ve tüm sistem ayarlarına tam erişime sahiptir.</span>
            </div>
          )}
          <div className="role-modules__label">Modül Erişimleri</div>
          <div className="role-modules__list">
            {modules.map((m) => {
              const cell = (cellsByRole[selected.id] ?? []).find((c) => c.module_key === m.key);
              const preset = cell ? matchPreset(cell.access_level, cell.scope) : null;
              const isFullAccess = cell?.access_level === "full" || cell?.access_level === "admin";
              const label = selected.is_system && isFullAccess ? "Tam Erişim" : (preset?.label ?? "—");
              const emph = EMPH_MODULES.has(m.key);
              return (
                <div key={m.id} className={cx("role-module-row", emph && "role-module-row--emph")}>
                  <span className="role-module-row__name">
                    {MODULE_EMOJI[m.key] ?? ""} {m.name}
                  </span>
                  <span className="role-module-row__badge">
                    {label}
                    {emph && isFullAccess && " ✓"}
                  </span>
                </div>
              );
            })}
          </div>
        </SettingsCard>
      )}

      {modal?.type === "create" && <RoleFormModal mode="create" onClose={() => setModal(null)} />}
      {modal?.type === "edit" && (
        <RoleFormModal mode="edit" role={modal.role} onClose={() => setModal(null)} />
      )}
      {modal?.type === "delete" && (
        <ConfirmDialog
          title="Rolü Sil"
          message={`"${modal.name}" rolünü silmek istediğinize emin misiniz?`}
          confirmLabel="Sil"
          danger
          isPending={deleteRole.isPending}
          onConfirm={() => handleDeleteConfirm(modal.id)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
