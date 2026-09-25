import { Suspense } from "react";

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
//
// PLN-F3.0 · `?tarih=` çekirdeğe (`DiaryEntryScreen`, ortak gövde) girdi:
// artık BURADA DA `useSearchParams` çağrılıyor (kök `/gunluk-kayit/page.tsx`
// ile aynı sebep) — Next 15 App Router kuralı gereği Suspense sınırı EKLENDİ
// (kök sayfanın deseni). `pnpm build` bu ajanda KOŞULMADI (sözleşme §3.9) —
// lider doğrular.
export default function SiteDiaryPage() {
  return (
    <Suspense>
      <SiteDiaryProgressView />
    </Suspense>
  );
}
