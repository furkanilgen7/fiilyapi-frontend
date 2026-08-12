import { StockEntryForm } from "@/components/stock-entry-form/StockEntryForm";

// F-ST T4 · Stok Girişi rotası (spec §5 S4). Özel segment `[...slug]`
// catch-all'ından her zaman ÖNCE eşleşir (Next.js App Router), yani form
// ComingSoon'a DÜŞMEZ. Şantiye bağlamı ROTADAN gelir — query parametresi YOK
// (T3'ten devralınan sözleşme, `siteStockEntryHref`).
export default function SiteStockEntryPage() {
  return <StockEntryForm />;
}
