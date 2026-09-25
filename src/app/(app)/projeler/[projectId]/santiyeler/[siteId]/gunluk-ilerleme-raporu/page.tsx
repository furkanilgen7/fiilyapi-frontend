import { SiteDailyReportView } from "@/components/earned-value/reports/views/SiteDailyReportView";

// PLN-F3.6a · şantiye kapsamlı Günlük İlerleme Raporu rotası (mockup
// `Planlama - Günlük İlerleme Raporu.dc.html`). [...slug] catch-all'ı bu
// segment için devre dışı bırakır; sayfa kendi layout'unu kurmaz
// (`ManHourBudgetView` deseni).
export default function SiteGunlukIlerlemeRaporuPage() {
  return <SiteDailyReportView />;
}
