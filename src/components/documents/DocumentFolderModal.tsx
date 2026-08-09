"use client";

import { useState } from "react";

import { Button, Field, Input } from "@/components/ui";
import { Modal } from "@/components/settings/Modal";
import { backendErrorMessage } from "@/lib/api/error-message";
import { useCreateDocumentFolder } from "@/lib/api/hooks/useDocumentMutations";
import "@/components/settings/settings.css";
import "@/styles/form-shell.css";

export interface DocumentFolderModalProps {
  /** Klasörün açılacağı proje — hook'a YOL parametresi olarak gider. */
  projectId: string;
  /**
   * ⚠️ İSTEĞE BAĞLI ve `undefined` ANLAMLIDIR: verilmezse gövdede `site_id`
   * HİÇ taşınmaz → klasör PROJE DÜZEYİNDE açılır. `siteId ?? ""` YAZMAYIN.
   */
  siteId?: string;
  onClose: () => void;
}

/**
 * "Yeni Klasör" diyaloğu — spec §6 S1 (ONAYLI): TEK "ad" alanı.
 *
 * Üst klasör seçimi BASILMAZ: mockup klasör listesini tek seviye çizer ve
 * şema `parent_id` taşısa da daha derin ağaç icat edilmez (bkz.
 * `DocumentFolderPanel` notu). Yeniden adlandırma/silme de BASILMAZ (spec §4).
 */
export function DocumentFolderModal({ projectId, siteId, onClose }: DocumentFolderModalProps) {
  const createFolder = useCreateDocumentFolder(projectId);

  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createFolder.isPending;

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Klasör adı zorunludur.");
      return;
    }
    setFormError(null);

    createFolder.mutate(
      // `project_id` GÖVDEDE YOKTUR (yol parametresi — backend sözleşmesi).
      { name: trimmed, ...(siteId !== undefined ? { site_id: siteId } : {}) },
      {
        onSuccess: () => onClose(),
        // 409 (ad çakışması) gövdesindeki Türkçe `detail` olduğu gibi basılır.
        onError: (error) => setFormError(backendErrorMessage(error, "Klasör oluşturulamadı.")),
      },
    );
  }

  return (
    <Modal
      title="Yeni Klasör"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            Oluştur
          </Button>
        </>
      }
    >
      <div className="settings-form">
        <Field label="Klasör Adı" required>
          {(control) => (
            <Input
              {...control}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFormError(null);
              }}
            />
          )}
        </Field>
        {formError && <p className="pf-form-error">{formError}</p>}
      </div>
    </Modal>
  );
}
