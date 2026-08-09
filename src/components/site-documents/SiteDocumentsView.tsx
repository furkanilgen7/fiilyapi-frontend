"use client";

import { useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { SiteDetailTabs } from "@/components/site-detail/SiteDetailTabs";
import { Button } from "@/components/ui/button/Button";
import { Input } from "@/components/ui/input/Input";
import { SearchIcon } from "@/components/ui/icons";
import { backendErrorMessage } from "@/lib/api/error-message";
import { downloadDocument } from "@/lib/api/documents-client";
import { useDocumentFolders } from "@/lib/api/hooks/useDocumentFolders";
import { useDocuments, type DocumentRead } from "@/lib/api/hooks/useDocuments";
import { useSite } from "@/lib/api/hooks/useSites";
import { BackendError } from "@/lib/api/unwrap";
import { hasAtLeast } from "@/lib/auth/permissions";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { DocumentCardGrid } from "./DocumentCardGrid";
import { DocumentFolderPanel } from "./DocumentFolderPanel";
import { RecentDocumentsList } from "./RecentDocumentsList";
import { recentDocuments } from "./recent-documents";
import "@/components/site-detail/site-detail.css";
import "./site-documents.css";

/** URL durumu anahtarları (F-PT/F-PL deseni: süzgeç paylaşılabilir olmalı). */
const FOLDER_PARAM = "folder";
const QUERY_PARAM = "q";

/** Belge listesi/klasör listesi boş-durum ve hata metinleri (tek kaynak). */
function gridMessage(isLoading: boolean, isError: boolean, hasQuery: boolean, isEmpty: boolean) {
  if (isLoading) return "Belgeler yükleniyor…";
  if (isError) return "Belgeler yüklenemedi.";
  if (!isEmpty) return undefined;
  return hasQuery ? "Aramanızla eşleşen belge bulunamadı." : "Bu klasörde henüz belge yok.";
}

/**
 * Şantiye › Belgeler sekmesi — mockup `Şantiye - Belgeler.dc.html` (ŞB,
 * kanonik). Yorumlardaki sayılar o dosyanın SATIR numaralarıdır.
 *
 * Rota `.../santiyeler/[siteId]/belgeler`. Sayfa KENDİ LAYOUT'UNU KURMAZ —
 * drill sidebar `[projectId]/layout.tsx`ten gelir (F-PL/F-PT/F-SD deseni).
 * Mockup'ın KENDİ üst barı (14-33) ve bağlam çipi BASILMAZ: kabuk canon
 * kazanır (spec §2). Üst bardaki "Belge ara..." kutusu (27-30) kaybolmasın
 * diye başlık şeridine iner — arama sunucuda (`?q=`) yapılır.
 *
 * ⚠️ KAPSAM KURALI (spec §2): `site_id` HER istekte geçer. Bu ekran şantiye
 * kapsamıdır; geçmemek "hepsi" değil "proje düzeyi" demektir (bkz.
 * `useDocumentFolders` notu) ve o E12'nin (T4) işidir.
 */
export function SiteDocumentsView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectId, siteId } = useParams<{ projectId: string; siteId: string }>();

  const permission = useModulePermission("documents");
  // Yazma yüzeyi (yükleme + klasör açma) `full` ister. `documents:admin`
  // (silme) UI'da İMA EDİLMEZ — spec §4.
  const canWrite = hasAtLeast(permission.level, "full");

  const activeFolderId = searchParams.get(FOLDER_PARAM) ?? undefined;
  const query = searchParams.get(QUERY_PARAM) ?? "";

  // Başlık için — drill kabuğu aynı anahtarı zaten çektiğinden ikinci bir ağ
  // isteği oluşmaz (React Query önbelleği).
  const siteQuery = useSite(siteId);
  const foldersQuery = useDocumentFolders(projectId, siteId);
  const documentsQuery = useDocuments(projectId, {
    siteId,
    folderId: activeFolderId,
    q: query.length > 0 ? query : undefined,
  });

  const [downloadError, setDownloadError] = useState<string | undefined>(undefined);

  const isForbidden =
    (documentsQuery.error instanceof BackendError && documentsQuery.error.status === 403) ||
    (foldersQuery.error instanceof BackendError && foldersQuery.error.status === 403);

  if (!permission.canView || isForbidden) return <AccessDenied />;

  const folders = foldersQuery.data?.folders ?? [];
  const documents = documentsQuery.data?.documents ?? [];
  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));
  const activeFolderName = activeFolderId ? folderNames.get(activeFolderId) : undefined;
  // Tarih dallarının ("Bugün"/"Dün") referansı TEK yerden verilir.
  const now = new Date();

  /** Klasör bağlantıları arama süzgecini KORUR (iki durum birbirini silmez). */
  function folderHref(folderId?: string): string {
    const params = new URLSearchParams(searchParams.toString());
    if (folderId) params.set(FOLDER_PARAM, folderId);
    else params.delete(FOLDER_PARAM);
    const next = params.toString();
    return next.length > 0 ? `${pathname}?${next}` : pathname;
  }

  function pushQuery(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value.length > 0) params.set(QUERY_PARAM, value);
    else params.delete(QUERY_PARAM);
    const next = params.toString();
    router.replace(next.length > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  async function handleDownload(document: DocumentRead) {
    setDownloadError(undefined);
    try {
      await downloadDocument(document.id, document.filename);
    } catch (error) {
      // Sessiz yutma YOK: 404/403/500 gövdesindeki Türkçe `detail` basılır.
      setDownloadError(backendErrorMessage(error, "Belge indirilemedi."));
    }
  }

  const site = siteQuery.data;
  const recent = recentDocuments(documents);

  return (
    <div className="sdoc">
      {/* ŞB 37-69 */}
      <DocumentFolderPanel
        // Şantiye adı yüklenene kadar uydurulmaz (ŞP deseni).
        title={site ? `${site.name} Klasörleri` : "Klasörler"}
        folders={folders}
        activeFolderId={activeFolderId}
        folderHref={folderHref}
        isLoading={foldersQuery.isLoading}
        isError={foldersQuery.isError}
        canWrite={canWrite}
      />

      <div className="sdoc__main">
        {/* ŞB 73-80 — sekme şeridi tek kaynaktan (`SiteDetailTabs`) */}
        <SiteDetailTabs projectId={projectId} siteId={siteId} activePath={pathname} />

        {/* ŞB 82-91 */}
        <div className="sdoc__head">
          <div>
            {/* ŞB 84 — aktif klasör; kök seçiliyken "Tüm Belgeler" */}
            <p className="sdoc__crumb">{activeFolderName ?? "Tüm Belgeler"}</p>
            {/* ŞB 85 */}
            <h1 className="sdoc__title">{site ? `${site.name} — Belgeler` : "Belgeler"}</h1>
          </div>
          <div className="sdoc__actions">
            {/* ŞB 27-30 — mockup'ın üst barı basılmadığı için kutu buraya indi */}
            <Input
              className="sdoc__search"
              type="search"
              aria-label="Belge ara"
              placeholder="Belge ara..."
              leftIcon={<SearchIcon />}
              value={query}
              onChange={(event) => pushQuery(event.target.value)}
            />
            {/* ŞB 88-89 — yazma tetikleyicileri; izinsizde BASILMAZ.
                T3 KANCASI: `onClick` T3'te diyaloglara bağlanır. */}
            {canWrite && <Button variant="secondary">↑ Yükle</Button>}
            {canWrite && <Button variant="primary">+ Klasör</Button>}
          </div>
        </div>

        {downloadError && <p className="sdoc__error">{downloadError}</p>}

        {/* ŞB 94-133 */}
        <DocumentCardGrid
          documents={documents}
          now={now}
          emptyMessage={gridMessage(
            documentsQuery.isLoading,
            documentsQuery.isError,
            query.length > 0,
            documents.length === 0,
          )}
          canWrite={canWrite}
          onDocumentClick={(document) => void handleDownload(document)}
        />

        {/* ŞB 137-164 — belge yokken hiç basılmaz (ızgaranın boş durumu yeterli) */}
        {recent.length > 0 && (
          <RecentDocumentsList
            documents={recent}
            folderNames={folderNames}
            now={now}
            onDownload={(document) => void handleDownload(document)}
          />
        )}
      </div>
    </div>
  );
}
