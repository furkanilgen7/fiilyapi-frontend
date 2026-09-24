"use client";

import { useRef } from "react";

import { Button, Input } from "@/components/ui";
import { XIcon } from "@/components/ui/icons";
import { formatUnitRate } from "@/lib/earned-value";
import { EMPTY_CELL } from "@/lib/format";
import { useEvItemSuggestions } from "@/lib/api/hooks/useEvBudget";
import { useSyncedFieldState } from "@/lib/hooks/useSyncedFieldState";

import { formatRateInput, leafLabel } from "./budget-format";
import type { ItemOut, LeafOut } from "./budget-tree";
import type { LeafDiffMark } from "./diff-rows";

export type SuggestionSource = "catalog" | "history";

/** Seçilen öneri: oran + kaynak + önerinin katalog kalemi (bağ yalnız KATALOG seçiminde kurulur). */
export interface PickedSuggestion {
  rate: string;
  source: SuggestionSource;
  catalogItemId: string;
}

interface RateCellProps {
  siteId: string;
  item: ItemOut;
  leaf: LeafOut;
  editable: boolean;
  mark: LeafDiffMark | undefined;
  suggestionOpen: boolean;
  onOpenSuggestion: () => void;
  onCloseSuggestion: () => void;
  /** Ham metin — gövdeyi `rateCommit` üretir. */
  onCommit: (raw: string) => void;
  onUseSuggestion: (picked: PickedSuggestion) => void;
}

/**
 * Yaprak oran hücresi — Adam-Saat Bütçesi.dc.html:239-257 (girdi + öneri
 * popover'ı), :630-631 (boş oran: kırmızı kenar, "Oran girilmedi").
 * Kaydetme ODAKTAN ÇIKINCA (on-blur) — yazarken istek atılmaz; sunucu
 * değeri `useSyncedFieldState` ile odak dışındayken senkronlanır.
 * Salt okunurda düz metin (BÜT:488 "Oran hücreleri düz metin").
 */
export function RateCell(props: RateCellProps) {
  const { item, leaf, editable, mark } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useSyncedFieldState(
    formatRateInput(leaf.unit_mhr),
    () => typeof document !== "undefined" && document.activeElement === inputRef.current,
  );
  const label = `${item.description} · ${leafLabel(leaf)} birim oran`;
  const oldRate = mark?.rateChanged ? <span className="ev-budget-old">{mark.oldRateShort}</span> : null;

  if (!editable) {
    const value = leaf.unit_mhr === null ? EMPTY_CELL : formatRateInput(leaf.unit_mhr);
    return <span className="ev-budget-rate">{oldRate}<span className="ev-budget-rate__text">{value}</span></span>;
  }
  return (
    <span className="ev-budget-rate">
      {oldRate}
      <Input
        ref={inputRef}
        size="row"
        numeric
        inputMode="decimal"
        aria-label={label}
        placeholder="Oran girilmedi"
        status={leaf.unit_mhr === null ? "error" : "default"}
        className="ev-budget-rate__input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onFocus={props.onOpenSuggestion}
        onBlur={() => props.onCommit(text)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") props.onCloseSuggestion();
        }}
      />
      {props.suggestionOpen && (
        <SuggestionPopover
          siteId={props.siteId}
          item={item}
          leaf={leaf}
          onClose={props.onCloseSuggestion}
          onUse={props.onUseSuggestion}
        />
      )}
    </span>
  );
}

interface SuggestionPopoverProps {
  siteId: string;
  item: ItemOut;
  leaf: LeafOut;
  onClose: () => void;
  onUse: (picked: PickedSuggestion) => void;
}

/**
 * BÜT:244-256 — "Katalog" + "Son 3 şantiye gerçekleşen" ve iki düğme.
 * `AnchoredPopover` KULLANILMADI: o bileşen açılınca odağı ilk düğmeye taşır,
 * oysa bu popover oran girdisi ODAKTAYKEN açılır (BÜT:639 `onFocus`) —
 * odak çalınsa kullanıcı yazamazdı. Kapatma: ×, seçim ya da Escape.
 * Düğmeye basış girdiyi ÖNCE bulandırır (on-blur kaydı yazılan metni
 * işler), öneri SONRA yazılır — sıra bilerek korunur.
 */
function SuggestionPopover({ siteId, item, leaf, onClose, onUse }: SuggestionPopoverProps) {
  const suggestions = useEvItemSuggestions(siteId, item.item_id);
  const catalog = suggestions.data?.catalog[0] ?? null;
  const history = suggestions.data?.history[0] ?? null;
  const unit = `a-s/${item.uom}`;
  const title = `${item.description} · ${leafLabel(leaf)} öneri`;
  return (
    <div className="ev-budget-pop ev-budget-suggest" role="dialog" aria-label={title}>
      <div className="ev-budget-pop__head">
        <span className="ev-budget-pop__title">{title}</span>
        <button type="button" className="ev-budget-pop__close" aria-label="Öneriyi kapat" onClick={onClose}>
          <XIcon width={12} height={12} aria-hidden="true" />
        </button>
      </div>
      <dl className="ev-budget-pop__grid">
        <dt>Katalog</dt>
        <dd className="ev-budget-mono">{catalog ? `${formatUnitRate(catalog.standard_unit_mhr)} ${unit}` : EMPTY_CELL}</dd>
        <dt>Son 3 şantiye gerçekleşen</dt>
        <dd className="ev-budget-mono ev-budget-pop__strong">
          {history ? `${formatUnitRate(history.standard_unit_mhr)} ${unit}` : EMPTY_CELL}
        </dd>
      </dl>
      <div className="ev-budget-pop__actions">
        <Button
          size="sm"
          className="ev-budget-pop__grow"
          disabled={history === null}
          onClick={() => history && onUse({ rate: history.standard_unit_mhr, source: "history", catalogItemId: history.catalog_item_id })}
        >
          Gerçekleşeni kullan
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={catalog === null}
          onClick={() => catalog && onUse({ rate: catalog.standard_unit_mhr, source: "catalog", catalogItemId: catalog.catalog_item_id })}
        >
          Katalog
        </Button>
      </div>
    </div>
  );
}
