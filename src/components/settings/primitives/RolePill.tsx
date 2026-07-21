import { roleVisual } from "./role-visuals";
import "./settings-primitives.css";

export function RolePill({ roleKey, name }: { roleKey: string; name: string }) {
  const v = roleVisual(roleKey);
  return (
    <span className="role-pill" style={{ background: v.badgeBg, color: v.badgeText }}>
      {name}
    </span>
  );
}
