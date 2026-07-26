import type { components } from "@/lib/api/schema";
import { formatCurrency } from "@/lib/format";

import { CardEmptyState } from "./CardEmptyState";
import "./dashboard.css";

// NOT: openapi-typescript "MetricPlaceholder" adini iki modulde (dashboard/projects) gordugu
// icin ad-alani onekiyle ayristirdi; gosterge paneli kendi semasini kullanir.
type MetricPlaceholder = components["schemas"]["app__modules__dashboard__schemas__MetricPlaceholder"];

export function PortfolioCard({ metric }: { metric: MetricPlaceholder }) {
  return (
    <section className="dash-card dash-portfolio">
      <h2 className="dash-card__label">Portföy · Toplam Hakediş</h2>
      {metric.available && metric.value !== null && metric.value !== undefined ? (
        <p className="dash-portfolio__value">{formatCurrency(metric.value)}</p>
      ) : (
        <CardEmptyState
          title="Henüz hakediş verisi yok"
          pendingModule={metric.pending_module}
        />
      )}
      {/* Mockup'taki alan grafigi kutusu; veri gelene kadar bos cizim alani. */}
      <svg
        className="dash-portfolio__chart"
        viewBox="0 0 500 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      />
    </section>
  );
}
