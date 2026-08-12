"use client";

import { useState } from "react";

import { Button, Field, Input, Select } from "@/components/ui";
import { Modal } from "@/components/settings/Modal";
import { stockErrorMessage } from "@/lib/api/stock-error";
import { useCreateWarehouse } from "@/lib/api/hooks/useStockMutations";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useSites } from "@/lib/api/hooks/useSites";
import "@/components/settings/settings.css";

/**
 * "+ Depo Ekle" — spec §5 **S3 (ONAYLI SAPMA)**: HİÇBİR mockup'ta depo
 * oluşturma yüzeyi yoktur, ama depo olmadan stok girişi (SG) yapılamaz; boş
 * kurulum kilitli kalırdı. Türetilmiş MİNİMAL diyalog `POST /warehouses`
 * şemasıyla birebir: `name` + nullable `site_id`.
 *
 * ⚠️ `site_id` SEÇİLMEZSE gövdede HİÇ TAŞINMAZ ve MERKEZ DEPO oluşur
 * (backend spec §7 S2b) — bu bir kaza değil, sözleşmenin kendisidir.
 * `siteId ?? ""` YAZILMAZ.
 *
 * Şantiye seçimi İKİ adımlıdır çünkü şantiye listesi ucu PROJE kapsamlıdır
 * (`GET /projects/{id}/sites`): önce proje, sonra o projenin şantiyeleri.
 * Proje seçilmezse "Merkez Depo" kipinde kalınır.
 */
export interface WarehouseModalProps {
  onClose: () => void;
}

const MAX_LENGTH = { name: 100 } as const;

const MESSAGES = {
  nameRequired: "Depo adı zorunludur.",
} as const;

/** `site_id` verilmediğinde oluşan depo türü — kullanıcıya açık yazılır. */
const CENTRAL_HINT = "Şantiye seçilmezse depo MERKEZ deposu olarak açılır.";

export function WarehouseModal({ onClose }: WarehouseModalProps) {
  const createWarehouse = useCreateWarehouse();
  const projectsQuery = useProjects();

  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Proje seçilmeden ağa çıkmaz (hook'un kendi boş-id kapısı).
  const sitesQuery = useSites(projectId);
  const projects = projectsQuery.data?.items ?? [];
  const sites = sitesQuery.data?.items ?? [];

  const isPending = createWarehouse.isPending;

  function handleProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId);
    // Şantiye kimlikleri projeye aittir — proje değişince seçim DÜŞER.
    setSiteId("");
  }

  function handleSubmit() {
    if (!name.trim()) {
      setFormError(MESSAGES.nameRequired);
      return;
    }
    setFormError(null);

    createWarehouse.mutate(
      { name: name.trim(), ...(siteId ? { site_id: siteId } : {}) },
      {
        onSuccess: () => onClose(),
        // ST §4b kanonu: bulunamayan `site_id` 404, ad çakışması 422/409 —
        // gövdedeki Türkçe `detail` olduğu gibi basılır.
        onError: (error) => setFormError(stockErrorMessage(error)),
      },
    );
  }

  return (
    <Modal
      title="Yeni Depo"
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
        <Field label="Depo Adı" required hint="Örn. D-1 Ambar, Merkez Depo (Sincan)">
          {(control) => (
            <Input
              {...control}
              maxLength={MAX_LENGTH.name}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <Field label="Proje" hint={CENTRAL_HINT}>
          {(control) => (
            <Select
              {...control}
              value={projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
            >
              <option value="">Merkez Depo (şantiyesiz)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {projectId && (
          <Field label="Şantiye">
            {(control) => (
              <Select
                {...control}
                value={siteId}
                onChange={(event) => setSiteId(event.target.value)}
              >
                <option value="">Merkez Depo (şantiyesiz)</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
