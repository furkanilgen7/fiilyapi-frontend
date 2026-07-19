"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Modal } from "./Modal";
import { useCreateRole, useRenameRole } from "@/lib/api/hooks/useRoleMutations";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { RoleResponse } from "@/lib/api/models";

const KEY_RE = /^[a-z][a-z0-9_]*$/;

interface RoleFormModalProps {
  mode: "create" | "edit";
  role?: RoleResponse;
  onClose: () => void;
}

export function RoleFormModal({ mode, role, onClose }: RoleFormModalProps) {
  const createRole = useCreateRole();
  const renameRole = useRenameRole();

  const [key, setKey] = useState(role?.key ?? "");
  const [name, setName] = useState(role?.name ?? "");
  const [emoji, setEmoji] = useState(role?.emoji ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createRole.isPending || renameRole.isPending;

  function validate(): string | null {
    if (!name.trim()) return "Ad zorunludur.";
    if (mode === "create" && !KEY_RE.test(key)) return "Anahtar küçük harf/rakam/alt-çizgi olmalı ve harfle başlamalı.";
    return null;
  }

  function handleSubmit() {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    if (mode === "create") {
      createRole.mutate(
        { key, name, emoji, description },
        { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
      );
    } else if (role) {
      renameRole.mutate(
        { id: role.id, body: { name, emoji, description } },
        { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
      );
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Yeni Rol" : "Rolü Düzenle"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="settings-form">
        {mode === "create" && (
          <label className="settings-field">
            <span className="settings-field__label">Anahtar (key)</span>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="or. saha_muduru" />
          </label>
        )}
        <label className="settings-field">
          <span className="settings-field__label">Ad</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Emoji</span>
          <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Açıklama</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
