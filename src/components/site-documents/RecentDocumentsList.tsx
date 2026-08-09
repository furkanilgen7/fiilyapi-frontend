import { Button } from "@/components/ui/button/Button";
import type { DocumentRead } from "@/lib/api/hooks/useDocuments";
import { documentTypeIcon, formatDocumentDate, formatDocumentSize } from "./document-format";

export interface RecentDocumentsListProps {
  documents: readonly DocumentRead[];
  /** Klasör kimliği → ad; meta satırının ilk parçası (ŞB 144). */
  folderNames: ReadonlyMap<string, string>;
  now: Date;
  onDownload: (document: DocumentRead) => void;
}

/**
 * Meta alt satırı (ŞB 144, 151, 158): "Günlük Raporlar · Şantiye Şefi: S. Öztürk"
 * = klasör adı · açıklama. Açıklama yoksa nokta ayırıcı da basılmaz; klasörsüz
 * belgede yalnız açıklama kalır (ikisi de yoksa satır hiç çizilmez).
 */
function metaLine(document: DocumentRead, folderNames: ReadonlyMap<string, string>): string {
  const folderName = document.folder_id ? folderNames.get(document.folder_id) : undefined;
  return [folderName, document.description ?? undefined].filter(Boolean).join(" · ");
}

/**
 * "SON EKLENENLER" paneli — mockup `Şantiye - Belgeler.dc.html` (ŞB) 137-164.
 * Sıralama İSTEMCİDEDİR (bkz. `recent-documents.ts`).
 */
export function RecentDocumentsList({
  documents,
  folderNames,
  now,
  onDownload,
}: RecentDocumentsListProps) {
  return (
    <section className="sdoc-recent">
      {/* ŞB 138-140 */}
      <h2 className="sdoc-recent__title">Son Eklenenler</h2>
      {/* ŞB 141-163 */}
      <ul className="sdoc-recent__list" aria-label="Son eklenen belgeler">
        {documents.map((document) => {
          const meta = metaLine(document, folderNames);
          return (
            <li key={document.id} className="sdoc-recent__row">
              {/* ŞB 143 — 20px tip ikonu */}
              <span className="sdoc-recent__icon" aria-hidden="true">
                {documentTypeIcon(document.filename)}
              </span>
              <div className="sdoc-recent__main">
                <span className="sdoc-recent__name">{document.filename}</span>
                {meta && <span className="sdoc-recent__meta">{meta}</span>}
              </div>
              {/* ŞB 145 */}
              <span className="sdoc-recent__size">{formatDocumentSize(document.size_bytes)}</span>
              {/* ŞB 146 — bugünse saat de basılır */}
              <span className="sdoc-recent__date">
                {formatDocumentDate(document.created_at, now, { withTime: true })}
              </span>
              {/* ŞB 147 — indirme, izinden BAĞIMSIZ: okuma izni olan indirir */}
              <Button
                variant="ghost"
                size="sm"
                className="sdoc-recent__download"
                onClick={() => onDownload(document)}
              >
                İndir
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
