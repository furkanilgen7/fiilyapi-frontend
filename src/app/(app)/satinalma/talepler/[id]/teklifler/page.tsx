"use client";

import { useParams } from "next/navigation";

import { QuoteComparisonView } from "@/components/purchasing/QuoteComparisonView";

// F-SA T4 · TEK (talep-bağlı teklif karşılaştırması) gerçek rotası —
// [...slug] catch-all'ı bu segment için devre dışı bırakır (Next.js App
// Router: özel segment her zaman catch-all'dan önce eşleşir). SAT tablosunun
// satırı bu linki (`purchaseRequestQuotesHref`) zaten basıyordu.
//
// Rota parametresi dışında URL durumu YOKTUR → `useSearchParams` kullanılmaz,
// Suspense sınırı GEREKMEZ (`/hakedisler/[paymentId]` deseni).
export default function TeklifKarsilastirmaPage() {
  const { id } = useParams<{ id: string }>();
  return <QuoteComparisonView requestId={id} />;
}
