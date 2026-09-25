import { SiteWeeklyQurrView } from "@/components/earned-value/reports/views/SiteWeeklyQurrView";

// PLN-F3.6a · şantiye kapsamlı Haftalık QURR rotası (mockup
// `Planlama - Haftalık QURR.dc.html`). [...slug] catch-all'ı bu segment
// için devre dışı bırakır; sayfa kendi layout'unu kurmaz (`ManHourBudgetView`
// deseni).
export default function SiteHaftalikQurrPage() {
  return <SiteWeeklyQurrView />;
}
