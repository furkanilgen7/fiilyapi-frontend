import { ApprovalsView } from "@/components/approvals/ApprovalsView";

// F-OK T5 · Onay Kutusu (`projedesign/Onay Kutusu.dc.html`) gerçek rotası.
// Kabuk sidebar'ındaki "Onay Kutusu" girişi (F3'ten beri duruyordu) artık
// catch-all `[...slug]` ComingSoon'una DEĞİL bu statik segmente düşer;
// `nav-config.test.ts`in "statik rotaya düşer" bekçisi bu klasörle yeşile döner.
//
// 🔴 `useSearchParams` KULLANILMIYOR: ekranın URL'de taşınan durumu YOKTUR —
// çalışan tek sekme var (`Benim Onayım`), diğer üçü devre dışı. Bu yüzden
// `<Suspense>` sarmalayıcısı da EKLENMEDİ; gereksiz sınır eklemek `/hazine/
// cek-senet` deseninin gerekçesini (prerender patlaması) taklit ederdi ama
// burada patlatacak bir çağrı yok.
export default function OnayKutusuPage() {
  return <ApprovalsView />;
}
