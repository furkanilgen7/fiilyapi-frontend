"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { DiaryModeSwitch } from "@/components/site-diary/DiaryModeSwitch";
import { SiteDetailTabs } from "@/components/site-detail/SiteDetailTabs";
import { Button } from "@/components/ui/button/Button";
import { useSitePlan } from "@/lib/api/hooks/useSitePlan";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { PlanGoalsCard } from "./PlanGoalsCard";
import { PlanGrid } from "./PlanGrid";
import { PlanMaterialsCard } from "./PlanMaterialsCard";
import { PlanViewModeNotice, PlanViewModeSwitch } from "./PlanViewModeSwitch";
import { PlanWeekNav } from "./PlanWeekNav";
import { addDaysIso, resolveWeekStart, weekEndOf } from "./week";
import "@/components/site-detail/site-detail.css";
import "@/components/site-diary/site-diary.css";
import "./site-planning.css";

/**
 * Şantiye Planlama ekranı — mockup `Şantiye - Planlama.dc.html` (P, kanonik).
 * Parantez/yorum içindeki sayılar o dosyanın SATIR numaralarıdır.
 *
 * Rota: `.../santiyeler/[siteId]/gunluk-kayit/planlama`. Sayfa KENDİ
 * LAYOUT'UNU KURMAZ — drill sidebar `[projectId]/layout.tsx`ten gelir
 * (`gunluk-kayit/ozet` ile birebir aynı desen).
 *
 * BU TASK YALNIZ OKUR (F-PL T2): hücre popover'ı, "+ Satır", "+ Hedef" ve
 * sprint düzenlemesi T3'ün işidir; burada hiçbir düzenleme kontrolü yoktur.
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

  if (!permission.canView) return <AccessDenied />;
  if (isForbidden(planQuery.error)) return <AccessDenied />;

  const plan = planQuery.data;
  const base = `/projeler/${projectId}/santiyeler/${siteId}`;

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
          {/* P97 — kaydetme akışı T3'te bağlanacak (4 PUT). Buton devre dışı
              BIRAKILMAZ: T3 `onClick`i buraya takacak. */}
          {permission.canWrite && <Button>Kaydet</Button>}
        </div>
      </div>

      <PlanViewModeNotice />

      {/* P102-181 — ızgara kartı */}
      <section className="plan-card plan-card--grid" aria-label="Haftalık plan ızgarası">
        <PlanWeekNav
          weekStart={weekStart}
          weekEnd={plan?.week_end ?? weekEndOf(weekStart)}
          sprintName={plan?.active_sprint?.name ?? null}
          onShiftWeek={handleShiftWeek}
        />

        {planQuery.isError && (
          <p className="plan__message">Planlama ızgarası yüklenemedi.</p>
        )}
        {!planQuery.isError && planQuery.isLoading && (
          <p className="plan__message">Yükleniyor…</p>
        )}
        {!planQuery.isError && !planQuery.isLoading && plan && plan.groups.length === 0 && (
          <p className="plan__message">Bu hafta için plan satırı eklenmemiş.</p>
        )}
        {!planQuery.isError && !planQuery.isLoading && plan && plan.groups.length > 0 && (
          <PlanGrid days={plan.days} groups={plan.groups} />
        )}
      </section>

      {/* P184-228 — alt iki kart */}
      <div className="plan__bottom">
        <PlanMaterialsCard />
        <PlanGoalsCard goals={plan?.goals ?? []} />
      </div>
    </div>
  );
}
