import { cx } from "@/lib/cx";
import { EMPTY_CELL } from "@/lib/format";
import type { VarianceStatus } from "@/lib/earned-value";

import "./status-mark.css";

/**
 * PLN-F3.4 · Sapma durumu rozeti — GİR Disiplin KPI tablosu "Durum" kolonu
 * (`Planlama - Günlük İlerleme Raporu.dc.html:188,326` `st()`: ▲ İleride ·
 * ▼ Geride · ● Normal).
 *
 * Glifler ▲/▼/● font ALT KÜMESİ dışındadır (bkz. F3-SÖZLEŞME §3.6, emsal
 * `PfBandsCard.tsx:147` "≥" notu) → burada SÖZCÜK yerine INLINE SVG çizilir
 * (ubuntu-latest fontconfig ikamesine düşmez, bkz.
 * `src/test-guards/symbol-subset-guard.test.ts`). `status === "none"` (veri
 * yok) mockup'ta YOKTUR — backend `status: null` döndüğünde nötr, glifsiz
 * `EMPTY_CELL` ("—", zaten alt küme İÇİNDE, `lib/format.ts`) basılır.
 */
export interface StatusMarkProps {
  status: VarianceStatus;
  className?: string;
}

const LABEL: Record<VarianceStatus, string> = {
  ahead: "İleride",
  late: "Geride",
  normal: "Normal",
  none: EMPTY_CELL,
};

function Glyph({ status }: { status: VarianceStatus }) {
  if (status === "ahead") {
    // Ek: yukarı üçgen (▲)
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="ev-status-mark__glyph">
        <polygon points="4,0 8,8 0,8" fill="currentColor" />
      </svg>
    );
  }
  if (status === "late") {
    // Ek: aşağı üçgen (▼)
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="ev-status-mark__glyph">
        <polygon points="0,0 8,0 4,8" fill="currentColor" />
      </svg>
    );
  }
  if (status === "normal") {
    // Ek: dolu daire (●)
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className="ev-status-mark__glyph">
        <circle cx="4" cy="4" r="4" fill="currentColor" />
      </svg>
    );
  }
  return null;
}

export function StatusMark({ status, className }: StatusMarkProps) {
  return (
    <span className={cx("ev-status-mark", `ev-status-mark--${status}`, className)}>
      <Glyph status={status} />
      <span className="ev-status-mark__label">{LABEL[status]}</span>
    </span>
  );
}
