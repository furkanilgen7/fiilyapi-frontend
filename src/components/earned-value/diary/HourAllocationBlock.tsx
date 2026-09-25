"use client";

import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { ClockIcon, UserIcon, WarningTriangleIcon } from "@/components/ui/icons";
import type { EvCodeNode, EvDayRow, EvDayView } from "@/lib/api/models";
import { cx } from "@/lib/cx";
import type { PfBandSettings } from "@/lib/earned-value";

import { keyOfRow, setCell, setReason, setRule, stripValues, toggleCode, type AllocationDraft, type RowKey } from "./allocation-model";
import { AllocationCell } from "./AllocationCell";
import { AllocationGrid } from "./AllocationGrid";
import { AllocationStrip } from "./AllocationStrip";
import { AllocationToolbar } from "./AllocationToolbar";
import { buildCodeIndex, columnHeader, defaultRuleFor, type ColumnHeader } from "./code-tree";
import { SubmitCheckBar } from "./SubmitCheckBar";
import type { AllocationAccess, SubmitState } from "./submit-checks";
import { useAllocationActions, type Flash } from "./useAllocationActions";

export type DraftUpdater = (update: (draft: AllocationDraft) => AllocationDraft) => void;

export interface HourAllocationBlockProps {
  siteId: string;
  day: string;
  view: EvDayView;
  codeTree: UseQueryResult<EvCodeNode[], Error>;
  bands: PfBandSettings;
  access: AllocationAccess;
  draft: AllocationDraft;
  isDirty: boolean;
  invalidCount: number;
  onDraftChange: DraftUpdater;
  submitState: SubmitState;
}

/**
 * Çekirdeğin `fullWidthBlock` yuvası — Saat Dağıtımı kartı (İ:386-491) +
 * Gönder kontrol çubuğu (İ:493-510). Taslak adaptörde durur (Gönder kapısı
 * onu bilmeli); burada yalnız ekran-içi durum (seçim, bildirim) var.
 */
export function HourAllocationBlock(props: HourAllocationBlockProps) {
  const { view, draft, access, onDraftChange } = props;
  const [selected, setSelected] = useState<ReadonlySet<RowKey>>(new Set());
  const actions = useAllocationActions({ ...props, selected, clearSelection: () => setSelected(new Set()) });
  const headers = buildHeaders(draft, view, props.codeTree.data);
  const strip = stripValues(view, draft, props.isDirty);
  return (
    <div className="ev-diary-block">
      {access.showForemanBand && <ForemanBand />}
      <section className={cx("ev-diary-alloc", access.isForeman && "ev-diary-alloc--faded")} aria-labelledby="ev-diary-alloc-title">
        <AllocationHead strip={strip} />
        {access.readOnlyText && <p className="ev-diary-alloc__ro">Salt okunur · {access.readOnlyText}</p>}
        <Warnings items={view.warnings} />
        <FlashLine flash={actions.flash} />
        <AllocationToolbar
          canEdit={access.canEdit}
          codes={draft.codes}
          headers={headers}
          selectedCount={selected.size}
          tree={{ nodes: props.codeTree.data, isLoading: props.codeTree.isLoading, isError: props.codeTree.isError }}
          onToggleCode={(node) => onDraftChange((d) => toggleCode(d, node.id, defaultRuleFor(node)))}
          onCopyPrevious={() => void actions.copyPrevious()}
          isCopying={actions.isCopying}
          onDistribute={actions.distribute}
          onBulkApply={(nodeId, text) => actions.bulkApply(nodeId, text, headers[nodeId]?.short ?? nodeId)}
          save={{ isDirty: props.isDirty, isSaving: actions.isSaving, invalidCount: props.invalidCount, onSave: () => void actions.save() }}
        />
        <GridSection
          {...props}
          headers={headers}
          unallocated={strip.unallocated}
          selected={selected}
          onToggleSelect={(key) => setSelected((prev) => toggleKey(prev, key))}
        />
      </section>
      <SubmitCheckBar
        state={props.submitState}
        reason={draft.reason}
        canEditReason={access.canEdit}
        onReasonChange={(reason) => onDraftChange((d) => setReason(d, reason))}
      />
    </div>
  );
}

interface GridSectionProps extends HourAllocationBlockProps {
  headers: Record<string, ColumnHeader>;
  unallocated: number;
  selected: ReadonlySet<RowKey>;
  onToggleSelect: (key: RowKey) => void;
}

/** Izgara ya da (kolon yokken) boş hâl. Hücreler `AllocationCell` (useSyncedFieldState). */
function GridSection({ view, draft, access, onDraftChange, headers, ...rest }: GridSectionProps) {
  if (draft.codes.length === 0) {
    return <p className="ev-diary-alloc__empty">Henüz iş kodu seçilmedi — “+ İş kodu ekle” ile kolon açın.</p>;
  }
  const renderCell = (row: EvDayRow, nodeId: string) => (
    <AllocationCell
      text={draft.cells[keyOfRow(row)]?.[nodeId] ?? ""}
      label={`${row.label} · ${headers[nodeId]?.short ?? nodeId} saati`}
      disabled={!access.canEdit}
      onChange={(text) => onDraftChange((d) => setCell(d, keyOfRow(row), nodeId, text))}
    />
  );
  return (
    <AllocationGrid
      view={view}
      draft={draft}
      headers={headers}
      bands={rest.bands}
      canEdit={access.canEdit}
      unallocated={rest.unallocated}
      selected={rest.selected}
      onToggleSelect={rest.onToggleSelect}
      onToggleRule={(nodeId) => onDraftChange((d) => flipRule(d, nodeId))}
      renderCell={renderCell}
    />
  );
}

function buildHeaders(draft: AllocationDraft, view: EvDayView, nodes: readonly EvCodeNode[] | undefined): Record<string, ColumnHeader> {
  const index = buildCodeIndex(nodes ?? []);
  const labels = new Map(view.codes.map((code) => [code.node_id, code]));
  return Object.fromEntries(
    draft.codes.map((code) => {
      const header = columnHeader(code.node_id, index, labels.get(code.node_id)?.label ?? null);
      // Ağaç henüz gelmediyse düzey bilgisi backend'in `CodeOut.level`inden.
      const level = labels.get(code.node_id)?.level;
      return [code.node_id, nodes === undefined && level != null ? { ...header, isLeaf: level === 4 } : header];
    }),
  );
}

function flipRule(draft: AllocationDraft, nodeId: string): AllocationDraft {
  const current = draft.codes.find((code) => code.node_id === nodeId)?.rule;
  return setRule(draft, nodeId, current === "direct" ? "prorata_by_daily_qty" : "direct");
}

function toggleKey(prev: ReadonlySet<RowKey>, key: RowKey): ReadonlySet<RowKey> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** İ:388-398 — başlık (⏱ yerine SVG saat) + YENİ çipi + alt metin + 4'lü şerit. */
function AllocationHead({ strip }: { strip: ReturnType<typeof stripValues> }) {
  return (
    <div className="ev-diary-alloc__head">
      <div className="ev-diary-alloc__title-wrap">
        <h2 id="ev-diary-alloc-title" className="ev-diary-alloc__title">
          <ClockIcon aria-hidden="true" /> Saat Dağıtımı <span className="ev-diary-chip">YENİ</span>
        </h2>
        <p className="ev-diary-alloc__subtitle">
          Mühendisin bölümü · günün bütün saatleri iş kodlarına bölünür, harcanan a-s buradan gelir
        </p>
      </div>
      <AllocationStrip values={strip} />
    </div>
  );
}

/** İ:150-155 formen bandı — metin §3.14 G10 (Ek Formlar "(e)"); 👷 yerine SVG. */
function ForemanBand() {
  return (
    <div className="ev-diary-foreman" role="note">
      <UserIcon aria-hidden="true" />
      <span>
        <b>Formen görünümü.</b> Miktar satırları, işçi / taşeron sayıları ve hava düzenlenebilir; Saat
        Dağıtımı mühendis tarafından doldurulur. Gönderim mühendiste.
      </span>
    </div>
  );
}

function Warnings({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="ev-diary-alloc__warnings">
      {items.map((text) => (
        <li key={text}>
          <WarningTriangleIcon aria-hidden="true" /> {text}
        </li>
      ))}
    </ul>
  );
}

/** İ:156-158 bildirim — canlı bölge hep DOM'da (BudgetFlash deseni). */
function FlashLine({ flash }: { flash: Flash | null }) {
  return (
    <div role="status" aria-live="polite" className="ev-diary-flash-slot">
      {flash && <p className={cx("ev-diary-flash", `ev-diary-flash--${flash.tone}`)}>{flash.message}</p>}
    </div>
  );
}
