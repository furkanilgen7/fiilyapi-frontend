import { SiteDiaryDetailProgressView } from "@/components/earned-value/diary-detail/DiaryDetailProgressAdapter";

// DET-1.2 · Günlük kayıt salt okunur detayı. Bölüm Detay deseni: sayfa yalnız
// orkestrasyon bileşenini bağlar — kabuk `[projectId]/layout.tsx`nin sahibi,
// bu rota KENDİ LAYOUT'UNU KURMAZ. Slug/UUID çözümü bileşendedir.
// DET-1.3 · §2.7: planlama adaptörü çekirdek görünümü SARAR (günlük ekranı
// emsali `gunluk-kayit/page.tsx`); planlama kurulu değilse burada doğrudan
// `SiteDiaryDetailView` basılır.
export default function SiteDiaryDetailPage() {
  return <SiteDiaryDetailProgressView />;
}
