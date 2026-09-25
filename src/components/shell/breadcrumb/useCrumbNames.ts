"use client";

/**
 * F-KIRINTI · dinamik segmentlerin insan-okunur adı — YALNIZ ÖNBELLEKTEN.
 *
 * ─── 🔴 K5/B3: İKİNCİ İSTEK YOK ──────────────────────────────────────────
 * Kırıntı HER ekranda basılır. Adı kendi sorgusuyla çekseydi uygulamadaki
 * her sayfa açılışına 1-3 ek istek eklerdi — üstelik sayfanın ZATEN çektiği
 * veriyi ikinci kez. Bu yüzden bu modül `queryFn: skipToken` ile abone olur:
 * gözlemci önbelleğe BAĞLANIR (veri geldiğinde/değiştiğinde yeniden render
 * eder) ama HİÇBİR ZAMAN fetch etmez.
 *
 * Bunun çalışmasının ön koşulu, anahtarın sayfanınkiyle BİREBİR aynı olması:
 *
 *   sayfa                                        önbellek anahtarı
 *   ────────────────────────────────────────────────────────────────────────
 *   useProject(projectKey)                       ["project", <p>]
 *   useSite(siteKey, { project: projectKey })    ["site", <s>, <p>]
 *   useSection(secKey, { site, project })        ["section", <sec>, <s>, <p>]
 *   useSiteDiaryEntry(id, { sectionId })         siteDiaryEntryQueryKey(id, <sec uuid>)
 *
 * Anahtar parçaları hook modüllerinden İTHAL EDİLİR (`PROJECT_QUERY_KEY` …),
 * elle yazılmaz: string kopyalansaydı sorgu anahtarı bir gün değiştiğinde
 * kırıntı SESSİZCE boş kalırdı (hata yok, log yok — yalnız sonsuz iskelet).
 *
 * ─── ŞANTİYE ALT AĞACINDA PROJE ADI ──────────────────────────────────────
 * 🔴 ÖLÇÜLDÜ: şantiye alt ekranlarının HİÇBİRİ `useProject` çağırmaz
 * (`/projeler/<p>/santiyeler/<s>/**` → yalnız `useSite`). Proje adı için
 * ikinci bir sorgu açmak K5'i ihlal ederdi; gerek de yok, çünkü
 * `SiteDetailResponse.project` (`SiteProjectSummary`) adı zaten TAŞIR —
 * `SiteHeroBar` proje bağlantısını da ondan kurar. Düşüş sırası bu yüzden
 * "önce proje sorgusu, yoksa şantiye yanıtının proje gövdesi"dir.
 */
import { skipToken, useQuery } from "@tanstack/react-query";

import { PROJECT_QUERY_KEY, type ProjectDetail } from "@/lib/api/hooks/useProjects";
import { SECTION_QUERY_KEY, type SectionDetailResponse } from "@/lib/api/hooks/useSection";
import { siteDiaryEntryQueryKey, type SiteDiaryEntryDetail } from "@/lib/api/hooks/useSiteDiary";
import { SITE_QUERY_KEY, type SiteDetail } from "@/lib/api/hooks/useSites";
import { formatDateDots } from "@/lib/format";

import type { CrumbNames } from "./trail";
import type { NamedEntity, RouteKeys } from "./trail-node";

export function useCrumbNames(keys: RouteKeys): CrumbNames {
  const project = useQuery<ProjectDetail>({
    queryKey: [PROJECT_QUERY_KEY, keys.projectId],
    queryFn: skipToken,
  });
  const site = useQuery<SiteDetail>({
    queryKey: [SITE_QUERY_KEY, keys.siteId, keys.projectId],
    queryFn: skipToken,
  });
  const section = useQuery<SectionDetailResponse>({
    queryKey: [SECTION_QUERY_KEY, keys.sectionId, keys.siteId, keys.projectId],
    queryFn: skipToken,
  });

  // DET-1.2 — günlük kayıt detayı: anahtar SAYFANIN anahtarıdır (tek üretici
  // `siteDiaryEntryQueryKey`). Sayfa kaydı bölümün kanonik kimliğiyle ister;
  // o kimlik AYNI önbellekteki bölüm yanıtından okunur (bölüm okunamadıysa
  // ikisi de bölümsüz anahtara düşer).
  const diaryEntry = useQuery<SiteDiaryEntryDetail>({
    queryKey: siteDiaryEntryQueryKey(keys.entityId, section.data?.id),
    queryFn: skipToken,
  });

  const projectName = project.data?.name ?? site.data?.project.name;

  /**
   * Sorgusu HATA vermiş türler. Yedek etikete düşerler, iskelette DONMAZLAR:
   * 404/403 alan bir kaydın adı hiç gelmeyecektir (bkz. `CrumbNames.unresolved`).
   * Proje için şantiye sorgusu da bir kaynaktır, o yüzden ikisi de hata
   * vermeden proje "çözülemedi" sayılmaz.
   */
  const unresolved = new Set<NamedEntity>();
  if (projectName === undefined && (project.isError || site.isError)) unresolved.add("project");
  if (site.data === undefined && site.isError) unresolved.add("site");
  if (section.data === undefined && section.isError) unresolved.add("section");
  if (diaryEntry.data === undefined && diaryEntry.isError) unresolved.add("diaryEntry");

  return {
    project: projectName,
    site: site.data?.name,
    section: section.data?.name,
    diaryEntry: diaryEntry.data === undefined ? undefined : formatDateDots(diaryEntry.data.entry_date),
    unresolved,
  };
}
