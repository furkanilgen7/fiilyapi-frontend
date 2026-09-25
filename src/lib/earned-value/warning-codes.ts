/**
 * PLN-F3.1 · Uyarı (`WarningOut.code`) → rozet meta verisi.
 *
 * Kaynak: mockup `Planlama - Panel.dc.html:231-258`. `WARNING_META`
 * `satisfies Record<KnownWarningCode, WarningMeta>` ile kurulur — backend
 * yeni bir `code` enum değeri eklerse (`EvWarning["code"]` genişler) bu
 * dosya `pnpm typecheck`te KIRILIR; sessizce eksik kalmaz.
 */
import type { EvWarning } from "@/lib/api/models";

export type KnownWarningCode = EvWarning["code"];
export type WarningTone = "danger" | "warning" | "neutral";
export type WarningDestination = "daily-report" | "diary" | "budget" | null;

export interface WarningMeta {
  label: string;
  tone: WarningTone;
  destination: WarningDestination;
}

export const WARNING_META = {
  pf_out_of_band: { label: "PF", tone: "danger", destination: "daily-report" },
  undistributed_hours: { label: "SAAT", tone: "warning", destination: "diary" },
  qty_overrun: { label: "MİKTAR", tone: "warning", destination: "budget" },
  missing_diary: { label: "GÜNLÜK", tone: "danger", destination: "diary" },
  draft_diary: { label: "GÜNLÜK", tone: "danger", destination: "diary" },
  empty_rate: { label: "ORAN", tone: "neutral", destination: "budget" },
  unrated_entry: { label: "UYARI", tone: "neutral", destination: null },
  unknown_line: { label: "UYARI", tone: "neutral", destination: null },
} satisfies Record<KnownWarningCode, WarningMeta>;

const FALLBACK_META: WarningMeta = { label: "UYARI", tone: "neutral", destination: null };

/** Bilinmeyen kod (backend ileride yeni bir tane eklerse) → nötr yedek, ÇÖKMEZ. */
export function warningMeta(code: string): WarningMeta {
  return Object.prototype.hasOwnProperty.call(WARNING_META, code)
    ? WARNING_META[code as KnownWarningCode]
    : FALLBACK_META;
}
