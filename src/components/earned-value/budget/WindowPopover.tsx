"use client";

import { useState } from "react";

import { AnchoredPopover, Button, DateInput } from "@/components/ui";
import { WarningTriangleIcon } from "@/components/ui/icons";
import { formatDateDots } from "@/lib/format";

import { PopoverHead } from "./AssignmentCells";
import type { GanttRow } from "./gantt-geometry";

interface WindowPopoverProps {
  row: GanttRow;
  sectionName: string;
  sectionStart: string | null;
  sectionEnd: string | null;
  onApply: (start: string, end: string) => void;
  onRevert: () => void;
  onClose: () => void;
}

function sectionRange(start: string | null, end: string | null): string {
  return start && end ? `${formatDateDots(start).slice(0, 5)} – ${formatDateDots(end)}` : "tarih yok";
}

/**
 * Disiplin × bölüm pencere ezmesi — Ek Formlar M3 (a): bölüm tarihi, başlangıç/
 * bitiş, dışına taşma UYARISI (F0-4: engel DEĞİL, Uygula açık kalır),
 * "Bölüm tarihine dön" (ezme varsa), Uygula/Vazgeç.
 */
export function WindowPopover({ row, sectionName, sectionStart, sectionEnd, onApply, onRevert, onClose }: WindowPopoverProps) {
  const [start, setStart] = useState(row.start ?? sectionStart ?? "");
  const [end, setEnd] = useState(row.end ?? sectionEnd ?? "");
  const valid = start !== "" && end !== "" && start <= end;
  const outside = valid && sectionStart !== null && sectionEnd !== null && (start < sectionStart || end > sectionEnd);
  const title = `${row.label} · ${sectionName} penceresi`;
  return (
    <AnchoredPopover label={title} onClose={onClose} className="ev-budget-pop ev-budget-window-pop">
      <PopoverHead title={title} onClose={onClose} />
      <dl className="ev-budget-pop__grid">
        <dt>Bölüm tarihi</dt>
        <dd className="ev-budget-mono">{sectionRange(sectionStart, sectionEnd)}</dd>
      </dl>
      <DateFields start={start} end={end} onStart={setStart} onEnd={setEnd} invalidEnd={outside || (start !== "" && end !== "" && !valid)} />
      {outside && (
        <div className="ev-budget-window-pop__warn" role="note">
          <span className="ev-budget-window-pop__warn-title">
            <WarningTriangleIcon width={12} height={12} aria-hidden="true" /> Pencere bölüm tarihinin dışına taşıyor (Bölüm:{" "}
            {sectionRange(sectionStart, sectionEnd)})
          </span>
          <span>Kaydedilebilir; yalnız uyarıdır.</span>
        </div>
      )}
      {row.override && (
        <Button variant="secondary" size="sm" onClick={onRevert}>
          Bölüm tarihine dön
        </Button>
      )}
      <div className="ev-budget-pop__actions">
        <Button size="sm" disabled={!valid} onClick={() => onApply(start, end)}>
          Uygula
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Vazgeç
        </Button>
      </div>
    </AnchoredPopover>
  );
}

interface DateFieldsProps {
  start: string;
  end: string;
  onStart: (iso: string) => void;
  onEnd: (iso: string) => void;
  invalidEnd: boolean;
}

function DateFields({ start, end, onStart, onEnd, invalidEnd }: DateFieldsProps) {
  return (
    <div className="ev-budget-window-pop__dates">
      <label className="ev-budget-field">
        <span className="ev-budget-field__label">Başlangıç</span>
        <DateInput size="row" value={start} onValueChange={onStart} aria-label="Pencere başlangıcı" />
      </label>
      <label className="ev-budget-field">
        <span className="ev-budget-field__label">Bitiş</span>
        <DateInput size="row" value={end} onValueChange={onEnd} aria-label="Pencere bitişi" status={invalidEnd ? "error" : "default"} />
      </label>
    </div>
  );
}
