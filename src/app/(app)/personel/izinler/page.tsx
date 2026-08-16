import { LeavesView } from "@/components/leaves/LeavesView";

// F-IZN T3 · `/personel/izinler` — İzin Yönetimi ekranı; kanon
// `İK - İzin Yönetimi.dc.html`.
//
// Ekran sorgu parametresi TAŞIMAZ (yıl seçici bileşen durumudur, URL'ye
// yazılmaz) — `useSearchParams` kullanılmadığı için `/personel` sayfasının
// aksine Suspense sınırı GEREKMEZ.
//
// Karar geri çağrıları (onay/red diyalogları) T4'te bağlanır; bağlanana kadar
// düğmeler devre-dışı basılır ve gerekçe ekranda okunur.
export default function LeavesPage() {
  return <LeavesView />;
}
