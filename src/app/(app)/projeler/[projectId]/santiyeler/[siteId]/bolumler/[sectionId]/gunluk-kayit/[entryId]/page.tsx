import { SiteDiaryDetailView } from "@/components/site-diary-detail/SiteDiaryDetailView";

// DET-1.2 · Günlük kayıt salt okunur detayı. Bölüm Detay deseni: sayfa yalnız
// orkestrasyon bileşenini bağlar — kabuk `[projectId]/layout.tsx`nin sahibi,
// bu rota KENDİ LAYOUT'UNU KURMAZ. Slug/UUID çözümü bileşendedir.
export default function SiteDiaryDetailPage() {
  return <SiteDiaryDetailView />;
}
