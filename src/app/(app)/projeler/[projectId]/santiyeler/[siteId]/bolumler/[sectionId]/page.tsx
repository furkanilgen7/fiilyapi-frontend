import { SectionDetailView } from "@/components/section-detail/SectionDetailView";

// Bölüm Detay rotası (F-P6 T2). Sayfa yalnız orkestrasyon bileşenini
// bağlar — kabuk (drill sidebar/topbar) `[projectId]/layout.tsx`nin sahibi,
// bu rota KENDİ LAYOUT'UNU KURMAZ (site-detail/is-kalemleri deseniyle aynı).
export default function SectionDetailPage() {
  return <SectionDetailView />;
}
