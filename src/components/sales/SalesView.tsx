"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button, Select } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useProjectUnits } from "@/lib/api/hooks/useProjectUnits";
import { useSales } from "@/lib/api/hooks/useSales";
import { useSalesSummary } from "@/lib/api/hooks/useSalesSummary";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { BlockOccupancyMap } from "./BlockOccupancyMap";
import { SalesKpiStrip } from "./SalesKpiStrip";
import { SalesTable } from "./SalesTable";
import { UpcomingCollectionsCard } from "./UpcomingCollectionsCard";
import { parseSalesStatusFilter, PRICE_LIST_PENDING_REASON } from "./sales-labels";
import "./sales.css";

/** URL durumu anahtarları — seçili proje ve süzgeç paylaşılabilir olmalı. */
const PROJECT_PARAM = "proje";
const STATUS_PARAM = "durum";

/** T3'ün açacağı satış formu (spec K1). */
export const NEW_SALE_HREF = "/satis/yeni";

/**
 * SY · `/satis` — mockup `Satış Yönetimi.dc.html` (kanonik). Yorumlardaki
 * sayılar O dosyanın SATIR numaralarıdır.
 *
 * Mockup'ın KENDİ üst barı (14-27) ve sol menüsü (30-49) BASILMAZ: kabuk canon
 * kazanır (F3 Topbar + Sidebar).
 *
 * ⚠️ PROJE SEÇİCİ — ONAYLI TÜRETİM. Mockup tek bir projenin bağlamında
 * çizilmiştir (breadcrumb 19-21, sol menüde "Yeşilvadi Rezidans" bloğu) ama
 * spec §3/K1 rotayı PROJE-GENEL (`/satis`) tanımlar; oysa uçların hepsi proje
 * kapsamlıdır (`/projects/{id}/sales[...]`). Köprü şarttır: seçici olmadan
 * ekran hangi projeyi göstereceğini bilemez. Emsal, `/puantaj` E5 ekranının
 * şantiye seçicisidir (F-PT T2) — seçim URL'de taşınır.
 *
 * ⚠️ SATIŞ DETAY EKRANI YOKTUR (spec §2/K3): `activate` / `transfer-deed` /
 * `cancel` / `pay` aksiyonları bu ekranda HİÇ basılmaz, satır detaya GİTMEZ.
 */
export function SalesView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const permission = useModulePermission("sales");

  const projectsQuery = useProjects();
  const projects = projectsQuery.data?.items ?? [];
  const projectParam = searchParams.get(PROJECT_PARAM);
  // Seçim URL'den; yoksa listenin ilki (mockup seçiciyi HER ZAMAN dolu çizer).
  const selectedProjectId =
    projectParam ?? projects[0]?.id ?? "";
  const statusFilter = parseSalesStatusFilter(searchParams.get(STATUS_PARAM));

  const salesQuery = useSales(selectedProjectId);
  const summaryQuery = useSalesSummary(selectedProjectId);
  const unitsQuery = useProjectUnits(selectedProjectId);

  if (!permission.canView || isForbidden(salesQuery.error) || isForbidden(summaryQuery.error)) {
    return <AccessDenied />;
  }

  /** Süzgeç/proje yazımı: diğer anahtarları KORUR, boş değeri URL'den DÜŞÜRÜR. */
  function pushParam(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const next = params.toString();
    router.replace(next.length > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  // Ünite haritası AYRI izin modülüne (`projects`) bağlıdır: 403 ekranı
  // düşürmez, kart görünür gerekçeyle boş kalır.
  const unitsNotice = unitsQuery.isError
    ? isForbidden(unitsQuery.error)
      ? "Blok doluluk haritası için ünite (proje) yetkisi gerekiyor."
      : backendErrorMessage(unitsQuery.error, "Ünite listesi yüklenemedi.")
    : undefined;

  return (
    <div className="satis">
      {/* 19-21 · breadcrumb'ın son öğesi sayfa başlığıdır */}
      <div className="satis__head">
        <h1 className="satis__title">Satış Yönetimi</h1>
        <div className="satis__actions">
          {/* Proje seçici — onaylı türetim (yukarıdaki not) */}
          <Select
            size="row"
            aria-label="Proje seçimi"
            value={selectedProjectId}
            onChange={(event) => pushParam(PROJECT_PARAM, event.target.value)}
          >
            {projects.length === 0 && <option value="">Proje yok</option>}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          {/* 24 · hedef ekran çizilmedi → düğme SİLİNMEZ, devre dışı basılır */}
          <Button variant="secondary" disabled title={PRICE_LIST_PENDING_REASON}>
            Fiyat Listesi
          </Button>
          {/* 25 · satış formu (spec K1) */}
          {permission.canWrite && (
            <Link href={NEW_SALE_HREF} className="btn btn--primary btn--md">
              + Satış Kaydı
            </Link>
          )}
        </div>
      </div>

      {/* Devre dışı düğmenin gerekçesi `title`da görünmez kalır — metne de basılır. */}
      <p className="satis__notice" data-testid="satis-fiyat-listesi-notu">
        “Fiyat Listesi” ekranı henüz tasarlanmadı; ünite liste fiyatları proje
        ünite kartlarından yönetilir.
      </p>

      {/* 54-60 */}
      <SalesKpiStrip summary={summaryQuery.data} />

      {/* 62-140 */}
      <BlockOccupancyMap blocks={unitsQuery.data?.blocks} notice={unitsNotice} />

      {/* 142-215 */}
      <SalesTable
        rows={salesQuery.data?.items}
        serverTotals={salesQuery.data?.totals}
        statusFilter={statusFilter}
        onStatusFilterChange={(next) => pushParam(STATUS_PARAM, next)}
        isLoading={salesQuery.isLoading}
        isError={salesQuery.isError}
        errorMessage={
          salesQuery.isError
            ? backendErrorMessage(salesQuery.error, "Satış listesi yüklenemedi.")
            : undefined
        }
      />

      {/* 217-234 */}
      <UpcomingCollectionsCard items={summaryQuery.data?.upcoming_collections} />
    </div>
  );
}
