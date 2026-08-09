import Link from "next/link";

import { Button } from "@/components/ui/button/Button";
import { cx } from "@/lib/cx";
import type { DocumentFolderRead } from "@/lib/api/hooks/useDocumentFolders";

export interface DocumentFolderPanelProps {
  /** Panel başlığı: "<Şantiye adı> Klasörleri" (ŞB 39). */
  title: string;
  folders: readonly DocumentFolderRead[];
  /** Seçili klasör; yoksa "Tüm Belgeler" kökü aktiftir. */
  activeFolderId?: string;
  /** Klasör bağlantısının hedefi — URL durumunu ekran kurar. */
  folderHref: (folderId?: string) => string;
  isLoading: boolean;
  isError: boolean;
  canWrite: boolean;
  /**
   * T3 KANCASI: "+" düğmesi (ŞB 40) yeni klasör diyaloğunu açar. T2'de
   * geçilmez — düğme basılır, tıklama sessizce yutulur. T3 yalnız bu prop'u
   * bağlar; düğmenin yeri, izin kapısı ve mockup düzeni burada sabitlendi.
   */
  onCreateFolderClick?: () => void;
}

/**
 * Sol klasör paneli — mockup `Şantiye - Belgeler.dc.html` (ŞB) 37-69.
 *
 * Liste TEK SEVİYEDİR: mockup klasörleri "Tüm Belgeler" kökünün altında tek
 * girintiyle çizer (45-68). Şema `parent_id` taşısa da daha derin bir ağaç
 * ÇİZİLMEZ — mockup'ta yoktur, icat edilmez.
 */
export function DocumentFolderPanel({
  title,
  folders,
  activeFolderId,
  folderHref,
  isLoading,
  isError,
  canWrite,
  onCreateFolderClick,
}: DocumentFolderPanelProps) {
  return (
    <nav className="sdoc-folders" aria-label="Belge klasörleri">
      {/* ŞB 38-41 */}
      <div className="sdoc-folders__head">
        <span className="sdoc-folders__heading">{title}</span>
        {canWrite && (
          <Button
            variant="ghost"
            className="sdoc-folders__add"
            aria-label="Yeni klasör"
            onClick={onCreateFolderClick}
          >
            +
          </Button>
        )}
      </div>

      {/* ŞB 42-44 — kök: klasör süzgeci YOK */}
      <Link
        href={folderHref()}
        className={cx("sdoc-folders__item", "sdoc-folders__item--root", !activeFolderId && "sdoc-folders__item--active")}
        aria-current={activeFolderId ? undefined : "page"}
      >
        <span className="sdoc-folders__icon" aria-hidden="true">
          📁
        </span>
        Tüm Belgeler
      </Link>

      {/* ŞB 45-68 — girintili klasörler */}
      {folders.map((folder) => (
        <Link
          key={folder.id}
          href={folderHref(folder.id)}
          className={cx(
            "sdoc-folders__item",
            "sdoc-folders__item--child",
            folder.id === activeFolderId && "sdoc-folders__item--active",
          )}
          aria-current={folder.id === activeFolderId ? "page" : undefined}
        >
          <span className="sdoc-folders__icon sdoc-folders__icon--sm" aria-hidden="true">
            📂
          </span>
          {folder.name}
        </Link>
      ))}

      {isLoading && <p className="sdoc-folders__message">Klasörler yükleniyor…</p>}
      {isError && <p className="sdoc-folders__message">Klasörler yüklenemedi.</p>}
      {!isLoading && !isError && folders.length === 0 && (
        <p className="sdoc-folders__message">Bu şantiyede henüz klasör yok.</p>
      )}
    </nav>
  );
}
