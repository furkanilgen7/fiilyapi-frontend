"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { useRoles } from "@/lib/api/hooks/useRoles";
import type { RoleResponse, UserResponse } from "@/lib/api/models";
import "@/components/settings/settings.css";
import "./users-preview.css";

// Kullanıcılar sayfasının altındaki "Roller" özet kartı (ref §B.1, §A.6-lite).
// Not: kullanıcı sayısı yalnızca bu sayfada yüklü olan (mevcut sayfalanmış) kullanıcı
// listesinden hesaplanır — toplam kullanıcı sayısını rol bazında dönen ayrı bir uç
// olmadığından tam doğru olmayabilir (bilinen kısıt, Rol Yönetimi sayfası kaynak alınır).
function countByRole(users: UserResponse[], roleId: string): number {
  return users.filter((u) => u.role_id === roleId).length;
}

export function RolesPreviewCard({ users }: { users: UserResponse[] }) {
  const rolesQuery = useRoles();
  const router = useRouter();

  const roles: RoleResponse[] = rolesQuery.data ?? [];

  return (
    <SettingsCard
      title="Roller"
      actions={
        <Button variant="primary" size="sm" onClick={() => router.push("/ayarlar/roller")}>
          + Rol Ekle
        </Button>
      }
    >
      {rolesQuery.isLoading && <p className="settings-note">Yükleniyor…</p>}
      {rolesQuery.isError && <p className="settings-note settings-note--error">Roller yüklenemedi.</p>}
      {roles.length > 0 && (
        <div className="roles-preview-list">
          {roles.map((role) => (
            <div key={role.id} className="roles-preview-item">
              <span className="roles-preview-item__emoji" aria-hidden="true">
                {role.emoji}
              </span>
              <div className="roles-preview-item__body">
                <div className="roles-preview-item__name">{role.name}</div>
                <div className="roles-preview-item__summary">{role.description}</div>
              </div>
              <span className="roles-preview-item__count">{countByRole(users, role.id)} kullanıcı</span>
              <button className="users-edit" onClick={() => router.push("/ayarlar/roller")}>
                Düzenle
              </button>
            </div>
          ))}
        </div>
      )}
    </SettingsCard>
  );
}
