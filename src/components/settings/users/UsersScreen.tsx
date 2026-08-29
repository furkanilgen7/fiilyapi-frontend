"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { SettingsCard } from "@/components/settings/primitives/SettingsCard";
import { UserAvatar } from "@/components/settings/primitives/UserAvatar";
import { RolePill } from "@/components/settings/primitives/RolePill";
import { StatusBadge } from "@/components/settings/StatusBadge";
import { useUsers, PAGE_SIZE } from "@/lib/api/hooks/useUsers";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useProjects, useProjectAccess } from "@/lib/api/hooks/useProjects";
import { useDeleteUser } from "@/lib/api/hooks/useUserMutations";
import { UserFormModal } from "@/components/settings/UserFormModal";
import { PasswordResetModal } from "@/components/settings/PasswordResetModal";
import { ProjectAccessModal } from "@/components/settings/ProjectAccessModal";
import { ConfirmDialog } from "@/components/settings/ConfirmDialog";
import { AccessDenied } from "@/components/settings/AccessDenied";
import { backendErrorMessage } from "@/lib/api/error-message";
import { isForbidden } from "@/lib/api/unwrap";
import { cx } from "@/lib/cx";
import type { ProjectResponse, RoleResponse, UserResponse } from "@/lib/api/models";
import { RolesPreviewCard } from "./RolesPreviewCard";
import { PermissionMatrixPreviewCard } from "./PermissionMatrixPreviewCard";
import "@/components/settings/settings.css";
import "./users-screen.css";
import "./users-preview.css";
import { routes } from "@/lib/routes";

// Ayarlar ana ekranı sekme şeridi — yalnız bu ekranda (mockup Ayarlar.dc.html §70-75);
// diğer Ayarlar alt sayfaları (Rol Yönetimi, İzin Matrisi, Şirket...) kendi sub-header'ına
// sahip, bu şeridi tekrar etmiyor.
const SETTINGS_TABS = [
  { href: routes.settings.users(), label: "Kullanıcılar" },
  { href: routes.settings.roles(), label: "Rol Yönetimi" },
  { href: routes.settings.permissionMatrix(), label: "İzin Matrisi" },
  { href: routes.settings.company(), label: "Şirket" },
] as const;

type ModalState =
  | { type: "create" }
  | { type: "edit"; user: UserResponse }
  | { type: "password"; user: UserResponse }
  | { type: "project"; user: UserResponse }
  | { type: "delete"; user: UserResponse }
  | null;

function role(roles: RoleResponse[] | undefined, roleId: string): RoleResponse | undefined {
  return roles?.find((r) => r.id === roleId);
}

function pageFromParams(v: string | null): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

// Proje Erişimi hücresi: her satır kendi useProjectAccess çağrısını yapan ayrı bir
// bileşen örneği olduğu için hook kuralları ihlal edilmez (client N+1, ref §C.1).
function ProjectAccessCell({ userId, projects }: { userId: string; projects: ProjectResponse[] | undefined }) {
  const accessQuery = useProjectAccess(userId);

  if (accessQuery.isLoading) return <span className="users-cell-access">…</span>;
  if (accessQuery.isError || !accessQuery.data) return <span className="users-cell-access">—</span>;

  const { all_projects, project_ids } = accessQuery.data;
  if (all_projects) return <span className="users-cell-access">Tüm Projeler</span>;

  const names = project_ids
    .map((id) => projects?.find((p) => p.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  return <span className="users-cell-access">{names.length > 0 ? names.join(", ") : "—"}</span>;
}

export function UsersScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = pageFromParams(searchParams.get("sayfa"));
  const offset = (page - 1) * PAGE_SIZE;

  const usersQuery = useUsers({ limit: PAGE_SIZE, offset });
  const rolesQuery = useRoles();
  const projectsQuery = useProjects(); // proje adı çözümü (ref §C.1)
  const deleteUser = useDeleteUser();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const total = usersQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sayfa", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }
  function closeModal() {
    setModal(null);
    setDeleteError(null);
  }
  function confirmDelete(user: UserResponse) {
    setDeleteError(null);
    deleteUser.mutate(user.id, { onSuccess: closeModal, onError: (e) => setDeleteError(backendErrorMessage(e)) });
  }

  useEffect(() => {
    if (usersQuery.data && page > pageCount) goToPage(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageCount, usersQuery.data]);

  if (usersQuery.isLoading) return <p className="settings-note">Yükleniyor…</p>;
  if (isForbidden(usersQuery.error)) return <AccessDenied />;
  if (usersQuery.isError || !usersQuery.data)
    return <p className="settings-note settings-note--error">Kullanıcılar yüklenemedi.</p>;
  if (page > pageCount) return null;

  const { items } = usersQuery.data;

  return (
    <>
      <nav className="settings-tabs" aria-label="Ayarlar sekmeleri">
        {SETTINGS_TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cx("settings-tabs__item", isActive && "settings-tabs__item--active")}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <SettingsCard
        title="Kullanıcı Listesi"
        count={`${total} kullanıcı`}
        bodyPad="flush"
        actions={
          <>
            <span className="users-search">
              <span aria-hidden="true">🔍</span>
              <input type="search" placeholder="Kullanıcı ara..." aria-label="Kullanıcı ara" />
            </span>
            <Button variant="primary" size="sm" onClick={() => setModal({ type: "create" })}>
              + Kullanıcı Ekle
            </Button>
          </>
        }
      >
        <table className="users-table">
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>E-posta</th>
              <th className="users-table__center">Rol</th>
              <th>Proje Erişimi</th>
              <th className="users-table__center">Durum</th>
              <th aria-label="İşlemler" />
            </tr>
          </thead>
          <tbody>
            {items.map((user) => {
              const r = role(rolesQuery.data, user.role_id);
              return (
                <tr key={user.id}>
                  <td>
                    <div className="users-cell-user">
                      <UserAvatar roleKey={r?.key ?? ""} name={user.full_name} />
                      <div>
                        <div className="users-cell-user__name">{user.full_name}</div>
                        <div className="users-cell-user__sub">{user.title}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td className="users-table__center">{r ? <RolePill roleKey={r.key} name={r.name} /> : "—"}</td>
                  <td>
                    <ProjectAccessCell userId={user.id} projects={projectsQuery.data?.items} />
                  </td>
                  <td className="users-table__center">
                    <StatusBadge status={user.status} />
                  </td>
                  <td>
                    <div className="settings-row-actions">
                      <button className="users-edit" onClick={() => setModal({ type: "edit", user })}>
                        Düzenle
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => setModal({ type: "password", user })}>
                        Parola
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setModal({ type: "project", user })}>
                        Projeler
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setModal({ type: "delete", user })}>
                        Sil
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SettingsCard>

      {pageCount > 1 && (
        <div className="users-pager">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            Önceki
          </Button>
          <span className="users-pager__label">
            Sayfa {page} / {pageCount}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
            Sonraki
          </Button>
        </div>
      )}

      <div className="users-preview-grid">
        <RolesPreviewCard users={items} />
        <PermissionMatrixPreviewCard />
      </div>

      {modal?.type === "create" && <UserFormModal mode="create" onClose={closeModal} />}
      {modal?.type === "edit" && <UserFormModal mode="edit" user={modal.user} onClose={closeModal} />}
      {modal?.type === "password" && <PasswordResetModal user={modal.user} onClose={closeModal} />}
      {modal?.type === "project" && <ProjectAccessModal user={modal.user} onClose={closeModal} />}
      {modal?.type === "delete" && (
        <ConfirmDialog
          title="Kullanıcıyı Sil"
          message={`"${modal.user.full_name}" kullanıcısını silmek istediğinize emin misiniz?`}
          confirmLabel="Sil"
          danger
          isPending={deleteUser.isPending}
          errorText={deleteError}
          onConfirm={() => confirmDelete(modal.user)}
          onClose={closeModal}
        />
      )}
    </>
  );
}
