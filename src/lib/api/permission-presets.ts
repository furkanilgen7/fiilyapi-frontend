import type { AccessLevel, Scope, PermissionUpdate } from "@/lib/api/models";

export type PresetKey =
  | "super"
  | "full"
  | "none"
  | "view"
  | "limited"
  | "finance"
  | "draft"
  | "request"
  | "approve";

export interface Preset {
  key: PresetKey;
  access_level: AccessLevel;
  scope: Scope;
  label: string;
}

// 9 adlandirilmis preset — spec §4.3 tablosu. Her (level, scope) kombinasyonu tekildir.
//
// 🔴 2026-09-19 (kullanici karari): "Kendi"/"Proje"/"Stok" preset'leri KALDIRILDI
//    ve "Taslak"in kapsami `project` -> `all` oldu. Backend bu uc kapsami artik
//    REDDEDIYOR (`core/access.py::DROPPED_SCOPES`), cunku hicbiri uygulanmiyordu:
//    `own` uygulansaydi onay kutusunun "kendi evragini onaylayamazsin" bekcisini
//    TERS CEVIRIRDI, `project` ise `UserProjectAccess`in ZATEN yaptigi seydi.
//    Bunlar birakilsaydi UI, backend'in 423 ile reddedecegi bir dugme sunardi.
export const PRESETS: Preset[] = [
  { key: "super", access_level: "admin", scope: "all", label: "Süper (silme dahil)" },
  { key: "full", access_level: "full", scope: "all", label: "Tam" },
  { key: "none", access_level: "none", scope: "all", label: "— (Yok)" },
  { key: "view", access_level: "view", scope: "all", label: "Görüntüle" },
  { key: "limited", access_level: "view", scope: "limited", label: "Sınırlı" },
  { key: "finance", access_level: "view", scope: "finance", label: "Mali" },
  { key: "draft", access_level: "draft", scope: "all", label: "Taslak" },
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
  draft: "Taslak oluşturabilir (onaya girmemiş kayıt).",
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
