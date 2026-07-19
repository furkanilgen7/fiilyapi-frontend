"use client";

import { Fragment } from "react";
import { Select } from "@/components/ui";
import { useModules } from "@/lib/api/hooks/useModules";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useAllRolePermissions } from "@/lib/api/hooks/useRolePermissions";
import { usePermissionMutation } from "@/lib/api/hooks/usePermissionMutation";
import { PRESETS, matchPreset, presetToUpdate, type PresetKey } from "@/lib/api/permission-presets";
import type { ModuleGroup, ModuleResponse, PermissionCell } from "@/lib/api/models";
import "./settings.css";

const SYSTEM_ADMIN_KEY = "system_admin";

const GROUP_ORDER: ModuleGroup[] = ["GENEL", "SAHA", "STOK_SATINALMA", "MALI", "SISTEM"];
const GROUP_LABELS: Record<ModuleGroup, string> = {
  GENEL: "Genel",
  SAHA: "Saha",
  STOK_SATINALMA: "Stok & Satınalma",
  MALI: "Mali",
  SISTEM: "Sistem",
};

function groupModules(modules: ModuleResponse[]): { group: ModuleGroup; items: ModuleResponse[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    items: modules.filter((m) => m.group === group).sort((a, b) => a.sort_order - b.sort_order),
  })).filter((section) => section.items.length > 0);
}

export function PermissionMatrix() {
  const modulesQuery = useModules();
  const rolesQuery = useRoles();

  const roles = rolesQuery.data ?? [];
  const roleIds = roles.map((role) => role.id);
  const permQueries = useAllRolePermissions(roleIds);
  const mutation = usePermissionMutation();

  if (modulesQuery.isLoading || rolesQuery.isLoading) {
    return <p className="settings-note">Yükleniyor…</p>;
  }
  if (modulesQuery.isError || rolesQuery.isError || !modulesQuery.data || !rolesQuery.data) {
    return <p className="settings-note settings-note--error">İzin matrisi yüklenemedi.</p>;
  }

  // rol_id -> (module_key -> hucre) haritasi
  const permByRole: Record<string, Record<string, PermissionCell>> = {};
  roleIds.forEach((roleId, index) => {
    const cells = permQueries[index]?.data ?? [];
    const map: Record<string, PermissionCell> = {};
    for (const cell of cells) map[cell.module_key] = cell;
    permByRole[roleId] = map;
  });

  const sections = groupModules(modulesQuery.data);

  function currentPresetKey(roleId: string, moduleKey: string): PresetKey | "" {
    const cell = permByRole[roleId]?.[moduleKey];
    const level = cell?.access_level ?? "none";
    const scope = cell?.scope ?? "all";
    return matchPreset(level, scope)?.key ?? "";
  }

  function handleChange(roleId: string, moduleKey: string, value: string) {
    if (value === "") return;
    mutation.mutate({ roleId, moduleKey, update: presetToUpdate(value as PresetKey) });
  }

  return (
    <div className="matrix-scroll">
      <table className="matrix-table">
        <thead>
          <tr>
            <th className="matrix-col-sticky matrix-col-head">Modül</th>
            {roles.map((role) => (
              <th key={role.id} className="matrix-role-head">
                <span aria-hidden="true">{role.emoji}</span> {role.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.group}>
              <tr className="matrix-group-row">
                <th className="matrix-col-sticky matrix-group-head" colSpan={roles.length + 1}>
                  {GROUP_LABELS[section.group]}
                </th>
              </tr>
              {section.items.map((module) => (
                <tr key={module.id}>
                  <th className="matrix-col-sticky matrix-module-name">{module.name}</th>
                  {roles.map((role) => {
                    const presetKey = currentPresetKey(role.id, module.key);
                    const readOnly = role.key === SYSTEM_ADMIN_KEY;
                    if (readOnly) {
                      const label = PRESETS.find((p) => p.key === presetKey)?.label ?? "Özel";
                      return (
                        <td key={role.id} className="matrix-cell matrix-cell--readonly">
                          {label}
                        </td>
                      );
                    }
                    return (
                      <td key={role.id} className="matrix-cell">
                        <Select
                          aria-label={`${module.name} — ${role.name}`}
                          value={presetKey}
                          onChange={(e) => handleChange(role.id, module.key, e.target.value)}
                        >
                          {presetKey === "" && (
                            <option value="" disabled>
                              Özel
                            </option>
                          )}
                          {PRESETS.map((preset) => (
                            <option key={preset.key} value={preset.key}>
                              {preset.label}
                            </option>
                          ))}
                        </Select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
