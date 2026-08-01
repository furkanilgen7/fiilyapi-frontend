"use client";

import { useParams } from "next/navigation";

import { ProgressPaymentDetailView } from "@/components/progress-payments/ProgressPaymentDetailView";

// P7 T3 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). T2'deki liste satırı `/hakedisler/{id}` linkini zaten basıyor.
export default function ProgressPaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  return <ProgressPaymentDetailView paymentId={paymentId} />;
}
