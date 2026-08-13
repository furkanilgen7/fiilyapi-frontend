import type { HrDocumentsSummaryResponse } from "@/lib/api/hooks/useHrDocuments";

import { MISSING_KPI_HINT, MISSING_KPI_HINT_FULL, PENDING_VALUE } from "./hr-documents-labels";
import "./hr-documents.css";

export interface HrDocumentsKpiStripProps {
  /** Yükleniyor/hata durumunda `undefined` — sahte sıfır BASILMAZ. */
  summary: HrDocumentsSummaryResponse | undefined;
}

/**
 * BT 58-64 · KPI şeridi — BEŞ kart: Toplam Belge (59) · Geçerli (60) ·
 * 30 Gün İçinde Bitecek (61) · Süresi Doldu (62) · Eksik Belge (63).
 *
 * ⚠️ HEPSİ SUNUCUDAN GERÇEKTİR. İstemci KPI HESAPLAMAZ (spec K6): beş sayı
 * `GET /hr/documents/summary` gövdesinden AYNEN basılır — listelerden ya da
 * `by_type` toplamlarından TÜRETİLMEZ (sunucu listeleri kırpabilir, türev
 * sayı yalan olurdu).
 *
 * ⚠️ `missing` tanımı SUNUCUNUNDUR (yalnız aktif + yayında personel, zorunlu
 * tip başına eksik KİŞİ sayısı) — ekran onu yeniden yorumlamaz, yalnız
 * ipucu olarak yazar. Diğer dördü BELGE sayısıdır; iki taban bilinçli
 * farklıdır (şema notu).
 */
export function HrDocumentsKpiStrip({ summary }: HrDocumentsKpiStripProps) {
  return (
    <div className="bt-kpi" data-testid="bt-kpi-strip">
      {/* 59 */}
      <div className="bt-kpi__card">
        <div className="bt-kpi__label">Toplam Belge</div>
        <div className="bt-kpi__value">{summary ? summary.total_documents : PENDING_VALUE}</div>
      </div>

      {/* 60 */}
      <div className="bt-kpi__card bt-kpi__card--valid">
        <div className="bt-kpi__label">Geçerli</div>
        <div className="bt-kpi__value bt-kpi__value--valid">
          {summary ? summary.valid : PENDING_VALUE}
        </div>
      </div>

      {/* 61 */}
      <div className="bt-kpi__card bt-kpi__card--expiring">
        <div className="bt-kpi__label">30 Gün İçinde Bitecek</div>
        <div className="bt-kpi__value bt-kpi__value--expiring">
          {summary ? summary.expiring : PENDING_VALUE}
        </div>
      </div>

      {/* 62 */}
      <div className="bt-kpi__card bt-kpi__card--expired">
        <div className="bt-kpi__label">Süresi Doldu</div>
        <div className="bt-kpi__value bt-kpi__value--expired">
          {summary ? summary.expired : PENDING_VALUE}
        </div>
      </div>

      {/* 63 — sayı GERÇEK; alt satır yalnız sunucunun TANIMINI aktarır */}
      <div className="bt-kpi__card" title={MISSING_KPI_HINT_FULL}>
        <div className="bt-kpi__label">Eksik Belge</div>
        <div className="bt-kpi__value bt-kpi__value--missing">
          {summary ? summary.missing : PENDING_VALUE}
        </div>
        <p className="bt-kpi__hint">{MISSING_KPI_HINT}</p>
      </div>
    </div>
  );
}
