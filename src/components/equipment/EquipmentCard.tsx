import Link from "next/link";

import { Badge } from "@/components/ui";
import { WarningTriangleIcon, inlineSymbolProps } from "@/components/ui/icons";
import type { EquipmentResponse } from "@/lib/api/hooks/useEquipment";
import { formatCurrency, formatDateLong } from "@/lib/format";

import { equipmentCategoryIcon } from "./category-icon";
import {
  equipmentCardTone,
  EQUIPMENT_EMPTY_VALUE,
  EQUIPMENT_OPERATOR_UNKNOWN_HINT,
  EQUIPMENT_RATE_UNKNOWN_HINT,
  EQUIPMENT_STATUS_BADGE_VARIANTS,
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_UNASSIGNED_SITE_LABEL,
} from "./equipment-labels";
import "./equipment.css";

export interface EquipmentCardProps {
  equipment: EquipmentResponse;
  /**
   * `site_id` → şantiye adı çözümü. Üç bağımsız veri kaynağından biri
   * (ekipman/şantiye/personel) — `undefined` ⇒ hâlâ yükleniyor, `null` ⇒
   * şantiye ataması yok (K6), boş dize DEĞİL.
   */
  siteLabel: string | null | undefined;
  /** `operator_id` → personel adı çözümü — aynı üç-kaynak deseni. */
  operatorName: string | null | undefined;
}

/**
 * M1 88-165 · Ekipman kartı. K12 — alt kutular DURUMA göre şekil değiştirir:
 * `working`/`idle` → (Günlük Kira, Operatör) ikilisi (95-98) · `broken`/
 * `maintenance` → tek geniş uyarı kutusu (`status_note` + `status_expected_date`,
 * 121-124 / 147-150).
 *
 * ⚠️ VARSAYIM (K12'de mockup örneği yok): `idle` durumu mockup'ta hiç
 * çizilmedi. En yakın makul davranış olarak `working` ile AYNI ikili kutu
 * düzenine düşer (ne arıza notu ne bakım notu vardır, tek anlamlı gösterim
 * kira/operatör ikilisidir) — rapora ayrıca not edilir.
 */
export function EquipmentCard({ equipment, siteLabel, operatorName }: EquipmentCardProps) {
  const tone = equipmentCardTone(equipment.status);
  const showWarningBox = equipment.status === "broken" || equipment.status === "maintenance";

  const siteText =
    siteLabel === undefined
      ? "Yükleniyor…"
      : siteLabel === null
        ? EQUIPMENT_UNASSIGNED_SITE_LABEL
        : siteLabel;

  return (
    <div
      className={`makine-card makine-card--${tone}`}
      data-testid="makine-card"
      data-equipment-id={equipment.id}
    >
      <div className="makine-card__head">
        <div className="makine-card__icon" aria-hidden="true">
          {equipmentCategoryIcon(equipment.category)}
        </div>
        <Badge variant={EQUIPMENT_STATUS_BADGE_VARIANTS[equipment.status]}>
          {EQUIPMENT_STATUS_LABELS[equipment.status]}
        </Badge>
      </div>

      <div className="makine-card__name">{equipment.name}</div>
      <div className="makine-card__meta">
        {equipment.brand ?? EQUIPMENT_EMPTY_VALUE} · {siteText}
      </div>

      {showWarningBox ? (
        <div className="makine-card__warning" data-testid="makine-card-warning-box">
          <div className="makine-card__warning-note">
            <WarningTriangleIcon {...inlineSymbolProps} />{" "}
            {equipment.status_note ?? EQUIPMENT_EMPTY_VALUE}
          </div>
          <div className="makine-card__warning-date">
            {equipment.status === "broken" ? "Tahmini onarım" : "Dönüş"}:{" "}
            {equipment.status_expected_date
              ? formatDateLong(equipment.status_expected_date)
              : EQUIPMENT_EMPTY_VALUE}
          </div>
        </div>
      ) : (
        <div className="makine-card__facts" data-testid="makine-card-fact-boxes">
          <div className="makine-card__fact">
            <div className="makine-card__fact-label">Günlük Kira</div>
            <div className="makine-card__fact-value makine-card__fact-value--mono">
              {equipment.rate_amount ? (
                formatCurrency(equipment.rate_amount)
              ) : (
                <span title={EQUIPMENT_RATE_UNKNOWN_HINT}>{EQUIPMENT_EMPTY_VALUE}</span>
              )}
            </div>
          </div>
          <div className="makine-card__fact">
            <div className="makine-card__fact-label">Operatör</div>
            <div className="makine-card__fact-value">
              {operatorName === undefined ? (
                "Yükleniyor…"
              ) : operatorName === null ? (
                <span title={EQUIPMENT_OPERATOR_UNKNOWN_HINT}>{EQUIPMENT_EMPTY_VALUE}</span>
              ) : (
                operatorName
              )}
            </div>
          </div>
        </div>
      )}

      {/* K4 — detay sayfası yok; tek eylem düzenleme formuna gider (T3'te açılır). */}
      <Link
        href={`/makine/${equipment.id}/duzenle`}
        className="makine-card__edit"
        data-testid="makine-card-edit-link"
      >
        Düzenle
      </Link>
    </div>
  );
}
