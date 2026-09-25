import { SiteDiaryProgressView } from "@/components/earned-value/diary/DiaryProgressAdapter";

// F-SD T2 · gerçek rota — [...slug] catch-all'ı bu segment için devre dışı
// bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
// eşleşir). Sayfa KENDİ LAYOUT'UNU KURMAZ, drill sidebar
// `[projectId]/layout.tsx`'ten gelir (hakedisler/is-kalemleri deseni).
//
// PLN-F2.3 · Çekirdek sarmalayıcı (`SiteDiaryEntryView`) yerine planlama
// ADAPTÖRÜ basılır (spec §2.7, tek işaretli dosya `DiaryProgressAdapter`):
// adaptör çekirdeği sarar, EV'si olmayan şantiyede uzantı vermez. Planlama
// modülü kurulmayan müşteride bu satır yeniden `SiteDiaryEntryView` olur.
export default function SiteDiaryPage() {
  return <SiteDiaryProgressView />;
}
