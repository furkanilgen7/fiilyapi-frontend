"use client";

import { useParams } from "next/navigation";

import { useSection } from "@/lib/api/hooks/useSection";
import { useSiteDiaryEntry } from "@/lib/api/hooks/useSiteDiary";
import { useSite } from "@/lib/api/hooks/useSites";
import { BackendError, isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";
import { routes } from "@/lib/routes";

import { DiaryDetailHeader } from "./DiaryDetailHeader";
import {
  DiaryDetailError,
  DiaryDetailForbidden,
  DiaryDetailNotFound,
  DiaryDetailSkeleton,
} from "./DiaryDetailStates";
import "./site-diary-detail.css";

/**
 * DET-1.2 · Günlük kayıt SALT OKUNUR detay sayfası (kullanıcı isteği
 * 2026-09-25: "oluşturulan günlük kayda tıklayınca o gün ne yapıldığını
 * göreyim"). Mockup: `Şantiye - Günlük Kayıt Detay (Salt Okunur).dc.html`.
 *
 * Giriş: Bölüm Detay › Günlük Kayıt satırı. Rota bölüm altındadır
 * (`routes.projects.sites.sections.diaryEntry`); kırıntı + geri tuşu
 * bölümün Günlük Kayıt SEKMESİNE (`?sekme=gunluk-kayit`) döner.
 *
 * Bu alt görevde: başlık kartı + kilit bandı + hâller. Kartlar (Yapılan
 * İşler · Miktarlar · Hava · İSG · İşçi) ve EV parçaları DET-1.3'te gelir.
 */
export function SiteDiaryDetailView() {
  const {
    projectId: projectKey,
    siteId: siteKey,
    sectionId: sectionKey,
    entryId,
  } = useParams<{ projectId: string; siteId: string; sectionId: string; entryId: string }>();

  // Kırıntı adları bu iki sorgunun ÖNBELLEĞİNDEN çözülür (K5 — ikinci istek
  // yok); Bölüm Detay'dan gelindiyse ikisi de zaten sıcaktır.
  const siteQuery = useSite(siteKey, { project: projectKey });
  const sectionQuery = useSection(sectionKey, { site: siteKey, project: projectKey });
  const section = sectionQuery.data;
  // Önceki/sonraki BÖLÜM bağlamında döner → kayıt, bölümün kanonik kimliğiyle
  // istenir. Bölüm okunamazsa (ör. `sites` 403) sayfa takılmaz: bağlamsız istenir.
  const sectionResolved = section !== undefined || sectionQuery.isError;
  const entryQuery = useSiteDiaryEntry(entryId, { sectionId: section?.id, enabled: sectionResolved });
  const permission = useModulePermission("site_diary");

  const sectionTabHref = routes.projects.sites.sections.detail({
    projectId: projectKey,
    siteId: siteKey,
    sectionId: sectionKey,
    sekme: "gunluk-kayit",
  });

  if (!permission.canView || isForbidden(entryQuery.error)) return <DiaryDetailForbidden />;
  if (entryQuery.error instanceof BackendError && entryQuery.error.status === 404) {
    return <DiaryDetailNotFound backHref={sectionTabHref} />;
  }
  if (entryQuery.isError) return <DiaryDetailError onRetry={() => void entryQuery.refetch()} />;

  const entry = entryQuery.data;
  if (entry === undefined) return <DiaryDetailSkeleton />;
  // Adresteki şantiyeye ait olmayan kayıt (kimlik elle değiştirilmiş) —
  // backend görünür şantiyede 404 verir; burada da AYNI hâl, veri sızmaz.
  if (siteQuery.data !== undefined && entry.site_id !== siteQuery.data.id) {
    return <DiaryDetailNotFound backHref={sectionTabHref} />;
  }

  const openHref =
    permission.canWrite && !entry.locked
      ? routes.projects.sites.diary({ projectId: projectKey, siteId: siteKey })
      : undefined;

  return (
    <div className="diary-detail">
      <DiaryDetailHeader
        entry={entry}
        currentSection={section === undefined ? undefined : { id: section.id, name: section.name }}
        entryHref={(id) =>
          routes.projects.sites.sections.diaryEntry({
            projectId: projectKey,
            siteId: siteKey,
            sectionId: sectionKey,
            entryId: id,
          })
        }
        openHref={openHref}
      />
    </div>
  );
}
