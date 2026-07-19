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

// Her preset'in kullaniciya donuk kisa aciklamasi — izin matrisi lejantinda gosterilir.
// Silme yalnizca "super" (admin) seviyesindedir; "full" bile silemez (backend access.py §5.0).
export const PRESET_DESCRIPTIONS: Record<PresetKey, string> = {
  super: "Modülde her şey: oluştur, düzenle ve sil. En üst yetki.",
  full: "Oluştur ve düzenle (tüm kayıtlar) — ama silme yok.",
  none: "Erişim yok.",
  view: "Tüm kayıtları görüntüler (salt-okunur).",
  limited: "Sınırlı bir alt kümeyi görüntüler (salt-okunur).",
  finance: "Yalnız mali/finans verilerini görüntüler.",
  own: "Yalnız kendi oluşturduğu kayıtları görüntüler.",
  project: "Yalnız kendi projesine ait kayıtları görüntüler.",
  stock: "Yalnız stok verilerini görüntüler.",
  draft: "Kendi projesinde taslak oluşturabilir (onaya girmemiş kayıt).",
  request: "Talep oluşturabilir (ör. satınalma talebi).",
  approve: "Kayıtları onaylayabilir.",
};

export function matchPreset(level: AccessLevel, scope: Scope): Preset | null {
  return PRESETS.find((preset) => preset.access_level === level && preset.scope === scope) ?? null;
}

export function presetToUpdate(key: PresetKey): PermissionUpdate {
  const preset = PRESETS.find((p) => p.key === key);
  if (!preset) throw new Error(`Bilinmeyen preset: ${key}`);
  return { access_level: preset.access_level, scope: preset.scope };
}
