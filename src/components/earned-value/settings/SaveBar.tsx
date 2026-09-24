import { Button } from "@/components/ui/button";
import { cx } from "@/lib/cx";

/**
 * Yapışkan Kaydet çubuğu — Ek:400-410 (çizim) · Ek:470-473 (dört hâl metni).
 *
 *   saved   — "Kaydedildi · <şantiye> · denetim günlüğüne yazıldı" (Ek:499)
 *   invalid — "Hatalı alan var · kaydetmeden önce düzeltin"
 *   dirty   — "<n> bölümde kaydedilmemiş değişiklik var · <şantiye>"
 *   clean   — "Bütün değişiklikler kaydedildi · <şantiye>"
 *
 * Salt okunur ekranda HİÇ basılmaz (Ek:498 `showBar: !ro`) — çağıran karar verir.
 */
export type SaveBarState = "saved" | "invalid" | "dirty" | "clean";

export interface SaveBarProps {
  state: SaveBarState;
  siteName: string;
  changeCount: number;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
}

function saveBarText(state: SaveBarState, siteName: string, changeCount: number): string {
  switch (state) {
    case "saved":
      return `Kaydedildi · ${siteName} · denetim günlüğüne yazıldı`;
    case "invalid":
      return "Hatalı alan var · kaydetmeden önce düzeltin";
    case "dirty":
      return `${changeCount} bölümde kaydedilmemiş değişiklik var · ${siteName}`;
    case "clean":
      return `Bütün değişiklikler kaydedildi · ${siteName}`;
  }
}

export function SaveBar({ state, siteName, changeCount, isSaving, onReset, onSave }: SaveBarProps) {
  // Ek:470-473 — Vazgeç yalnız değişiklik varken; Kaydet yalnız geçerli değişiklik varken.
  const canReset = changeCount > 0 && state !== "saved" && !isSaving;
  const canSave = state === "dirty" && !isSaving;
  return (
    <div role="region" aria-label="Kaydetme çubuğu" className="ev-save-bar">
      <span aria-hidden="true" className={cx("ev-save-bar__dot", `ev-save-bar__dot--${state}`)} />
      <span role="status" className={cx("ev-save-bar__text", `ev-save-bar__text--${state}`)}>
        {saveBarText(state, siteName, changeCount)}
      </span>
      <div className="ev-save-bar__actions">
        <Button variant="secondary" onClick={onReset} disabled={!canReset}>
          Vazgeç
        </Button>
        <Button onClick={onSave} disabled={!canSave} aria-busy={isSaving || undefined}>
          Kaydet
        </Button>
      </div>
    </div>
  );
}
