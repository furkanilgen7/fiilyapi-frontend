import { ReportsCatalogView } from "@/components/reports/ReportsCatalogView";

/**
 * F-RAPOR T3 · `/raporlar` GERÇEK rotası (mockup `Raporlar.dc.html`).
 *
 * KÖK OLAY: kabuk sidebar'ında "Raporlar" girişi F3 kabuk canon'undan beri
 * duruyordu (`nav-config.ts:37` → `routes.reports()`) ama bu klasör YOKTU;
 * yol `[...slug]` catch-all'ına düşüyor ve kullanıcıya 404 değil "yakında"
 * gösteriyordu — yani ÖLÜ BİR LİNKTİ. Bu segment catch-all'ı devre dışı
 * bırakır (Next.js App Router: özel segment her zaman catch-all'dan önce
 * eşleşir); `page.test.tsx` ve `nav-config.test.ts`in "statik rotaya düşer"
 * bekçisi bunu doğrular.
 *
 * 🔴 `useSearchParams` KULLANILMIYOR: ekranın URL'de taşınan durumu YOKTUR
 * (proje süzgeci devre dışıdır, seçim saklanmaz). Bu yüzden `<Suspense>`
 * sarmalayıcısı da EKLENMEDİ — `/onay-kutusu` deseni.
 */
export default function RaporlarPage() {
  return <ReportsCatalogView />;
}
