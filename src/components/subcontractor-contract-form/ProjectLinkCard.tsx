import { Field, Select } from "@/components/ui";

import { FSO_TEXT } from "./constants";
import type { SubcontractorContractFormErrors } from "./validate";

/**
 * FSO 51-68 · "🔗 Proje Bağlantısı" kartı — üç sütun (53):
 * Proje* (56) · Şantiye* (60) · İşveren Sözleşmesi salt-okunur (63-65).
 *
 * Mockup'ta proje/şantiye adları SABİT örneklerdir (56, 60); kopyalanmaz —
 * `GET /projects` ve `GET /projects/{id}/sites` uçlarından gelir.
 *
 * "İşveren Sözleşmesi" YAZILABİLİR DEĞİLDİR (64: `<div>`, `<input>` değil):
 * poz listesinin kaynağıdır, seçilen projenin sözleşmesinden OKUNUR.
 */
export interface ProjectOptionItem {
  id: string;
  name: string;
}

export interface ProjectLinkCardProps {
  projectId: string;
  siteId: string;
  projects: readonly ProjectOptionItem[];
  sites: readonly ProjectOptionItem[];
  isProjectsLoading: boolean;
  isSitesLoading: boolean;
  /** Seçili projenin işveren sözleşme no'su; yoksa `null`. */
  employerContractNo: string | null;
  /** İşveren sözleşmesi okunamadı/yok — kullanıcıya sessizce boş gösterilmez. */
  employerContractNote: string | null;
  errors: SubcontractorContractFormErrors;
  disabled?: boolean;
  onChangeProject: (projectId: string) => void;
  onChangeSite: (siteId: string) => void;
}

export function ProjectLinkCard({
  projectId,
  siteId,
  projects,
  sites,
  isProjectsLoading,
  isSitesLoading,
  employerContractNo,
  employerContractNote,
  errors,
  disabled,
  onChangeProject,
  onChangeSite,
}: ProjectLinkCardProps) {
  return (
    <section className="pf-card" aria-labelledby="fso-project-card">
      <h2 className="pf-card__title" id="fso-project-card">
        {FSO_TEXT.projectCard}
      </h2>
      <div className="pf-grid pf-grid--3">
        <Field label="Proje" required error={errors.projectId}>
          {(control) => (
            <Select
              {...control}
              value={projectId}
              disabled={disabled || isProjectsLoading}
              status={errors.projectId ? "error" : "default"}
              onChange={(event) => onChangeProject(event.target.value)}
            >
              {/* 56 — ilk seçenek "Seçiniz..." */}
              <option value="">Seçiniz...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Şantiye" required error={errors.siteId}>
          {(control) => (
            <Select
              {...control}
              value={siteId}
              // 60 — şantiye listesi projeye bağlıdır; proje seçilmeden açılmaz.
              disabled={disabled || !projectId || isSitesLoading}
              status={errors.siteId ? "error" : "default"}
              onChange={(event) => onChangeSite(event.target.value)}
            >
              <option value="">Seçiniz...</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {/* 63-66 · salt-okunur kutu + "Poz listesi buradan gelir" ipucu. */}
        <div className="field">
          <span className="field__label-row">
            <span className="field__label">İşveren Sözleşmesi</span>
          </span>
          <p className="fso-readonly fso-readonly--mono" data-testid="fso-employer-contract">
            {employerContractNo ?? "—"}
          </p>
          <p className="field__hint">{employerContractNote ?? FSO_TEXT.employerContractHint}</p>
        </div>
      </div>
    </section>
  );
}
