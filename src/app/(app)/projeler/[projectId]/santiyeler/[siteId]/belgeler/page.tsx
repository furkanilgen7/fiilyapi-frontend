import { SiteDocumentsView } from "@/components/site-documents/SiteDocumentsView";

// F-BC T2 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). Sayfa KENDİ LAYOUT'UNU KURMAZ, drill sidebar
// `[projectId]/layout.tsx`'ten gelir (gunluk-kayit/puantaj deseni).
export default function SiteDocumentsPage() {
  return <SiteDocumentsView />;
}
