"use client";

import { useState } from "react";

import { Button, Input, Textarea } from "@/components/ui";
import { AlertIcon, ArrowRightIcon, LockIcon, WarningTriangleIcon, XIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import { EMPTY_CELL, formatDateDots, toIstanbulDateOnly } from "@/lib/format";
import type { EvBudgetView, EvPreviewOut } from "@/lib/api/models";

import { formatMhr } from "./budget-format";
import { BudgetFlash } from "./BudgetFlash";
import { DeleteDraftModal, FreezeModal } from "./BudgetModals";
import type { DiffSummary } from "./diff-rows";
import { emptyRateCount, type BudgetStep, type FreezeBlocker } from "./freeze-findings";
import { revDative, type ScreenState } from "./revision-state";
import type { BudgetActions } from "./useBudgetScreenHooks";

export interface FrozenInfo {
  number: number;
  date: string;
  by: string | null;
}

interface FreezeStepProps {
  view: EvBudgetView;
  state: ScreenState;
  canApprove: boolean;
  blockers: readonly FreezeBlocker[];
  diff: DiffSummary | null;
  preview: EvPreviewOut | undefined;
  actions: BudgetActions;
  frozenInfo: FrozenInfo | null;
  onStep: (step: BudgetStep) => void;
  onFrozen: (info: FrozenInfo) => void;
  onDraftDeleted: () => void;
}

function peakText(preview: EvPreviewOut | undefined): string {
  const peak = preview?.total.peak_week;
  if (!peak || peak.required_people === null) return EMPTY_CELL;
  return `${formatMhr(peak.required_people)} kişi · H${peak.week_no}`;
}

function rangeText(preview: EvPreviewOut | undefined): string {
  if (!preview?.start || !preview.end) return EMPTY_CELL;
  return `${formatDateDots(preview.start)} – ${formatDateDots(preview.end)}`;
}

/** Sol kart — Adam-Saat Bütçesi.dc.html:411-421. */
function SummaryCard({ view, diff, preview }: Pick<FreezeStepProps, "view" | "diff" | "preview">) {
  const empty = emptyRateCount(view);
  return (
    <section className="ev-budget-card ev-budget-summary" aria-label="Baseline özeti">
      <div className="ev-budget-caption">Baseline özeti · Rev {view.revision?.number ?? 0}</div>
      <div className="ev-budget-summary__hero">
        <span className="ev-budget-summary__label">Toplam doğrudan bütçe</span>
        <span className="ev-budget-summary__total">
          {formatMhr(view.totals.direct_budget_mhr)} <span className="ev-budget-summary__unit">a-s</span>
        </span>
        {diff && (
          <span className="ev-budget-summary__label">
            {revDative(diff.againstNumber)} göre{" "}
            <b className={cx("ev-budget-mono", `ev-budget-tone--${diff.tone}`)}>{diff.delta}</b> a-s
          </span>
        )}
      </div>
      <dl className="ev-budget-summary__grid">
        <dt>Tarih aralığı</dt>
        <dd>{rangeText(preview)}</dd>
        <dt>Kalem</dt>
        <dd>{`${view.totals.item_count} iş tipi · ${view.totals.leaf_count} bölüm satırı`}</dd>
        <dt>Dolaylı (bütçe dışı)</dt>
        <dd>{formatMhr(view.totals.indirect_budget_mhr)} a-s</dd>
        <dt>Tepe gereken işçi</dt>
        <dd>{peakText(preview)}</dd>
        <dt>Oranı boş</dt>
        <dd className={empty > 0 ? "ev-budget-tone--missing" : "ev-budget-tone--ok"}>{empty > 0 ? `${empty} kalem` : "Yok"}</dd>
      </dl>
    </section>
  );
}

const STEP_LINK: Record<BudgetStep, string> = { 1: "Adım 1 · Oranlar", 2: "Adım 2 · Zamanlama", 3: "Adım 3 · Önizleme", 4: "Adım 4 · Baseline" };

interface BlockerListProps {
  blockers: readonly FreezeBlocker[];
  state: ScreenState;
  openingDraft: boolean;
  onStep: (step: BudgetStep) => void;
  onOpenDraft: () => void;
}

/** Ek Formlar M6 (a)(b) — kırmızı başlıklı engel listesi; her engel ilgili adıma bağlanır. */
function BlockerList({ blockers, state, openingDraft, onStep, onOpenDraft }: BlockerListProps) {
  return (
    <div className="ev-budget-blockers" role="region" aria-label="Dondurma engelleri">
      <div className="ev-budget-blockers__head">Dondurma engelleri · {blockers.length}</div>
      {blockers.map((b) => (
        <div key={b.code} className="ev-budget-blockers__row">
          <div className="ev-budget-blockers__text">
            <span className="ev-budget-blockers__title">
              <XIcon width={10} height={10} aria-hidden="true" /> {b.title}
            </span>
            {b.detail && <span className="ev-budget-blockers__detail">{b.detail}</span>}
          </div>
          {b.step !== null && (
            <button type="button" className="ev-budget-blockers__link" onClick={() => onStep(b.step as BudgetStep)}>
              {STEP_LINK[b.step]} <ArrowRightIcon width={12} height={12} aria-hidden="true" />
            </button>
          )}
          {b.code === "no_draft" && state.canOpenDraft && (
            <Button variant="secondary" size="sm" disabled={openingDraft} onClick={onOpenDraft}>
              Taslak aç (Rev {state.nextDraftNumber})
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Adım 4 · Baseline — Adam-Saat Bütçesi.dc.html:409-468 + Ek Formlar M5 (b)(c), M6. */
export function FreezeStep(props: FreezeStepProps) {
  const { view, state, blockers } = props;
  const [name, setName] = useState(view.revision?.name ?? `Rev ${view.revision?.number ?? 0}`);
  const [note, setNote] = useState(view.revision?.description ?? "");
  const [modal, setModal] = useState<"freeze" | "delete" | null>(null);
  const number = view.revision?.number ?? 0;

  async function confirmFreeze() {
    const rev = await props.actions.freeze({ name: name.trim() || null, description: note.trim() || null });
    setModal(null);
    if (rev) props.onFrozen({ number: rev.number, date: rev.frozen_at ?? "", by: rev.frozen_by?.full_name ?? null });
  }

  async function confirmDelete() {
    if (!view.revision) return;
    const done = await props.actions.deleteDraft(view.revision.id);
    setModal(null);
    if (done) props.onDraftDeleted();
  }

  return (
    <div className="ev-budget-freeze">
      <SummaryCard view={view} diff={props.diff} preview={props.preview} />
      <section className="ev-budget-card ev-budget-freeze__panel" aria-label="Adım 4 · Baseline'ı dondur">
        <h2 className="ev-budget-card__title">Adım 4 · Baseline&apos;ı dondur</h2>
        <FreezeForm name={name} note={note} disabled={!state.canFreeze} onName={setName} onNote={setNote} />
        <p className="ev-budget-freeze__caution">
          <AlertIcon width={16} height={16} aria-hidden="true" />
          <span>
            <b>Dondurulan baseline değiştirilemez;</b> değişiklikler yeni revizyon olur. Dondurunca Rev {number} aktif olur,
            Planlama Paneli ve raporlar {revDative(number)} göre hesaplanır.
          </span>
        </p>
        <BudgetFlash flash={props.actions.flash} />
        {props.frozenInfo && <FrozenMessage info={props.frozenInfo} />}
        {blockers.length > 0 && (
          <BlockerList blockers={blockers} state={state} openingDraft={props.actions.isOpeningDraft} onStep={props.onStep} onOpenDraft={() => void props.actions.openDraft()} />
        )}
        <EmptyRateChip view={view} visible={state.mode === "draft"} />
        <FreezeActions {...props} onAsk={setModal} />
      </section>
      <FreezeDialogs {...props} modal={modal} onClose={() => setModal(null)} onFreeze={() => void confirmFreeze()} onDelete={() => void confirmDelete()} />
    </div>
  );
}

interface FreezeDialogsProps extends FreezeStepProps {
  modal: "freeze" | "delete" | null;
  onClose: () => void;
  onFreeze: () => void;
  onDelete: () => void;
}

function FreezeDialogs({ view, state, diff, actions, modal, onClose, onFreeze, onDelete }: FreezeDialogsProps) {
  if (modal === "freeze") {
    return (
      <FreezeModal
        number={view.revision?.number ?? 0}
        activeNumber={state.active?.number ?? null}
        directTotal={view.totals.direct_budget_mhr}
        diff={diff}
        emptyCount={emptyRateCount(view)}
        busy={actions.isFreezing}
        onCancel={onClose}
        onConfirm={onFreeze}
      />
    );
  }
  if (modal === "delete" && view.revision) {
    return (
      <DeleteDraftModal
        draft={view.revision}
        activeNumber={state.active?.number ?? null}
        changedCount={diff?.count ?? null}
        busy={actions.isDeleting}
        onCancel={onClose}
        onConfirm={onDelete}
      />
    );
  }
  return null;
}

interface FreezeFormProps {
  name: string;
  note: string;
  disabled: boolean;
  onName: (value: string) => void;
  onNote: (value: string) => void;
}

function FreezeForm({ name, note, disabled, onName, onNote }: FreezeFormProps) {
  return (
    <>
      <label className="ev-budget-field">
        <span className="ev-budget-field__label">Revizyon adı</span>
        <Input value={name} disabled={disabled} onChange={(event) => onName(event.target.value)} />
      </label>
      <label className="ev-budget-field">
        <span className="ev-budget-field__label">Açıklama</span>
        <Textarea rows={3} value={note} disabled={disabled} onChange={(event) => onNote(event.target.value)} />
      </label>
    </>
  );
}

function FrozenMessage({ info }: { info: FrozenInfo }) {
  const date = info.date ? formatDateDots(toIstanbulDateOnly(info.date)) : "";
  return (
    <p className="ev-budget-flash ev-budget-flash--success" role="status">
      Rev {info.number} donduruldu · {date}
      {info.by ? ` · ${info.by}` : ""}. Aktif baseline artık Rev {info.number}.
    </p>
  );
}

function EmptyRateChip({ view, visible }: { view: EvBudgetView; visible: boolean }) {
  const empty = emptyRateCount(view);
  if (!visible || empty === 0) return null;
  return (
    <p className="ev-budget-warn-chip">
      <WarningTriangleIcon width={12} height={12} aria-hidden="true" />
      Uyarı (engel değil): <span className="ev-budget-mono ev-budget-strong">{empty}</span> yaprağın oranı boş · dondururken
      modalde gösterilir
    </p>
  );
}

function FreezeActions(props: FreezeStepProps & { onAsk: (modal: "freeze" | "delete") => void }) {
  const { state, blockers, canApprove, onAsk } = props;
  const blocked = blockers.length > 0;
  return (
    <div className="ev-budget-freeze__actions">
      <Button variant="secondary" onClick={() => props.onStep(3)}>
        ← Önizleme
      </Button>
      {state.canDeleteDraft && (
        <Button variant="secondary" className="ev-budget-danger-btn" onClick={() => onAsk("delete")}>
          Taslağı sil
        </Button>
      )}
      {canApprove && !state.hideActions && (
        <>
          {blocked && state.mode === "draft" && <span className="ev-budget-freeze__hint">Engeller kapanınca etkinleşir</span>}
          <Button className="ev-budget-freeze__submit" disabled={blocked || !state.canFreeze} onClick={() => onAsk("freeze")}>
            <LockIcon width={13} height={13} aria-hidden="true" />
            Baseline&apos;ı Dondur
          </Button>
        </>
      )}
    </div>
  );
}
