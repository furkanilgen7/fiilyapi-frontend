"use client";

import { useState, type ReactNode } from "react";

import { Checkbox } from "@/components/ui";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";

import {
  initialExpanded,
  selectionState,
  toggleExpanded,
  toggleSelection,
  visibleRows,
  type DefaultExpanded,
  type SelectionState,
  type TreeNode,
  type VisibleRow,
} from "./tree-rows";
import "./tree-table.css";

/**
 * PLN-F1.2 · Planlama modülünün çok seviyeli aç/kapa ağaç tablosu.
 *
 * Kaynaklar (seviye stilleri `tree-table.css` içinde varyant başına):
 *   panel    — Planlama - Panel.dc.html:348-396, 512-542 (disiplin ▸ iş tipi)
 *   budget   — Planlama - Adam-Saat Bütçesi.dc.html:205-271, 601-643 (4 seviye + seçim)
 *   progress — Planlama - Günlük İlerleme Raporu.dc.html:231-271, 480-492 (L1/L2/L3)
 *   qurr     — Planlama - Haftalık QURR.dc.html:152-202, 330-343 (gruplu başlık)
 *
 * SEMANTİK: native `<table>` + `<tr aria-level>`; `role="treegrid"` DEĞİL.
 * treegrid, ok tuşlarıyla hücre/satır gezinmesi + roving tabindex
 * sözleşmesi ister (APG); o klavye modeli kurulmadan rolü ilan etmek ekran
 * okuyucuya YANLIŞ bir etkileşim vaadi verir. Tablo semantiği (satır/kolon
 * başlıkları) korunur; hiyerarşi `aria-level` + chevron düğmesinin
 * `aria-expanded`ı ile duyurulur, klavye erişimi native `<button>` ile gelir.
 */

export type TreeTableVariant = "panel" | "budget" | "progress" | "qurr";

export interface TreeTableColumn<T> {
  key: string;
  header: ReactNode;
  /** Varsayılan `"left"`. */
  align?: "left" | "right";
  /** Sayı kolonları: JetBrains Mono (mockup'ların bütün sayı hücreleri). */
  mono?: boolean;
  /** Girinti + chevron bu kolonda. Hiçbirinde yoksa İLK kolon. */
  tree?: boolean;
  /** Başlık ve gövde hücresine eklenir (ör. QURR'un yapışkan kolonları). */
  className?: string;
  render: (node: TreeNode<T>, depth: number) => ReactNode;
}

export interface TreeTableHeaderGroup {
  key: string;
  label: ReactNode;
  /** Kapsadığı VERİ kolonu sayısı (seçim kolonu sayılmaz, ayrıca eklenir). */
  span: number;
  className?: string;
}

export interface TreeTableProps<T> {
  nodes: readonly TreeNode<T>[];
  columns: readonly TreeTableColumn<T>[];
  /** Chevron ("X aç/kapat") ve seçim ("X seç") erişilebilir adları için. */
  getLabel: (node: TreeNode<T>) => string;
  variant: TreeTableVariant;
  ariaLabel: string;
  emptyText: ReactNode;
  className?: string;

  /** Varsayılan `"none"`. Yalnız kontrolsüz modda okunur. */
  defaultExpanded?: DefaultExpanded;
  /** Kontrollü açık küme; verilirse `onExpandedChange` ile güncellenmelidir. */
  expanded?: ReadonlySet<string>;
  onExpandedChange?: (next: Set<string>) => void;
  /** `false` → chevron yok, ağaç tamamen açık (Günlük Rapor, QURR). Varsayılan `true`. */
  collapsible?: boolean;

  selectable?: boolean;
  /** Seçili YAPRAK kimlikleri (kontrollü). Üst durumlar türetilir. */
  selected?: ReadonlySet<string>;
  onSelectedChange?: (next: Set<string>) => void;
  selectionDisabled?: boolean;

  /** QURR.dc.html:161-167 — kolon gruplarının üst başlık satırı. */
  headerGroups?: readonly TreeTableHeaderGroup[];
  /** Günlük Rapor 237 — başlık satırında ad hücresi `span 9`: ağaç hücresinin colSpan'ı. */
  treeCellColSpan?: (node: TreeNode<T>, depth: number) => number;
  rowClassName?: (node: TreeNode<T>, depth: number) => string | undefined;
}

const EMPTY: ReadonlySet<string> = new Set();

function useControllable(
  value: ReadonlySet<string> | undefined,
  onChange: ((next: Set<string>) => void) | undefined,
  initial: () => ReadonlySet<string>,
): [ReadonlySet<string>, (next: Set<string>) => void] {
  const [inner, setInner] = useState<ReadonlySet<string>>(initial);
  const isControlled = value !== undefined;
  const set = (next: Set<string>) => {
    if (!isControlled) setInner(next);
    onChange?.(next);
  };
  return [isControlled ? value : inner, set];
}

function SelectionCheckbox({
  state,
  label,
  disabled,
  onToggle,
}: {
  state: SelectionState;
  label: string;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Checkbox
      size="lg"
      aria-label={label}
      checked={state === "checked"}
      indeterminate={state === "indeterminate"}
      disabled={disabled}
      onChange={onToggle}
    />
  );
}

function cellClass<T>(column: TreeTableColumn<T>, extra?: string): string {
  return cx(
    "tree-table__cell",
    column.align === "right" && "tree-table__cell--right",
    column.mono && "tree-table__cell--mono",
    column.className,
    extra,
  );
}

export function TreeTable<T>({
  nodes,
  columns,
  getLabel,
  variant,
  ariaLabel,
  emptyText,
  className,
  defaultExpanded = "none",
  expanded: expandedProp,
  onExpandedChange,
  collapsible = true,
  selectable = false,
  selected: selectedProp,
  onSelectedChange,
  selectionDisabled = false,
  headerGroups,
  treeCellColSpan,
  rowClassName,
}: TreeTableProps<T>) {
  const [expandedState, setExpanded] = useControllable(expandedProp, onExpandedChange, () =>
    initialExpanded(nodes, defaultExpanded),
  );
  const [selected, setSelected] = useControllable(selectedProp, onSelectedChange, () => EMPTY);

  const expanded = collapsible ? expandedState : initialExpanded(nodes, "all");
  const rows = visibleRows(nodes, expanded);
  const treeIndex = Math.max(
    0,
    columns.findIndex((c) => c.tree),
  );
  const totalColumns = columns.length + (selectable ? 1 : 0);

  const renderTreeCell = (row: VisibleRow<T>, column: TreeTableColumn<T>, span: number) => {
    const label = getLabel(row.node);
    return (
      <th
        key={column.key}
        scope="row"
        colSpan={span > 1 ? span : undefined}
        className={cellClass(column, "tree-table__tree-cell")}
      >
        <span className="tree-table__tree-inner">
          {collapsible && row.hasChildren && (
            <button
              type="button"
              className="tree-table__toggle"
              aria-expanded={row.expanded}
              aria-label={`${label} aç/kapat`}
              onClick={() => setExpanded(toggleExpanded(expandedState, row.id))}
            >
              <ChevronDownIcon
                width={10}
                height={10}
                aria-hidden="true"
                className={cx(
                  "tree-table__chevron",
                  !row.expanded && "tree-table__chevron--collapsed",
                )}
              />
            </button>
          )}
          <span className="tree-table__label">{column.render(row.node, row.depth)}</span>
        </span>
      </th>
    );
  };

  const renderCells = (row: VisibleRow<T>) => {
    const cells: ReactNode[] = [];
    let skip = 0;
    columns.forEach((column, index) => {
      if (skip > 0) {
        skip -= 1;
        return;
      }
      if (index === treeIndex) {
        const span = Math.max(1, Math.min(treeCellColSpan?.(row.node, row.depth) ?? 1, columns.length - index));
        skip = span - 1;
        cells.push(renderTreeCell(row, column, span));
        return;
      }
      cells.push(
        <td key={column.key} className={cellClass(column)}>
          {column.render(row.node, row.depth)}
        </td>,
      );
    });
    return cells;
  };

  return (
    <table
      className={cx("tree-table", `tree-table--${variant}`, className)}
      aria-label={ariaLabel}
    >
      <thead>
        {headerGroups && headerGroups.length > 0 && (
          <tr className="tree-table__group-row">
            {selectable && <th className="tree-table__group-head" aria-hidden="true" />}
            {headerGroups.map((group) => (
              <th
                key={group.key}
                scope="colgroup"
                colSpan={group.span}
                className={cx("tree-table__group-head", group.className)}
              >
                {group.label}
              </th>
            ))}
          </tr>
        )}
        <tr className="tree-table__head-row">
          {selectable && (
            <td className="tree-table__cell tree-table__select-cell" aria-hidden="true" />
          )}
          {columns.map((column) => (
            <th key={column.key} scope="col" className={cellClass(column, "tree-table__head")}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={totalColumns} className="tree-table__empty">
              {emptyText}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              aria-level={row.depth + 1}
              className={cx(
                "tree-table__row",
                `tree-table__row--level-${row.depth}`,
                row.hasChildren ? "tree-table__row--branch" : "tree-table__row--leaf",
                rowClassName?.(row.node, row.depth),
              )}
            >
              {selectable && (
                <td className="tree-table__cell tree-table__select-cell">
                  <SelectionCheckbox
                    state={selectionState(row.node, selected)}
                    label={`${getLabel(row.node)} seç`}
                    disabled={selectionDisabled}
                    onToggle={() => setSelected(toggleSelection(selected, row.node))}
                  />
                </td>
              )}
              {renderCells(row)}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
