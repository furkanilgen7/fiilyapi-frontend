import { useEffect, useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";

import { buildListTruncation, type ListTruncation } from "@/lib/list-truncation";

import { useProjects } from "./useProjects";
import { sitesQueryOptions } from "./useSites";

/**
 * F-BLG T2c · TEK seçicide "şantiye · proje" seçenekleri (Depo Ekle mockup'ı
 * 86-96 TEK select çizer, iki adımlı "önce proje" akışı ÇİZMEZ).
 *
 * 🔴 Neden fan-out: DÜZ bir `GET /sites` ucu YOKTUR — openapi'de tek liste
 * yolu `GET /projects/{project_id}/sites`tir. Seçenekler proje listesi
 * üzerinden toplanır (`useSiteOptions` emsali) ama BURADA bir fark var:
 *
 * 🔴 SINIRLI EŞZAMANLILIK. `useSiteOptions` bütün projeleri AYNI ANDA
 * ateşler; 40 projeli bir kurulumda bu tek karede 40 istek demektir. Burada
 * kayar bir pencere kullanılır: aynı anda en çok `SITE_FAN_OUT_CONCURRENCY`
 * istek uçar, biri sonuçlandıkça pencere kayar. Önbellek `useSites` ile
 * PAYLAŞILIR (aynı `queryKey`), yani zaten çekilmiş proje ikinci kez
 * istenmez.
 *
 * 🔴 SESSİZ ATLAMA YOK: alt isteklerden biri düşerse o projenin şantiyeleri
 * listede olmaz — bu durum `failedProjectNames` ile ÇAĞIRANA sızdırılır ve
 * çağıran görünür bant basmak ZORUNDADIR.
 */

/** Aynı anda uçan en fazla şantiye isteği. */
export const SITE_FAN_OUT_CONCURRENCY = 4;

/**
 * Kayar pencerenin bir sonraki ucu. SAF: pencere yalnız BÜYÜR (küçülmesi
 * hâlihazırda uçan bir isteği iptal ederdi) ve proje sayısını AŞMAZ.
 */
export function nextFanOutWindow(
  settledCount: number,
  totalCount: number,
  currentWindow: number,
): number {
  const next = Math.min(totalCount, settledCount + SITE_FAN_OUT_CONCURRENCY);
  return next > currentWindow ? next : currentWindow;
}

export interface SiteFanOutOption {
  siteId: string;
  siteName: string;
  projectId: string;
  projectName: string;
}

export interface SiteFanOutState {
  options: SiteFanOutOption[];
  isLoading: boolean;
  isError: boolean;
  /** Şantiyeleri ÇEKİLEMEYEN projelerin adları — seçenekler EKSİK demektir. */
  failedProjectNames: string[];
  /**
   * Proje listesi kırpılması. `GET /projects` `limit`/`offset` ALMAZ ve
   * yanıtında `total` YOKTUR (şema teyidi: `ProjectListResponse` = `counts` +
   * `items`) — yani bildirilmiş bir tavan yoktur ve korkuluk hiçbir zaman
   * kırpılma İDDİA ETMEZ (`buildListTruncation` bilinmeyen `total`da sessiz
   * kalır). Uç sayfalanırsa bu alan kendiliğinden konuşmaya başlar.
   */
  truncation: ListTruncation;
  isPartial: boolean;
}

export function useSiteFanOutOptions(): SiteFanOutState {
  const projectsQuery = useProjects();
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data]);

  const [windowEnd, setWindowEnd] = useState(SITE_FAN_OUT_CONCURRENCY);

  const siteQueries = useQueries({
    queries: projects.map((project, index) => {
      const options = sitesQueryOptions(project.id);
      return { ...options, enabled: options.enabled && index < windowEnd };
    }),
  });

  const settledCount = siteQueries.filter(
    (query, index) => index < windowEnd && (query.isSuccess || query.isError),
  ).length;

  useEffect(() => {
    setWindowEnd((current) => nextFanOutWindow(settledCount, projects.length, current));
  }, [settledCount, projects.length]);

  const options = projects.flatMap((project, index) => {
    const items = siteQueries[index]?.data?.items ?? [];
    return items.map((site) => ({
      siteId: site.id,
      siteName: site.name,
      projectId: project.id,
      projectName: project.name,
    }));
  });

  const failedProjectNames = projects
    .filter((_, index) => siteQueries[index]?.isError === true)
    .map((project) => project.name);

  const truncation = buildListTruncation(projects.length, undefined);

  return {
    options,
    // Pencere kaydıkça henüz sırası gelmemiş projeler vardır: liste TAM
    // olmadan "yüklendi" denmez.
    isLoading:
      projectsQuery.isLoading ||
      windowEnd < projects.length ||
      siteQueries.some((query) => query.isLoading),
    isError: projectsQuery.isError,
    failedProjectNames,
    truncation,
    isPartial: truncation.isTruncated,
  };
}
