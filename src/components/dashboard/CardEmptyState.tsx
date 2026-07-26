import { pendingModuleLabel } from "@/lib/pending-modules";

import "./dashboard.css";

export function CardEmptyState({
  title,
  pendingModule,
}: {
  title: string;
  pendingModule: string;
}) {
  return (
    <div className="dash-empty">
      <p className="dash-empty__title">{title}</p>
      <p className="dash-empty__hint">{pendingModuleLabel(pendingModule)}</p>
    </div>
  );
}
