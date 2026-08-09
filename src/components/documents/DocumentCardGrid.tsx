import type { DocumentRead } from "@/lib/api/hooks/useDocuments";
import { documentTypeIcon, formatDocumentDate, formatDocumentSize } from "./document-format";

export interface DocumentCardGridProps {
  documents: readonly DocumentRead[];
  /** Tarih dallarının referansı — ekran tek yerden verir (gizli `new Date()` yok). */
  now: Date;
  /** Boş/yükleniyor/hata durumunda basılacak tek satırlık Türkçe metin. */
  emptyMessage?: string;
  canWrite: boolean;
  onDocumentClick: (document: DocumentRead) => void;
  /**
   * T3 KANCASI: kesikli "Dosya Yükle" kartı (ŞB 130-133) yükleme diyaloğunu
   * açar. T2'de geçilmez — kart basılır, tıklama sessizce yutulur.
   */
  onUploadClick?: () => void;
}

/**
 * Belge kart ızgarası — mockup `Şantiye - Belgeler.dc.html` (ŞB) 94-133.
 *
 * Kart tıklaması = İNDİRME (spec §6 S1 onaylı sapma: mockup kartta aksiyon
 * çizmez, indirme tek anlamlı eylemdir). Bu yüzden kart `<button>`dur —
 * `div` + `onClick` klavyeyle erişilemezdi.
 */
export function DocumentCardGrid({
  documents,
  now,
  emptyMessage,
  canWrite,
  onDocumentClick,
  onUploadClick,
}: DocumentCardGridProps) {
  return (
    <div className="sdoc-grid">
      {documents.map((document) => (
        <button
          key={document.id}
          type="button"
          className="sdoc-card"
          onClick={() => onDocumentClick(document)}
        >
          {/* ŞB 96 — 36px tip ikonu */}
          <span className="sdoc-card__icon">{documentTypeIcon(document.filename)}</span>
          {/* ŞB 97 */}
          <span className="sdoc-card__name">{document.filename}</span>
          {/* ŞB 98 — "1,2 MB · Bugün" */}
          <span className="sdoc-card__meta">
            {formatDocumentSize(document.size_bytes)} · {formatDocumentDate(document.created_at, now)}
          </span>
        </button>
      ))}

      {/* ŞB 130-133 — kesikli yükleme kartı; yazma izni yoksa BASILMAZ */}
      {canWrite && (
        <button
          type="button"
          className="sdoc-card sdoc-card--upload"
          aria-label="Dosya Yükle"
          onClick={onUploadClick}
        >
          <span className="sdoc-card__plus" aria-hidden="true">
            +
          </span>
          <span className="sdoc-card__upload-label" aria-hidden="true">
            Dosya Yükle
          </span>
        </button>
      )}

      {emptyMessage && <p className="sdoc-grid__message">{emptyMessage}</p>}
    </div>
  );
}
