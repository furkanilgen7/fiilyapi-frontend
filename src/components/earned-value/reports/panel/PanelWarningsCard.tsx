"use client";

import Link from "next/link";

import { EMPTY_CELL, formatDateDots, formatDecimal } from "@/lib/format";
import { divideDecimalStrings } from "@/lib/decimal";
import { formatPercent01, warningMeta } from "@/lib/earned-value";
import type { EvWarning } from "@/lib/api/models";

import type { EvPanelRow } from "./panel-tree";
import { filterPanelWarnings, panelWarningHref } from "./panel-warnings";
import type { ReportLinks } from "../kit/report-screen";
import "./panel-warnings.css";

export interface PanelWarningsCardProps {
  warnings: readonly EvWarning[];
  /** Disiplin/kendi-taşeron filtresi UYGULANMIŞ satırlar — S8 görünürlük süzgeci bunlara göre çalışır. */
  visibleRows: readonly EvPanelRow[];
  links: ReportLinks;
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

/** Uyarı satırının ikinci (küçük) satırı — kod'a göre mockup'ın alt metni. */
function warningDetail(warning: EvWarning): string | null {
  if (warning.code === "qty_overrun") {
    const qty = qtyOverrunDetail(warning);
    const location = [warning.item_name, warning.section_name].filter((p) => p !== null).join(" · ");
    return qty === null ? (location || null) : location ? `${location} · ${qty}` : qty;
  }
  if (warning.target === "day" && warning.target_id !== null) {
    return formatDateDots(warning.target_id);
  }
  if (warning.item_name !== null || warning.section_name !== null) {
    return [warning.item_name, warning.section_name].filter((p) => p !== null).join(" · ");
  }
  return null;
}

/**
 * PLN-F3.3 · Uyarılar kartı — Panel:225-257. S8: yalnız GÖRÜNÜR (filtrelenmiş)
 * satırlara ait uyarılar listelenir; gün hedefli uyarılar HER ZAMAN görünür.
 */
export function PanelWarningsCard({ warnings, visibleRows, links }: PanelWarningsCardProps) {
  const visible = filterPanelWarnings(warnings, visibleRows);
  return (
    <div className="ev-panel-warnings">
      <div className="ev-panel-warnings__head">
        <span className="ev-panel-warnings__title">Uyarılar</span>
        {visible.length > 0 && <span className="ev-panel-warnings__count">{visible.length}</span>}
      </div>
      {visible.length === 0 ? (
        <p className="ev-panel-warnings__empty">Görünür kapsamda uyarı yok.</p>
      ) : (
        <div className="ev-panel-warnings__list">
          {visible.map((warning, index) => {
            const meta = warningMeta(warning.code);
            const href = panelWarningHref(warning, links);
            const detail = warningDetail(warning);
            const body = (
              <>
                <span className={`ev-panel-warnings__badge ev-panel-warnings__badge--${meta.tone}`}>{meta.label}</span>
                <span className="ev-panel-warnings__body">
                  <span className="ev-panel-warnings__message">{warning.message}</span>
                  {detail !== null && <span className="ev-panel-warnings__detail">{detail}</span>}
                </span>
                {href !== null && <span className="ev-panel-warnings__chevron" aria-hidden="true">›</span>}
              </>
            );
            const key = `${warning.code}-${warning.target}-${warning.target_id ?? index}`;
            return href !== null ? (
              <Link key={key} href={href} className="ev-panel-warnings__row ev-panel-warnings__row--link">
                {body}
              </Link>
            ) : (
              <div key={key} className="ev-panel-warnings__row">
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
