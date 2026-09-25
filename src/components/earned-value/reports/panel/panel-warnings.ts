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
import { formatPf, warningMeta, type WarningDestination } from "@/lib/earned-value";
import { EMPTY_CELL, formatDateDots, formatWeekdayShort } from "@/lib/format";

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

export interface PfOutOfBandGroup {
  readonly message: string;
  readonly detail: string;
  readonly count: number;
  readonly href: string | null;
}

/** Uyarının kalem ADI — `rows[node_id === target_id]` BİRLEŞİMİ (lider planı §1.1); eşleşme yoksa `item_name` yedeği. */
function pfWarningName(warning: EvWarning, rows: readonly EvPanelRow[]): string {
  const row = warning.target_id === null ? undefined : rows.find((r) => r.node_id === warning.target_id);
  return row?.name ?? warning.item_name ?? "";
}

/**
 * PLN-F3.6b LİDER PLANI §1.1 + §4 · Backend her bant dışı kalem için AYRI
 * bir `pf_out_of_band` uyarısı üretir ("PF uyarı SAYISI = backend
 * listesinin uzunluğu"); PANEL bunları TEK karta TOPLAR: başlık "N kalem PF
 * bant dışı (< eşik)", alt satır "Ad değer · Ad değer · …". Girdi S8
 * SÜZGECİNDEN SONRA verilir (`filterPanelWarnings` çıktısı) — görünmeyen bir
 * kalemin PF uyarısı gruba KARIŞMAZ. Hiç `pf_out_of_band` yoksa `null` (kart
 * BASILMAZ, uydurma "0 kalem" YOK).
 */
export function groupPfOutOfBandWarnings(
  visibleWarnings: readonly EvWarning[],
  rows: readonly EvPanelRow[],
  redBelow: string,
  links: ReportLinks,
): PfOutOfBandGroup | null {
  const pf = visibleWarnings.filter((w) => w.code === "pf_out_of_band");
  if (pf.length === 0) return null;
  const detail = pf
    .map((w) => `${pfWarningName(w, rows)} ${w.value === null ? EMPTY_CELL : formatPf(w.value)}`)
    .join(" · ");
  return {
    message: `${pf.length} kalem PF bant dışı (< ${formatPf(redBelow)})`,
    detail,
    count: pf.length,
    href: panelWarningHref(pf[0], links),
  };
}

export interface MissingDiaryGroup {
  readonly message: string;
  readonly detail: string;
  readonly count: number;
  readonly href: string | null;
}

/**
 * PLN-F3.6b LİDER DENETİMİ · `pf_out_of_band` İLE AYNI DESEN: backend her
 * gönderilmemiş GÜN için AYRI bir `missing_diary` uyarısı üretir (`target:
 * "day"`), Panel bunları TEK karta toplar: "N günlük gönderilmedi" + alt
 * satır "gg.aa.yyyy Kıs · gg.aa.yyyy Kıs — gün kilitlenmedi". Gün hedefli
 * olduğu için S8 süzgeci ZATEN uygulanmaz (`filterPanelWarnings`), bu
 * fonksiyon yalnız GRUPLAR.
 */
export function groupMissingDiaryWarnings(visibleWarnings: readonly EvWarning[], links: ReportLinks): MissingDiaryGroup | null {
  const missing = visibleWarnings.filter((w) => w.code === "missing_diary" && w.target_id !== null);
  if (missing.length === 0) return null;
  const detail = `${missing.map((w) => `${formatDateDots(w.target_id!)} ${formatWeekdayShort(w.target_id!)}`).join(" · ")} — gün kilitlenmedi`;
  return {
    message: `${missing.length} günlük gönderilmedi`,
    detail,
    count: missing.length,
    href: panelWarningHref(missing[0], links),
  };
}

/**
 * PLN-F3.6b LİDER DENETİMİ · ORAN (`empty_rate`) uyarısının sabit açıklama
 * kuyruğu — mockup "Buat/priz montajı · Çatı — bütçe ve kazanılmış
 * hesaplanamıyor". Kuyruk KODA bağlıdır (her `empty_rate` uyarısı için AYNI
 * cümle — `meta.label`in "ORAN" sabit rozet metniyle AYNI sınıf), TEK bir
 * kalemin verisinden TÜRETİLMEZ; bu yüzden uydurma SAYI/AD İÇERMEZ.
 */
export const EMPTY_RATE_SUFFIX = "bütçe ve kazanılmış hesaplanamıyor";
