import { Select } from "@/components/ui";
import type { HrDocumentsSummaryResponse } from "@/lib/api/hooks/useHrDocuments";

import { FILTER_PENDING_REASON, PENDING_VALUE } from "./hr-documents-labels";
import "./hr-documents.css";

export interface HrDocumentsFilterBarProps {
  /** Çip sayaçlarının kaynağı; `undefined` ⇒ yükleniyor/hata (sayı yerine "—"). */
  summary: HrDocumentsSummaryResponse | undefined;
}

interface ChipDef {
  label: string;
  count: number | undefined;
  modifier?: string;
}

/**
 * BT 67-76 · süzgeç şeridi — dört çip (69-72) + Belge Tipi (74) + Proje (75).
 *
 * ⚠️ ŞEF KARARI: `GET /hr/documents/summary` SORGU PARAMETRESİ ALMAZ; sunucu
 * tarafı süzgeç YOKTUR. İstemci tarafı süzgeç de İCAT EDİLMEZ — beş KPI ve tip
 * dağılımı sunucunun TÜM dünyasını anlatır, listeler süzülürse KPI'larla
 * tutarsızlaşırdı (spec K6).
 *
 * Kalıcı kural gereği hiçbiri SİLİNMEZ: çipler GERÇEK sayaçlarını basar
 * (bilgi taşırlar), fakat süzme davranışı devre-dışıdır ve gerekçe GÖRÜNÜRdür
 * — `title` ipucuna gömülü kalmaz, şeridin altında bant olarak yazılır.
 */
export function HrDocumentsFilterBar({ summary }: HrDocumentsFilterBarProps) {
  const chips: ChipDef[] = [
    { label: "Süresi Dolan", count: summary?.expired, modifier: "bt-chip--expired" },
    { label: "Yaklaşan", count: summary?.expiring },
    { label: "Geçerli", count: summary?.valid },
    { label: "Eksik", count: summary?.missing },
  ];

  return (
    <div className="bt-filters" data-testid="bt-filters">
      {/* 68-73 */}
      <div className="bt-chips">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled
            title={FILTER_PENDING_REASON}
            className={`bt-chip${chip.modifier ? ` ${chip.modifier}` : ""}`}
          >
            {`${chip.label} (${chip.count ?? PENDING_VALUE})`}
          </button>
        ))}
      </div>

      {/* 74 — seçenekler mockup'tan; süzgeç ucu olmadığı için devre-dışı */}
      <Select
        aria-label="Belge tipi"
        className="bt-filters__select"
        disabled
        title={FILTER_PENDING_REASON}
        defaultValue=""
      >
        <option value="">Tüm Belge Tipleri</option>
      </Select>

      {/* 75 */}
      <Select
        aria-label="Proje"
        className="bt-filters__select"
        disabled
        title={FILTER_PENDING_REASON}
        defaultValue=""
      >
        <option value="">Tüm Projeler</option>
      </Select>

      <p className="bt-filters__note">{FILTER_PENDING_REASON}</p>
    </div>
  );
}
