import { PurchaseRequestForm } from "@/components/purchasing/PurchaseRequestForm";

// F-SA T3 · FST (Form - Satinalma Talebi) gerçek rotası — SAT 65
// "+ Satın Alma Talebi" düğmesinin hedefi (`NEW_PURCHASE_REQUEST_HREF`).
//
// `/satinalma` sayfasının aksine URL durumu YOKTUR (form kendi durumunu
// tutar) → `useSearchParams` kullanılmaz, Suspense sınırı GEREKMEZ.
export default function YeniSatinalmaTalebiPage() {
  return <PurchaseRequestForm />;
}
