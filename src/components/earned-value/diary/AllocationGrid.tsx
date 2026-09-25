"use client";

import { Checkbox } from "@/components/ui/checkbox/Checkbox";
import { ArrowRightIcon, CheckIcon, WarningTriangleIcon } from "@/components/ui/icons";
import type { EvDayRow, EvDayView } from "@/lib/api/models";
import { cx } from "@/lib/cx";
import type { PfBandSettings } from "@/lib/earned-value";
import { EMPTY_CELL } from "@/lib/format";

import {
  columnTotals,
  keyOfRow,
  rowRemaining,
  type AllocationDraft,
  type AllocationRule,
  type RowKey,
} from "./allocation-model";
import type { ColumnHeader } from "./code-tree";
import { formatHours, toCenti, type Centi } from "./hours";
import { PfBadge } from "./PfBadge";

export interface AllocationGridProps {
  view: EvDayView;
  draft: AllocationDraft;
  headers: Readonly<Record<string, ColumnHeader>>;
  bands: PfBandSettings;
  canEdit: boolean;
  unallocated: Centi;
  selected: ReadonlySet<RowKey>;
  onToggleSelect: (key: RowKey) => void;
  onToggleRule: (nodeId: string) => void;
  renderCell: (row: EvDayRow, nodeId: string) => React.ReactNode;
}

/** İ:446-489 — kişi × iş kodu ızgarası; ilk kolon yapışkan (TimesheetWeekTable emsali). */
export function AllocationGrid(props: AllocationGridProps) {
  const own = props.view.rows.filter((row) => row.kind === "personnel");
  const subs = props.view.rows.filter((row) => row.kind === "subcontractor");
  const ownHours = own.reduce((sum, row) => sum + toCenti(row.hours), 0);
  const subHours = subs.reduce((sum, row) => sum + toCenti(row.hours), 0);
  const span = props.draft.codes.length + 2;
  return (
    <div className="ev-diary-grid-scroll">
      <table className="ev-diary-grid">
        <GridHead {...props} />
        <tbody>
          <SeparatorRow span={span}>{`Kendi ekip · puantajdan · ${own.length} kişi · ${formatHours(ownHours)} sa`}</SeparatorRow>
          {own.map((row) => (
            <GridRow key={keyOfRow(row)} row={row} {...props} />
          ))}
          {subs.length > 0 && (
            <SeparatorRow span={span}>{`Taşeron · günlük kayıttan · ${formatHours(subHours)} a-s`}</SeparatorRow>
          )}
          {subs.map((row) => (
            <GridRow key={keyOfRow(row)} row={row} {...props} />
          ))}
        </tbody>
        <GridFoot {...props} />
      </table>
    </div>
  );
}

const RULE_LABELS: Record<AllocationRule, string> = {
  prorata_by_daily_qty: "Miktara göre dağıtılır",
  direct: "Doğrudan",
};

function GridHead({ draft, headers, canEdit, onToggleRule }: AllocationGridProps) {
  return (
    <thead>
      <tr>
        <th scope="col" className="ev-diary-grid__lead ev-diary-grid__lead--head">
          Kişi · meslek · puantaj sa
        </th>
        {draft.codes.map((code) => {
          const header = headers[code.node_id];
          return (
            <th key={code.node_id} scope="col" className={cx("ev-diary-grid__code", !header?.isLeaf && "ev-diary-grid__code--group")}>
              <span className="ev-diary-grid__code-id">{header?.code}</span>
              <span className="ev-diary-grid__code-name" title={header?.short}>{header?.short}</span>
              {/* İ:456-458 — üst grup kolonunda kip; K11 karışık birimde kazanılmış payı (backend) */}
              {header && !header.isLeaf && (
                <button
                  type="button"
                  className={cx("ev-diary-rule", `ev-diary-rule--${code.rule}`)}
                  disabled={!canEdit}
                  title="Miktara göre: yaprakların bugünkü miktar payıyla (birimler karışıksa kazanılmış a-s payıyla)"
                  onClick={() => onToggleRule(code.node_id)}
                >
                  {RULE_LABELS[code.rule]}
                </button>
              )}
            </th>
          );
        })}
        <th scope="col" className="ev-diary-grid__remain ev-diary-grid__remain--head">Kalan</th>
      </tr>
    </thead>
  );
}

function SeparatorRow({ span, children }: { span: number; children: string }) {
  return (
    <tr className="ev-diary-grid__sep">
      <th scope="colgroup" colSpan={span}>{children}</th>
    </tr>
  );
}

function rowJob(row: EvDayRow): string {
  if (row.kind === "personnel") return row.trade ?? "";
  const count = row.headcount ?? 0;
  const perPerson = count > 0 ? Math.round(toCenti(row.hours) / count) : 0;
  return `Taşeron · ${count} kişi × ${formatHours(perPerson)} sa`;
}

function GridRow({ row, draft, canEdit, selected, onToggleSelect, renderCell }: AllocationGridProps & { row: EvDayRow }) {
  const key = keyOfRow(row);
  const hours = toCenti(row.hours);
  return (
    <tr className={cx("ev-diary-grid__row", row.changed && "ev-diary-grid__row--changed", row.kind === "subcontractor" && "ev-diary-grid__row--sub")}>
      <th scope="row" className="ev-diary-grid__lead">
        <span className="ev-diary-grid__person">
          <Checkbox
            size="lg"
            className="ev-diary-grid__select"
            aria-label={`${row.label} seç`}
            checked={selected.has(key)}
            disabled={!canEdit}
            onChange={() => onToggleSelect(key)}
          />
          <span className="ev-diary-grid__who">
            <span className="ev-diary-grid__name">{row.label}</span>
            <span className="ev-diary-grid__job">{rowJob(row)}</span>
            {row.changed && <ChangedNote saved={row.saved_hours} current={row.hours} />}
          </span>
          <span className="ev-diary-grid__hours">{formatHours(hours)}</span>
        </span>
      </th>
      {draft.codes.map((code) => (
        <td key={code.node_id} className="ev-diary-cell">
          {renderCell(row, code.node_id)}
        </td>
      ))}
      <td className="ev-diary-grid__remain">
        <RemainBadge value={rowRemaining(draft, row)} />
      </td>
    </tr>
  );
}

/**
 * İ:465 — "⚠ Puantaj değişti (9 → 11 sa), dağılımı gözden geçir"; değerler
 * backend satırından (`saved_hours` → `hours`). ⚠ ve → glif değil SVG (F-SEM).
 */
function ChangedNote({ saved, current }: { saved: string | null; current: string }) {
  return (
    <span className="ev-diary-grid__changed">
      <WarningTriangleIcon aria-hidden="true" />
      <span>
        Puantaj değişti ({formatHours(toCenti(saved))}
        <span className="sr-only"> sa, şimdi </span>
        <ArrowRightIcon className="ev-diary-inline-arrow" aria-hidden="true" />
        {formatHours(toCenti(current))} sa), dağılımı gözden geçir
      </span>
    </span>
  );
}

/** İ:680 — ✓ 0 yeşil · eksi kırmızı · artı sarı. */
function RemainBadge({ value }: { value: Centi }) {
  const tone = value === 0 ? "ok" : value < 0 ? "over" : "under";
  return (
    <span className={cx("ev-diary-remain", `ev-diary-remain--${tone}`)}>
      {value === 0 ? (
        <>
          <CheckIcon aria-hidden="true" /> 0
        </>
      ) : (
        formatHours(value)
      )}
    </span>
  );
}

/** İ:689 — üst grup kolonunun PF'si yoktur: miktara göre ise "→ alt", doğrudan ise "—". */
function GroupPfCell({ rule }: { rule: AllocationRule }) {
  if (rule !== "prorata_by_daily_qty") return <span className="ev-diary-muted">{EMPTY_CELL}</span>;
  return (
    <span className="ev-diary-muted" title="Yapraklara bugünkü miktar payıyla dağılır">
      <ArrowRightIcon className="ev-diary-inline-arrow" aria-hidden="true" /> alt
    </span>
  );
}

function GridFoot({ view, draft, headers, bands, unallocated }: AllocationGridProps) {
  const totals = columnTotals(draft, view.rows);
  const leaves = new Map((view.progress?.leaves ?? []).map((leaf) => [leaf.node_id, leaf.pf_day]));
  return (
    <tfoot>
      <tr className="ev-diary-grid__total">
        <th scope="row" className="ev-diary-grid__lead">
          <span className="ev-diary-grid__foot-lead">
            <span>Toplam harcanan</span>
            <span className="ev-diary-mono">{formatHours(toCenti(view.totals.source_hours))}</span>
          </span>
        </th>
        {draft.codes.map((code) => (
          <td key={code.node_id} className="ev-diary-grid__num">{formatHours(totals[code.node_id] ?? 0)}</td>
        ))}
        <td className={cx("ev-diary-grid__remain ev-diary-grid__num", unallocated === 0 ? "ev-diary-tone--ok" : "ev-diary-tone--warn")}>
          {formatHours(unallocated)}
        </td>
      </tr>
      <tr className="ev-diary-grid__pf">
        <th scope="row" className="ev-diary-grid__lead">Bugün PF (kazanılmış ÷ harcanan)</th>
        {draft.codes.map((code) => (
          <td key={code.node_id} className="ev-diary-grid__num">
            {headers[code.node_id]?.isLeaf ? (
              <PfBadge value={leaves.get(code.node_id) ?? null} bands={bands} />
            ) : (
              <GroupPfCell rule={code.rule} />
            )}
          </td>
        ))}
        <td className="ev-diary-grid__remain" />
      </tr>
    </tfoot>
  );
}
