"use client";

import { cx } from "@/lib/cx";
import type { EvRevisionDiffOut } from "@/lib/api/models";

import { diffRows, diffSummary } from "./diff-rows";

interface DiffPanelProps {
  diff: EvRevisionDiffOut;
}

/**
 * Revizyon farkı paneli — Adam-Saat Bütçesi.dc.html:154-175. Renk K22:
 * a-s artışı kırmızı (`--increase`), azalış yeşil (`--decrease`).
 * Satır yoksa panel basılmaz (BÜT:657 `showDiff && diffRows.length > 0`).
 */
export function DiffPanel({ diff }: DiffPanelProps) {
  const summary = diffSummary(diff);
  const rows = diffRows(diff);
  if (summary === null || rows.length === 0) return null;
  return (
    <section className="ev-budget-diff" aria-label={summary.title}>
      <div className="ev-budget-diff__head">
        <span className="ev-budget-diff__title">{summary.title}</span>
        <span className="ev-budget-diff__count">{summary.count} satır değişti · tabloda sarı zeminli</span>
        <span className="ev-budget-diff__total">
          Toplam doğrudan <span className="ev-budget-mono">{summary.before}</span> →{" "}
          <b className="ev-budget-mono">{summary.after}</b> a-s{" "}
          <b className={cx("ev-budget-mono", `ev-budget-tone--${summary.tone}`)}>{summary.delta}</b>
        </span>
      </div>
      <table className="ev-budget-diff__table">
        <thead>
          <tr>
            <th scope="col">Kalem · bölüm</th>
            <th scope="col">Eski miktar</th>
            <th scope="col">Yeni miktar</th>
            <th scope="col">Eski oran</th>
            <th scope="col">Yeni oran</th>
            <th scope="col">Bütçe farkı</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.leafId}>
              <th scope="row">
                <span className="ev-budget-diff__name">{row.name}</span>
                <span className="ev-budget-diff__note">{row.note}</span>
              </th>
              <td className="ev-budget-diff__old">{row.oldQty}</td>
              <td className={cx(row.qtyChanged && "ev-budget-diff__changed")}>{row.newQty}</td>
              <td className="ev-budget-diff__old">{row.oldRate}</td>
              <td className={cx(row.rateChanged && "ev-budget-diff__changed", row.rateMissing && "ev-budget-tone--missing")}>
                {row.newRate}
              </td>
              <td className={cx("ev-budget-diff__delta", `ev-budget-tone--${row.tone}`)}>{row.delta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
