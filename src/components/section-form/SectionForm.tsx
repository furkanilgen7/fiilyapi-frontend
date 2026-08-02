"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button, Checkbox } from "@/components/ui";
import { FormActions } from "@/components/form-shell";
import { backendErrorMessage } from "@/lib/api/error-message";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSection } from "@/lib/api/hooks/useSection";
import { useCreateSection, useUpdateSection } from "@/lib/api/hooks/useSectionMutations";
import { useSite } from "@/lib/api/hooks/useSites";
import { useUserOptions } from "@/lib/api/hooks/useUserOptions";
import { BackendError, isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { pendingModuleLabel } from "@/lib/pending-modules";
import { isUserListUnavailable } from "@/components/site-form/user-picker";

import { BoqAssignmentCard } from "./BoqAssignmentCard";
import { buildSectionBody } from "./build-body";
import { DocumentsCard } from "./DocumentsCard";
import { emptySectionFormValues, sectionFormValuesFromDetail, type SectionFormValues } from "./form-state";
import { ScheduleBudgetCard } from "./ScheduleBudgetCard";
import { SectionInfoCard } from "./SectionInfoCard";
import { TeamCard } from "./TeamCard";
import { hasSectionFormErrors, MESSAGES, validateSectionForm, type SectionFormErrors } from "./validate";
// Sıra önemli: önce paylaşılan kabuk, sonra forma özgü bloklar.
import "@/styles/form-shell.css";
import "./section-form.css";

export type SectionFormProps =
  | { mode: "create"; projectId: string; siteId: string }
  | { mode: "edit"; projectId: string; siteId: string; sectionId: string };

/** Bilgi kutusu ikonu (mockup F54) — SiteCreateView deseniyle aynı. */
function InfoIcon() {
  return (
    <svg className="site-form__info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v6M10 6.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Bölüm oluştur/düzenle formu (F-P6 T3, mockup "Form - Bolum Ekle.dc.html").
 * `create` ve `edit` kipleri AYNI bileşendir (`ProgressPaymentForm` deseni,
 * iki kopya form YOK). `SectionFormModal` bunun yerine EMEKLİ edildi.
 */
export function SectionForm(props: SectionFormProps) {
  const router = useRouter();
  const { canWrite } = useModulePermission("sites");
  const isEdit = props.mode === "edit";

  const siteQuery = useSite(props.siteId);
  const projectQuery = useProject(props.projectId);
  const detailQuery = useSection(isEdit ? props.sectionId : "");
  const detail = isEdit ? detailQuery.data : undefined;
  const users = useUserOptions();

  const createSection = useCreateSection(props.siteId);
  const updateSection = useUpdateSection(isEdit ? props.sectionId : "");
  const isSaving = createSection.isPending || updateSection.isPending;

  const [values, setValues] = useState<SectionFormValues>(emptySectionFormValues);
  const [errors, setErrors] = useState<SectionFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Düzenleme kipinde tohumlama YALNIZ BİR KEZ çalışır (ProgressPaymentForm
  // deseni) — sonraki `detailQuery` yenilemeleri kullanıcının o anki
  // düzenlemesini SİLMEZ.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!isEdit) return;
    if (!detail) return;
    seededRef.current = true;
    setValues(sectionFormValuesFromDetail(detail));
  }, [isEdit, detail]);

  const shouldFocusRef = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  if (!canWrite) return <AccessDenied />;
  if (isForbidden(siteQuery.error) || isForbidden(projectQuery.error) || isForbidden(detailQuery.error)) {
    return <AccessDenied />;
  }
  if (isEdit && (detailQuery.isLoading || !detail)) {
    return <p className="site-form__message">Yükleniyor…</p>;
  }
  if (siteQuery.isLoading || !siteQuery.data) {
    return <p className="site-form__message">Yükleniyor…</p>;
  }

  const site = siteQuery.data;
  const project = projectQuery.data;

  function handleChange<K extends keyof SectionFormValues>(field: K, value: SectionFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancel() {
    const target = isEdit
      ? `/projeler/${props.projectId}/santiyeler/${props.siteId}/bolumler/${props.sectionId}`
      : `/projeler/${props.projectId}/santiyeler/${props.siteId}`;
    router.push(target);
  }

  function handleMutationError(err: unknown) {
    const isCodeConflict = err instanceof BackendError && err.status === 409;
    if (isCodeConflict) {
      setErrors((prev) => ({ ...prev, code: MESSAGES.sectionCodeConflict }));
    }
    setFormError(isCodeConflict ? MESSAGES.sectionCodeConflict : backendErrorMessage(err));
  }

  function submit(isDraft: boolean) {
    const nextErrors = validateSectionForm(values, {
      isDraft,
      isUserListUnavailable: isUserListUnavailable(users),
    });
    setErrors(nextErrors);

    if (hasSectionFormErrors(nextErrors)) {
      shouldFocusRef.current = true;
      setFormError(Object.values(nextErrors)[0] ?? null);
      return;
    }

    setFormError(null);
    const body = buildSectionBody(values, { isDraft });

    if (!isEdit) {
      createSection.mutate(body, {
        onSuccess: (created) =>
          router.push(`/projeler/${props.projectId}/santiyeler/${props.siteId}/bolumler/${created.id}`),
        onError: handleMutationError,
      });
      return;
    }

    updateSection.mutate(body, {
      onSuccess: (updated) =>
        router.push(`/projeler/${props.projectId}/santiyeler/${props.siteId}/bolumler/${updated.id}`),
      onError: handleMutationError,
    });
  }

  return (
    <div className="pf-shell">
      <div className="pf-topbar">
        <nav className="pf-breadcrumb" aria-label="Kırıntı yolu">
          <Link href="/projeler">Projeler</Link>
          <span className="pf-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <Link href={`/projeler/${props.projectId}/santiyeler/${props.siteId}`}>{site.name}</Link>
          <span className="pf-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <span className="pf-breadcrumb__current" aria-current="page">
            {isEdit ? "Bölümü Düzenle" : "Yeni Bölüm"}
          </span>
        </nav>
        <div className="pf-topbar__actions">
          <Button variant="secondary" className="pf-topbar-cancel" onClick={handleCancel} disabled={isSaving}>
            İptal
          </Button>
          <Button variant="primary" className="pf-topbar-submit" onClick={() => submit(false)} disabled={isSaving}>
            {isSaving ? "Kaydediliyor…" : isEdit ? "Kaydet" : "Bölümü Oluştur"}
          </Button>
        </div>
      </div>

      <div className="pf">
        <header className="pf-head">
          <h1 className="pf-title">{isEdit ? "Bölümü Düzenle" : "Yeni Bölüm (Faz) Ekle"}</h1>
          <p className="pf-subtitle">
            Bölüm, şantiyenin bir iş fazıdır — kendi iş kalemleri, işçileri ve hakedişi olur
          </p>
        </header>

        <div className="site-form__info" data-testid="section-form-site-info">
          <InfoIcon />
          <div className="site-form__info-text">
            <strong>Şantiye:</strong> {site.name}
            {project && ` · ${project.name} (${project.code})`}
            <br />
            Mevcut {site.section_count} bölüm var. Yeni bölüm eklendikten sonra{" "}
            <strong>iş kalemi ataması</strong> yapılmalı.
          </div>
          <Link href={`/projeler/${props.projectId}/santiyeler/${props.siteId}`} className="site-form__info-link">
            Mevcut Bölümler →
          </Link>
        </div>

        <div className="pf-body" data-testid="section-form-body" ref={formRef}>
          <SectionInfoCard values={values} onChange={handleChange} siteName={site.name} errors={errors} />
          <TeamCard values={values} onChange={handleChange} errors={errors} />
          <ScheduleBudgetCard values={values} onChange={handleChange} errors={errors} />
          <BoqAssignmentCard />
          <DocumentsCard />
        </div>

        {formError && (
          <p className="pf-form-error" role="alert">
            {formError}
          </p>
        )}

        <FormActions
          variant="split"
          leading={
            // F236-239: Gantt'a otomatik ekleme — devre dışı (→P11), gövdeye girmez.
            <Checkbox
              checked
              disabled
              title={pendingModuleLabel("gantt")}
              label="Bölümü proje takvimine (Gantt) otomatik ekle"
            />
          }
          onCancel={handleCancel}
          onSaveDraft={() => submit(true)}
          onSubmit={() => submit(false)}
          submitLabel={isEdit ? "Kaydet" : "Bölümü Oluştur"}
          pendingLabel="Kaydediliyor…"
          isPending={isSaving}
        />
      </div>
    </div>
  );
}
