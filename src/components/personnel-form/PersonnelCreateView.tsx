"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui";
import { useCreatePersonnel } from "@/lib/api/hooks/usePersonnelMutations";
import { useSubcontractors } from "@/lib/api/hooks/useSubcontractors";
import { backendErrorMessage } from "@/lib/api/error-message";
import { hasAtLeast } from "@/lib/auth/permissions";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { buildPersonnelCreateBody, submittableValues } from "./build-body";
import {
  BREADCRUMB_CURRENT,
  BREADCRUMB_HR,
  PAGE_SUBTITLE_PREFIX,
  PAGE_SUBTITLE_SUFFIX,
  PAGE_TITLE,
  PENDING_DRAFT,
  PENDING_HR_SCREEN,
  PENDING_NOTICES,
  SUBMIT_LABEL,
  TOPBAR_DRAFT_LABEL,
} from "./constants";
import { ContactCard } from "./ContactCard";
import { emptyPersonnelFormValues, type PersonnelFormValues } from "./form-state";
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
 * "İptal"/kaydetme sonrası dönülecek rotayı taşıyan sorgu parametresi.
 *
 * Mockup'ın "İptal" bağlantıları `Personel.dc.html`e gider (35, 38, 210) ama
 * personel LİSTE ekranı bu dilimde YOK (İK dilimine kaldı). Bu yüzden form
 * GELDİĞİ YERE döner: puantaj ekranlarındaki giriş noktaları bu parametreyi
 * doldurur, doğrudan URL ile gelen kullanıcı genel puantaja düşer.
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

/**
 * Yeni Personel Kaydı — tam sayfa form (mockup `Form - Personel Ekle.dc.html`).
 * Yorumlardaki sayılar o dosyanın SATIR numaralarıdır.
 *
 * ⭐ ÜST KURAL: mockup'taki her alan basılır. Sunucu sözleşmesinde
 * (`PersonnelCreate`) karşılığı OLMAYAN alanlar devre-dışıdır, gerekçeleri
 * ekranın üstünde GÖRÜNÜR listelenir ve gövdeye ASLA sızmazlar — bu alanların
 * form durumunda karşılığı bile yoktur (`form-state.ts`).
 */
export function PersonnelCreateView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get(RETURN_PARAM));

  const permission = useModulePermission("personnel");
  const createPersonnel = useCreatePersonnel();
  const subcontractorsQuery = useSubcontractors();

  const [values, setValues] = useState<PersonnelFormValues>(emptyPersonnelFormValues);
  const [errors, setErrors] = useState<PersonnelFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

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
    router.push(returnTo);
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
    createPersonnel.mutate(buildPersonnelCreateBody(submittable), {
      // `usePersonnelMutations` başarıda personel önbelleğini geçersizleştirir
      // → matris yeni kişiyi HEMEN satır olarak çizer (T2 kararı K1).
      onSuccess: () => router.push(returnTo),
      onError: (err) => setFormError(backendErrorMessage(err)),
    });
  }

  // Yazma yetkisi olmayan kullanıcı bu rotayı hiç görmemeli (giriş noktaları
  // zaten gizli); doğrudan URL ile gelen için kapı burada.
  if (!hasAtLeast(permission.level, "full")) return <AccessDenied />;

  return (
    <div className="pf-shell">
      {/* 30-42 — yapışkan üst şerit */}
      <div className="pf-topbar">
        <nav className="pf-breadcrumb" aria-label="Kırıntı yolu">
          {/* 35 — hedef ekran (Personel listesi) henüz yok: EDİLGEN basılır */}
          <span className="pnf-breadcrumb-passive" title={PENDING_HR_SCREEN}>
            {BREADCRUMB_HR}
          </span>
          <span className="pf-breadcrumb__sep" aria-hidden="true">
            /
          </span>
          <span className="pf-breadcrumb__current" aria-current="page">
            {BREADCRUMB_CURRENT}
          </span>
        </nav>
        <div className="pf-topbar__actions">
          {/* 38 */}
          <Button
            variant="secondary"
            className="pf-topbar-cancel"
            onClick={handleCancel}
            disabled={createPersonnel.isPending}
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
            disabled={createPersonnel.isPending}
          >
            {createPersonnel.isPending ? "Kaydediliyor…" : SUBMIT_LABEL}
          </Button>
        </div>
      </div>

      <div className="pf">
        <header className="pf-head">
          {/* 47 */}
          <h1 className="pf-title">{PAGE_TITLE}</h1>
          {/* 48 */}
          <p className="pf-subtitle">
            {PAGE_SUBTITLE_PREFIX}
            <span className="pnf-req">*</span>
            {PAGE_SUBTITLE_SUFFIX}
          </p>
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
          isPending={createPersonnel.isPending}
        />
      </div>
    </div>
  );
}
