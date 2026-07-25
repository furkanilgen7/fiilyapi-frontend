import type { components } from "@/lib/api/schema";

import { CardEmptyState } from "./CardEmptyState";
import "./dashboard.css";

type Placeholder = components["schemas"]["PendingApprovalsPlaceholder"];

export function PendingApprovalsCard({ data }: { data: Placeholder }) {
  // items semada opsiyonel (backend bos listede alani atlayabilir).
  const items = data.items ?? [];

  return (
    <section className="dash-card dash-list-card">
      <h2 className="dash-list-card__title">
        Onay Bekleyenler
        {data.count > 0 && (
          <span className="dash-list-card__badge" data-testid="dash-approvals-badge">
            {data.count}
          </span>
        )}
      </h2>
      {data.available && items.length > 0 ? (
        <ul className="dash-list">
          {items.map((item) => (
            <li key={item} className="dash-list__row">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <CardEmptyState title="Onay bekleyen kayıt yok" pendingModule={data.pending_module} />
      )}
    </section>
  );
}
