"use client";

import { useParams } from "next/navigation";

import { SubcontractorProgressPaymentForm } from "@/components/progress-payments/SubcontractorProgressPaymentForm";

// F-TH T3 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). Draft-dışı hakedişte Türkçe uyarı basma sorumluluğu
// `SubcontractorProgressPaymentForm`dadır (brief §Rotalar).
export default function EditSubcontractorProgressPaymentPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  return <SubcontractorProgressPaymentForm mode="edit" paymentId={paymentId} />;
}
