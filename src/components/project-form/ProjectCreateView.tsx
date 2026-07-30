"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";
import { useCreateProject } from "@/lib/api/hooks/useProjectMutations";
import { useUsers } from "@/lib/api/hooks/useUsers";
import { BackendError } from "@/lib/api/unwrap";
import { backendErrorMessage } from "@/lib/settings/error-message";
import { BasicInfoCard } from "./BasicInfoCard";
import { BudgetCard, type BudgetValues } from "./BudgetCard";
import { ContractCard, type ContractValues } from "./ContractCard";
import { DocumentsPlaceholderCard } from "./DocumentsPlaceholderCard";
import { EmployerCard, type EmployerValues } from "./EmployerCard";
import { FormActions } from "./FormActions";
import { ProjectTypeCards } from "./ProjectTypeCards";
import { SiteRepeaterCard, type SiteRow } from "./SiteRepeaterCard";
import {
  InvestmentFields,
  LandShareFields,
  type InvestmentValues,
  type LandShareValues,
} from "./TypeFieldGroups";
import {
  buildProjectCreateBody,
  emptyProjectFormValues,
  numberOrNull,
  type ProjectFormValues,
} from "./form-state";
import type { BasicInfoValues, ProjectType } from "./types";
import {
  emptyProjectFormErrors,
  hasErrors,
  MESSAGES,
  validateProjectForm,
  type ProjectFormErrors,
} from "./validate";
import "./project-form.css";

/** Şantiye Şefi seçicisini besleyen kullanıcı listesi (§4.7, §7.9). */
const MANAGER_OPTIONS_LIMIT = 200;

/**
 * Yeni Proje oluşturma yüzeyi (spec §4). Kartlar tipe göre gösterilir (§7.3),
 * gönderim `POST /projects` (`is_draft` bayrağı §5), doğrulama §4.10.
 *
 * Düzenleme kipi ve taslağı kesinleştirme bu dilimde YOK (§5.6, §8) — form
 * yalnız oluşturma yüzeyidir.
 */
export function ProjectCreateView() {
  const router = useRouter();
  const createProject = useCreateProject();
  const usersQuery = useUsers({ limit: MANAGER_OPTIONS_LIMIT, offset: 0 });
  const managerNames = (usersQuery.data?.items ?? []).map((u) => u.full_name);

  const [values, setValues] = useState<ProjectFormValues>(emptyProjectFormValues);
  const [errors, setErrors] = useState<ProjectFormErrors>(emptyProjectFormErrors);
  const [formError, setFormError] = useState<string | null>(null);

  // Doğrulama sonrası ilk hatalı alana odak taşınır (§4.10). Odak isteği
  // bayrakla taşınır; hangi alanın "ilk" olduğunu DOM sırası söyler.
  const shouldFocusRef = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    firstInvalid?.focus();
  }, [errors]);

  const isContracting = values.projectType === "taahhut";
  const contractAmount = isContracting
    ? numberOrNull(values.contract.amount)
    : null;

  function handleCancel() {
    router.push("/projeler");
  }

  function updateBasic<K extends keyof BasicInfoValues>(
    field: K,
    value: BasicInfoValues[K],
  ) {
    setValues((prev) => ({ ...prev, basic: { ...prev.basic, [field]: value } }));
  }

  function updateEmployer<K extends keyof EmployerValues>(
    field: K,
    value: EmployerValues[K],
  ) {
    setValues((prev) => ({
      ...prev,
      employer: { ...prev.employer, [field]: value },
    }));
  }

  function updateContract<K extends keyof ContractValues>(
    field: K,
    value: ContractValues[K],
  ) {
    setValues((prev) => ({
      ...prev,
      contract: { ...prev.contract, [field]: value },
    }));
  }

  function updateInvestment<K extends keyof InvestmentValues>(
    field: K,
    value: InvestmentValues[K],
  ) {
    setValues((prev) => ({
      ...prev,
      investment: { ...prev.investment, [field]: value },
    }));
  }

  function updateLandShare<K extends keyof LandShareValues>(
    field: K,
    value: LandShareValues[K],
  ) {
    setValues((prev) => ({
      ...prev,
      landShare: { ...prev.landShare, [field]: value },
    }));
  }

  function updateBudget(field: keyof BudgetValues, value: string) {
    setValues((prev) => ({ ...prev, budget: { ...prev.budget, [field]: value } }));
  }

  function updateSites(rows: SiteRow[]) {
    setValues((prev) => ({ ...prev, sites: rows }));
  }

  function updateProjectType(projectType: ProjectType) {
    setValues((prev) => ({ ...prev, projectType }));
  }

  function submit(isDraft: boolean) {
    const nextErrors = validateProjectForm(values, { isDraft });
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      shouldFocusRef.current = true;
      setFormError(null);
      return;
    }
    setFormError(null);
    createProject.mutate(buildProjectCreateBody(values, isDraft), {
      // Liste sorgusunun invalidate'i hook'un içinde (useCreateProject).
      onSuccess: () => router.push("/projeler"),
      onError: (err) => {
        const isCodeConflict = err instanceof BackendError && err.status === 409;
        setFormError(
          isCodeConflict
            ? MESSAGES.projectCodeConflict
            : backendErrorMessage(err),
        );
      },
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
          <span className="pf-breadcrumb__current" aria-current="page">
            Yeni Proje
          </span>
        </nav>
        <div className="pf-topbar__actions">
          <Button
            variant="secondary"
            className="pf-topbar-cancel"
            onClick={handleCancel}
            disabled={createProject.isPending}
          >
            İptal
          </Button>
          <Button
            variant="primary"
            className="pf-topbar-submit"
            onClick={() => submit(false)}
            disabled={createProject.isPending}
          >
            Projeyi Oluştur
          </Button>
        </div>
      </div>

      <div className="pf">
        <header className="pf-head">
          <h1 className="pf-title">Yeni Proje Oluştur</h1>
          <p className="pf-subtitle">
            Proje tipini seçin — alanlar seçime göre değişir
          </p>
        </header>

        <div className="pf-body" ref={formRef}>
          <ProjectTypeCards
            value={values.projectType}
            onChange={updateProjectType}
          />

          <BasicInfoCard
            values={values.basic}
            onChange={updateBasic}
            errors={errors.basic}
          />

          {/* İşveren + Sözleşme yalnız taahhütte (§7.3) */}
          {isContracting && (
            <>
              <EmployerCard
                values={values.employer}
                onChange={updateEmployer}
                error={errors.employer}
              />
              <ContractCard
                values={values.contract}
                onChange={updateContract}
                errors={errors.contract}
              />
            </>
          )}

          {values.projectType === "kendi_yatirim" && (
            <InvestmentFields
              values={values.investment}
              onChange={updateInvestment}
              errors={errors.investment}
            />
          )}

          {values.projectType === "kat_karsiligi" && (
            <LandShareFields
              values={values.landShare}
              onChange={updateLandShare}
              errors={errors.landShare}
            />
          )}

          <SiteRepeaterCard
            rows={values.sites}
            onChange={updateSites}
            managerNames={managerNames}
            errors={errors.sites}
          />

          <BudgetCard
            values={values.budget}
            onChange={updateBudget}
            contractAmount={contractAmount}
            errors={errors.budget}
          />

          <DocumentsPlaceholderCard />
        </div>

        {formError && (
          <p className="pf-form-error" role="alert">
            {formError}
          </p>
        )}

        <FormActions
          onCancel={handleCancel}
          onSaveDraft={() => submit(true)}
          onSubmit={() => submit(false)}
          isPending={createProject.isPending}
        />
      </div>
    </div>
  );
}
