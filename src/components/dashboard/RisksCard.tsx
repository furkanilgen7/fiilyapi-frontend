import type { components } from "@/lib/api/schema";

import { CardEmptyState } from "./CardEmptyState";
import "./dashboard.css";

type Placeholder = components["schemas"]["ListPlaceholder"];

export function RisksCard({ data }: { data: Placeholder }) {
  // items semada opsiyonel (backend bos listede alani atlayabilir).
  const items = data.items ?? [];

  return (
    <section className="dash-card dash-list-card">
      <h2 className="dash-list-card__title">Risk &amp; Uyarılar</h2>
      {data.available && items.length > 0 ? (
        <ul className="dash-list">
          {items.map((item) => (
            <li key={item} className="dash-risk">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <CardEmptyState title="Uyarı yok" pendingModule={data.pending_module} />
      )}
    </section>
  );
}
