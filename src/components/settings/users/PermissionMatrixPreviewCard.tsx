"use client";

import { useRouter } from "next/navigation";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { AccessChip } from "@/components/settings/primitives/AccessChip";
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
  const router = useRouter();

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
    <SettingsCard title="İzin Matrisi" bodyPad="flush">
      {isLoading && <p className="settings-note">Yükleniyor…</p>}
      {forbidden && <p className="settings-note">Bu içeriği görüntüleme izniniz yok.</p>}
      {!forbidden && isError && !isLoading && (
        <p className="settings-note settings-note--error">İzin matrisi yüklenemedi.</p>
      )}
      {!forbidden && !isError && !isLoading && (
        <table className="matrix-preview-table">
          <thead>
            <tr>
              <th>Modül</th>
              {roles.map((role) => (
                <th key={role.id}>
                  <span aria-hidden="true">{role.emoji}</span> {role.name}
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
                    <td key={role.id}>
                      <AccessChip presetKey={key} label={label} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="users-edit matrix-preview-link" onClick={() => router.push("/ayarlar/izin-matrisi")}>
        Tüm izin matrisini görüntüle →
      </button>
    </SettingsCard>
  );
}
