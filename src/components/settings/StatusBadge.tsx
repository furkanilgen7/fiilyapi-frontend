import { Badge } from "@/components/ui";
import { statusLabel, statusVariant } from "@/lib/settings/status";
import type { UserStatus } from "@/lib/api/models";

export function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}
