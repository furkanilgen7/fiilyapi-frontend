"use client";

import { EQUIPMENT_RENTAL_INVOICES_MAX_LIMIT, useEquipmentRentalInvoices } from "@/lib/api/hooks/useEquipmentRentalInvoices";
import { useEquipmentDocuments } from "@/lib/api/hooks/useEquipmentDocuments";
import { useEquipmentFuelSummary } from "@/lib/api/hooks/useEquipmentFuelSummary";
import { useEquipmentWorkSummary } from "@/lib/api/hooks/useEquipmentWorkSummary";
import { useSupplier } from "@/lib/api/hooks/useSuppliers";
import type { EquipmentDetailScreenResponse } from "@/lib/api/hooks/useEquipmentDetailScreen";
import type { WorkSummaryRow } from "@/lib/api/hooks/useEquipmentWorkSummary";

import { periodFromIsoDate, recentPeriods, type DetailPeriod } from "./detail-period";
import { EquipmentDetailHero } from "./EquipmentDetailHero";
import { EquipmentDocumentsCard } from "./EquipmentDocumentsCard";
import { EquipmentFuelCard } from "./EquipmentFuelCard";
import { EquipmentLinksCard } from "./EquipmentLinksCard";
import { EquipmentMaintenanceCard } from "./EquipmentMaintenanceCard";
import { EquipmentRentalCard } from "./EquipmentRentalCard";
import { EquipmentTechCard } from "./EquipmentTechCard";
import { EquipmentWorkCard } from "./EquipmentWorkCard";

/** MD:210-229 — geçmiş şeridi ÜÇ ay basar (cari ay dâhil). */
const HISTORY_MONTHS = 3;

export interface EquipmentDetailBodyProps {
  detail: EquipmentDetailScreenResponse;
  resolveSiteLabel: (siteId: string | null) => string | null | undefined;
  onAddDocumentClick?: () => void;
}

/**
 * Dönemden türeyen sorguların yaşadığı katman — `detail` GELDİKTEN SONRA
 * mount edilir (`EquipmentDetailView` docstring'i).
 *
 * 🔴 `useEquipmentWorkSummary` ÜÇ KEZ çağrılır ve sayı SABİTTİR
 * (`HISTORY_MONTHS`), çünkü hook sayısı render'lar arasında değişemez. Uçta
 * `equipment_id` parametresi YOKTUR (yalnız `year`/`month`/`site_id`), bu
 * yüzden satır istemcide seçilir.
 */
export function EquipmentDetailBody({
  detail,
  resolveSiteLabel,
  onAddDocumentClick,
}: EquipmentDetailBodyProps) {
  const equipmentId = detail.equipment.id;
  const asOf = detail.as_of;

  // Dönem SUNUCUNUN `as_of` damgasından türer (`detail-period.ts` gerekçesi).
  // Ayrıştırılamayan damga hiç olmamalı; olursa geçmiş şerit boş kalır ama
  // ekranın geri kalanı (saklanan künye + türev bloklar) DÜŞMEZ.
  const period = periodFromIsoDate(asOf);
  const periods: DetailPeriod[] =
    period === null
      ? Array.from({ length: HISTORY_MONTHS }, () => ({ year: 2000, month: 1 }))
      : recentPeriods(period, HISTORY_MONTHS);

  const work0 = useEquipmentWorkSummary(periods[0]);
  const work1 = useEquipmentWorkSummary(periods[1]);
  const work2 = useEquipmentWorkSummary(periods[2]);
  const workQueries = [work0, work1, work2];

  const fuelQuery = useEquipmentFuelSummary({
    year: periods[0].year,
    month: periods[0].month,
    equipmentId,
  });

  const documentsQuery = useEquipmentDocuments(equipmentId);
  const supplierQuery = useSupplier(detail.equipment.supplier_id ?? "");
  const invoicesQuery = useEquipmentRentalInvoices({
    equipmentId,
    // Kırpılma korkuluğu (TB3/F-TH): sunucu varsayılanı 50'dir; en güncel
    // hakediş İLK sıradadır (uç `period_year DESC, period_month DESC`
    // sıralar — `rental_repository.list_invoices`), yani birinci öğe
    // sayfalama kaç olursa olsun doğrudur.
    limit: EQUIPMENT_RENTAL_INVOICES_MAX_LIMIT,
  });

  /** Satırı SEÇ — "yanıt yok" (`undefined`) ile "satır yok" (`null`) AYRI. */
  function rowOf(index: number): WorkSummaryRow | null | undefined {
    const data = workQueries[index].data;
    if (data === undefined) return undefined;
    return data.rows.find((row) => row.equipment_id === equipmentId) ?? null;
  }

  const currentRow = rowOf(0);
  const supplierName =
    detail.equipment.supplier_id === null
      ? null
      : supplierQuery.data === undefined
        ? undefined
        : supplierQuery.data.name;

  const latestInvoice = invoicesQuery.data === undefined
    ? undefined
    : (invoicesQuery.data.items[0] ?? null);

  return (
    <>
      <EquipmentDetailHero
        equipment={detail.equipment}
        maintenance={detail.maintenance}
        workRow={currentRow}
        siteLabel={resolveSiteLabel(detail.equipment.site_id)}
      />

      {/* MD:115-142 */}
      <div className="makine-det__grid">
        <EquipmentTechCard equipment={detail.equipment} />
        <EquipmentRentalCard
          equipment={detail.equipment}
          rental={detail.rental}
          supplierName={supplierName}
        />
      </div>

      {/* MD:144-196 */}
      <div style={{ marginBottom: 16 }}>
        <EquipmentDocumentsCard
          documents={documentsQuery.data}
          isLoading={documentsQuery.isLoading}
          error={documentsQuery.isError ? documentsQuery.error : null}
          asOf={asOf}
          onAddDocumentClick={onAddDocumentClick}
        />
      </div>

      {/* MD:198-252 */}
      <div className="makine-det__grid">
        <EquipmentWorkCard
          currentRow={currentRow}
          history={periods.map((entry, index) => {
            const row = rowOf(index);
            return {
              period: entry,
              row,
              siteLabel: row ? resolveSiteLabel(row.site_id) : null,
            };
          })}
        />
        <EquipmentFuelCard equipment={detail.equipment} summary={fuelQuery.data} />
      </div>

      {/* MD:254-300 */}
      <div className="makine-det__grid">
        <EquipmentMaintenanceCard maintenance={detail.maintenance} asOf={asOf} />
        <EquipmentLinksCard equipment={detail.equipment} latestInvoice={latestInvoice} />
      </div>

      {/* Görsel spec KAYNAK BAŞINA "yüklendi" iddiası kurar (F-İK dersi): tek
          bayrak, ikinci kaynağın hâlâ pending olduğunu GİZLER ve kadraj
          "Yükleniyor…" hâlini donmuş yakalayabilir. */}
      {work0.data !== undefined && <span hidden data-testid="makine-det-loaded-work-0" />}
      {work1.data !== undefined && <span hidden data-testid="makine-det-loaded-work-1" />}
      {work2.data !== undefined && <span hidden data-testid="makine-det-loaded-work-2" />}
      {fuelQuery.data !== undefined && <span hidden data-testid="makine-det-loaded-fuel" />}
      {documentsQuery.data !== undefined && <span hidden data-testid="makine-det-loaded-documents" />}
      {invoicesQuery.data !== undefined && <span hidden data-testid="makine-det-loaded-invoices" />}
      {(detail.equipment.supplier_id === null || supplierQuery.data !== undefined) && (
        <span hidden data-testid="makine-det-loaded-supplier" />
      )}
    </>
  );
}
