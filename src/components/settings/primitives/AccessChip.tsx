import { cx } from "@/lib/cx";
import type { PresetKey } from "@/lib/api/permission-presets";
import "./settings-primitives.css";

// Ref §A.7: full/super (admin,all)=yalnız ✓ (yeşil), none=düz gri "—", onay=yeşil pill,
// diğer kısmi erişimler=amber pill (Kullanıcılar > İzin Matrisi önizleme mockup'ı, Ayarlar.dc.html §231+).
const CLASS: Record<string, string> = {
  full: "access-chip--full",
  none: "access-chip--none",
  view: "access-chip--amber",
  limited: "access-chip--amber",
  finance: "access-chip--amber",
  own: "access-chip--amber",
  project: "access-chip--amber",
  stock: "access-chip--amber",
  draft: "access-chip--amber",
  request: "access-chip--amber",
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
  if (presetKey === "full" || presetKey === "super")
    return <span className="access-chip access-chip--full">✓</span>;
  return <span className={cx("access-chip", CLASS[presetKey] ?? "access-chip--amber")}>{label}</span>;
}
