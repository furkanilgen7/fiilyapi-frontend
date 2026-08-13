import Link from "next/link";

import { Badge } from "@/components/ui";
import type { HrExpiringDocument } from "@/lib/api/hooks/useHrDocuments";

import {
  formatDateDots,
  formatDayCount,
  PENDING_VALUE,
  personnelDetailHref,
} from "./hr-documents-labels";
import "./hr-documents.css";

export interface HrExpiringDocumentsTableProps {
  /** `undefined` ⇒ yükleniyor/hata; boş dizi ⇒ GERÇEK boşluk. */
  rows: HrExpiringDocument[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  /** Başlıktaki sayı KPI'dan gelir (liste kırpılmış olabilir). */
  totalCount: number | undefined;
}

/**
 * BT 137-153 · "30 Gün İçinde Bitecek" tablosu — `expiring_documents`
 * listesinden GERÇEK. Sütunlar (141-144): Personel · Belge · Bitiş · Kalan.
 *
 * Süresi dolan tablosunun aksine burada "Proje" sütunu YOKTUR (mockup
 * böyle çiziyor) — `project_name` alanı gövdede gelse de sütun EKLENMEZ.
 */
export function HrExpiringDocumentsTable({
  rows,
  isLoading,
  errorMessage,
  totalCount,
}: HrExpiringDocumentsTableProps) {
  return (
    <section className="bt-card" data-testid="bt-expiring-card" aria-labelledby="bt-expiring-title">
      {/* 138 */}
      <div className="bt-card__head bt-card__head--warning">
        <h2 className="bt-card__title bt-card__title--warning" id="bt-expiring-title">
          {`30 Gün İçinde Bitecek (${totalCount ?? PENDING_VALUE})`}
        </h2>
      </div>

      {errorMessage ? (
        <div className="bt-empty">
          <p className="bt-empty__title">Yaklaşan belgeler yüklenemedi.</p>
          <p className="bt-empty__hint">{errorMessage}</p>
        </div>
      ) : isLoading || !rows ? (
        <div className="bt-empty">
          <p className="bt-empty__title">Yükleniyor…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bt-empty">
          <p className="bt-empty__title">30 gün içinde bitecek belge yok.</p>
        </div>
      ) : (
        <table className="bt-table">
          {/* 140-145 */}
          <thead>
            <tr>
              <th className="bt-table__th" scope="col">
                Personel
              </th>
              <th className="bt-table__th" scope="col">
                Belge
              </th>
              <th className="bt-table__th bt-table__th--center" scope="col">
                Bitiş
              </th>
              <th className="bt-table__th bt-table__th--center" scope="col">
                Kalan
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="bt-table__row"
                data-testid={`bt-expiring-row-${row.id}`}
              >
                {/* 147 — ad GERÇEK bağlantı */}
                <td className="bt-table__td">
                  <Link className="bt-person-link" href={personnelDetailHref(row.personnel_id)}>
                    {row.personnel_name}
                  </Link>
                </td>
                <td className="bt-table__td">
                  <Badge variant="warning">{row.document_label}</Badge>
                </td>
                <td className="bt-table__td bt-table__td--center">
                  {formatDateDots(row.valid_until)}
                </td>
                <td className="bt-table__td bt-table__td--days-left">
                  {formatDayCount(row.days_left)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
