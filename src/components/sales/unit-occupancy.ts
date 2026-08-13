import type { UnitResponse, UnitSalesStatus } from "@/lib/api/hooks/useProjectUnits";

import type { UnitOccupancyTone } from "./sales-labels";

/**
 * F-P8 T2 · SY 62-140 "Blok Doluluk Haritası"nın SAF yardımcıları.
 *
 * Buradaki tek "hesap" SAYMADIR (blok başlığındaki daire/dükkan kırılımı ve
 * blok altındaki "18 tapulu · 2 rezerve · 4 boş" özeti). Bu meşrudur: ünite
 * listesi SAYFASIZ ve blok blok TAMDIR (`GET /projects/{id}/units` →
 * `blocks[].units[]`), yani sayım kırpılmış bir kümeden gelmez. PARA ile
 * ilgili hiçbir türev burada üretilmez — KPI şeridi sunucunun summary ucundan
 * beslenir.
 */

/** Hücrenin rengi — kaynağı ünitenin SUNUCUDAKİ `sales_status` damgasıdır. */
export function unitOccupancyTone(status: UnitSalesStatus | null): UnitOccupancyTone {
  if (status === "sold") return "sold"; // 76 (#16a34a)
  if (status === "reserved") return "reserved"; // 89 (#f59e0b)
  if (status === "closed") return "closed";
  // `listed` ve (damgası olmayan) ünite mockup'ta BOŞ tonundadır (92, #e2e8f0).
  return "available";
}

/** Ünite türlerinin Türkçe karşılıkları — blok başlığı (74, 104) için. */
export const UNIT_KIND_LABELS: Record<UnitResponse["unit_kind"], string> = {
  apartment: "Daire", // 74
  shop: "Dükkan", // 104
  office: "Ofis",
  warehouse: "Depo",
  parking: "Otopark",
};

/** Başlıktaki tür kırılımını üretir: "24 Daire + 4 Dükkan" (104). */
export function blockKindSummary(units: readonly UnitResponse[]): string {
  const order: UnitResponse["unit_kind"][] = [
    "apartment",
    "shop",
    "office",
    "warehouse",
    "parking",
  ];
  return order
    .map((kind) => ({ kind, count: units.filter((unit) => unit.unit_kind === kind).length }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${UNIT_KIND_LABELS[entry.kind]}`)
    .join(" + ");
}

export interface BlockOccupancyCounts {
  sold: number;
  reserved: number;
  available: number;
  closed: number;
}

/** Blok altındaki özet satırı (101, 137). */
export function blockOccupancyCounts(units: readonly UnitResponse[]): BlockOccupancyCounts {
  const counts: BlockOccupancyCounts = { sold: 0, reserved: 0, available: 0, closed: 0 };
  for (const unit of units) counts[unitOccupancyTone(unit.sales_status)] += 1;
  return counts;
}

/** 101 · "18 tapulu · 2 rezerve · 4 boş" — sıfır olan kırılım BASILMAZ. */
export function blockOccupancySummary(counts: BlockOccupancyCounts): string {
  const parts: string[] = [];
  if (counts.sold > 0) parts.push(`${counts.sold} tapulu`);
  if (counts.reserved > 0) parts.push(`${counts.reserved} rezerve`);
  if (counts.available > 0) parts.push(`${counts.available} boş`);
  if (counts.closed > 0) parts.push(`${counts.closed} kapalı`);
  return parts.join(" · ");
}
