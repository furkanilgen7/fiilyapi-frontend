"use client";

import { useParams } from "next/navigation";

import { InvoiceDetailView } from "@/components/invoices/InvoiceDetailView";

// F-FAT2 T2 · FGI/FGE detayı TEK rotadadır; gelen/giden ayrımı
// `InvoiceDetailResponse.direction`tan gelir (`ProgressPaymentDetailPage`
// deseni). İki ayrı rota yazmak aynı kalem tablosunun iki kopyasını doğururdu.
export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  return <InvoiceDetailView invoiceId={invoiceId} />;
}
