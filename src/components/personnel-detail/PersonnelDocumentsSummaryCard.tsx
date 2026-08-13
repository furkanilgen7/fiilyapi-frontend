"use client";

import { Badge } from "@/components/ui";
import {
  buildDocumentMetaLine,
  DOCUMENT_ADD_PENDING_REASON,
  DOCUMENT_DOWNLOAD_PENDING_REASON,
  DOCUMENT_NO_FILE_REASON,
  resolveDocumentStatusLabel,
  resolveDocumentStatusVariant,
  resolveDocumentName,
} from "@/components/hr-documents/hr-documents-labels";
import "@/components/hr-documents/hr-documents.css";
import { backendErrorMessage } from "@/lib/api/error-message";
import { usePersonnelDocuments } from "@/lib/api/hooks/useHrDocuments";

export interface PersonnelDocumentsSummaryCardProps {
  /** Belge listesinin sahibi; boşsa hook ağa çıkmaz. */
  personnelId: string;
}

/**
 * PD 130-141 · "Belgeler" kartı — F-İK T5'ten beri GERÇEK:
 * `GET /personnel/{personnel_id}/documents` listesi basılır.
 *
 * ⚠️ Kart SALT-OKUNURDUR. `POST/PATCH/DELETE` uçları backend'de VARDIR ama
 * belge ekleme FORMUNUN/DİYALOĞUNUN mockup'ı YOKTUR (`projedesign/` tarandı:
 * PD yalnız düğmeyi çizer, BT'de de yükleme formu yok) — WORKFLOW §3 gereği
 * o parça form mockup'ı gelene kadar BEKLER. Bu, yönetime bildirilecek AÇIK
 * bir maddedir; "+ Ekle" devre-dışı ve gerekçesi görünürdür.
 *
 * ⚠️ Mockup satır altında "PDF · 2.4 MB" gösterir; DOSYA UZANTISI/BOYUTU
 * sunucuda YOKTUR — basılmaz (uydurma yok). Alt satır durum + tarihten kurulur.
 *
 * ⚠️ `status` şemada SERBEST STRING'dir (enum değil): etiket/rozet araması
 * bilinmeyen değere DAYANIKLIdır (`resolve*` fonksiyonları), `as any` YOK.
 */
export function PersonnelDocumentsSummaryCard({
  personnelId,
}: PersonnelDocumentsSummaryCardProps) {
  const documentsQuery = usePersonnelDocuments(personnelId);
  const documents = documentsQuery.data;

  return (
    <section className="pd-card" data-testid="personnel-documents-card">
      <div className="pd-card__head">
        <h2 className="pd-card__title">Belgeler</h2>
        {/* PD 131 — uç VAR, form mockup'ı YOK: devre-dışı + görünür gerekçe */}
        <button
          type="button"
          className="pd-card__add-btn"
          disabled
          title={DOCUMENT_ADD_PENDING_REASON}
        >
          + Ekle
        </button>
      </div>

      {documentsQuery.isError ? (
        <div className="pd-card__pending" aria-disabled="true">
          <p className="pd-card__pending-text">
            Belgeler yüklenemedi: {backendErrorMessage(documentsQuery.error)}
          </p>
        </div>
      ) : documentsQuery.isLoading || !documents ? (
        <div className="pd-card__pending" aria-disabled="true">
          <p className="pd-card__pending-text">Yükleniyor…</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="pd-card__pending" aria-disabled="true">
          <p className="pd-card__pending-text">Bu personele ait belge kaydı yok.</p>
        </div>
      ) : (
        <div className="pd-doc-list">
          {documents.map((document) => (
            <div
              key={document.id}
              className="pd-doc-row"
              data-testid={`personnel-document-${document.id}`}
            >
              <div className="pd-doc-row__body">
                {/* PD 136 — katalog tipi ya da serbest etiket */}
                <p className="pd-doc-row__name">{resolveDocumentName(document)}</p>
                {/* PD 137 — durum + tarih (dosya bilgisi sunucuda yok) */}
                <p className="pd-doc-row__meta">{buildDocumentMetaLine(document)}</p>
              </div>
              <Badge variant={resolveDocumentStatusVariant(document.status)}>
                {resolveDocumentStatusLabel(document.status)}
              </Badge>
              {/* PD 141 — indirme bu dilimde BAĞLANMAZ (ikili indirme ayrı
                  sözleşme); dosyası olmayan kayıtta gerekçe de farklıdır. */}
              <button
                type="button"
                className="pd-card__download-btn"
                disabled
                title={
                  document.document_id === null
                    ? DOCUMENT_NO_FILE_REASON
                    : DOCUMENT_DOWNLOAD_PENDING_REASON
                }
              >
                İndir
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
