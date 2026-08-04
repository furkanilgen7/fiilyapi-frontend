import { SiteDiarySummaryView } from "@/components/site-diary/SiteDiarySummaryView";

// F-SD T4 · "Hakediş Özeti" modunun gerçek rotası (spec §1). "Kayıt Gir"
// sayfasıyla aynı desen: sayfa KENDİ LAYOUT'UNU KURMAZ, drill sidebar
// `[projectId]/layout.tsx`ten gelir.
export default function SiteDiarySummaryPage() {
  return <SiteDiarySummaryView />;
}
