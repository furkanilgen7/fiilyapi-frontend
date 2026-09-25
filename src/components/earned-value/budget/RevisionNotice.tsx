"use client";

import { ReadOnlyStrip } from "@/components/earned-value/common/state";
import type { EvBudgetView } from "@/lib/api/models";

import { revDative, type ScreenState } from "./revision-state";

/** Ayarlar - Planlama (Ek) F0-8 hâl kartının bütçe karşılığı. */
export const SITE_COMPLETED_TEXT = "Tamamlanmış şantiye · bütçe salt okunur.";

interface RevisionNoticeProps {
  view: EvBudgetView;
  state: ScreenState;
  onBackToDraft: () => void;
  onBackToActive: () => void;
  onOpenDraft: () => void;
  openingDraft: boolean;
}

/**
 * Revizyon hâline göre üst şerit:
 *   • donmuş (aktif/arşiv) — BÜT:146-152 banner; taslak varsa "Taslak Rev N'e dön",
 *     yoksa Ek Formlar M5 (a) "Rev 1 aktif, taslak yok." + "Taslak aç (Rev 2)".
 *   • taslak + görüntüleyici — BÜT:483 compact "Görüntüleyici · yalnız okuma".
 *   • revizyon yok — Ek Formlar M5 (d) bilgi kutusu.
 *   • tamamlanmış şantiye (B1-12) — hepsinin önünde, banner.
 */
export function RevisionNotice(props: RevisionNoticeProps) {
  const { view, state } = props;
  // B1-12: tamamlanmış şantiye diğer bütün hâllerin ÖNÜNDEDİR (AYP F0-8 şeridiyle tutarlı).
  if (state.siteCompleted) {
    return (
      <ReadOnlyStrip variant="banner" lead="Salt okunur.">
        {SITE_COMPLETED_TEXT}
      </ReadOnlyStrip>
    );
  }
  if (state.mode === "none") return <NoRevisionNotice />;
  if (state.isViewer) return <ReadOnlyStrip variant="compact">Görüntüleyici · yalnız okuma</ReadOnlyStrip>;
  if (state.mode === "draft" || view.revision === null) return null;
  return <FrozenNotice {...props} number={view.revision.number} />;
}

function NoRevisionNotice() {
  return (
    <div className="ev-budget-info" role="note">
      <strong>Bu şantiyede henüz bütçe revizyonu yok.</strong>{" "}
      <span className="ev-budget-info__muted">
        İlk kayıt (oran, grup eşlemesi ya da &quot;Katalogdan öner&quot;) <strong>Rev 0 taslağını</strong>{" "}
        oluşturur.
      </span>
    </div>
  );
}

function FrozenNotice({ state, number, ...handlers }: RevisionNoticeProps & { number: number }) {
  if (state.draft) {
    return (
      <ReadOnlyStrip
        variant="banner"
        lead={`Rev ${number} dondurulmuş.`}
        action={{ label: `Taslak ${revDative(state.draft.number)} dön`, onClick: handlers.onBackToDraft }}
      >
        Oran ve dağılım değiştirilemez; değişiklik için taslak revizyonu açın.
      </ReadOnlyStrip>
    );
  }
  if (state.mode === "archived" && state.active) {
    return (
      <ReadOnlyStrip
        variant="banner"
        lead={`Rev ${number} dondurulmuş.`}
        action={{ label: `Aktif ${revDative(state.active.number)} dön`, onClick: handlers.onBackToActive }}
      >
        Oran ve dağılım değiştirilemez; değişiklik için taslak revizyonu açın.
      </ReadOnlyStrip>
    );
  }
  return (
    <ReadOnlyStrip
      variant="banner"
      lead={`Rev ${number} aktif, taslak yok.`}
      action={
        state.canOpenDraft
          ? {
              label: `Taslak aç (Rev ${state.nextDraftNumber})`,
              onClick: handlers.onOpenDraft,
              disabled: handlers.openingDraft,
            }
          : undefined
      }
    >
      Değişiklik için taslak açın.
    </ReadOnlyStrip>
  );
}
