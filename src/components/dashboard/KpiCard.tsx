import type { components } from "@/lib/api/schema";
import { formatCompactCurrency } from "@/lib/format";

import { CardEmptyState } from "./CardEmptyState";
import "./dashboard.css";

// NOT: openapi-typescript "MetricPlaceholder" adini iki modulde (dashboard/projects) gordugu
// icin ad-alani onekiyle ayristirdi; gosterge paneli kendi semasini kullanir.
type MetricPlaceholder = components["schemas"]["app__modules__dashboard__schemas__MetricPlaceholder"];

export function KpiCard({
  label,
  emptyTitle,
  metric,
}: {
  label: string;
  emptyTitle: string;
  metric: MetricPlaceholder;
}) {
  return (
    <section className="dash-card dash-kpi">
      <h2 className="dash-card__label">{label}</h2>
      {metric.available && metric.value !== null && metric.value !== undefined ? (
        <p className="dash-kpi__value">{formatCompactCurrency(metric.value)}</p>
      ) : (
        <CardEmptyState title={emptyTitle} pendingModule={metric.pending_module} />
      )}
      <div className="dash-bar dash-bar--kpi">
        <div className="dash-bar__fill" style={{ width: "0%" }} />
      </div>
    </section>
  );
}
