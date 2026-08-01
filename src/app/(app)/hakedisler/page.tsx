import { ProgressPaymentsView } from "@/components/progress-payments/ProgressPaymentsView";

// P7 T2 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). `page.test.tsx` bu sayfanın ComingSoon DEĞİL gerçek görünümü
// bastığını doğrular.
export default function HakedislerPage() {
  return <ProgressPaymentsView />;
}
