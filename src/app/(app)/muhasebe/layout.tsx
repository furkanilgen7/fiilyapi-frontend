import { MuhasebeSidebar } from "@/components/accounting/shell/MuhasebeSidebar";

/**
 * F-MU1 T3 · `/muhasebe` grubunun drill-in kabuğu (Ayarlar emsali:
 * `app/(app)/ayarlar/layout.tsx`).
 *
 * 🔴 Sidebar GRUBUN TAMAMINA uygulanır — köke (`/muhasebe`) de,
 * `/muhasebe/hesap-plani`ye de. Gerekçesi `MuhasebeSidebar` başlığındadır
 * (E8'in kendi sidebar çizimi Hesap Planı'na hiçbir yol göstermiyor =
 * mockup boşluğu; ONAYLI SAPMA ADAYI).
 */
export default function MuhasebeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MuhasebeSidebar />
      <div className="muhasebe-content">{children}</div>
    </>
  );
}
