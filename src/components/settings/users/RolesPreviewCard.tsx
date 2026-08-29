"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { roleVisual } from "@/components/settings/primitives/role-visuals";
import { useRoles } from "@/lib/api/hooks/useRoles";
import type { RoleResponse, UserResponse } from "@/lib/api/models";
import "@/components/settings/settings.css";
import "./users-preview.css";
import { routes } from "@/lib/routes";

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
        <Button variant="primary" size="sm" onClick={() => router.push(routes.settings.roles())}>
          + Rol Ekle
        </Button>
      }
    >
      {rolesQuery.isLoading && <p className="settings-note">Yükleniyor…</p>}
      {rolesQuery.isError && <p className="settings-note settings-note--error">Roller yüklenemedi.</p>}
      {roles.length > 0 && (
        <div className="roles-preview-list">
          {roles.map((role) => {
            const visual = roleVisual(role.key);
            return (
              <div key={role.id} className="roles-preview-item">
                <div className="roles-preview-item__head">
                  <span className="roles-preview-item__label">
                    <span className="roles-preview-item__emoji" aria-hidden="true">
                      {role.emoji}
                    </span>
                    <span className="roles-preview-item__name">{role.name}</span>
                  </span>
                  <span className="roles-preview-item__meta">
                    <span
                      className="roles-preview-item__count"
                      style={{ background: visual.badgeBg, color: visual.badgeText }}
                    >
                      {countByRole(users, role.id)} kullanıcı
                    </span>
                    <button className="users-edit" onClick={() => router.push(routes.settings.roles())}>
                      Düzenle
                    </button>
                  </span>
                </div>
                <div className="roles-preview-item__summary">{role.description}</div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsCard>
  );
}
