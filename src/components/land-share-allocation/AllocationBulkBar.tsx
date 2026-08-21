import { Badge, Button, Select } from "@/components/ui";
import type { LandShareShareholderRow } from "@/lib/api/hooks/useLandShare";

import type { UnitOwnerSide } from "./allocation-state";
import {
  ALLOCATION_ASSIGN_CONTRACTOR_LABEL,
  ALLOCATION_ASSIGN_LANDOWNER_LABEL,
  ALLOCATION_ASSIGN_SELECTED_LABEL,
  ALLOCATION_AUTO_DISTRIBUTE_PLAIN_LABEL,
  ALLOCATION_BULK_BAR_TITLE,
  ALLOCATION_SHAREHOLDER_PLACEHOLDER,
  allocationSelectedBadge,
  autoDistributeLabel,
  shareholderOptionLabel,
} from "./constants";

interface AllocationBulkBarProps {
  selectedCount: number;
  shareholders: readonly LandShareShareholderRow[];
  /** Toplu hissedar seçicisinin GÖRÜNEN değeri. */
  shareholderId: string;
  /** Sözleşme gelmediyse `null` — etiket UYDURULMAZ. */
  ourSharePct: string | null;
  ownerSharePct: string | null;
  disabled: boolean;
  /** Otomatik dağıtımın GÖRÜNÜR gerekçeleri (`auto-distribute.ts` çıktısı). */
  notices: readonly string[];
  onAssign: (side: UnitOwnerSide) => void;
  onAssignShareholder: (shareholderId: string) => void;
  onAutoDistribute: () => void;
}

/**
 * "Toplu İşlem" barı (PG 85-103).
 *
 * 🔴 PG 101'İN "%55/%45"İ ÖRNEK VERİDİR. Etiket `autoDistributeLabel` ile
 * SÖZLEŞMEDEN türetilir (T1); mockup'ın sayısını gömmek %60/%40 sözleşmeli bir
 * projede düğmenin YANLIŞ oran vaat etmesine yol açardı. Oranlar henüz
 * gelmediyse düğme kapalı basılır — uydurma bir etiketle açık durmaz.
 *
 * 🔴 "Otomatik Dağıt" SUNUCUYA HİÇBİR ŞEY GÖNDERMEZ. Böyle bir uç YOKTUR
 * (ölçüldü); işlem YALNIZ bekleyen (kaydedilmemiş) atama üretir ve kullanıcı
 * "Paylaşımı Kaydet" demeden hiçbir satır yazılmaz.
 *
 * 🔴 HİSSEDAR YALNIZ ARSA TARAFINDA ANLAMLIDIR (sunucu 422 ile zorlar). Toplu
 * seçici de bu kurala tabidir: `setUnitShareholder` (T1) ARSA'da olmayan
 * satırı DEĞİŞTİRMEDEN geri döndürür, yani bu düğmeden 422 üretmek mümkün
 * değildir.
 */
export function AllocationBulkBar({
  selectedCount,
  shareholders,
  shareholderId,
  ourSharePct,
  ownerSharePct,
  disabled,
  notices,
  onAssign,
  onAssignShareholder,
  onAutoDistribute,
}: AllocationBulkBarProps) {
  const hasSelection = selectedCount > 0;
  const canAutoDistribute = ourSharePct !== null && ownerSharePct !== null;

  return (
    <section className="pf-card pg-bulk" data-testid="paylasim-form-toplu-bar">
      <div className="pg-bulk__row">
        {/* 88 */}
        <span className="pg-bulk__title">{ALLOCATION_BULK_BAR_TITLE}</span>
        {/* 90 — sayı ÇALIŞMA ZAMANINDA gelir */}
        <Badge variant="primary" data-testid="paylasim-form-secim-rozeti">
          {allocationSelectedBadge(selectedCount)}
        </Badge>
        <span className="pg-bulk__sep" aria-hidden="true" />
        {/* 91 */}
        <span className="pg-bulk__hint">{ALLOCATION_ASSIGN_SELECTED_LABEL}</span>
        {/* 92 */}
        <Button
          variant="success"
          size="sm"
          data-testid="paylasim-form-toplu-biz"
          disabled={disabled || !hasSelection}
          onClick={() => onAssign("contractor")}
        >
          {ALLOCATION_ASSIGN_CONTRACTOR_LABEL}
        </Button>
        {/* 93 */}
        <Button
          variant="secondary"
          size="sm"
          data-testid="paylasim-form-toplu-arsa"
          disabled={disabled || !hasSelection}
          onClick={() => onAssign("landowner")}
        >
          {ALLOCATION_ASSIGN_LANDOWNER_LABEL}
        </Button>
        <span className="pg-bulk__sep" aria-hidden="true" />
        {/* 95-100 — hissedar seçenekleri ÖZETTEN gelir; ayrı bir uç GEREKMEZ */}
        <Select
          size="row"
          aria-label={ALLOCATION_SHAREHOLDER_PLACEHOLDER}
          data-testid="paylasim-form-toplu-hissedar"
          disabled={disabled || !hasSelection || shareholders.length === 0}
          value={shareholderId}
          onChange={(event) => onAssignShareholder(event.target.value)}
        >
          <option value="">{ALLOCATION_SHAREHOLDER_PLACEHOLDER}</option>
          {shareholders.map((row) => (
            <option key={row.shareholder_id} value={row.shareholder_id}>
              {shareholderOptionLabel(row)}
            </option>
          ))}
        </Select>
        {/* 101 — etiket SÖZLEŞMEDEN türer */}
        <Button
          variant="secondary"
          size="sm"
          className="pg-bulk__auto"
          data-testid="paylasim-form-otomatik-dagit"
          disabled={disabled || !canAutoDistribute}
          onClick={onAutoDistribute}
        >
          {canAutoDistribute
            ? autoDistributeLabel(ourSharePct, ownerSharePct)
            : ALLOCATION_AUTO_DISTRIBUTE_PLAIN_LABEL}
        </Button>
      </div>

      {notices.map((notice) => (
        <p key={notice} className="pg-bulk__notice" data-testid="paylasim-form-dagitim-notu">
          {notice}
        </p>
      ))}
    </section>
  );
}
