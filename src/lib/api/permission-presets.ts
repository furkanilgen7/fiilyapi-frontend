import type { AccessLevel, Scope, PermissionUpdate } from "@/lib/api/models";

export type PresetKey =
  | "super"
  | "full"
  | "none"
  | "view"
  | "limited"
  | "finance"
  | "own"
  | "project"
  | "stock"
  | "draft"
  | "request"
  | "approve";

export interface Preset {
  key: PresetKey;
  access_level: AccessLevel;
  scope: Scope;
  label: string;
}

// 12 adlandirilmis preset — spec §4.3 tablosu. Her (level, scope) kombinasyonu tekildir.
export const PRESETS: Preset[] = [
  { key: "super", access_level: "admin", scope: "all", label: "Süper (silme dahil)" },
  { key: "full", access_level: "full", scope: "all", label: "Tam" },
  { key: "none", access_level: "none", scope: "all", label: "— (Yok)" },
  { key: "view", access_level: "view", scope: "all", label: "Görüntüle" },
  { key: "limited", access_level: "view", scope: "limited", label: "Sınırlı" },
  { key: "finance", access_level: "view", scope: "finance", label: "Mali" },
  { key: "own", access_level: "view", scope: "own", label: "Kendi" },
  { key: "project", access_level: "view", scope: "project", label: "Proje" },
  { key: "stock", access_level: "view", scope: "stock", label: "Stok" },
  { key: "draft", access_level: "draft", scope: "project", label: "Taslak" },
  { key: "request", access_level: "request", scope: "all", label: "Talep" },
  { key: "approve", access_level: "approve", scope: "all", label: "Onay" },
];

export function matchPreset(level: AccessLevel, scope: Scope): Preset | null {
  return PRESETS.find((preset) => preset.access_level === level && preset.scope === scope) ?? null;
}

export function presetToUpdate(key: PresetKey): PermissionUpdate {
  const preset = PRESETS.find((p) => p.key === key);
  if (!preset) throw new Error(`Bilinmeyen preset: ${key}`);
  return { access_level: preset.access_level, scope: preset.scope };
}
