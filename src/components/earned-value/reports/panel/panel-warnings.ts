/**
 * PLN-F3.3 · Uyarılar kartının SAF filtre + bağlantı çözücüsü (S8).
 *
 * F3-SOZLESME.md §0 + lider emri: uyarı listesi İSTEMCİDE süzülür —
 * disiplin/kendi-taşeron filtresi uygulandıktan sonra GÖRÜNÜR olmayan bir
 * kalemin uyarısı da gösterilmemelidir (görünmeyen bir satırın "Dağıt →"
 * bağlantısı KULLANICIYI BAŞKA bir disipline götürürdü).
 *
 *   • `target === "day"` → GÜN kapsamlıdır, "tüm şantiye" — filtre UYGULANMAZ.
 *   • `target === "node"` → `target_id` GÖRÜNÜR satırların `node_id` kümesinde
 *     olmalı.
 *   • `target === "leaf"` → `target_id` biçimi `l:<item>:…`dir (bütçe
 *     ağacının yaprağı); Panel tablosu İTEM düzeyinde durur (`i:<item>`), o
 *     yüzden ikinci parça (`<item>`) çıkarılıp `i:<item>` GÖRÜNÜR satırlarda
 *     aranır.
 */
import type { EvPanelRow } from "./panel-tree";
import type { EvWarning } from "@/lib/api/models";
import { warningMeta, type WarningDestination } from "@/lib/earned-value";

import type { ReportLinks } from "../kit/report-screen";

function visibleNodeIds(rows: readonly EvPanelRow[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.node_id !== null) ids.add(row.node_id);
  }
  return ids;
}

function leafItemNodeId(targetId: string): string | null {
  const parts = targetId.split(":");
  const item = parts[1];
  return item === undefined ? null : `i:${item}`;
}

/** Görünür (filtrelenmiş) satırlara göre uyarı listesini süzer (S8). */
export function filterPanelWarnings(
  warnings: readonly EvWarning[],
  visibleRows: readonly EvPanelRow[],
): EvWarning[] {
  const nodeIds = visibleNodeIds(visibleRows);
  return warnings.filter((warning) => {
    if (warning.target === "day") return true;
    if (warning.target_id === null) return false;
    if (warning.target === "node") return nodeIds.has(warning.target_id);
    if (warning.target === "leaf") {
      const itemNodeId = leafItemNodeId(warning.target_id);
      return itemNodeId !== null && nodeIds.has(itemNodeId);
    }
    return false;
  });
}

/**
 * Uyarı kartının bağlantısı: `WARNING_META.destination` HALİHAZIRDA kod →
 * hedef eşlemesini taşır (SAAT/GÜNLÜK → günlük kaydı, PF → GİR, MİKTAR/ORAN
 * → Bütçe) — bu fonksiyon yalnız o hedefi `ReportLinks`teki İLGİLİ üreticiye
 * yönlendirir. Gün hedefli uyarıda `target_id` GÜN ISO'sudur; diğer
 * hedeflerde (node/leaf) uyarı belirli bir GÜNE değil KALEME bağlıdır —
 * bağlantı tarihsiz (bugünün/varsayılanın) açılır.
 */
export function panelWarningHref(warning: EvWarning, links: ReportLinks): string | null {
  const destination: WarningDestination = warningMeta(warning.code).destination;
  const day = warning.target === "day" ? (warning.target_id ?? undefined) : undefined;
  switch (destination) {
    case "diary":
      return links.diary(day);
    case "daily-report":
      return links.dailyReport(day);
    case "budget":
      return links.budget;
    default:
      return null;
  }
}
