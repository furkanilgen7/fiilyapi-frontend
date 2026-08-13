import Link from "next/link";

import type { HrDocumentsSummaryResponse } from "@/lib/api/hooks/useHrDocuments";

import { buildBreakdownRows, NOTIFICATION_SETTINGS_ROUTE } from "./hr-documents-labels";
import "./hr-documents.css";

export interface HrDocumentTypeBreakdownCardProps {
  /** `undefined` ⇒ yükleniyor/hata. */
  summary: HrDocumentsSummaryResponse | undefined;
}

/**
 * BT 155-186 · "Belge Tipi Dağılımı" kartı — `by_type[]`ten GERÇEK.
 *
 * Her tip (158-177): ad (159) · "kayıtlı / olması gereken" oranı (159) ·
 * dört renkli oran çubuğu (160) · sayı dökümü (161). HEPSİ sunucu
 * alanlarından kurulur (`buildBreakdownRow`).
 *
 * ⚠️ Çubuktaki YÜZDELER yalnız `width` değeridir — yeni bir KPI DEĞİLDİR ve
 * ekranda sayı olarak BASILMAZ (spec K6). Toplam sıfırsa dilim üretilmez,
 * boş kanal görünür (bölme hatası yok).
 *
 * BT 178-183 · "Otomatik hatırlatma" kutusu: metin mockup'tan; "Ayarla →"
 * bağlantısı GERÇEKTİR — `/ayarlar/bildirimler` rotası repoda VARDIR.
 */
export function HrDocumentTypeBreakdownCard({ summary }: HrDocumentTypeBreakdownCardProps) {
  const rows = buildBreakdownRows(summary);

  return (
    <section
      className="bt-breakdown"
      data-testid="bt-breakdown-card"
      aria-labelledby="bt-breakdown-title"
    >
      {/* 156 */}
      <h2 className="bt-breakdown__title" id="bt-breakdown-title">
        Belge Tipi Dağılımı
      </h2>

      <div className="bt-breakdown__list">
        {!summary ? (
          <p className="bt-empty__hint">Yükleniyor…</p>
        ) : rows.length === 0 ? (
          <p className="bt-empty__hint">Tanımlı belge tipi yok.</p>
        ) : (
          rows.map((row) => (
            <div key={row.typeId} data-testid={`bt-breakdown-row-${row.typeId}`}>
              {/* 159 */}
              <div className="bt-breakdown__row-head">
                <span className="bt-breakdown__name">{row.typeName}</span>
                <span className="bt-breakdown__ratio">{row.ratioLabel}</span>
              </div>
              {/* 160 — genişlikler SUNUM; sayı olarak basılmaz */}
              <div className="bt-bar">
                {row.segments.map((segment) => (
                  <span
                    key={segment.key}
                    className={`bt-bar__seg bt-bar__seg--${segment.key}`}
                    style={{ width: `${segment.percent}%` }}
                  />
                ))}
              </div>
              {/* 161 */}
              <p className="bt-breakdown__detail">{row.detailLabel}</p>
            </div>
          ))
        )}

        {/* 178-183 */}
        <div className="bt-reminder">
          <strong>Otomatik hatırlatma:</strong> Belge bitişine 30 gün kala personel ve İK&apos;ya
          bildirim gider.{" "}
          <Link className="bt-reminder__link" href={NOTIFICATION_SETTINGS_ROUTE}>
            Ayarla →
          </Link>
        </div>
      </div>
    </section>
  );
}
