"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Toggle } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatDateDots, toIstanbulDateOnly } from "@/lib/format";
import type { EvBudgetView, EvRevisionOut } from "@/lib/api/models";

import { RevisionPicker } from "./RevisionPicker";
import { activeRevisionChip, revisionBadge, type ScreenState } from "./revision-state";

export interface BudgetLinks {
  /** İş Kalemleri (BOQ) — şantiye çözülmeden null. */
  boq: string | null;
  /** Bölüm tarihleri (Şantiye Detay). */
  sections: string | null;
  catalog: string;
}

interface BudgetHeaderProps {
  view: EvBudgetView;
  revisions: readonly EvRevisionOut[];
  state: ScreenState;
  links: BudgetLinks;
  showDiff: boolean;
  diffAvailable: boolean;
  onToggleDiff: (next: boolean) => void;
  onSelectRevision: (revision: EvRevisionOut) => void;
  onOpenDraft: () => void;
  /** Kök ikizde şantiye seçici (GeneralSiteDiaryView deseni). */
  picker?: ReactNode;
}

function SourceLink({ href, children }: { href: string | null; children: ReactNode }) {
  return href ? (
    <Link href={href} className="ev-budget-head__source-link">
      {children}
    </Link>
  ) : (
    <span className="ev-budget-head__source-link">{children}</span>
  );
}

/** BÜT:94-98 — veri kaynağı çipleri. */
function SourceChips({ view, links }: { view: EvBudgetView; links: BudgetLinks }) {
  return (
    <div className="ev-budget-head__sources">
      <span className="ev-budget-head__source">
        Miktar ← <SourceLink href={links.boq}>İş Kalemleri (BOQ)</SourceLink> + bölüm tahsisleri
        {view.boq_synced_at && (
          <>
            {" · senk. "}
            <span className="ev-budget-mono">{formatDateDots(toIstanbulDateOnly(view.boq_synced_at))}</span>
          </>
        )}
      </span>
      <span className="ev-budget-head__source">
        Tarihler ← <SourceLink href={links.sections}>Bölümler</SourceLink>
      </span>
      <span className="ev-budget-head__source">
        Oran önerisi ← <SourceLink href={links.catalog}>Birim Oran Kataloğu</SourceLink>
      </span>
    </div>
  );
}

/**
 * Sayfa başı — Adam-Saat Bütçesi.dc.html:81-123. Kırıntı KABUĞUNDUR (route-tree);
 * sağdaki SORU kutusu (:124-130) mockup notudur, basılmaz.
 */
export function BudgetHeader(props: BudgetHeaderProps) {
  const { view, revisions, state, links, showDiff, diffAvailable, onToggleDiff, picker } = props;
  const badge = revisionBadge(view);
  return (
    <header className="ev-budget-head">
      <div className="ev-budget-head__main">
        {picker}
        <div className="ev-budget-head__title-row">
          <h1 className="ev-budget-head__title">Adam-Saat Bütçesi</h1>
          <span className={cx("ev-budget-badge", `ev-budget-badge--${badge.tone}`)}>{badge.label}</span>
          <span className="ev-budget-head__active">{activeRevisionChip(revisions)}</span>
        </div>
        <SourceChips view={view} links={links} />
      </div>
      <div className="ev-budget-head__side">
        <RevisionPicker
          view={view}
          revisions={revisions}
          state={state}
          onSelect={props.onSelectRevision}
          onOpenDraft={props.onOpenDraft}
        />
        <Toggle
          label="Revizyon farkını göster"
          checked={showDiff && diffAvailable}
          disabled={!diffAvailable}
          onChange={(event) => onToggleDiff(event.target.checked)}
        />
      </div>
    </header>
  );
}
