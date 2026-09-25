"use client";

import Link from "next/link";

import { EMPTY_CELL, formatDateDots, formatDecimal } from "@/lib/format";
import { divideDecimalStrings } from "@/lib/decimal";
import { formatPercent01, warningMeta } from "@/lib/earned-value";
import type { EvPanelReport, EvWarning } from "@/lib/api/models";

import type { EvPanelRow } from "./panel-tree";
import { EMPTY_RATE_SUFFIX, filterPanelWarnings, groupMissingDiaryWarnings, groupPfOutOfBandWarnings, panelWarningHref } from "./panel-warnings";
import type { ReportLinks } from "../kit/report-screen";
import "./panel-warnings.css";

export interface PanelWarningsCardProps {
  warnings: readonly EvWarning[];
  /** Disiplin/kendi-taşeron filtresi UYGULANMIŞ satırlar — S8 görünürlük süzgeci bunlara göre çalışır. */
  visibleRows: readonly EvPanelRow[];
  links: ReportLinks;
  /** `pf_bands.cumulative.red_below` (ya da varsayılan) — PF grubunun "< eşik" metni için. */
  pfRedBelow: string;
  /** SAAT (`undistributed_hours`) alt satırı "puantajı N · dağıtılan M" için — kart KENDİ hesap ÜRETMEZ. */
  kpi: EvPanelReport["kpi"];
}

const QTY_RATIO_SCALE = 4;

/** S9 — "1.284 / 1.250 m³ (%102,7)". */
function qtyOverrunDetail(warning: EvWarning): string | null {
  const qtyCum = warning.qty_cum ?? null;
  const plannedQty = warning.planned_qty ?? null;
  if (qtyCum === null || plannedQty === null) return null;
  const ratio = divideDecimalStrings(qtyCum, plannedQty, QTY_RATIO_SCALE);
  const pct = ratio === null ? EMPTY_CELL : formatPercent01(ratio);
  const uom = warning.uom ?? "";
  return `${formatDecimal(qtyCum, 0)} / ${formatDecimal(plannedQty, 0)} ${uom} (${pct})`.trim();
}

/**
 * Uyarı satırının ikinci (küçük) satırı — kod'a göre mockup'ın alt metni.
 *
 * 🔴 PLN-F3.6b LİDER DENETİMİ KUSURU: SAAT (`undistributed_hours`) yalnız
 * tarihi basıyordu ("24.09.2026"), mockup "24.09.2026 puantajı 326 ·
 * dağıtılan 310" der — `kpi.timesheet_total_day`/`kpi.spent_day`den EKLENDİ.
 * ORAN (`empty_rate`) sabit "— bütçe ve kazanılmış hesaplanamıyor" kuyruğu
 * EKLENDİ (koda bağlı sabit açıklama, `EMPTY_RATE_SUFFIX`).
 */
function warningDetail(warning: EvWarning, kpi: EvPanelReport["kpi"]): string | null {
  if (warning.code === "qty_overrun") {
    const qty = qtyOverrunDetail(warning);
    const location = [warning.item_name, warning.section_name].filter((p) => p !== null).join(" · ");
    return qty === null ? (location || null) : location ? `${location} · ${qty}` : qty;
  }
  if (warning.code === "undistributed_hours" && warning.target === "day" && warning.target_id !== null) {
    const timesheet = kpi === null || kpi.timesheet_total_day === null ? EMPTY_CELL : formatDecimal(kpi.timesheet_total_day, 0);
    const spent = kpi === null || kpi.spent_day === null ? EMPTY_CELL : formatDecimal(kpi.spent_day, 0);
    return `${formatDateDots(warning.target_id)} puantajı ${timesheet} · dağıtılan ${spent}`;
  }
  if (warning.target === "day" && warning.target_id !== null) {
    return formatDateDots(warning.target_id);
  }
  if (warning.code === "empty_rate" && (warning.item_name !== null || warning.section_name !== null)) {
    const location = [warning.item_name, warning.section_name].filter((p) => p !== null).join(" · ");
    return `${location} — ${EMPTY_RATE_SUFFIX}`;
  }
  if (warning.item_name !== null || warning.section_name !== null) {
    return [warning.item_name, warning.section_name].filter((p) => p !== null).join(" · ");
  }
  return null;
}

interface WarningRowContent {
  key: string;
  tone: string;
  label: string;
  message: string;
  detail: string | null;
  href: string | null;
  /**
   * 🔴 LİDER DENETİMİ KUSURU (2. tur) — ÖNCEDEN `tone==="warning"` satır
   * zeminini belirliyordu; bu, `qty_overrun` (MİKTAR) rozeti de "warning"
   * tonunda olduğu İÇİN MİKTAR satırını da amber zemine BOYUYORDU. Mockup
   * (Panel:234-243) ÖLÇÜLDÜ: yalnız SAAT satırı `background:#fffbeb` alır,
   * MİKTAR rozeti AYNI amber renkte ama satır zemini DÜZ BEYAZ — rozet tonu
   * ile satır vurgusu AYRI KARARLAR. `highlighted` yalnız `undistributed_hours`
   * (SAAT) kodunda `true`.
   */
  highlighted: boolean;
}

function WarningRow({ row }: { row: WarningRowContent }) {
  const body = (
    <>
      <span className={`ev-panel-warnings__badge ev-panel-warnings__badge--${row.tone}`}>{row.label}</span>
      <span className="ev-panel-warnings__body">
        <span className="ev-panel-warnings__message">{row.message}</span>
        {row.detail !== null && <span className="ev-panel-warnings__detail">{row.detail}</span>}
      </span>
      {row.href !== null && <span className="ev-panel-warnings__chevron" aria-hidden="true">›</span>}
    </>
  );
  const toneClass = row.highlighted ? " ev-panel-warnings__row--warning" : "";
  return row.href !== null ? (
    <Link href={row.href} className={`ev-panel-warnings__row ev-panel-warnings__row--link${toneClass}`}>
      {body}
    </Link>
  ) : (
    <div className={`ev-panel-warnings__row${toneClass}`}>{body}</div>
  );
}

/**
 * PLN-F3.3 · Uyarılar kartı — Panel:225-257. S8: yalnız GÖRÜNÜR (filtrelenmiş)
 * satırlara ait uyarılar listelenir; gün hedefli uyarılar HER ZAMAN görünür.
 *
 * 🔴 PLN-F3.6b LİDER PLANI §1.1/§4: backend `pf_out_of_band`ı HER bant dışı
 * kalem için AYRI üretir; burada TEK karta GRUPLANIR (`groupPfOutOfBandWarnings`
 * — S8 süzgecinden SONRA çalışır). Rozet sayısı GÖRÜNÜR SATIR sayısıdır (PF
 * grubu TEK satır sayılır), backend uyarı sayısı DEĞİL (mockup "5" — 1 PF
 * grubu + SAAT + MİKTAR + GÜNLÜK + ORAN).
 */
export function PanelWarningsCard({ warnings, visibleRows, links, pfRedBelow, kpi }: PanelWarningsCardProps) {
  const visible = filterPanelWarnings(warnings, visibleRows);
  const pfGroup = groupPfOutOfBandWarnings(visible, visibleRows, pfRedBelow, links);
  // 🔴 LİDER DENETİMİ: GÜNLÜK de PF İLE AYNI DESEN — backend her gönderilmemiş
  // gün için AYRI `missing_diary` uyarısı üretir, Panel TEK karta toplar.
  const missingDiaryGroup = groupMissingDiaryWarnings(visible, links);

  // Sıra mockup'la BİREBİR: kaynak dizideki İLK GEÇTİĞİ konumda basılır —
  // gruplanan kodların (PF/GÜNLÜK) SONRAKİ tekrarları atlanır, tek satıra
  // zaten TOPLANDI (`groupPfOutOfBandWarnings`/`groupMissingDiaryWarnings`).
  const seenGrouped = new Set<string>();
  const rows: WarningRowContent[] = [];
  visible.forEach((warning, index) => {
    if (warning.code === "pf_out_of_band") {
      if (pfGroup === null || seenGrouped.has("pf_out_of_band")) return;
      seenGrouped.add("pf_out_of_band");
      const meta = warningMeta("pf_out_of_band");
      rows.push({ key: "pf-group", tone: meta.tone, label: meta.label, message: pfGroup.message, detail: pfGroup.detail, href: pfGroup.href, highlighted: false });
      return;
    }
    if (warning.code === "missing_diary") {
      if (missingDiaryGroup === null || seenGrouped.has("missing_diary")) return;
      seenGrouped.add("missing_diary");
      const meta = warningMeta("missing_diary");
      rows.push({ key: "missing-diary-group", tone: meta.tone, label: meta.label, message: missingDiaryGroup.message, detail: missingDiaryGroup.detail, href: missingDiaryGroup.href, highlighted: false });
      return;
    }
    const meta = warningMeta(warning.code);
    rows.push({
      key: `${warning.code}-${warning.target}-${warning.target_id ?? index}`,
      tone: meta.tone,
      label: meta.label,
      message: warning.message,
      detail: warningDetail(warning, kpi),
      href: panelWarningHref(warning, links),
      // Mockup Panel:234-243 ölçümü — yalnız SAAT (`undistributed_hours`)
      // satır zemini amber alır, MİKTAR (AYNI badge tonu) DÜZ kalır.
      highlighted: warning.code === "undistributed_hours",
    });
  });

  return (
    <div className="ev-panel-warnings">
      <div className="ev-panel-warnings__head">
        <span className="ev-panel-warnings__title">Uyarılar</span>
        {rows.length > 0 && <span className="ev-panel-warnings__count">{rows.length}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="ev-panel-warnings__empty">Görünür kapsamda uyarı yok.</p>
      ) : (
        <div className="ev-panel-warnings__list">
          {rows.map((row) => (
            <WarningRow key={row.key} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
