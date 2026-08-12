import { SiteStockView } from "@/components/stock/SiteStockView";

// F-ST T3 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir), yani "Stok" sekmesi artık ComingSoon'a DÜŞMEZ. Sayfa KENDİ
// LAYOUT'UNU KURMAZ; drill sidebar `[projectId]/layout.tsx`ten gelir
// (belgeler/gunluk-kayit/puantaj deseni).
export default function SiteStockPage() {
  return <SiteStockView />;
}
