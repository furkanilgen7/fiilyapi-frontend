import { formatCurrency, formatPercent, formatMonthYear } from "@/lib/format";
import type { ProjectDetail } from "@/lib/api/hooks/useProjects";
import type { ProjectCostsResponse } from "@/lib/api/hooks/useProjectCosts";
import type { UnitTotals } from "@/lib/api/hooks/useProjectUnits";

import { PendingCell, EMPTY_VALUE } from "./PendingCell";
import {
  PROJECT_SUMMARY_PENDING_KEYS,
  PROJECT_TYPE_LABELS,
  unitKindBreakdownText,
} from "./project-summary-labels";

/**
 * KY 63-107 / KK 64-108 hero bloğu.
 *
 * 🔴 ÜNİTE KIRILIMI ("48 Daire + 4 Dükkan") BASILIR — bu, emrin K2
 * tablosundan ÖLÇÜLMÜŞ bir SAPMADIR ve raporda böyle bildirildi.
 *
 * K2 şöyle diyordu: *"özet ucunda yok; satır düzeyinde `unit_kind` var ama
 * liste 50'lik sayfalı → türetmek YALAN olur"*. Yasağın DAYANAĞI istemci
 * türevidir ve o dayanak burada YOKTUR:
 *   · `GET /projects/{id}/units` → `UnitListResponse` SAYFALI DEĞİLDİR
 *     (gövdesi yalnız `totals` + `blocks`; `limit`/`offset`/`total` alanı
 *     hiç yoktur — sayfalı olan `land-share/units`tur, başka bir uç).
 *   · Kırılım SUNUCUNUN kendi sayacıdır: `UnitTotals.counts`
 *     (`UnitKindBreakdown`), istemcide sayılmış bir dizi DEĞİL.
 * Yani basılan sayı türev değil, sunucu değeridir; K4 de ihlal edilmez.
 *
 * 🔴 BASILMAYAN İKİ KUTU, gerekçesiyle EKRANDA:
 *   · "İnşaat İlerlemesi" (KY 83 · KK 89) — iki kaynak da sahte
 *     (`LandShareCard.construction_progress` boş zarf,
 *     `ProjectDetailResponse.progress_pct` canlıda her projede `0`).
 *   · "Nakit Durumu" (KY 103) — maliyet ucu nakit TAŞIMAZ.
 */
export interface ProjectSummaryHeroProps {
  project: ProjectDetail;
  costs: ProjectCostsResponse;
  /** Ünite sayaçları; uç 403/404 verirse `null` (hero yine basılır). */
  totals: UnitTotals | null;
}

function metaLine(project: ProjectDetail, totals: UnitTotals | null): string[] {
  const parts: string[] = [];
  if (project.city) parts.push(project.city);
  const breakdown = totals ? unitKindBreakdownText(totals.counts) : "";
  if (breakdown) parts.push(breakdown);
  if (project.start_date && project.end_date) {
    parts.push(`${formatMonthYear(project.start_date)} – ${formatMonthYear(project.end_date)}`);
  }
  return parts;
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="psum-hero__kpi">
      <div className="psum-hero__kpi-label">{label}</div>
      <div className="psum-hero__kpi-value">{value}</div>
      {note ? <div className="psum-hero__kpi-note">{note}</div> : null}
    </div>
  );
}

export function ProjectSummaryHero({ project, costs, totals }: ProjectSummaryHeroProps) {
  const meta = metaLine(project, totals);
  const isLandShare = project.project_type === "kat_karsiligi";
  const landShare = project.land_share;

  return (
    <header
      className={`psum-hero psum-hero--${project.project_type}`}
      data-testid="psum-hero"
    >
      <div className="psum-hero__top">
        <div>
          <p className="psum-hero__type">
            {PROJECT_TYPE_LABELS[project.project_type]}
            {isLandShare && landShare ? ` · Arsa Sahibi: ${landShare.landowner_name}` : ""}
          </p>
          <h1 className="psum-hero__title">{project.name}</h1>
          {meta.length > 0 ? (
            <p className="psum-hero__meta">{meta.join(" · ")}</p>
          ) : null}
        </div>
        {/* KY 76-80 / KK 77-81 — sağ üst kâr bloğu. İkisi de AYRI alandır ve
            ayrı ayrı `null` olabilir; marj kârdan TÜRETİLMEZ (K4). */}
        <div className="psum-hero__profit">
          <div className="psum-hero__profit-label">
            {isLandShare ? "Kendi Payım — Tahmini Kâr" : "Tahmini Net Kâr"}
          </div>
          <div className="psum-hero__profit-value">
            {costs.profit.profit === null ? EMPTY_VALUE : formatCurrency(costs.profit.profit)}
          </div>
          <div className="psum-hero__profit-margin">
            {costs.profit.margin_pct === null
              ? EMPTY_VALUE
              : `${formatPercent(costs.profit.margin_pct)} kâr marjı`}
          </div>
        </div>
      </div>

      <div className="psum-hero__kpis">
        {/* KK 111-115 · paylaşım oranı YALNIZ kat karşılığında ve GERÇEK. */}
        {isLandShare && landShare ? (
          <Kpi
            label="Paylaşım Oranı"
            value={`${formatPercent(landShare.our_share_pct)} / ${formatPercent(landShare.owner_share_pct)}`}
            note="Biz / Arsa Sahibi"
          />
        ) : null}

        {/* İKİ mockup'ta da çizili, İKİSİNDE de kaynağı yok. */}
        <PendingCell
          label="İnşaat İlerlemesi"
          moduleKey={PROJECT_SUMMARY_PENDING_KEYS.constructionProgress}
          className="psum-hero__pending"
        />

        {/* KY 84-88 · satılan ünite sayacı — sunucudan (`UnitTotals`). */}
        {totals ? (
          <Kpi
            label="Satılan Ünite"
            value={`${totals.sold_units} / ${totals.counts.total}`}
            note={`${totals.available_units} satışta · ${totals.reserved_units} rezerve`}
          />
        ) : null}

        <Kpi
          label="Gerçekleşen Satış"
          value={
            costs.profit.realized_sales === null
              ? EMPTY_VALUE
              : formatCurrency(costs.profit.realized_sales)
          }
          note={
            costs.profit.revenue === null
              ? undefined
              : `/ ${formatCurrency(costs.profit.revenue)} hedef`
          }
        />

        <Kpi
          label="Toplam Maliyet"
          value={formatCurrency(costs.breakdown.total_spent)}
          note={
            costs.profit.cost === null ? undefined : `/ ${formatCurrency(costs.profit.cost)} bütçe`
          }
        />

        {/* KK 103-107 · arsa maliyeti. Kat karşılığında `0` GERÇEK bir
            sıfırdır (arsa parası ödenmez) — yer tutucu değil. */}
        {isLandShare ? (
          <Kpi
            label="Arsa Maliyeti"
            value={
              costs.breakdown.land_cost === null
                ? EMPTY_VALUE
                : formatCurrency(costs.breakdown.land_cost)
            }
            note="Kat karşılığı"
          />
        ) : (
          <PendingCell
            label="Nakit Durumu"
            moduleKey={PROJECT_SUMMARY_PENDING_KEYS.cashPosition}
            className="psum-hero__pending"
          />
        )}
      </div>
    </header>
  );
}
