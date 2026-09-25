import { SitePanelView } from "@/components/earned-value/reports/views/SitePanelView";

// PLN-F3.6a · şantiye kapsamlı Planlama Paneli rotası (K21; mockup
// `Planlama - Panel.dc.html`). [...slug] catch-all'ı bu segment için devre
// dışı bırakır; sayfa kendi layout'unu kurmaz (`ManHourBudgetView` deseni).
export default function SitePlanlamaPaneliPage() {
  return <SitePanelView />;
}
