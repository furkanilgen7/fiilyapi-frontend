"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, usePathname } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { SiteDetailTabs } from "@/components/site-detail/SiteDetailTabs";
import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { useBoq } from "@/lib/api/hooks/useBoq";
import { useProgressPayments } from "@/lib/api/hooks/useProgressPayments";
import { useSite } from "@/lib/api/hooks/useSites";
import { useSiteSubcontractorPayments } from "@/lib/api/hooks/useSiteSubcontractorPayments";
import { useSiteDiaryEntries, useSiteDiaryEntry } from "@/lib/api/hooks/useSiteDiary";
import {
  useCreateSiteDiaryEntry,
  useReopenSiteDiaryEntry,
  useSaveSiteDiaryLines,
  useSubmitSiteDiaryEntry,
  useUpdateSiteDiaryEntry,
} from "@/lib/api/hooks/useSiteDiaryMutations";
import {
  useSitePlanDaySummary,
  SITE_PLAN_DAY_SUMMARY_DEFAULT_DAYS,
} from "@/lib/api/hooks/useSitePlanDaySummary";
import { backendErrorMessage } from "@/lib/api/error-message";
import { BackendError, isForbidden } from "@/lib/api/unwrap";
import { hasAtLeast } from "@/lib/auth/permissions";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { formatMonthName } from "@/lib/format";

import { DiaryBasicInfoCard } from "./DiaryBasicInfoCard";
import { DiaryLinesCard } from "./DiaryLinesCard";
import { DiaryModeSwitch } from "./DiaryModeSwitch";
import { DiaryChiefNoteCard, DiaryWorkDoneCard } from "./DiaryNotesCards";
import { DiaryPaymentAccrualCard } from "./DiaryPaymentAccrualCard";
import { DiaryPhotosCard } from "./DiaryPhotosCard";
import { DiaryPlanPreviewCard } from "./DiaryPlanPreviewCard";
import { DiaryRecentEntriesCard } from "./DiaryRecentEntriesCard";
import { DiarySafetyCard } from "./DiarySafetyCard";
import { DiaryWorkerCountsCard } from "./DiaryWorkerCountsCard";
import { DIARY_STATUS_LABELS } from "./diary-labels";
import { boqQuantityById, isoDate, isoPeriod } from "./derive";
import { computeDiaryAccrual } from "./payment-accrual";
import { buildRecentEntryRows } from "./recent-entries";
import { buildWorkerRows } from "./worker-counts";
import {
  buildDiaryCreateBody,
  buildDiaryLinesBody,
  buildDiaryUpdateBody,
  diaryFormFromEntry,
  emptyDiaryForm,
  invalidQuantityIds,
  invalidWorkerCountIds,
  isDiaryFormDirty,
  type DiaryFormState,
} from "./form-state";
import "@/components/site-detail/site-detail.css";
import "./site-diary.css";
import { routes } from "@/lib/routes";

export interface DiaryEntryScreenProps {
  /**
   * 🔴 URL-3 — "slug VEYA UUID"; ADRES anahtarlaridir, kanonik UUID DEGIL.
   * Sayfa yolu bunlarla kurulur (`base`), yani kanonik UUID gecirilseydi
   * kullanicinin okunur adresi bir tikta UUID'ye geri duserdi.
   */
  projectKey: string;
  siteKey: string;
  /**
   * Basligin USTUNDE duran serit. Santiye rotasinda `SiteDetailTabs`
   * (GK148-155), kok rotada santiye SECICISI (E5 98 deseni) — ekranin geri
   * kalani IKISINDE DE aynidir.
   */
  chrome: React.ReactNode;
}

/**
 * ═══ IKI ROTANIN TEK ORTAK GOVDESI (F-NAVSAHA) ═══
 *
 * `TimesheetWeekScreen`in gunluk-kayit ikizi. Ayni ekran IKI kabukta yasar:
 *
 * | | `/gunluk-kayit` (E7) | `Santiye › Gunluk Kayit` (GK) |
 * |---|---|---|
 * | Santiye | secici (`?site=`) | rotadan sabit |
 * | Ust serit | secici | `SiteDetailTabs` |
 * | Kabuk | ana kabuk | drill sidebar |
 *
 * Fark KABUKTUR, hesap degil — bu yuzden form, kaydetme, 409 akisi, izin
 * dallari ve sag panel turevleri BURADA TEK YERDE durur.
 */
export function DiaryEntryScreen({
  projectKey,
  siteKey,
  chrome,
}: DiaryEntryScreenProps) {
  const siteQuery = useSite(siteKey, { project: projectKey });
  // 🔴 SLUG -> KANONIK KIMLIK GECIS NOKTASI (bkz. `routes.ts` YOL/SORGU kurali).
  const siteId = siteQuery.data?.id ?? "";
  const projectId = siteQuery.data?.project.id ?? "";
  const boqQuery = useBoq(siteId);
  const permission = useModulePermission("site_diary");

  // Hangi GÜNÜN kaydı düzenleniyor. Varsayılan BUGÜN (mockup'taki sabit tarih
  // KOPYALANMAZ — tarih artefaktı istisnası, spec başlığı).
  const [activeDate, setActiveDate] = useState<string>(() => isoDate(new Date()));
  const [form, setForm] = useState<DiaryFormState>(() => emptyDiaryForm(isoDate(new Date())));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasDateConflict, setHasDateConflict] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Gün → kayıt eşlemesi: ayın listesi çekilir, gün eşleşmesi orada aranır
  // (T3'ün "Son Kayıtlar" listesi AYNI önbellek anahtarını kullanır).
  const period = isoPeriod(activeDate);
  const entriesQuery = useSiteDiaryEntries(siteId, period);
  const matchedId =
    entriesQuery.data?.items.find((item) => item.entry_date === activeDate)?.id ?? "";
  const entryQuery = useSiteDiaryEntry(matchedId);
  const entry = matchedId === "" ? undefined : entryQuery.data;

  const planQuery = useSitePlanDaySummary(
    siteId,
    activeDate,
    SITE_PLAN_DAY_SUMMARY_DEFAULT_DAYS,
  );

  // T3 sağ paneli — "Aylık Hakediş Birikimi" (GK387-413) iki hakediş
  // listesinden türetilir. İşveren hakedişi PROJE düzeyi kayıttır (F-TH
  // kararı S4) → `site_id` süzmesi kullanılmaz; taşeron tarafı U2'de sunucuda
  // süzülür. Ay süzmesi istemcide (`computeDiaryAccrual`).
  const employerPaymentsQuery = useProgressPayments({ project_id: projectId });
  const subcontractorPayments = useSiteSubcontractorPayments(projectId, siteId);
  const paymentsPermission = useModulePermission("progress_payments");

  const createEntry = useCreateSiteDiaryEntry(siteId);
  const updateEntry = useUpdateSiteDiaryEntry(matchedId);
  const saveLines = useSaveSiteDiaryLines(matchedId);
  const submitEntry = useSubmitSiteDiaryEntry(matchedId);
  const reopenEntry = useReopenSiteDiaryEntry(matchedId);

  const isEntryLoading =
    entriesQuery.isLoading || (matchedId !== "" && entryQuery.isLoading);

  // Form tohumlama: sunucudaki kayıt DEĞİŞTİĞİNDE (id ya da updated_at) yerel
  // durum yeniden kurulur. Yükleme sürerken tohumlanmaz — yoksa liste gelince
  // kullanıcının yazdığı boş-gün formu bir kez sıfırlanırdı.
  const seedKey = entry ? `entry:${entry.id}:${entry.updated_at}` : `new:${activeDate}`;
  const seededRef = useRef<string | null>(null);
  useEffect(() => {
    if (isEntryLoading) return;
    if (seededRef.current === seedKey) return;
    const previous = seededRef.current;
    seededRef.current = seedKey;
    if (entry) {
      setForm(diaryFormFromEntry(entry));
      return;
    }
    // Kayıtlı günden boş güne geçildiyse (ya da ilk yükleme) temiz form:
    // önceki günün notları yeni güne KOPYALANMAZ.
    if (previous === null || previous.startsWith("entry:")) {
      setForm(emptyDiaryForm(activeDate));
      return;
    }
    setForm((prev) => ({ ...prev, entryDate: activeDate, quantities: {}, workerCounts: {} }));
  }, [seedKey, entry, activeDate, isEntryLoading]);

  if (!permission.canView) return <AccessDenied />;
  if (isForbidden(siteQuery.error) || isForbidden(entriesQuery.error)) return <AccessDenied />;

  const site = siteQuery.data;
  /**
   * 🔴 ŞANTİYESİZ HÂL — kök rotada GERÇEKTİR (şantiye listesi boş, ya da
   * kullanıcının erişebildiği şantiye yok). Şantiye kapsamlı rotada `siteKey`
   * bir YOL segmentidir, yani orada bu hâl OLUŞAMAZ.
   *
   * Şantiyesizken ekran YAZILAMAZ olmalı: `useSite` bile koşmaz
   * (`enabled: siteId.length > 0`), yani `POST` gövdesinin `site_id`si BOŞ
   * giderdi. Ayrıca `base` bu hâlde `/projeler//santiyeler/` gibi ÇİFT SLAŞLI
   * bozuk bir yol kurar — mod anahtarı da bu yüzden basılmaz.
   */
  const hasSite = siteKey.length > 0;
  if (!hasSite) {
    return (
      <div className="diary">
        {chrome}
        <div className="diary__head">
          <div>
            <h1 className="diary__title">Günlük Kayıt &amp; Planlama</h1>
            <p className="diary__subtitle">
              Şantiye seçilmedi — kayıt girilebilecek bir şantiye yok.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isSubmitted = entry?.status === "submitted";
  // Salt-okunur görünüm: yazma izni yok ya da kayıt gönderilmiş.
  const isReadOnly = !permission.canWrite || isSubmitted;
  const canReopen = hasAtLeast(permission.level, "admin");
  const isDirty = entry ? isDiaryFormDirty(entry, form) : false;

  // YOL baglantisi ADRESTEKI anahtarlarla kurulur — kanonik UUID gecirilseydi
  // kullanicinin okunur adresi bir tikta UUID'ye geri duserdi.
  const base = routes.projects.sites.detail({ projectId: projectKey, siteId: siteKey });

  // Sağ panel türevleri — hepsi SAF fonksiyonlarda (ayrı `.ts` dosyaları),
  // bileşenin içinde hesap YOK.
  const recentRows = buildRecentEntryRows(entriesQuery.data?.items ?? [], site?.sections ?? []);
  const workerRows = buildWorkerRows(entry?.worker_counts ?? []);
  const accrual = computeDiaryAccrual({
    employerItems: employerPaymentsQuery.data?.items ?? [],
    isEmployerLoading: employerPaymentsQuery.isLoading,
    isEmployerError: employerPaymentsQuery.isError,
    subcontractorItems: subcontractorPayments.items,
    isSubcontractorLoading: subcontractorPayments.isLoading,
    isSubcontractorError: subcontractorPayments.isError,
    subcontractorTruncation: subcontractorPayments.truncation,
    year: period.year,
    month: period.month,
  });

  function handleFormChange(patch: Partial<DiaryFormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
    // Kayıt YOKKEN tarih değiştirilirse aranan gün de değişir; kayıt VARKEN
    // tarih alanı kaydın taşınmasıdır (PATCH), arama günü kayıttan sonra
    // güncellenir.
    if (patch.entryDate !== undefined && !entry) setActiveDate(patch.entryDate);
  }

  function handleQuantityChange(boqItemId: string, value: string) {
    setForm((prev) => ({ ...prev, quantities: { ...prev.quantities, [boqItemId]: value } }));
  }

  function handleWorkerCountChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, workerCounts: { ...prev.workerCounts, [key]: value } }));
  }

  /** Satır tıklanınca o günün kaydına geçilir (GK359). */
  function handleSelectDate(entryDate: string) {
    setErrorMessage(null);
    setHasDateConflict(false);
    setActiveDate(entryDate);
    setForm((prev) => ({ ...prev, entryDate }));
  }

  function reportError(error: unknown, fallback: string) {
    if (error instanceof BackendError && error.status === 409) {
      setHasDateConflict(true);
      setErrorMessage(backendErrorMessage(error, "Bu güne ait günlük kayıt zaten var."));
      return;
    }
    setErrorMessage(backendErrorMessage(error, fallback));
  }

  /** Taslak Kaydet (E7 66) — kayıt yoksa açar, varsa başlık + satırları yazar. */
  async function handleSaveDraft() {
    setErrorMessage(null);
    setHasDateConflict(false);
    if (invalidQuantityIds(form).length > 0) {
      setErrorMessage("Miktar hücrelerinde geçersiz değer var; düzeltip tekrar deneyin.");
      return;
    }
    if (invalidWorkerCountIds(form).length > 0) {
      setErrorMessage("İşçi sayısı hücrelerinde geçersiz değer var; düzeltip tekrar deneyin.");
      return;
    }
    setIsSaving(true);
    try {
      if (!entry) {
        const created = await createEntry.mutateAsync(buildDiaryCreateBody(form));
        setActiveDate(created.entry_date);
        return;
      }
      const updated = await updateEntry.mutateAsync(buildDiaryUpdateBody(form, entry));
      await saveLines.mutateAsync(buildDiaryLinesBody(updated, form));
      setActiveDate(updated.entry_date);
    } catch (error: unknown) {
      reportError(error, "Günlük kayıt kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  /** Kaydet & Gönder (GK169) — kaydeder, sonra `submit` ile gönderir. */
  async function handleSaveAndSubmit() {
    if (!entry) return;
    setErrorMessage(null);
    setHasDateConflict(false);
    if (invalidQuantityIds(form).length > 0) {
      setErrorMessage("Miktar hücrelerinde geçersiz değer var; düzeltip tekrar deneyin.");
      return;
    }
    if (invalidWorkerCountIds(form).length > 0) {
      setErrorMessage("İşçi sayısı hücrelerinde geçersiz değer var; düzeltip tekrar deneyin.");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateEntry.mutateAsync(buildDiaryUpdateBody(form, entry));
      await saveLines.mutateAsync(buildDiaryLinesBody(updated, form));
      setActiveDate(updated.entry_date);
      await submitEntry.mutateAsync();
    } catch (error: unknown) {
      reportError(error, "Günlük kayıt gönderilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  /** Yeniden Aç (spec §2 S3) — gönderilmiş kaydı taslağa döndürür. */
  async function handleReopen() {
    if (!entry) return;
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await reopenEntry.mutateAsync();
    } catch (error: unknown) {
      reportError(error, "Kayıt yeniden açılamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="diary">
      {/* Kabuğa özel üst şerit — şantiye rotasında sekme barı (GK148-155),
          kök rotada şantiye seçici. Çağıran verir. */}
      {chrome}

      {/* GK158-171 — başlık + mod anahtarı + aksiyonlar */}
      <div className="diary__head">
        <div>
          <h1 className="diary__title">Günlük Kayıt &amp; Planlama</h1>
          <p className="diary__subtitle">
            {site ? `${site.name} · ${site.project.name}` : "Şantiye bilgisi yükleniyor…"}
          </p>
        </div>
        <div className="diary__head-actions">
          <DiaryModeSwitch
            active="entry"
            entryHref={`${base}/gunluk-kayit`}
            planningHref={`${base}/gunluk-kayit/planlama`}
            summaryHref={`${base}/gunluk-kayit/ozet`}
          />
          {permission.canWrite && !isSubmitted && (
            <>
              {/* E7 66 */}
              <Button variant="secondary" disabled={isSaving} onClick={handleSaveDraft}>
                {isSaving ? "Kaydediliyor…" : "Taslak Kaydet"}
              </Button>
              {/* GK169 — kayıt açılmadan gönderilemez (satır iskeleti sunucudan
                  gelir); buton silinmez, gerekçesiyle devre dışı kalır. */}
              <Button
                variant="success"
                disabled={isSaving || !entry}
                title={entry ? undefined : "Önce taslak kaydedin — iş kalemi satırları kayıt açılınca gelir"}
                onClick={handleSaveAndSubmit}
              >
                Kaydet &amp; Gönder
              </Button>
            </>
          )}
          {isSubmitted && canReopen && (
            <Button variant="secondary" disabled={isSaving} onClick={handleReopen}>
              Yeniden Aç
            </Button>
          )}
        </div>
      </div>

      <div className="diary__status-row">
        {entry && (
          <Badge variant={isSubmitted ? "success" : "neutral"}>
            {DIARY_STATUS_LABELS[entry.status]}
          </Badge>
        )}
        {isSubmitted && (
          <span className="diary__status-note">
            Gönderilmiş kayıt salt-okunurdur.
            {canReopen ? " Düzenlemek için “Yeniden Aç” deyin." : ""}
          </span>
        )}
        {!permission.canWrite && (
          <span className="diary__status-note">
            Bu modülde yalnız görüntüleme yetkiniz var — form salt-okunur.
          </span>
        )}
      </div>

      {errorMessage && (
        <p className="diary__error">
          {errorMessage}
          {hasDateConflict && (
            <Button
              variant="ghost"
              size="sm"
              className="diary__error-action"
              onClick={() => {
                setHasDateConflict(false);
                setErrorMessage(null);
                void entriesQuery.refetch();
              }}
            >
              Var olan kaydı aç
            </Button>
          )}
        </p>
      )}

      {entriesQuery.isError && !errorMessage && (
        <p className="diary__error">Günlük kayıtlar yüklenemedi</p>
      )}

      {/* GK173 — sol form / sağ özet ızgarası (1fr 340px, 20px boşluk) */}
      <div className="diary__grid">
        <div className="diary__col diary__col--main">
          <DiaryBasicInfoCard
            form={form}
            onChange={handleFormChange}
            disabled={isReadOnly}
            sections={site?.sections ?? []}
          />
          <DiaryLinesCard
            entry={entry}
            form={form}
            onQuantityChange={handleQuantityChange}
            disabled={isReadOnly}
            contractQuantities={boqQuantityById(boqQuery.data)}
            contractQuantitiesUnavailable={boqQuery.isError}
            isDirty={isDirty}
            // GK264 "Hakediş Durumu →" mockup'ta `Şantiye - Hakedişler.dc.html`e,
            // yani ŞANTİYENİN Hakedişler sekmesine gider. Spec §2 sehven
            // proje-genel `/hakedisler` yazmıştı; kullanıcı kararı (2026-08-04):
            // mockup kazanır. Aynı ekrandaki GK408 "Hakedişler →" de buraya
            // gidiyor — ekran içi tutarsızlık böylece kapandı.
            paymentsHref={`${base}/hakedisler`}
          />
          <DiaryWorkDoneCard
            value={form.workDone}
            onChange={(value) => handleFormChange({ workDone: value })}
            disabled={isReadOnly}
          />
          <DiaryChiefNoteCard
            value={form.chiefNote}
            onChange={(value) => handleFormChange({ chiefNote: value })}
            disabled={isReadOnly}
          />
          <DiaryPhotosCard />
          <DiaryPlanPreviewCard
            days={planQuery.data?.days}
            isLoading={planQuery.isLoading}
            isError={planQuery.isError}
            planningHref={`${base}/gunluk-kayit/planlama`}
          />
        </div>

        {/* GK352-451 — sağ özet sütunu; sıra mockup'la birebir:
            Son Kayıtlar (356) · Hakediş Birikimi (387) · İşçi Dağılımı (414) ·
            İş Güvenliği (440). */}
        <div className="diary__col diary__col--side">
          <DiaryRecentEntriesCard
            rows={recentRows}
            isLoading={entriesQuery.isLoading}
            isError={entriesQuery.isError}
            activeDate={activeDate}
            onSelectDate={handleSelectDate}
            hasUnsavedChanges={isDirty}
          />
          <DiaryPaymentAccrualCard
            accrual={accrual}
            monthLabel={formatMonthName(period.month)}
            paymentsHref={`${base}/hakedisler`}
            createHref={
              paymentsPermission.canWrite ? routes.progressPayments.new({ projectId }) : null
            }
          />
          <DiaryWorkerCountsCard
            rows={workerRows}
            form={form}
            onChange={handleWorkerCountChange}
            disabled={isReadOnly}
            isEntryMissing={!entry}
          />
          <DiarySafetyCard form={form} onChange={handleFormChange} disabled={isReadOnly} />
        </div>
      </div>
    </div>
  );
}

/**
 * Şantiye kapsamlı "Kayıt Gir" ekranı — rota
 * `.../santiyeler/[siteId]/gunluk-kayit`, mockup `Şantiye - Günlük
 * Kayıt.dc.html` (GK).
 *
 * 🔴 F-NAVSAHA · BU BİLEŞENİN GÖRÜNEN DAVRANIŞI DEĞİŞMEDİ. Gövde
 * `DiaryEntryScreen`e taşındı (kök `/gunluk-kayit` ikizi onu paylaşsın diye);
 * burada yalnız ROTADAN OKUMA kaldı. Ayrım kasıtlı: `useParams` yalnız rota
 * altında anlamlıdır — kök rotada `{}` döner. Anahtarları prop'a çevirip
 * "yoksa useParams" gibi SESSİZ bir varsayılan bırakmak, iki kabuğun
 * ayrıştığını gizlerdi.
 */
export function SiteDiaryEntryView() {
  const pathname = usePathname();
  // 🔴 URL-3 — rota parametreleri "slug VEYA UUID"dur; ADRES anahtarlaridir.
  const { projectId: projectKey, siteId: siteKey } = useParams<{
    projectId: string;
    siteId: string;
  }>();

  return (
    <DiaryEntryScreen
      projectKey={projectKey}
      siteKey={siteKey}
      /* GK148-155 — şantiye sekme barı; sıra `SiteDetailTabs` tek kaynağından. */
      chrome={
        <SiteDetailTabs projectKey={projectKey} siteKey={siteKey} activePath={pathname} />
      }
    />
  );
}
