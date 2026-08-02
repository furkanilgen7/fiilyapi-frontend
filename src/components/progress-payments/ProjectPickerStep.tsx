"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Field, Select } from "@/components/ui";
import { useProjects } from "@/lib/api/hooks/useProjects";
import "./progress-payment-form.css";

/**
 * `/hakedisler/yeni` rotası `?project=` sorgu parametresi OLMADAN açıldığında
 * gösterilen ara adım (brief §Belirsizlik çözümü 2) — kullanıcı boş ekranda
 * bırakılmaz, proje seçtirilip aynı rotaya `?project=<id>` ile yönlendirilir.
 */
export function ProjectPickerStep() {
  const router = useRouter();
  const projectsQuery = useProjects();
  const [selected, setSelected] = useState("");

  function handleContinue() {
    if (!selected) return;
    router.push(`/hakedisler/yeni?project=${selected}`);
  }

  return (
    <div className="pp-form">
      <h1 className="pp-form__title">İşveren Hakediş Oluştur</h1>
      <p className="pp-form__message">
        Hakediş oluşturmak için önce bir proje seçin.
      </p>

      {projectsQuery.isLoading && <p className="pp-form__message">Yükleniyor…</p>}
      {projectsQuery.isError && (
        <p className="pp-form__message">Proje listesi yüklenemedi.</p>
      )}

      {projectsQuery.data && (
        <div className="pp-form__header-card">
          <Field label="Proje" required>
            {(control) => (
              <Select
                {...control}
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                <option value="">Seçiniz</option>
                {projectsQuery.data.items.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="pp-form__actions">
            <Button variant="primary" onClick={handleContinue} disabled={!selected}>
              Devam Et
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
