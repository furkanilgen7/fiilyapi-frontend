"use client";

import { useState } from "react";

import { Badge } from "@/components/ui";
import { backendErrorMessage } from "@/lib/api/error-message";
import { downloadEquipmentDocument } from "@/lib/api/equipment-documents-client";
import { formatDateDots } from "@/lib/format";
import type { EquipmentDocumentListResponse } from "@/lib/api/hooks/useEquipmentDocuments";

import { documentValidity } from "./document-validity";

export interface EquipmentDocumentsCardProps {
  documents: EquipmentDocumentListResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  /** `EquipmentDetailResponse.as_of` — geçerlilik rozetinin SUNUCU günü. */
  asOf: string;
  /** `full` izni yoksa tetikleyici BASILMAZ (M1 ile aynı karar). */
  onAddDocumentClick?: () => void;
}

/**
 * MD:144-196 · 📎 Belgeler.
 *
 * 🔴 `GET /equipment/{id}/documents` NEYİN kümesidir — sorgu gövdesinden
 * (`document_service.list_documents` → `visible_equipment` K9/K20): ekipmanın
 * TÜM belgeleri, tarih süzgeci YOK. "Süresi doldu"/"yaklaşıyor" sınıflaması
 * burada TÜREMEZ çünkü yanıt bir durum alanı taşımaz; `document-validity.ts`
 * onu SUNUCUNUN `as_of` gününe göre üretir (gerekçe orada yazılı).
 *
 * MD:147 `4 belge · 1 süresi yaklaşıyor` — sayaçlar TABLONUN KENDİ
 * satırlarından türer, `documents/summary` ucundan DEĞİL: o uç filo genelidir
 * ve pasif ekipmanı hiç kapsamaz (bkz. `document-validity.ts`).
 */
export function EquipmentDocumentsCard({
  documents,
  isLoading,
  error,
  asOf,
  onAddDocumentClick,
}: EquipmentDocumentsCardProps) {
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const items = documents?.items;

  const rows = (items ?? []).map((doc) => ({
    doc,
    validity: documentValidity(doc.valid_until, asOf),
  }));
  const expiringCount = rows.filter((row) => row.validity.kind === "expiring").length;
  const expiredCount = rows.filter((row) => row.validity.kind === "expired").length;

  const countParts = [`${rows.length} belge`];
  if (expiringCount > 0) countParts.push(`${expiringCount} süresi yaklaşıyor`);
  if (expiredCount > 0) countParts.push(`${expiredCount} süresi doldu`);

  async function handleDownload(documentId: string, filename: string) {
    setDownloadError(null);
    try {
      await downloadEquipmentDocument(documentId, filename);
    } catch (caught) {
      // Sessiz düşüş YOK — indirme reddi görünür bir Türkçe iletiye döner.
      setDownloadError(backendErrorMessage(caught));
    }
  }

  return (
    <section className="makine-det__card makine-det__card--flush" aria-label="Belgeler">
      <div className="makine-det__doc-head">
        <h2 className="makine-det__card-title" style={{ marginBottom: 0 }}>
          📎 Belgeler
        </h2>
        <span className="makine-det__doc-count" data-testid="makine-det-doc-count">
          {isLoading ? "Yükleniyor…" : countParts.join(" · ")}
        </span>
        {/* MD:149 `+ Belge Ekle` — M1'in diyaloğunun AYNISI (ikinci form YOK). */}
        {onAddDocumentClick && (
          <button
            type="button"
            className="makine-det__card-more"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={onAddDocumentClick}
          >
            + Belge Ekle
          </button>
        )}
      </div>

      {error !== null && (
        <p className="makine-det__notice makine-det__notice--danger" role="alert">
          {backendErrorMessage(error)}
        </p>
      )}
      {downloadError !== null && (
        <p className="makine-det__notice makine-det__notice--danger" role="alert">
          {downloadError}
        </p>
      )}

      {!isLoading && error === null && rows.length === 0 && (
        <p className="makine-det__empty">Bu ekipmana yüklenmiş belge yok.</p>
      )}

      {rows.length > 0 && (
        <div className="makine-det__table-wrap">
          <table className="makine-det__table">
            <thead>
              <tr>
                <th>Belge Türü</th>
                <th>Belge No</th>
                <th className="makine-det__td-center">Düzenlenme</th>
                <th className="makine-det__td-center">Geçerlilik</th>
                <th className="makine-det__td-center">Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ doc, validity }) => (
                <tr
                  key={doc.id}
                  className={
                    validity.kind === "expiring"
                      ? "makine-det__row--expiring"
                      : validity.kind === "expired"
                        ? "makine-det__row--expired"
                        : undefined
                  }
                >
                  <td className="makine-det__td-name">{doc.type_name}</td>
                  <td>{doc.document_no ?? "—"}</td>
                  <td className="makine-det__td-center">
                    {doc.issued_at === null ? "—" : formatDateDots(doc.issued_at)}
                  </td>
                  <td className="makine-det__td-center">
                    {doc.valid_until === null ? "Süresiz" : formatDateDots(doc.valid_until)}
                  </td>
                  <td className="makine-det__td-center">
                    <Badge variant={validity.variant}>{validity.label}</Badge>
                  </td>
                  <td>
                    {/* MD:194 `Görüntüle` — mockup Belge Arşivi ekranına
                        bağlıyor; burada belgenin KENDİSİ indirilir, çünkü
                        `GET /equipment/documents/{id}/download` ucu vardır ve
                        arşiv ekranı ekipman belgelerini listelemez (ayrı
                        `documents` modülüdür). SAPMA rapora yazıldı. */}
                    <button
                      type="button"
                      className="makine-det__card-more"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                      onClick={() => void handleDownload(doc.id, doc.filename)}
                    >
                      İndir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
