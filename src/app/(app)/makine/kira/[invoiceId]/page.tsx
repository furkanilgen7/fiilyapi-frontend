import { EquipmentRentalInvoiceDetailView } from "@/components/equipment-rental/EquipmentRentalInvoiceDetailView";

// F-KIRA · `/makine/kira/[invoiceId]` — `Makine - Kira Hakedişi.dc.html` (M5)
// doğrulama ekranı. Next 15'te `params` bir Promise'tir.
export default async function EquipmentRentalInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  return <EquipmentRentalInvoiceDetailView invoiceId={invoiceId} />;
}
