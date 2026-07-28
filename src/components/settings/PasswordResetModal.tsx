"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { Modal } from "./Modal";
import { useResetPassword } from "@/lib/api/hooks/useUserMutations";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { UserResponse } from "@/lib/api/models";

const MIN_PASSWORD = 8;

export function PasswordResetModal({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit() {
    if (password.length < MIN_PASSWORD) {
      setFormError(`Parola en az ${MIN_PASSWORD} karakter olmalıdır.`);
      return;
    }
    setFormError(null);
    reset.mutate(
      { id: user.id, body: { new_password: password } },
      { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
    );
  }

  return (
    <Modal
      title={`Parola Sıfırla — ${user.full_name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={reset.isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={reset.isPending}>
            Sıfırla
          </Button>
        </>
      }
    >
      <div className="settings-form">
        <Field label="Yeni Parola" required hint={`En az ${MIN_PASSWORD} karakter.`}>
          {(control) => (
            <Input
              {...control}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
