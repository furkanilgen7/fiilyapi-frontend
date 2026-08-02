import { SiteProgressPaymentsView } from "@/components/progress-payments/SiteProgressPaymentsView";

// P7 T6 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). Sayfa KENDİ LAYOUT'UNU KURMAZ, drill sidebar
// `[projectId]/layout.tsx`'ten gelir (is-kalemleri deseni).
export default function SiteHakedislerPage() {
  return <SiteProgressPaymentsView />;
}
