"use client";

import { useState } from "react";

import { AnchoredPopover } from "@/components/ui/popover/AnchoredPopover";
import { Input } from "@/components/ui/input/Input";
import { Button } from "@/components/ui/button/Button";
import { CheckIcon, SearchIcon } from "@/components/ui/icons";
import type { EvCodeNode } from "@/lib/api/models";
import { cx } from "@/lib/cx";

import { pickerEntries, type PickerEntry } from "./code-tree";

export interface CodePickerPopoverProps {
  nodes: readonly EvCodeNode[] | undefined;
  isLoading: boolean;
  isError: boolean;
  selected: ReadonlySet<string>;
  onToggle: (node: EvCodeNode) => void;
  onClose: () => void;
  /** Yüzey sınıfına ek (tablet eylem çubuğunda yukarı açılış, F2.6). */
  className?: string;
}

/**
 * "+ İş kodu ekle" seçicisi — İ:404-423 (+ İ:636-641 davranışı): arama,
 * disiplin/kalem başlıkları, grup "(üst grup)" ve yaprak seçimi, oransız
 * yaprak PASİF "· oran yok" (K12; backend onu 422 ile reddeder).
 */
export function CodePickerPopover({ nodes, isLoading, isError, selected, onToggle, onClose, className }: CodePickerPopoverProps) {
  const [query, setQuery] = useState("");
  const entries = nodes ? pickerEntries(nodes, query, selected) : [];
  const byId = new Map((nodes ?? []).map((node) => [node.id, node]));
  return (
    <AnchoredPopover label="İş kodu ekle" onClose={onClose} className={cx("ev-diary-picker", className)}>
      <div className="ev-diary-picker__search">
        <Input
          size="row"
          aria-label="Kalem, bölüm veya kod ara"
          placeholder="Kalem, bölüm veya kod ara"
          leftIcon={<SearchIcon />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="ev-diary-picker__list" role="group" aria-label="İş kodları">
        {isLoading && <p className="ev-diary-picker__empty">Kod ağacı yükleniyor…</p>}
        {isError && <p className="ev-diary-picker__empty">Kod ağacı yüklenemedi.</p>}
        {!isLoading && !isError && entries.length === 0 && <p className="ev-diary-picker__empty">Eşleşen iş kodu yok.</p>}
        {entries.map((entry) => (
          <PickerRow key={entry.id} entry={entry} onToggle={() => {
            const node = byId.get(entry.id);
            if (node) onToggle(node);
          }} />
        ))}
      </div>
      <div className="ev-diary-picker__foot">
        <span>{selected.size} iş kodu seçili</span>
        <Button variant="ghost" size="sm" className="ev-diary-picker__done" onClick={onClose}>
          Tamam
        </Button>
      </div>
    </AnchoredPopover>
  );
}

function PickerRow({ entry, onToggle }: { entry: PickerEntry; onToggle: () => void }) {
  if (entry.kind === "discipline" || entry.kind === "item") {
    return (
      <div className={cx("ev-diary-picker__head", `ev-diary-picker__head--${entry.kind}`)}>
        <span>{entry.label}</span>
        <span className="ev-diary-picker__code">{entry.code}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={entry.selected}
      disabled={!entry.selectable}
      className={cx(
        "ev-diary-picker__row",
        `ev-diary-picker__row--${entry.kind}`,
        entry.selected && "ev-diary-picker__row--on",
        entry.noRate && "ev-diary-picker__row--norate",
      )}
      onClick={onToggle}
    >
      <span className="ev-diary-picker__box" aria-hidden="true">
        {entry.selected && <CheckIcon />}
      </span>
      <span className="ev-diary-picker__label">{entry.label}</span>
      <span className="ev-diary-picker__code">{entry.code}</span>
    </button>
  );
}
