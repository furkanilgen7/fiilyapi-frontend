import { TreasuryView } from "@/components/treasury/TreasuryView";

// F-HZ T2 · Ekran 9 (Hazine) gerçek rotası — özel segment catch-all'dan önce
// eşleşir (Next.js App Router kanonu, `/makine` deseni), yani kabuk
// sidebar'ındaki "Hazine" artık ComingSoon'a DÜŞMEZ.
export default function HazinePage() {
  return <TreasuryView />;
}
