"use client";

import { useParams } from "next/navigation";

import { SubcontractorProgressPaymentDetailView } from "@/components/progress-payments/SubcontractorProgressPaymentDetailView";

// F-TH T4 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). T2'deki liste satırı `/hakedisler/taseron/{id}` linkini zaten
// basıyor.
export default function SubcontractorProgressPaymentDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  return <SubcontractorProgressPaymentDetailView paymentId={paymentId} />;
}
