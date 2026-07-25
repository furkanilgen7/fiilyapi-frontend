"use client";

import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { AccessChip } from "@/components/settings/primitives/AccessChip";
import { roleVisual } from "@/components/settings/primitives/role-visuals";
import { useModules } from "@/lib/api/hooks/useModules";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useAllRolePermissions } from "@/lib/api/hooks/useRolePermissions";
import { matchPreset, type PresetKey } from "@/lib/api/permission-presets";
import { isForbidden } from "@/lib/api/unwrap";
import type { ModuleResponse, PermissionCell, RoleResponse } from "@/lib/api/models";
import "@/components/settings/settings.css";
import "./users-preview.css";

// Kullanıcılar sayfasının altındaki koşullandırılmış "İzin Matrisi" özet kartı
// (ref §B.1: 9 modül, gruplama yok, tam editör Ayarlar > İzin Matrisi sayfasındadır).
const PREVIEW_MODULE_COUNT = 9;

// Mockup'ta (Ayarlar.dc.html §242-246) kolon başlıkları kısa rol adları kullanır
// (Patron/Şef/Muhasebe/PM/Satın.); tanımsız roller için tam ada düşülür.
const SHORT_COLUMN_LABEL: Record<string, string> = {
  patron: "Patron",
  site_chief: "Şef",
  accounting: "Muhasebe",
  project_manager: "PM",
  procurement: "Satın.",
};

function columnLabel(role: RoleResponse): string {
  return SHORT_COLUMN_LABEL[role.key] ?? role.name;
}

function presetForCell(cell: PermissionCell | undefined): { key: PresetKey | ""; label: string } {
  const level = cell?.access_level ?? "none";
  const scope = cell?.scope ?? "all";
  const preset = matchPreset(level, scope);
  return { key: preset?.key ?? "", label: preset?.label ?? "—" };
}

export function PermissionMatrixPreviewCard() {
  const modulesQuery = useModules();
  const rolesQuery = useRoles();
  const roles: RoleResponse[] = rolesQuery.data ?? [];
  const roleIds = roles.map((r) => r.id);
  const permQueries = useAllRolePermissions(roleIds);

  const isLoading = modulesQuery.isLoading || rolesQuery.isLoading;
  const forbidden =
    isForbidden(modulesQuery.error) || isForbidden(rolesQuery.error) || permQueries.some((q) => isForbidden(q.error));
  const isError = modulesQuery.isError || rolesQuery.isError || !modulesQuery.data || !rolesQuery.data;

  const modules: ModuleResponse[] = (modulesQuery.data ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, PREVIEW_MODULE_COUNT);

  const permByRole: Record<string, Record<string, PermissionCell>> = {};
  roleIds.forEach((roleId, index) => {
    const cells = permQueries[index]?.data ?? [];
    const map: Record<string, PermissionCell> = {};
    for (const cell of cells) map[cell.module_key] = cell;
    permByRole[roleId] = map;
  });

  return (
    <SettingsCard
      title={
        <span className="matrix-preview-heading">
          İzin Matrisi
          <span className="matrix-preview-heading__sub">Modül bazlı erişim kontrolü</span>
        </span>
      }
      bodyPad="flush"
    >
      {isLoading && <p className="settings-note">Yükleniyor…</p>}
      {forbidden && <p className="settings-note">Bu içeriği görüntüleme izniniz yok.</p>}
      {!forbidden && isError && !isLoading && (
        <p className="settings-note settings-note--error">İzin matrisi yüklenemedi.</p>
      )}
      {!forbidden && !isError && !isLoading && (
        <table className="matrix-preview-table">
          <thead>
            <tr>
              <th className="matrix-preview-table__head-module">Modül</th>
              {roles.map((role) => (
                <th key={role.id} className="matrix-preview-table__head-role" style={{ color: roleVisual(role.key).headText }}>
                  <span aria-hidden="true">{role.emoji}</span>
                  <br />
                  {columnLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <tr key={module.id}>
                <th className="matrix-preview-table__module" scope="row">
                  {module.name}
                </th>
                {roles.map((role) => {
                  const cell = permByRole[role.id]?.[module.key];
                  const { key, label } = presetForCell(cell);
                  return (
                    <td key={role.id} className="matrix-preview-table__cell">
                      <AccessChip presetKey={key} label={label} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SettingsCard>
  );
}
