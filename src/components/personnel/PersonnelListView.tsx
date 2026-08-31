"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import { downloadPersonnelExport } from "@/lib/api/personnel-export-client";
import { isForbidden } from "@/lib/api/unwrap";
import { hasAtLeast } from "@/lib/auth/permissions";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { buildListTruncation, listTruncationMessage } from "@/lib/list-truncation";
import { PERSONNEL_MAX_LIMIT, usePersonnel } from "@/lib/api/hooks/usePersonnel";
import { useHrDocumentsSummary } from "@/lib/api/hooks/useHrDocuments";
import { useProjects } from "@/lib/api/hooks/useProjects";

import {
  deriveKpis,
  deriveTradeOptions,
  filterByTrade,
  paginateClientSide,
} from "./personnel-derive";
import {
  EXPORT_ERROR_FALLBACK,
  EXPORT_LABEL,
  EXPORT_TRADE_BLOCKED_REASON,
} from "./personnel-list-labels";
import { PersonnelDocumentAlertBanner } from "./PersonnelDocumentAlertBanner";
import {
  PersonnelFilterBar,
  type PersonnelProjectOption,
  type PersonnelStatusFilter,
} from "./PersonnelFilterBar";
import { PersonnelKpiStrip } from "./PersonnelKpiStrip";
import { PersonnelPagination } from "./PersonnelPagination";
import { PersonnelTable } from "./PersonnelTable";
import { PersonnelTabsStrip } from "./PersonnelTabsStrip";
import "./personnel-list.css";
import { routes } from "@/lib/routes";

const QUERY_PARAM = "q";
const PROJECT_PARAM = "proje";
const TRADE_PARAM = "meslek";
const STATUS_PARAM = "durum";
const PAGE_SIZE = 6; // P 236 — mockup "1–6 gösteriliyor" ile birebir.

/**
 * F-PT2 T2 · P — `/personel` liste (kanonik `Personel.dc.html`; parantez içi
 * sayılar o dosyanın SATIR numaralarıdır). Yorumların geri kalanı ilgili alt
 * bileşenlerdedir.
 *
 * ⚠️ TABLONUN KAYNAĞI `GET /personnel`dir; `trade` (meslek) süzgeci backend'de
 * YOKTUR (spec K-B) — `q`/`is_active`/`project_id` sunucuya gider, meslek
 * İSTEMCİDE süzülür (`personnel-derive.ts`, T1). Proje süzgeci F-İK T2'den
 * beri GERÇEKTİR (İK-1 backend'i `project_id` parametresini açtı).
 *
 * ⚠️ Sayfalama İSTEMCİDE yapılır (spec K-E): tüm kadro `limit=200` ile TEK
 * istekte çekilir, `page` yalnız bu bileşenin yerel durumudur (URL'e YAZILMAZ
 * — süzgeçlerin aksine paylaşılabilir olması istenmedi).
 */
export function PersonnelListView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const permission = useModulePermission("personnel");
  const canWrite = hasAtLeast(permission.level, "full");

  const query = searchParams.get(QUERY_PARAM) ?? "";
  const projectId = searchParams.get(PROJECT_PARAM) ?? undefined;
  const trade = searchParams.get(TRADE_PARAM) ?? undefined;
  const rawStatus = searchParams.get(STATUS_PARAM);
  const status: PersonnelStatusFilter = rawStatus === "active" || rawStatus === "inactive" ? rawStatus : undefined;

  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  useEffect(() => {
    setPage(1);
  }, [query, projectId, trade, status]);

  /**
   * 🔴 EXPORT-XLSX · SIZINTI KURALI — TEK süzgeç nesnesi: liste sorgusu da
   * `GET /personnel/export.xlsx` de BUNDAN beslenir. İki yerde kurulsalardı
   * kullanıcı "A projesi" süzgeciyle bakarken TÜM kadroyu indirebilirdi.
   *
   * `limit`/`offset` DIŞARIDA: sayfalama bir süzgeç DEĞİLDİR (aşağıda liste
   * çağrısına eklenir) — sayfalama zaten İSTEMCİDEDİR, Excel'i altı satıra
   * kısmak anlamsız olurdu.
   */
  const serverFilters = {
    ...(query ? { q: query } : {}),
    ...(projectId ? { projectId } : {}),
    ...(status !== undefined ? { isActive: status === "active" } : {}),
  };

  // Kırpılma korkuluğu (TB3/F-TH dersi): tavan AÇIKÇA gönderilir.
  const personnelQuery = usePersonnel({
    limit: PERSONNEL_MAX_LIMIT,
    offset: 0,
    ...serverFilters,
  });

  // Proje ADI sunucudan personel kaydıyla GELMEZ (yalnız `assigned_project_id`)
  // — ad eşlemesi ve süzgeç seçenekleri proje listesinden kurulur. Liste
  // yüklenemezse proje HÜCRESİ pending'e düşer; ekranın geri kalanı etkilenmez.
  const projectsQuery = useProjects();

  // Uyarı bandının tek kaynağı. Bant KRİTİK DEĞİL: hata verirse sessizce düşer.
  const documentSummaryQuery = useHrDocumentsSummary();

  if (!permission.canView || isForbidden(personnelQuery.error)) return <AccessDenied />;

  const serverItems = personnelQuery.data?.items;
  const serverTotal = personnelQuery.data?.total;
  const kpis = serverItems && serverTotal !== undefined ? deriveKpis(serverItems, serverTotal) : undefined;
  const tradeOptions = serverItems ? deriveTradeOptions(serverItems) : [];
  const truncation = buildListTruncation(serverItems?.length ?? 0, serverTotal);
  const hasFilter =
    query.length > 0 || projectId !== undefined || trade !== undefined || status !== undefined;

  const projectItems = projectsQuery.data?.items;
  const projectOptions: PersonnelProjectOption[] = (projectItems ?? []).map((project) => ({
    id: project.id,
    name: project.name,
  }));
  const projectNames = projectItems
    ? Object.fromEntries(projectItems.map((project) => [project.id, project.name]))
    : undefined;

  const documentCounts = documentSummaryQuery.data
    ? {
        expired: documentSummaryQuery.data.expired,
        expiring: documentSummaryQuery.data.expiring,
      }
    : undefined;

  const filteredItems = serverItems ? filterByTrade(serverItems, trade) : undefined;
  const paged = filteredItems ? paginateClientSide(filteredItems, page, PAGE_SIZE) : undefined;

  /**
   * 🔴🔴 MESLEK SÜZGECİ AÇIKKEN EXCEL KAPALIDIR.
   *
   * `trade` sunucuda YOKTUR (spec K-B) ve süzme `filterByTrade` ile
   * İSTEMCİDE yapılır. Uç meslek almadığı için indirilen dosya ekranda
   * görülenden GENİŞ olurdu — kullanıcı "Elektrikçiler"i indirdiğini sanarak
   * TÜM kadroyu alırdı. Bu bir veri sızıntısıdır; düğme SİLİNMEZ, devre dışı
   * basılır ve gerekçe GÖRÜNÜR olur (repo kanonu).
   */
  const isExportBlockedByTrade = trade !== undefined;

  /** `AuditLogScreen` kanonu: uçuşta kilit, hata GÖRÜNÜR. */
  async function handleExport() {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadPersonnelExport(serverFilters);
    } catch (error) {
      setExportError(backendErrorMessage(error, EXPORT_ERROR_FALLBACK));
    } finally {
      setIsExporting(false);
    }
  }

  /** Süzgeç yazımı: diğer anahtarları KORUR, boş değeri URL'den DÜŞÜRÜR. */
  function pushParam(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const next = params.toString();
    router.replace(next.length > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  return (
    <div className="personel">
      {/* 60 */}
      <p className="personel__eyebrow">Saha &amp; İK</p>
      {/* 61-67 */}
      <div className="personel__head">
        <h1 className="personel__title">İnsan Kaynakları</h1>
        <div className="personel__actions">
          {/* 🔴 64 — EXPORT-XLSX ile GERÇEK: `GET /personnel/export.xlsx`.
              TEK istisna meslek süzgecidir (aşağıdaki gerekçe). */}
          <Button
            variant="secondary"
            data-testid="personel-export"
            disabled={isExporting || isExportBlockedByTrade}
            onClick={handleExport}
          >
            {EXPORT_LABEL}
          </Button>
          {/* 65 — mevcut formun oluşturma kipi */}
          {canWrite && (
            <Link href={routes.personnel.new({ returnTo: routes.personnel.list() })}>
              <Button variant="primary">+ Personel Ekle</Button>
            </Link>
          )}
        </div>
      </div>

      {/* 70-77 */}
      <PersonnelTabsStrip />

      {isExportBlockedByTrade && (
        <p className="personel__notice" data-testid="personel-export-blocked">
          {EXPORT_TRADE_BLOCKED_REASON}
        </p>
      )}
      {exportError !== null && (
        <p className="personel__notice" role="status" data-testid="personel-export-error">
          {exportError}
        </p>
      )}

      {/* 80-86 — GERÇEK (sayaçlar `GET /hr/documents/summary`ten) */}
      <PersonnelDocumentAlertBanner counts={documentCounts} />

      {truncation.isTruncated && (
        <p className="personel__notice" data-testid="personel-truncation-notice">
          {listTruncationMessage(truncation)} Süzgeçleri daraltarak listenin tamamını
          görebilirsiniz.
        </p>
      )}

      {/* 89-114 */}
      <PersonnelKpiStrip kpis={kpis} />

      {/* 117-125 */}
      <PersonnelFilterBar
        query={query}
        projectId={projectId}
        projectOptions={projectOptions}
        trade={trade}
        tradeOptions={tradeOptions}
        status={status}
        onQueryChange={(next) => pushParam(QUERY_PARAM, next)}
        onProjectChange={(next) => pushParam(PROJECT_PARAM, next)}
        onTradeChange={(next) => pushParam(TRADE_PARAM, next)}
        onStatusChange={(next) => pushParam(STATUS_PARAM, next)}
      />

      {/* 132-232 · 235-243 sayfalama AYNI kart kabuğunun içindedir (mockup) */}
      <PersonnelTable
        rows={paged?.pageItems}
        isLoading={personnelQuery.isLoading}
        isError={personnelQuery.isError}
        errorMessage={
          personnelQuery.isError ? backendErrorMessage(personnelQuery.error) : undefined
        }
        hasFilter={hasFilter}
        projectNames={projectNames}
        pagination={
          filteredItems &&
          paged && (
            <PersonnelPagination
              page={page}
              totalPages={paged.totalPages}
              totalCount={filteredItems.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )
        }
      />
    </div>
  );
}
