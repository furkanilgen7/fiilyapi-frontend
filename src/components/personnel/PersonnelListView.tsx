"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import { isForbidden } from "@/lib/api/unwrap";
import { hasAtLeast } from "@/lib/auth/permissions";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { buildListTruncation, listTruncationMessage } from "@/lib/list-truncation";
import { PERSONNEL_MAX_LIMIT, usePersonnel } from "@/lib/api/hooks/usePersonnel";

import {
  deriveKpis,
  deriveTradeOptions,
  filterByTrade,
  paginateClientSide,
} from "./personnel-derive";
import { EXPORT_PENDING_REASON } from "./personnel-list-labels";
import { PersonnelDocumentAlertBanner } from "./PersonnelDocumentAlertBanner";
import { PersonnelFilterBar, type PersonnelStatusFilter } from "./PersonnelFilterBar";
import { PersonnelKpiStrip } from "./PersonnelKpiStrip";
import { PersonnelPagination } from "./PersonnelPagination";
import { PersonnelTable } from "./PersonnelTable";
import { PersonnelTabsStrip } from "./PersonnelTabsStrip";
import "./personnel-list.css";

const QUERY_PARAM = "q";
const TRADE_PARAM = "meslek";
const STATUS_PARAM = "durum";
const PAGE_SIZE = 6; // P 236 — mockup "1–6 gösteriliyor" ile birebir.

/**
 * F-PT2 T2 · P — `/personel` liste (kanonik `Personel.dc.html`; parantez içi
 * sayılar o dosyanın SATIR numaralarıdır). Yorumların geri kalanı ilgili alt
 * bileşenlerdedir.
 *
 * ⚠️ TABLONUN KAYNAĞI `GET /personnel`dir; `trade` (meslek) süzgeci backend'de
 * YOKTUR (spec K-B) — `q`/`is_active` sunucuya gider, meslek İSTEMCİDE
 * süzülür (`personnel-derive.ts`, T1).
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
  const trade = searchParams.get(TRADE_PARAM) ?? undefined;
  const rawStatus = searchParams.get(STATUS_PARAM);
  const status: PersonnelStatusFilter = rawStatus === "active" || rawStatus === "inactive" ? rawStatus : undefined;

  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [query, trade, status]);

  // Kırpılma korkuluğu (TB3/F-TH dersi): tavan AÇIKÇA gönderilir.
  const personnelQuery = usePersonnel({
    limit: PERSONNEL_MAX_LIMIT,
    offset: 0,
    ...(query ? { q: query } : {}),
    ...(status !== undefined ? { isActive: status === "active" } : {}),
  });

  if (!permission.canView || isForbidden(personnelQuery.error)) return <AccessDenied />;

  const serverItems = personnelQuery.data?.items;
  const serverTotal = personnelQuery.data?.total;
  const kpis = serverItems && serverTotal !== undefined ? deriveKpis(serverItems, serverTotal) : undefined;
  const tradeOptions = serverItems ? deriveTradeOptions(serverItems) : [];
  const truncation = buildListTruncation(serverItems?.length ?? 0, serverTotal);
  const hasFilter = query.length > 0 || trade !== undefined || status !== undefined;

  const filteredItems = serverItems ? filterByTrade(serverItems, trade) : undefined;
  const paged = filteredItems ? paginateClientSide(filteredItems, page, PAGE_SIZE) : undefined;

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
          {/* 64 — spec K5: uç yok, devre-dışı + görünür gerekçe */}
          <Button variant="secondary" disabled title={EXPORT_PENDING_REASON}>
            Dışa Aktar
          </Button>
          {/* 65 — mevcut formun oluşturma kipi */}
          {canWrite && (
            <Link href="/personel/yeni?donus=/personel">
              <Button variant="primary">+ Personel Ekle</Button>
            </Link>
          )}
        </div>
      </div>

      {/* 70-77 */}
      <PersonnelTabsStrip />

      {/* 80-86 — pending */}
      <PersonnelDocumentAlertBanner />

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
        trade={trade}
        tradeOptions={tradeOptions}
        status={status}
        onQueryChange={(next) => pushParam(QUERY_PARAM, next)}
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
