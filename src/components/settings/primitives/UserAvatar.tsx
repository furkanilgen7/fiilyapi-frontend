import { initials } from "@/lib/shell/initials";
import { roleVisual } from "./role-visuals";
import "./settings-primitives.css";

export function UserAvatar({ roleKey, name }: { roleKey: string; name: string }) {
  const v = roleVisual(roleKey);
  return (
    <span
      className="user-avatar"
      aria-hidden="true"
      style={{ backgroundImage: `linear-gradient(135deg, ${v.gradFrom}, ${v.gradTo})` }}
    >
      {initials(name)}
    </span>
  );
}
