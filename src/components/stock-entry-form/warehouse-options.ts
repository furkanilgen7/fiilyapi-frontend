/**
 * F-ST T4 · Depo seçeneklerinin gruplanması ve ÖN DOLDURMA kuralı.
 *
 * ⚠️ T3'TEN DEVRALINAN SÖZLEŞME: form `.../santiyeler/{siteId}/stok/giris`
 * rotasındadır ve **QUERY PARAMETRESİ KULLANILMAZ** — şantiye bağlamı
 * ROTADAN gelir. Depo ön-doldurması bu `siteId` ile yapılır.
 *
 * `GET /warehouses` ucunda `site_id` SÜZGECİ YOKTUR (openapi.json), süzme
 * İSTEMCİDE yapılır; `site_id === null` MERKEZ DEPO demektir (backend
 * spec §7 S2b) ve merkez depo listeden ÇIKARILMAZ (SG 84 onu çizer).
 */

import type { WarehouseResponse } from "@/lib/api/hooks/useWarehouses";

export interface WarehouseGroups {
  /** Rotadaki şantiyenin depoları — ön doldurma buradan yapılır. */
  site: WarehouseResponse[];
  /** Şantiyesiz (merkez) depolar. */
  central: WarehouseResponse[];
  /** Başka şantiyelerin depoları — transferin KAYNAĞI çoğunlukla buradadır. */
  other: WarehouseResponse[];
}

export function groupWarehouses(
  warehouses: readonly WarehouseResponse[],
  siteId: string,
): WarehouseGroups {
  return {
    site: warehouses.filter((warehouse) => warehouse.site_id === siteId),
    central: warehouses.filter((warehouse) => warehouse.site_id === null),
    other: warehouses.filter(
      (warehouse) => warehouse.site_id !== null && warehouse.site_id !== siteId,
    ),
  };
}

/**
 * Ön doldurulacak depo: rotadaki şantiyenin İLK deposu. Şantiyenin deposu
 * yoksa `null` döner — merkez depo ya da başka şantiyenin deposu SESSİZCE
 * seçilmez (yanlış depoya giriş yazmak, boş bırakmaktan kötüdür).
 */
export function defaultWarehouseId(
  warehouses: readonly WarehouseResponse[],
  siteId: string,
): string | null {
  return groupWarehouses(warehouses, siteId).site[0]?.id ?? null;
}
