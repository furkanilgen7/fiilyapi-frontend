/**
 * PLN-F2.3 · Kalem düzeyi planlama bilgisi (`itemMeta` yuvası) — SAF.
 *
 * Gün payload'ı ve kod ağacı kalemin doğrudan/dolaylı ve kendi/taşeron
 * atamasını TAŞIMAZ; kaynağı AKTİF (dondurulmuş) baseline'ın bütçe görünümüdür
 * (`GET /budget?revision_id=<aktif>`, K3: L3'te atanır). G9: dolaylı kalemde
 * "+ Bölüm" yok · İ:225: kalem kod satırında "Kendi" / "Taşeron".
 */
import type { EvBudgetView, EvRevisionOut } from "@/lib/api/models";

const CONTRACTOR_LABELS = { own: "Kendi", subcon: "Taşeron" } as const;

/** Dağıtım aktif revizyona yazılır; aktif yoksa `null` (taslak varsayılanına düşülmez). */
export function activeRevisionId(revisions: readonly EvRevisionOut[] | undefined): string | null {
  return revisions?.find((revision) => revision.status === "active")?.id ?? null;
}

export interface ItemFacts {
  /** `is_direct === false` kalemlerin BOQ kalem kimlikleri. */
  indirectItemIds: ReadonlySet<string>;
  contractorLabel: (boqItemId: string) => string | null;
}

export function buildItemFacts(budget: EvBudgetView | undefined): ItemFacts {
  const items = (budget?.disciplines ?? []).flatMap((d) => d.groups.flatMap((g) => g.items));
  const labels = new Map(items.map((item) => [item.item_id, CONTRACTOR_LABELS[item.contractor_type]]));
  return {
    indirectItemIds: new Set(items.filter((item) => !item.is_direct).map((item) => item.item_id)),
    contractorLabel: (boqItemId) => labels.get(boqItemId) ?? null,
  };
}
