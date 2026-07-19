"use client";

import { useState } from "react";
import { Button, Badge } from "@/components/ui";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useDeleteRole } from "@/lib/api/hooks/useRoleMutations";
import { RoleFormModal } from "./RoleFormModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { RoleResponse } from "@/lib/api/models";
import "./settings.css";

type ModalState = { type: "create" } | { type: "edit"; role: RoleResponse } | { type: "delete"; role: RoleResponse } | null;

export function RolesScreen() {
  const rolesQuery = useRoles();
  const deleteRole = useDeleteRole();
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function closeModal() {
    setModal(null);
    setDeleteError(null);
  }

  function confirmDelete(role: RoleResponse) {
    setDeleteError(null);
    deleteRole.mutate(role.id, {
      onSuccess: closeModal,
      onError: (err) => setDeleteError(backendErrorMessage(err)),
    });
  }

  if (rolesQuery.isLoading) {
    return <p className="settings-note">Yükleniyor…</p>;
  }
  if (rolesQuery.isError || !rolesQuery.data) {
    return <p className="settings-note settings-note--error">Roller yüklenemedi.</p>;
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__toolbar">
        <span className="settings-panel__count">{rolesQuery.data.length} rol</span>
        <Button variant="primary" size="sm" onClick={() => setModal({ type: "create" })}>
          Yeni Rol
        </Button>
      </div>

      <table className="settings-table">
        <thead>
          <tr>
            <th>Rol</th>
            <th>Anahtar</th>
            <th>Açıklama</th>
            <th>Tür</th>
            <th aria-label="İşlemler" />
          </tr>
        </thead>
        <tbody>
          {rolesQuery.data.map((role) => (
            <tr key={role.id}>
              <td>
                <span className="settings-role__name">
                  <span aria-hidden="true">{role.emoji}</span> {role.name}
                </span>
              </td>
              <td>
                <code className="settings-role__key">{role.key}</code>
              </td>
              <td>{role.description}</td>
              <td>{role.is_system ? <Badge variant="neutral">Sistem</Badge> : <Badge variant="success">Özel</Badge>}</td>
              <td>
                <div className="settings-row-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    data-action="edit"
                    disabled={role.is_system}
                    onClick={() => setModal({ type: "edit", role })}
                  >
                    Düzenle
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    data-action="delete"
                    disabled={role.is_system}
                    onClick={() => setModal({ type: "delete", role })}
                  >
                    Sil
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal?.type === "create" && <RoleFormModal mode="create" onClose={closeModal} />}
      {modal?.type === "edit" && <RoleFormModal mode="edit" role={modal.role} onClose={closeModal} />}
      {modal?.type === "delete" && (
        <ConfirmDialog
          title="Rolü Sil"
          message={`"${modal.role.name}" rolünü silmek istediğinize emin misiniz?`}
          confirmLabel="Sil"
          danger
          isPending={deleteRole.isPending}
          errorText={deleteError}
          onConfirm={() => confirmDelete(modal.role)}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
