import { cx } from "@/lib/cx";
import type { PresetKey } from "@/lib/api/permission-presets";
import "./settings-primitives.css";

// Ref §A.7: full=düz yeşil metin, none=düz gri "—", diğerleri renkli çip.
const CLASS: Record<string, string> = {
  super: "access-chip--green",
  full: "access-chip--full",
  none: "access-chip--none",
  view: "access-chip--amber",
  limited: "access-chip--blue",
  finance: "access-chip--blue",
  own: "access-chip--blue",
  project: "access-chip--blue",
  stock: "access-chip--blue",
  draft: "access-chip--blue",
  request: "access-chip--blue",
  approve: "access-chip--green",
};

export function AccessChip({
  presetKey,
  label,
}: {
  presetKey: PresetKey | "";
  label: string;
}) {
  if (presetKey === "none" || presetKey === "")
    return <span className="access-chip access-chip--none">—</span>;
  if (presetKey === "full")
    return <span className="access-chip access-chip--full">✓ {label}</span>;
  return <span className={cx("access-chip", CLASS[presetKey] ?? "access-chip--blue")}>{label}</span>;
}
