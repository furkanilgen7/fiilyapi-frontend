"use client";

import { useState, type ReactNode } from "react";

import { AnchoredPopover, Button, Segmented } from "@/components/ui";
import { ChevronDownIcon, XIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import { EMPTY_CELL } from "@/lib/format";

import type { DisciplineOption } from "./budget-tree";

/**
 * PLN-F1.6 · Ek Formlar M1 (grup → disiplin seçici) ve M2 (iş tipi
 * Kendi/Taşeron · Doğrudan/Dolaylı seçicileri + yaprak ezmesi).
 * Rozet renkleri Adam-Saat Bütçesi.dc.html:594-595; seçici düğmesi Ek Formlar
 * `.ownbtn` (:46), açılır liste `.dd`/`.dd-o` (:57-58), popover `.pop` (:60).
 * Disiplin renkleri VERİDİR (`style` ile), token değildir.
 */

export type BadgeTone = "own" | "subcon" | "direct" | "indirect";

export interface AssignmentOption<V extends string> {
  value: V;
  label: string;
  sub?: string;
  tone: BadgeTone;
}

/**
 * Açıkken tetikleyiciye basış `AnchoredPopover`ın "dışarı tıklandı" kapanışına
 * ulaşmasın — yoksa mousedown kapatır, click yeniden açardı (düğme kapatamazdı).
 */
export function stopWhenOpen(open: boolean) {
  return (event: React.MouseEvent) => {
    if (open) event.stopPropagation();
  };
}

function Swatch({ color }: { color: string }) {
  return <span className="ev-budget-swatch" style={{ background: color }} aria-hidden="true" />;
}

interface GroupDisciplinePickerProps {
  groupName: string;
  current: DisciplineOption | null;
  options: readonly DisciplineOption[];
  editable: boolean;
  onPick: (disciplineId: string) => void;
}

const CONTRACTOR_LABEL = { own: "Kendi", subcon: "Taşeron" } as const;

/** M1 (a) — "DİSİPLİN · Seçilmedi ▾"; boşken kırmızı kenar (BÜT:631 deseni). */
export function GroupDisciplinePicker({ groupName, current, options, editable, onPick }: GroupDisciplinePickerProps) {
  const [open, setOpen] = useState(false);
  if (!editable) return <DisciplineText current={current} />;
  return (
    <span className="ev-budget-anchor">
      <button
        type="button"
        className={cx("ev-budget-disc-btn", current === null && "ev-budget-disc-btn--empty")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${groupName} disiplini: ${current?.name ?? "Seçilmedi"}`}
        onMouseDown={stopWhenOpen(open)}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ev-budget-disc-btn__caption">Disiplin</span>
        {current && <Swatch color={current.color} />}
        <span className="ev-budget-disc-btn__value">{current?.name ?? "Seçilmedi"}</span>
        <ChevronDownIcon width={12} height={12} aria-hidden="true" />
      </button>
      {open && (
        <AnchoredPopover label={`${groupName} için disiplin seç`} onClose={() => setOpen(false)} className="ev-budget-dd ev-budget-disc-menu" escapeOverflow>
          {options.length === 0 && <p className="ev-budget-dd__empty">Disiplin listesi boş.</p>}
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cx("ev-budget-disc-option", option.id === current?.id && "ev-budget-dd__option--selected")}
              onClick={() => {
                setOpen(false);
                if (option.id !== current?.id) onPick(option.id);
              }}
            >
              <Swatch color={option.color} />
              <span className="ev-budget-disc-option__name">{option.name}</span>
              <span className="ev-budget-disc-option__default">{CONTRACTOR_LABEL[option.defaultContractorType]}</span>
            </button>
          ))}
        </AnchoredPopover>
      )}
    </span>
  );
}

/** M1 (d) — donmuş revizyonda seçici düz metindir. */
function DisciplineText({ current }: { current: DisciplineOption | null }) {
  if (!current) return <span className="ev-budget-subtle">{EMPTY_CELL}</span>;
  return (
    <span className="ev-budget-disc-text">
      <Swatch color={current.color} />
      {current.name}
    </span>
  );
}

interface AssignmentPickerProps<V extends string> {
  ariaLabel: string;
  value: V;
  options: readonly AssignmentOption<V>[];
  editable: boolean;
  onPick: (value: V) => void;
}

function optionOf<V extends string>(options: readonly AssignmentOption<V>[], value: V) {
  return options.find((o) => o.value === value) ?? options[0];
}

/** M2 (a) — iş tipi (L3) rozeti tıklanabilir seçiciye döner; salt okunurda düz rozet (M2 d). */
export function AssignmentPicker<V extends string>({ ariaLabel, value, options, editable, onPick }: AssignmentPickerProps<V>) {
  const [open, setOpen] = useState(false);
  const current = optionOf(options, value);
  if (!editable) return <span className={cx("ev-budget-chip", `ev-budget-chip--${current.tone}`)}>{current.label}</span>;
  return (
    <span className="ev-budget-anchor">
      <button
        type="button"
        className={cx("ev-budget-chip", "ev-budget-chip--button", `ev-budget-chip--${current.tone}`)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${current.label}`}
        onMouseDown={stopWhenOpen(open)}
        onClick={() => setOpen((v) => !v)}
      >
        {current.label}
        <ChevronDownIcon width={10} height={10} aria-hidden="true" />
      </button>
      {open && (
        <AnchoredPopover label={ariaLabel} onClose={() => setOpen(false)} className="ev-budget-dd ev-budget-assign-menu" escapeOverflow>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cx("ev-budget-dd__option", option.value === value && "ev-budget-dd__option--selected")}
              onClick={() => {
                setOpen(false);
                if (option.value !== value) onPick(option.value);
              }}
            >
              <span className="ev-budget-dd__label">{option.label}</span>
              {option.sub && <span className="ev-budget-dd__sub">{option.sub}</span>}
            </button>
          ))}
        </AnchoredPopover>
      )}
    </span>
  );
}

interface LeafOverrideProps<V extends string> {
  title: string;
  value: V;
  itemValue: V;
  overridden: boolean;
  options: readonly AssignmentOption<V>[];
  editable: boolean;
  onPick: (value: V) => void;
}

/**
 * M2 (b) — yaprak rozeti: miras soluk (BÜT:633 opacity .55), ezilmiş tam renk +
 * turuncu nokta. Tıklayınca "İş tipi değeri / Bu satır" popover'ı; "Ezmeyi geri al".
 */
export function LeafOverrideBadge<V extends string>(props: LeafOverrideProps<V>) {
  const { title, value, overridden, options, editable } = props;
  const [open, setOpen] = useState(false);
  const current = optionOf(options, value);
  const chip = cx("ev-budget-chip", `ev-budget-chip--${current.tone}`, !overridden && "ev-budget-chip--inherited");
  const dot = overridden ? <span className="ev-budget-override-dot" aria-label="ezildi" /> : null;
  if (!editable) {
    return (
      <span className="ev-budget-leaf-assign">
        <span className={chip}>{current.label}</span>
        {dot}
      </span>
    );
  }
  return (
    <span className="ev-budget-anchor ev-budget-leaf-assign">
      <button type="button" className={cx(chip, "ev-budget-chip--button")} aria-haspopup="dialog" aria-expanded={open} aria-label={`${title}: ${current.label}`} onMouseDown={stopWhenOpen(open)} onClick={() => setOpen((v) => !v)}>
        {current.label}
      </button>
      {dot}
      {open && <LeafOverridePopover {...props} onClose={() => setOpen(false)} />}
    </span>
  );
}

function LeafOverridePopover<V extends string>(props: LeafOverrideProps<V> & { onClose: () => void }) {
  const { title, value, itemValue, overridden, options, onPick, onClose } = props;
  const itemLabel = optionOf(options, itemValue).label;
  const pick = (next: V) => {
    onClose();
    onPick(next);
  };
  return (
    <AnchoredPopover label={title} onClose={onClose} className="ev-budget-pop" escapeOverflow>
      <PopoverHead title={title} onClose={onClose} />
      <dl className="ev-budget-pop__grid">
        <dt>İş tipi değeri</dt>
        <dd>{itemLabel}</dd>
        <dt>Bu satır</dt>
        <dd className={cx(overridden && "ev-budget-pop__overridden")}>
          {optionOf(options, value).label} · {overridden ? "ezildi" : "miras"}
        </dd>
      </dl>
      <Segmented
        size="sm"
        fill
        aria-label={title}
        value={value}
        onChange={pick}
        options={options.map((o) => ({ value: o.value, label: o.label }))}
      />
      {overridden && (
        <Button variant="secondary" size="sm" onClick={() => pick(itemValue)}>
          Ezmeyi geri al ({itemLabel})
        </Button>
      )}
    </AnchoredPopover>
  );
}

export function PopoverHead({ title, onClose }: { title: ReactNode; onClose: () => void }) {
  return (
    <div className="ev-budget-pop__head">
      <span className="ev-budget-pop__title">{title}</span>
      <button type="button" className="ev-budget-pop__close" aria-label="Kapat" onClick={onClose}>
        <XIcon width={12} height={12} aria-hidden="true" />
      </button>
    </div>
  );
}
