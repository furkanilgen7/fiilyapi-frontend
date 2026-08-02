"use client";

import { useParams } from "next/navigation";

import { ProgressPaymentForm } from "@/components/progress-payments/ProgressPaymentForm";

// P7 T5 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). Draft-dışı hakedişte Türkçe uyarı basma sorumluluğu
// `ProgressPaymentForm`dadır (brief §Rotalar).
export default function EditProgressPaymentPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  return <ProgressPaymentForm mode="edit" paymentId={paymentId} />;
}
