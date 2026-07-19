"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { useUsers, PAGE_SIZE } from "@/lib/api/hooks/useUsers";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useDeleteUser } from "@/lib/api/hooks/useUserMutations";
import { StatusBadge } from "./StatusBadge";
import { UserFormModal } from "./UserFormModal";
import { PasswordResetModal } from "./PasswordResetModal";
import { ProjectAccessModal } from "./ProjectAccessModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { backendErrorMessage } from "@/lib/settings/error-message";
import { isForbidden } from "@/lib/api/unwrap";
import { AccessDenied } from "./AccessDenied";
import type { RoleResponse, UserResponse } from "@/lib/api/models";
import "./settings.css";

type ModalState =
  | { type: "create" }
  | { type: "edit"; user: UserResponse }
  | { type: "password"; user: UserResponse }
  | { type: "project"; user: UserResponse }
  | { type: "delete"; user: UserResponse }
  | null;

function roleName(roles: RoleResponse[] | undefined, roleId: string): string {
  return roles?.find((r) => r.id === roleId)?.name ?? "—";
}

function pageFromParams(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function UsersScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = pageFromParams(searchParams.get("sayfa"));
  const offset = (page - 1) * PAGE_SIZE;

  const usersQuery = useUsers({ limit: PAGE_SIZE, offset });
  const rolesQuery = useRoles();
  const deleteUser = useDeleteUser();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    deleteUser.mutate(user.id, {
      onSuccess: closeModal,
      onError: (err) => setDeleteError(backendErrorMessage(err)),
    });
  }

  if (usersQuery.isLoading) {
    return <p className="settings-note">Yükleniyor…</p>;
  }

  if (isForbidden(usersQuery.error)) {
    return <AccessDenied />;
  }

  if (usersQuery.isError || !usersQuery.data) {
    return <p className="settings-note settings-note--error">Kullanıcılar yüklenemedi.</p>;
  }

  const { items, total } = usersQuery.data;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="settings-panel">
      <div className="settings-panel__toolbar">
        <span className="settings-panel__count">{total} kullanıcı</span>
        <Button variant="primary" size="sm" onClick={() => setModal({ type: "create" })}>
          Yeni Kullanıcı
        </Button>
      </div>

      <table className="settings-table">
        <thead>
          <tr>
            <th>Ad Soyad</th>
            <th>E-posta</th>
            <th>Unvan</th>
            <th>Rol</th>
            <th>Durum</th>
            <th aria-label="İşlemler" />
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td>{user.full_name}</td>
              <td>{user.email}</td>
              <td>{user.title}</td>
              <td>{roleName(rolesQuery.data, user.role_id)}</td>
              <td>
                <StatusBadge status={user.status} />
              </td>
              <td>
                <div className="settings-row-actions">
                  <Button variant="ghost" size="sm" onClick={() => setModal({ type: "edit", user })}>
                    Düzenle
                  </Button>
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
          ))}
        </tbody>
      </table>

      <div className="settings-pager">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          Önceki
        </Button>
        <span className="settings-pager__label">
          Sayfa {page} / {pageCount}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
          Sonraki
        </Button>
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
    </div>
  );
}
