"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button/Button";
import { Input } from "@/components/ui/input/Input";
import type { EvAllocationCode, EvCodeNode } from "@/lib/api/models";
import { cx } from "@/lib/cx";

import type { ColumnHeader } from "./code-tree";
import { CodePickerPopover } from "./CodePickerPopover";
import { parseHoursInput } from "./hours";

export interface AllocationToolbarProps {
  canEdit: boolean;
  codes: readonly EvAllocationCode[];
  headers: Readonly<Record<string, ColumnHeader>>;
  selectedCount: number;
  tree: { nodes: readonly EvCodeNode[] | undefined; isLoading: boolean; isError: boolean };
  onToggleCode: (node: EvCodeNode) => void;
  onCopyPrevious: () => void;
  isCopying: boolean;
  onDistribute: () => void;
  onBulkApply: (nodeId: string, text: string) => void;
  /** Geçersiz metinli hücre sayısı — kayıt (çekirdeğin tek düğmesi, S1) bunu reddeder. */
  invalidCount: number;
}

/** İ:403-445 — "+ İş kodu ekle" · "Dünkü dağılımı kopyala" · "Seçili kişilere toplu ata · n" · "Kalanı orantılı dağıt". */
export function AllocationToolbar(props: AllocationToolbarProps) {
  const [isBulkOpen, setBulkOpen] = useState(false);
  const { canEdit, selectedCount } = props;
  const canBulk = canEdit && selectedCount > 0;
  return (
    <>
      <div className="ev-diary-toolbar">
        <CodePickerButton {...props} />
        <Button variant="secondary" className="ev-diary-btn" disabled={!canEdit || props.isCopying} onClick={props.onCopyPrevious}>
          Dünkü dağılımı kopyala
        </Button>
        <Button
          variant="secondary"
          className={cx("ev-diary-btn", canBulk && "ev-diary-btn--bulk-on")}
          disabled={!canBulk}
          aria-expanded={isBulkOpen && canBulk}
          onClick={() => setBulkOpen((open) => !open)}
        >
          Seçili kişilere toplu ata · {selectedCount}
        </Button>
        <Button variant="secondary" className="ev-diary-btn" disabled={!canEdit} onClick={props.onDistribute}>
          Kalanı orantılı dağıt
        </Button>
        {canEdit && props.invalidCount > 0 && (
          <span className="ev-diary-toolbar__note ev-diary-tone--danger">{props.invalidCount} hücrede geçersiz değer</span>
        )}
      </div>
      {isBulkOpen && canBulk && (
        <BulkAssignPanel
          codes={props.codes}
          headers={props.headers}
          selectedCount={selectedCount}
          onApply={(nodeId, text) => {
            props.onBulkApply(nodeId, text);
            setBulkOpen(false);
          }}
        />
      )}
    </>
  );
}

/** İ:404-423 — "+ İş kodu ekle" ve açılır ağaç seçicisi. */
function CodePickerButton({ canEdit, codes, tree, onToggleCode }: AllocationToolbarProps) {
  const [isOpen, setOpen] = useState(false);
  return (
    <span className="ev-diary-toolbar__anchor">
      <Button
        variant="light-blue"
        className="ev-diary-btn ev-diary-btn--add"
        disabled={!canEdit}
        aria-expanded={isOpen}
        onClick={() => setOpen((open) => !open)}
      >
        + İş kodu ekle
      </Button>
      {isOpen && canEdit && (
        <CodePickerPopover
          {...tree}
          selected={new Set(codes.map((code) => code.node_id))}
          onToggle={onToggleCode}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}

interface BulkAssignPanelProps {
  codes: readonly EvAllocationCode[];
  headers: Readonly<Record<string, ColumnHeader>>;
  selectedCount: number;
  onApply: (nodeId: string, text: string) => void;
}

/** İ:425-431 — seçili kişi sayısı · iş kodu çipleri · saat · Uygula. */
function BulkAssignPanel({ codes, headers, selectedCount, onApply }: BulkAssignPanelProps) {
  const [nodeId, setNodeId] = useState<string | null>(codes[0]?.node_id ?? null);
  const [hours, setHours] = useState("");
  const parsed = parseHoursInput(hours);
  const canApply = nodeId !== null && hours.trim() !== "" && parsed !== null;
  return (
    <div className="ev-diary-bulk" role="group" aria-label="Toplu atama">
      <b>{selectedCount} kişi</b>
      <span className="ev-diary-muted">iş kodu:</span>
      {codes.map((code) => (
        <button
          key={code.node_id}
          type="button"
          aria-pressed={nodeId === code.node_id}
          className={cx("ev-diary-bulk__chip", nodeId === code.node_id && "ev-diary-bulk__chip--on")}
          onClick={() => setNodeId(code.node_id)}
        >
          {headers[code.node_id]?.short ?? code.node_id}
        </button>
      ))}
      <Input
        size="row"
        numeric
        inputMode="decimal"
        aria-label="Toplu atanacak saat"
        placeholder="saat"
        wrapperClassName="ev-diary-bulk__hours"
        status={parsed === null ? "error" : "default"}
        value={hours}
        onChange={(event) => setHours(event.target.value)}
      />
      <Button size="sm" className="ev-diary-bulk__apply" disabled={!canApply} onClick={() => nodeId && onApply(nodeId, hours)}>
        Uygula
      </Button>
    </div>
  );
}
