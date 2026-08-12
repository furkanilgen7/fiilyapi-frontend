"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button, Checkbox } from "@/components/ui";
import { useCreatePersonnel, useUpdatePersonnel } from "@/lib/api/hooks/usePersonnelMutations";
import { usePersonnelDetail } from "@/lib/api/hooks/usePersonnelDetail";
import { useSubcontractors } from "@/lib/api/hooks/useSubcontractors";
import { backendErrorMessage } from "@/lib/api/error-message";
import { isForbidden } from "@/lib/api/unwrap";
import { hasAtLeast } from "@/lib/auth/permissions";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { buildPersonnelCreateBody, buildPersonnelUpdateBody, submittableValues } from "./build-body";
import {
  ACTIVE_TOGGLE_LABEL,
  BREADCRUMB_CURRENT,
  BREADCRUMB_CURRENT_EDIT,
  BREADCRUMB_HR,
  PAGE_SUBTITLE_EDIT_SUFFIX,
  PAGE_SUBTITLE_PREFIX,
  PAGE_SUBTITLE_SUFFIX,
  PAGE_TITLE,
  PAGE_TITLE_EDIT,
  PENDING_DRAFT,
  PENDING_NOTICES,
  PERSONNEL_LIST_HREF,
  SUBMIT_LABEL,
  SUBMIT_LABEL_EDIT,
  TOPBAR_DRAFT_LABEL,
} from "./constants";
import { ContactCard } from "./ContactCard";
import {
  emptyPersonnelFormValues,
  personnelFormValuesFromDetail,
  type PersonnelFormValues,
} from "./form-state";
import { IdentityCard } from "./IdentityCard";
import { JobCard } from "./JobCard";
import { PersonnelDocumentsCard } from "./PersonnelDocumentsCard";
import { PersonnelFormActions } from "./PersonnelFormActions";
import {
  hasPersonnelFormErrors,
  validatePersonnelForm,
  type PersonnelFormErrors,
} from "./validate";
// Sıra önemli: önce paylaşılan kabuk, sonra forma özgü bloklar (özgü kazansın).
import "@/styles/form-shell.css";
import "./personnel-form.css";

/**
 * "İptal"/kaydetme sonrası dönülecek rotayı taşıyan sorgu parametresi
 * (yalnız `create` kipinde okunur).
 *
 * Mockup'ın "İptal" bağlantıları `Personel.dc.html`e gider (35, 38, 210).
 * Form GELDİĞİ YERE döner: puantaj ekranlarındaki giriş noktaları bu
 * parametreyi doldurur, doğrudan URL ile gelen kullanıcı genel puantaja düşer.
 */
export const RETURN_PARAM = "donus";

/** Parametre yoksa ya da güvenilir değilse dönülecek rota. */
export const DEFAULT_RETURN_TO = "/puantaj";

/** Yalnız uygulama içi mutlak yol kabul edilir (açık yönlendirme kapalı). */
export function safeReturnTo(raw: string | null): string {
  if (!raw) return DEFAULT_RETURN_TO;
  if (!raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_RETURN_TO;
  return raw;
}

export type PersonnelFormProps = { mode: "create" } | { mode: "edit"; personnelId: string };

/**
 * Personel Kaydı formu — `create`/`edit` AYNI bileşendir (F-P6 `SectionForm`
 * iki-kip emsali BİREBİR, iki kopya form YOK). Mockup `Form - Personel
 * Ekle.dc.html` (yorumlardaki sayılar o dosyanın SATIR numaralarıdır);
 * düzenleme kipinin kendi mockup'ı yoktur, metinleri `SectionForm`ın
 * kip desenini izler.
 *
 * ⭐ ÜST KURAL: mockup'taki her alan basılır. Sunucu sözleşmesinde
 * (`PersonnelCreate`/`PersonnelUpdate`) karşılığı OLMAYAN alanlar
 * devre-dışıdır, gerekçeleri ekranın üstünde GÖRÜNÜR listelenir ve gövdeye
 * ASLA sızmazlar — bu alanların form durumunda karşılığı bile yoktur
 * (`form-state.ts`). Düzenleme kipinde bu pending alanlar AYNEN pending
 * kalır (K2) — yalnız `is_active` ek olarak düzenlenebilir.
 */
export function PersonnelForm(props: PersonnelFormProps) {
  const isEdit = props.mode === "edit";
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get(RETURN_PARAM));

  const permission = useModulePermission("personnel");
  const createPersonnel = useCreatePersonnel();
  const updatePersonnel = useUpdatePersonnel(isEdit ? props.personnelId : "");
  const subcontractorsQuery = useSubcontractors();
  const detailQuery = usePersonnelDetail(isEdit ? props.personnelId : "");
  const detail = isEdit ? detailQuery.data : undefined;
  const isSaving = createPersonnel.isPending || updatePersonnel.isPending;

  const [values, setValues] = useState<PersonnelFormValues>(emptyPersonnelFormValues);
  const [errors, setErrors] = useState<PersonnelFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Düzenleme kipinde tohumlama YALNIZ BİR KEZ çalışır (`SectionForm` deseni)
  // — sonraki `detailQuery` yenilemeleri kullanıcının o anki düzenlemesini
  // SİLMEZ.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!isEdit) return;
    if (!detail) return;
    seededRef.current = true;
    setValues(personnelFormValuesFromDetail(detail));
  }, [isEdit, detail]);

  // Doğrulama sonrası ilk hatalı alana odak — hangi alanın "ilk" olduğunu DOM
  // sırası söyler; odak isteği bayrakla taşınır (şantiye formu deseni).
  const shouldFocusRef = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  // Mutasyon yok: her değişiklik yeni nesne üretir.
  function handleChange<K extends keyof PersonnelFormValues>(
    field: K,
    value: PersonnelFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancel() {
    router.push(isEdit ? `/personel/${props.personnelId}` : returnTo);
  }

  function submit() {
    const nextErrors = validatePersonnelForm(values);
    setErrors(nextErrors);

    if (hasPersonnelFormErrors(nextErrors)) {
      shouldFocusRef.current = true;
      // Özet, alan mesajlarının İLKİDİR — yeni dize üretilmez.
      setFormError(Object.values(nextErrors)[0] ?? null);
      return;
    }

    const submittable = submittableValues(values);
    if (!submittable) return; // doğrulama geçtiyse ulaşılamaz; tip kapısı

    setFormError(null);
    const onError = (err: unknown) => setFormError(backendErrorMessage(err));

    if (!isEdit) {
      createPersonnel.mutate(buildPersonnelCreateBody(submittable), {
        // `usePersonnelMutations` başarıda personel önbelleğini geçersizleştirir
        // → matris/liste yeni kişiyi HEMEN çizer.
        onSuccess: () => router.push(returnTo),
        onError,
      });
      return;
    }

    updatePersonnel.mutate(buildPersonnelUpdateBody(submittable), {
      onSuccess: () => router.push(`/personel/${props.personnelId}`),
      onError,
    });
  }

  // Yazma yetkisi olmayan kullanıcı bu rotayı hiç görmemeli (giriş noktaları
  // zaten gizli); doğrudan URL ile gelen için kapı burada.
  if (!hasAtLeast(permission.level, "full")) return <AccessDenied />;
  if (isEdit && isForbidden(detailQuery.error)) return <AccessDenied />;
  if (isEdit && detailQuery.isError) {
    return <p className="pf-message">Personel yüklenemedi</p>;
  }
  if (isEdit && (detailQuery.isLoading || !detail)) {
    return <p className="pf-message">Yükleniyor…</p>;
  }

  const pageTitle = isEdit ? PAGE_TITLE_EDIT : PAGE_TITLE;
  const submitLabel = isEdit ? SUBMIT_LABEL_EDIT : SUBMIT_LABEL;
  const breadcrumbCurrent = isEdit ? BREADCRUMB_CURRENT_EDIT : BREADCRUMB_CURRENT;

  return (
    <div className="pf-shell">
      {/* 30-42 — yapışkan üst şerit */}
      <div className="pf-topbar">
        <nav className="pf-breadcrumb" aria-label="Kırıntı yolu">
          {/* F-PT2 T3 kapsam C: `/personel` GERÇEK rota — kırıntı artık edilgen DEĞİL. */}
          <Link href={PERSONNEL_LIST_HREF}>{BREADCRUMB_HR}</Link>
          <span className="pf-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <span className="pf-breadcrumb__current" aria-current="page">
            {breadcrumbCurrent}
          </span>
        </nav>
        <div className="pf-topbar__actions">
          {/* 38 */}
          <Button
            variant="secondary"
            className="pf-topbar-cancel"
            onClick={handleCancel}
            disabled={isSaving}
          >
            İptal
          </Button>
          {/* 39 — sunucuda taslak yok: devre-dışı, gerekçesi görünür listede */}
          <Button variant="secondary" className="pf-topbar-cancel" disabled title={PENDING_DRAFT}>
            {TOPBAR_DRAFT_LABEL}
          </Button>
          {/* 40 */}
          <Button
            variant="primary"
            className="pf-topbar-submit"
            onClick={submit}
            disabled={isSaving}
          >
            {isSaving ? "Kaydediliyor…" : submitLabel}
          </Button>
        </div>
      </div>

      <div className="pf">
        <header className="pf-head">
          {/* 47 */}
          <h1 className="pf-title">{pageTitle}</h1>
          {/* 48 */}
          <p className="pf-subtitle">
            {PAGE_SUBTITLE_PREFIX}
            <span className="pnf-req">*</span>
            {isEdit ? PAGE_SUBTITLE_EDIT_SUFFIX : PAGE_SUBTITLE_SUFFIX}
          </p>
          {/* K2 — mockup'ta karşılığı yok, yalnız düzenleme kipinde basılır. */}
          {isEdit && (
            <Checkbox
              className="pnf-active-toggle"
              checked={values.isActive}
              onChange={(event) => handleChange("isActive", event.target.checked)}
              label={ACTIVE_TOGGLE_LABEL}
            />
          )}
        </header>

        {/* Devre-dışı yüzeylerin GÖRÜNÜR gerekçeleri — sessiz atlama yok. */}
        <ul className="pnf-notices" data-testid="personnel-form-notices">
          {PENDING_NOTICES.map((notice) => (
            <li key={notice} className="pnf-notices__item">
              {notice}
            </li>
          ))}
        </ul>

        <div className="pf-body" data-testid="personnel-form-body" ref={formRef}>
          <IdentityCard values={values} onChange={handleChange} errors={errors} />
          <ContactCard />
          <JobCard
            values={values}
            onChange={handleChange}
            errors={errors}
            subcontractors={{
              items: subcontractorsQuery.data?.items ?? [],
              isLoading: subcontractorsQuery.isLoading,
              isError: subcontractorsQuery.isError,
            }}
          />
          <PersonnelDocumentsCard />
        </div>

        {formError && (
          <p className="pf-form-error" data-testid="personnel-form-error">
            {formError}
          </p>
        )}

        <PersonnelFormActions
          onCancel={handleCancel}
          onSubmit={submit}
          isPending={isSaving}
          submitLabel={submitLabel}
        />
      </div>
    </div>
  );
}
