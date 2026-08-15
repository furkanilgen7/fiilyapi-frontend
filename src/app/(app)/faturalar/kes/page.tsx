import { InvoiceCreateView } from "@/components/invoices/InvoiceCreateView";

// F-FAT2 T2 · FK (Fatura - Kes) gerçek rotası. `/faturalar/[invoiceId]`
// dinamik segmentinden ÖNCE eşleşir (Next.js: statik segment önceliklidir),
// yani "kes" bir fatura kimliği sanılmaz.
export default function FaturaKesPage() {
  return <InvoiceCreateView />;
}
