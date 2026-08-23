import { pendingModuleLabel } from "@/lib/pending-modules";

import "./dashboard.css";

export function CardEmptyState({
  title,
  pendingModule,
}: {
  title: string;
  // Opsiyonel: gerekce satiri YALNIZ anahtar verildiginde basilir. Anahtarin
  // bayat kaldigi yuzeylerde (or. onay karti) cagiran taraf bilerek atlar.
  pendingModule?: string;
}) {
  return (
    <div className="dash-empty">
      <p className="dash-empty__title">{title}</p>
      {pendingModule !== undefined && (
        <p className="dash-empty__hint">{pendingModuleLabel(pendingModule)}</p>
      )}
    </div>
  );
}
