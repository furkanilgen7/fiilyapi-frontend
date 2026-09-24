"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { XIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import type { BoqItem } from "@/lib/api/hooks/useBoq";
import { EMPTY_CELL } from "@/lib/format";
import { cx } from "@/lib/cx";

import { ChipToggleGroup } from "./ChipToggleGroup";
import { SettingsSection } from "./SettingsSection";
import { nextDraftKey, type CompositeMeasure, type MetricDraft } from "./settings-form";

/**
 * Paçal metrikler kartı — Ayarlar - Planlama.dc.html (AYP):178-215 (liste + açık
 * düzenleyici) · Ek:210-223 (kapalı hâl + "+ Yeni paçal metrik").
 *
 * K25: metrik TEK ölçü taşır (spent | earned | budget). Pay = BOQ kalemleri
 * (iş tipleri) toplamı, payda = tek kalemin miktarı; kalemler şantiye BOQ'sundan.
 *
 * ⚠️ Mockup satırda "5,42 / 5,29" (gerçekleşen / planlı) ve düzenleyicide
 * "Canlı değer" basar (AYP:183 · :204). Bu değerler ayar ucunda YOK (QURR
 * hesabı, F3) → satırda EMPTY_CELL, düzenleyicide canlı değer satırı basılmaz.
 *
 * "Sil" (CEO kararı b — mockup'ta yok): aynı ekrandaki tatil satırı ×/Sil
 * deseni (Ek:146). PUT tam değiştirme olduğu için silme yalnız TASLAKTAN
 * çıkarır, kirli sayacı artar, Kaydet'e kadar kalıcı değildir. Salt okunurda
 * düğme HİÇ basılmaz (Ek:146'daki tatil ×'i yalnız kapanır — burada karar gereği gizli).
 */
const MEASURE_OPTIONS: ReadonlyArray<{ value: CompositeMeasure; label: string }> = [
  { value: "spent", label: "Harcanan a-s" },
  { value: "earned", label: "Kazanılmış a-s" },
  { value: "budget", label: "Bütçe a-s" },
];

/** AYP:289 · :313 — tanım satırındaki ölçü sözcüğü. */
const MEASURE_WORD: Record<CompositeMeasure, string> = {
  spent: "harcanan",
  earned: "kazanılmış",
  budget: "bütçe",
};

/** AYP:315 `saveB` — ad boşsa. */
const UNNAMED_METRIC = "Adsız metrik";
const NAME_MAX_LENGTH = 150;

interface EditorState {
  /** Düzenlenen satırın anahtarı; `null` → yeni metrik. */
  key: string | null;
  name: string;
  measure: CompositeMeasure;
  numeratorItemIds: string[];
  denominatorItemId: string;
}

type ItemLookup = (itemId: string) => BoqItem | undefined;

function itemName(lookup: ItemLookup, itemId: string): string {
  return lookup(itemId)?.description ?? EMPTY_CELL;
}

/** AYP:289 — "(Kalıp + Demir + Beton harcanan) ÷ Beton m³". */
function metricDefinition(metric: MetricDraft, lookup: ItemLookup): string {
  const numerator = metric.numeratorItemIds.map((id) => itemName(lookup, id)).join(" + ");
  const denominator = lookup(metric.denominatorItemId);
  const denominatorText = denominator
    ? `${denominator.description} ${denominator.unit}`
    : EMPTY_CELL;
  return `(${numerator} ${MEASURE_WORD[metric.measure]}) ÷ ${denominatorText}`;
}

export interface PacalMetricsCardProps {
  metrics: readonly MetricDraft[];
  boqItems: readonly BoqItem[];
  disabled: boolean;
  onChange: (metrics: MetricDraft[]) => void;
}

export function PacalMetricsCard({ metrics, boqItems, disabled, onChange }: PacalMetricsCardProps) {
  const [editor, setEditor] = useState<EditorState | null>(null);
  const lookup: ItemLookup = (itemId) => boqItems.find((item) => item.id === itemId);
  // AYP:212 `bOpen && !ro` — salt okunurda düzenleyici kapanır.
  const openEditor = disabled ? null : editor;

  function edit(metric: MetricDraft) {
    setEditor({
      key: metric.key,
      name: metric.name,
      measure: metric.measure,
      numeratorItemIds: [...metric.numeratorItemIds],
      denominatorItemId: metric.denominatorItemId,
    });
  }

  function remove(key: string) {
    // Düzenleyicide açık olan satır silinirse düzenleyici kapanır (bayat anahtar kalmasın).
    if (editor?.key === key) setEditor(null);
    onChange(metrics.filter((metric) => metric.key !== key));
  }

  function apply(state: EditorState) {
    const applied: MetricDraft = {
      key: state.key ?? nextDraftKey("metric"),
      name: state.name.trim() || UNNAMED_METRIC,
      measure: state.measure,
      numeratorItemIds: state.numeratorItemIds,
      denominatorItemId: state.denominatorItemId,
    };
    onChange(
      state.key === null
        ? [...metrics, applied]
        : metrics.map((metric) => (metric.key === state.key ? applied : metric)),
    );
    setEditor(null);
  }

  return (
    <SettingsSection title="Paçal metrikler" aside="QURR başlık kartlarında görünür" gap="sm">
      {metrics.length > 0 && (
        // AYP:180-187 — metrik listesi
        <ul className="ev-pacal__list">
          {metrics.map((metric) => (
            <li
              key={metric.key}
              className={cx(
                "ev-pacal__row",
                openEditor?.key === metric.key && "ev-pacal__row--editing",
              )}
            >
              <span className="ev-pacal__name-col">
                <span className="ev-pacal__name">{metric.name}</span>
                <span className="ev-pacal__def">{metricDefinition(metric, lookup)}</span>
              </span>
              <span className="ev-pacal__value">{EMPTY_CELL}</span>
              <button
                type="button"
                className="ev-pacal__edit"
                aria-label={`Düzenle: ${metric.name}`}
                disabled={disabled}
                onClick={() => edit(metric)}
              >
                Düzenle
              </button>
              {!disabled && (
                // Ek:146 — tatil satırı sil deseni (kenarsız ×, title "Sil")
                <button
                  type="button"
                  className="ev-pacal__remove"
                  title="Sil"
                  aria-label={`Paçal metriği sil: ${metric.name}`}
                  onClick={() => remove(metric.key)}
                >
                  <XIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {openEditor ? (
        <PacalMetricEditor
          state={openEditor}
          boqItems={boqItems}
          lookup={lookup}
          onChange={setEditor}
          onCancel={() => setEditor(null)}
          onApply={apply}
        />
      ) : (
        // Ek:222 · AYP:212-214
        <button
          type="button"
          className="ev-pacal__new"
          aria-label="Yeni paçal metrik"
          disabled={disabled}
          onClick={() =>
            setEditor({
              key: null,
              name: "",
              measure: "spent",
              numeratorItemIds: [],
              denominatorItemId: "",
            })
          }
        >
          + Yeni paçal metrik
        </button>
      )}
    </SettingsSection>
  );
}

interface PacalMetricEditorProps {
  state: EditorState;
  boqItems: readonly BoqItem[];
  lookup: ItemLookup;
  onChange: (state: EditorState) => void;
  onCancel: () => void;
  onApply: (state: EditorState) => void;
}

/** AYP:189-211 — açık düzenleyici. */
function PacalMetricEditor({ state, boqItems, lookup, onChange, onCancel, onApply }: PacalMetricEditorProps) {
  const numeratorOptions = boqItems.map((item) => ({ value: item.id, label: item.description }));
  const denominatorOptions = boqItems.map((item) => ({
    value: item.id,
    label: `${item.description} (${item.unit})`,
  }));
  const canApply = state.numeratorItemIds.length > 0 && state.denominatorItemId !== "";
  const title = state.key === null ? "Yeni paçal metrik" : `Düzenle · ${state.name}`;
  const numeratorText = state.numeratorItemIds.map((id) => itemName(lookup, id)).join(" + ");
  const denominator = lookup(state.denominatorItemId);

  return (
    <div role="group" aria-label="Paçal metrik düzenleyici" className="ev-pacal-editor">
      {/* AYP:191 */}
      <p className="ev-pacal-editor__title">{title}</p>
      {/* AYP:192 */}
      <Field label="Ad">
        {(control) => (
          <Input
            {...control}
            size="row"
            maxLength={NAME_MAX_LENGTH}
            value={state.name}
            onChange={(event) => onChange({ ...state, name: event.target.value })}
          />
        )}
      </Field>
      <div>
        {/* AYP:194-195 */}
        <span className="ev-settings__group-caption ev-pacal-editor__caption">
          Pay · iş tipleri toplamı
        </span>
        <ChipToggleGroup
          aria-label="Pay · iş tipleri toplamı"
          variant="filled"
          options={numeratorOptions}
          value={state.numeratorItemIds}
          onChange={(ids) => onChange({ ...state, numeratorItemIds: ids })}
        />
        {/* AYP:196 · :292 — tek ölçü (K25) */}
        <Segmented
          aria-label="Pay ölçüsü"
          size="sm"
          className="ev-pacal-editor__measure"
          options={MEASURE_OPTIONS}
          value={state.measure}
          onChange={(measure) => onChange({ ...state, measure })}
        />
      </div>
      <div>
        {/* AYP:199-200 · :293 */}
        <span className="ev-settings__group-caption ev-pacal-editor__caption">
          Payda · tek iş tipinin miktarı
        </span>
        <ChipToggleGroup
          aria-label="Payda · tek iş tipinin miktarı"
          variant="soft"
          multiple={false}
          options={denominatorOptions}
          value={state.denominatorItemId ? [state.denominatorItemId] : []}
          onChange={([id]) => onChange({ ...state, denominatorItemId: id ?? "" })}
        />
      </div>
      {/* AYP:202-205 — formül (canlı değer satırı :204 bu uçta yok) */}
      <p className="ev-pacal-editor__formula">
        <b>{state.name.trim() || UNNAMED_METRIC}</b> = ({numeratorText || EMPTY_CELL} ·{" "}
        {MEASURE_WORD[state.measure]} a-s) ÷{" "}
        {denominator ? `${denominator.description} (${denominator.unit})` : EMPTY_CELL}
      </p>
      {/* AYP:206-209 */}
      <div className="ev-pacal-editor__actions">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Vazgeç
        </Button>
        <Button size="sm" disabled={!canApply} onClick={() => onApply(state)}>
          Metriği uygula
        </Button>
      </div>
    </div>
  );
}
