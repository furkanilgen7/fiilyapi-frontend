import { HrDocumentsView } from "@/components/hr-documents/HrDocumentsView";

// F-İK T5 · `/personel/belgeler` — Belge & Sertifika ekranı; kanon
// `İK - Belge Takibi.dc.html`.
//
// Bu dosyanın eklenmesiyle T2'nin GERÇEK yaptığı iki bağlantı (sekme şeridi
// "Belge & Sertifika" + uyarı bandındaki "Belgeleri Gör →") artık [...slug]
// catch-all'a (ComingSoon) DÜŞMEZ.
//
// Ekran süzgeç TAŞIMAZ (özet ucu sorgu parametresi almaz) — `useSearchParams`
// kullanılmadığı için `/personel` sayfasının aksine Suspense sınırı GEREKMEZ.
export default function HrDocumentsPage() {
  return <HrDocumentsView />;
}
