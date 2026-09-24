import { ManHourBudgetView } from "@/components/earned-value/budget/ManHourBudgetView";

// PLN-F1 · şantiye kapsamlı Adam-Saat Bütçesi rotası (Planlama - Adam-Saat
// Bütçesi.dc.html:84-87 kırıntısı). [...slug] catch-all'ı bu segment için
// devre dışı bırakır; sayfa kendi layout'unu kurmaz.
export default function SiteAdamSaatButcesiPage() {
  return <ManHourBudgetView />;
}
