import Link from "next/link";

import { Badge, Button } from "@/components/ui";
import type { HrExpiredDocument } from "@/lib/api/hooks/useHrDocuments";

import {
  APPOINTMENT_PENDING_REASON,
  formatDateDots,
  formatDayCount,
  formatProjectName,
  PENDING_VALUE,
  personnelDetailHref,
  ROW_ACTION_LABEL,
  STATUS_COLUMN_PENDING_REASON,
} from "./hr-documents-labels";
import "./hr-documents.css";

export interface HrExpiredDocumentsTableProps {
  /** `undefined` ⇒ yükleniyor/hata; boş dizi ⇒ GERÇEK boşluk. */
  rows: HrExpiredDocument[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  /** Başlıktaki sayı KPI'dan gelir (liste kırpılmış olabilir — uzunluk sayılmaz). */
  totalCount: number | undefined;
}

/**
 * BT 79-133 · "Süresi Dolan Belgeler" tablosu — `expired_documents` listesinden
 * GERÇEK. Sütunlar (86-92): Personel · Belge Tipi · Proje · Geçerlilik ·
 * Gecikme · Durum · (aksiyon).
 *
 * ⚠️ Mockup personel adının ALTINDA meslek gösterir (96) — `HrExpiredDocument`
 * meslek TAŞIMAZ; alt satır BASILMAZ (uydurma yok, F-PT2 K6 emsali).
 *
 * ⚠️ "Durum" sütunu (91) mockup'ta türe özgü etiket basar ("Çalışamaz",
 * "Vinç Kullanamaz"); sunucuda böyle bir alan YOKTUR. Kalıcı kural (F-PT2 K1):
 * sütun SİLİNMEZ — hücre pending "—" + görünür gerekçe basar.
 *
 * ⚠️ Aksiyon düğmesi (102/111/120/129) mockup'ta satıra göre metin değiştirir;
 * o ayrımın kaynağı sunucuda yok — tek NÖTR metin, devre-dışı + gerekçe.
 */
export function HrExpiredDocumentsTable({
  rows,
  isLoading,
  errorMessage,
  totalCount,
}: HrExpiredDocumentsTableProps) {
  return (
    <section className="bt-card" data-testid="bt-expired-card" aria-labelledby="bt-expired-title">
      {/* 80-83 */}
      <div className="bt-card__head bt-card__head--danger">
        <h2 className="bt-card__title" id="bt-expired-title">
          {`Süresi Dolan Belgeler (${totalCount ?? PENDING_VALUE})`}
        </h2>
        <span className="bt-card__subtitle">Acil aksiyon gerekli</span>
      </div>

      {errorMessage ? (
        <div className="bt-empty">
          <p className="bt-empty__title">Süresi dolan belgeler yüklenemedi.</p>
          <p className="bt-empty__hint">{errorMessage}</p>
        </div>
      ) : isLoading || !rows ? (
        <div className="bt-empty">
          <p className="bt-empty__title">Yükleniyor…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bt-empty">
          <p className="bt-empty__title">Süresi dolmuş belge yok.</p>
          <p className="bt-empty__hint">Aktif kadronun tüm belgeleri geçerli görünüyor.</p>
        </div>
      ) : (
        <table className="bt-table">
          {/* 85-93 */}
          <thead>
            <tr>
              <th className="bt-table__th" scope="col">
                Personel
              </th>
              <th className="bt-table__th" scope="col">
                Belge Tipi
              </th>
              <th className="bt-table__th" scope="col">
                Proje
              </th>
              <th className="bt-table__th bt-table__th--center" scope="col">
                Geçerlilik
              </th>
              <th className="bt-table__th bt-table__th--overdue" scope="col">
                Gecikme
              </th>
              <th className="bt-table__th bt-table__th--center" scope="col">
                Durum
              </th>
              <th className="bt-table__th bt-table__th--center" scope="col">
                <span className="sr-only">Aksiyon</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="bt-table__row bt-table__row--danger"
                data-testid={`bt-expired-row-${row.id}`}
              >
                {/* 96 — ad GERÇEK bağlantı; meslek alt satırı YOK (sunucuda alan yok) */}
                <td className="bt-table__td">
                  <Link className="bt-person-link" href={personnelDetailHref(row.personnel_id)}>
                    {row.personnel_name}
                  </Link>
                </td>
                {/* 97 */}
                <td className="bt-table__td">
                  <Badge variant="danger">{row.document_label}</Badge>
                </td>
                {/* 98 — `null` GERÇEK boşluktur */}
                <td className="bt-table__td">{formatProjectName(row.project_name)}</td>
                {/* 99 */}
                <td className="bt-table__td bt-table__td--valid-until">
                  {formatDateDots(row.valid_until)}
                </td>
                {/* 100 */}
                <td className="bt-table__td bt-table__td--overdue">
                  {formatDayCount(row.days_overdue)}
                </td>
                {/* 101 — sütun kalır, hücre pending */}
                <td className="bt-table__td bt-pending-cell" title={STATUS_COLUMN_PENDING_REASON}>
                  {PENDING_VALUE}
                </td>
                {/* 102 — uç yok: devre-dışı + gerekçe (rota ÜRETMEZ) */}
                <td className="bt-table__td bt-table__td--center">
                  <Button variant="danger" size="sm" disabled title={APPOINTMENT_PENDING_REASON}>
                    {ROW_ACTION_LABEL}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
