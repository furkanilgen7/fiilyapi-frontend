import type { UserStatus } from "@/lib/api/models";

const LABELS: Record<UserStatus, string> = {
  active: "Aktif",
  on_leave: "İzinli",
  passive: "Pasif",
};

const VARIANTS: Record<UserStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  on_leave: "warning",
  passive: "neutral",
};

export function statusLabel(status: UserStatus): string {
  return LABELS[status];
}

export function statusVariant(status: UserStatus): "success" | "warning" | "neutral" {
  return VARIANTS[status];
}
