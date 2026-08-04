import { SiteDiaryEntryView } from "@/components/site-diary/SiteDiaryEntryView";

// F-SD T2 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). Sayfa KENDİ LAYOUT'UNU KURMAZ, drill sidebar
// `[projectId]/layout.tsx`'ten gelir (hakedisler/is-kalemleri deseni).
export default function SiteDiaryPage() {
  return <SiteDiaryEntryView />;
}
