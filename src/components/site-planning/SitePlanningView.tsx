"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { DiaryModeSwitch } from "@/components/site-diary/DiaryModeSwitch";
import { SiteDetailTabs } from "@/components/site-detail/SiteDetailTabs";
import { Button } from "@/components/ui/button/Button";
import { useSitePlan } from "@/lib/api/hooks/useSitePlan";
import { useSiteSections } from "@/lib/api/hooks/useSiteSections";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { planSectionsState } from "./plan-sections";
import { PlanAddRowButton } from "./PlanAddRowButton";
import { PlanGoalsCard } from "./PlanGoalsCard";
import { PlanGrid } from "./PlanGrid";
import { PlanMaterialsCard } from "./PlanMaterialsCard";
import { PlanSaveStatus } from "./PlanSaveStatus";
import { PlanViewModeNotice, PlanViewModeSwitch } from "./PlanViewModeSwitch";
import { PlanWeekNav } from "./PlanWeekNav";
import { usePlanDraft } from "./usePlanDraft";
import { usePlanSave } from "./usePlanSave";
import { addDaysIso, resolveWeekStart, weekEndOf } from "./week";
import "@/components/site-detail/site-detail.css";
import "@/components/site-diary/site-diary.css";
import "./site-planning.css";
import { routes } from "@/lib/routes";

/**
 * Şantiye Planlama ekranı — mockup `Şantiye - Planlama.dc.html` (P, kanonik).
 * Parantez/yorum içindeki sayılar o dosyanın SATIR numaralarıdır.
 *
 * Rota: `.../santiyeler/[siteId]/gunluk-kayit/planlama`. Sayfa KENDİ
 * LAYOUT'UNU KURMAZ — drill sidebar `[projectId]/layout.tsx`ten gelir
 * (`gunluk-kayit/ozet` ile birebir aynı desen).
 *
 * DÜZENLEME (F-PL T3): ızgara/hedefler/sprint YEREL TASLAKTA (`usePlanDraft`)
 * yaşar, "Kaydet" dört PUT'u SIRALI yazar (`usePlanSave`). Yazma izni olmayan
 * kullanıcıda tüm giriş yüzeyleri GİZLENMEZ, devre-dışı basılır.
 *
 * ONAYLI SAPMA (kabuk): P'nin kendi sol menüsü "Planlama"yı ayrı bir sidebar
 * öğesi yapar; bu repoda şantiyenin 7 sekmesi tek kaynaktır (F3/F-SD kanonu)
 * ve Planlama, "Günlük Kayıt" sekmesinin bir alt görünümüdür — kardeşi
 * "Hakediş Özeti" gibi. Bu yüzden sekme şeridi korunur, mod anahtarı ikisini
 * birbirine bağlar.
 *
 * Hafta durumu URL'dedir (`?week=YYYY-MM-DD`) — bağlantı paylaşılabilir olsun;
 * parametresiz varsayılan İÇİNDE BULUNULAN haftadır (mockup'ın "21 – 27
 * Temmuz 2026" sabiti kopyalanmaz — tarih artefaktı istisnası).
 */
export function SitePlanningView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectId, siteId } = useParams<{ projectId: string; siteId: string }>();

  const permission = useModulePermission("site_diary");
  const weekStart = resolveWeekStart(searchParams.get("week"));
  const planQuery = useSitePlan(siteId, weekStart);
  // Bölüm listesi ızgaradan DEĞİL şantiyeden gelir: ızgaranın grupları yalnız
  // mevcut satırlardan türer, henüz satırı olmayan bölüm orada görünmez (T5).
  const sectionsQuery = useSiteSections(siteId);
  // Taslak/kaydetme hook'ları erken dönüşlerin ÜSTÜNDE: kanca sırası her
  // render'da aynı kalmalı (izin dalı hook atlatamaz).
  const { draft, dispatch, isDirty } = usePlanDraft(planQuery.data, weekStart);
  const saveHandle = usePlanSave(siteId, weekStart, dispatch);

  if (!permission.canView) return <AccessDenied />;
  if (isForbidden(planQuery.error)) return <AccessDenied />;

  const plan = planQuery.data;
  const base = routes.projects.sites.detail({ projectId, siteId });
  const canSave = permission.canWrite && isDirty && !saveHandle.isSaving;
  const sections = planSectionsState(
    sectionsQuery.data,
    sectionsQuery.isLoading,
    sectionsQuery.isError,
  );

  /** `‹`/`›` — hafta URL'de taşınır; `replace` geçmişi hafta hafta şişirmez. */
  function handleShiftWeek(deltaDays: number) {
    router.replace(`${pathname}?week=${addDaysIso(weekStart, deltaDays)}`, { scroll: false });
  }

  return (
    <div className="plan">
      {/* Şantiye sekme barı — sıra `SiteDetailTabs` tek kaynağından. */}
      <SiteDetailTabs projectId={projectId} siteId={siteId} activePath={pathname} />

      {/* P80-84 */}
      <DiaryModeSwitch
        active="planning"
        entryHref={`${base}/gunluk-kayit`}
        planningHref={`${base}/gunluk-kayit/planlama`}
        summaryHref={`${base}/gunluk-kayit/ozet`}
      />

      {/* P86-99 — başlık + görünüm kipi + Kaydet */}
      <div className="plan__head">
        <div>
          {/* P88 */}
          <h1 className="plan__title">
            Planlama{plan ? ` — ${plan.site_name} Şantiyesi` : ""}
          </h1>
          {/* P89 */}
          <p className="plan__subtitle">
            Haftalık &amp; aylık iş planı{plan ? ` · ${plan.project_name}` : ""}
          </p>
        </div>
        <div className="plan__head-actions">
          <PlanViewModeSwitch />
          {/* P97 — dört PUT'u SIRALI yazar. Salt-okur kullanıcıda buton
              GİZLENMEZ, devre-dışı basılır (üst kural); değişiklik yokken de
              devre-dışıdır: kirli olmayan bölüme istek atmak gereksiz replace
              riskidir. */}
          <Button disabled={!canSave} onClick={() => void saveHandle.save(draft)}>
            Kaydet
          </Button>
        </div>
      </div>

      <PlanViewModeNotice />
      <PlanSaveStatus
        steps={saveHandle.steps}
        isSaving={saveHandle.isSaving}
        hasFailure={saveHandle.hasFailure}
        onRetry={() => void saveHandle.save(draft)}
      />

      {/* P102-181 — ızgara kartı */}
      <section className="plan-card plan-card--grid" aria-label="Haftalık plan ızgarası">
        <PlanWeekNav
          weekStart={weekStart}
          weekEnd={plan?.week_end ?? weekEndOf(weekStart)}
          // Sprint adı TASLAKTAN okunur: düzenleme "Kaydet"ten önce görünür.
          sprintName={draft.sprintName}
          canWrite={permission.canWrite}
          onShiftWeek={handleShiftWeek}
          onChangeSprintName={(name) => dispatch({ type: "setSprintName", name })}
        />

        {planQuery.isError && (
          <p className="plan__message">Planlama ızgarası yüklenemedi.</p>
        )}
        {!planQuery.isError && planQuery.isLoading && (
          <p className="plan__message">Yükleniyor…</p>
        )}
        {/* BOŞ IZGARA (T5 bulgusu): grup yokken "+ Satır" yalnız grup
            başlığında dursaydı hiçbir yerde olmazdı — yani plan SIFIRDAN hiç
            kurulamazdı. Boş-durum metni KALIR, girişi yanına konur. Sentetik
            başlangıç: tür "Ekip", bölüm "Bölümsüz"; ikisi de popover'da
            değiştirilebilir. */}
        {!planQuery.isError && !planQuery.isLoading && plan && draft.groups.length === 0 && (
          <div className="plan__empty">
            <p className="plan__message">Bu hafta için plan satırı eklenmemiş.</p>
            <PlanAddRowButton
              defaultKind="crew"
              defaultSectionId={null}
              sections={sections}
              canWrite={permission.canWrite}
              onAdd={(row) => dispatch({ type: "addRow", row })}
            />
          </div>
        )}
        {!planQuery.isError && !planQuery.isLoading && plan && draft.groups.length > 0 && (
          <PlanGrid
            days={plan.days}
            draft={draft}
            sections={sections}
            canWrite={permission.canWrite}
            dispatch={dispatch}
          />
        )}
      </section>

      {/* P184-228 — alt iki kart */}
      <div className="plan__bottom">
        <PlanMaterialsCard />
        <PlanGoalsCard goals={draft.goals} canWrite={permission.canWrite} dispatch={dispatch} />
      </div>
    </div>
  );
}
