import { PersonnelDetailView } from "@/components/personnel-detail/PersonnelDetailView";

// F-PT2 T3 · `/personel/[id]` detay ekranı — kanon `Personel Detay.dc.html`.
//
// ⚠️ Next.js App Router'da statik `yeni/` segmenti dinamik `[id]`den ÖNCE
// eşleşir — bu rota `/personel/yeni`yi ÇALMAZ (build kapısında doğrulanır).
export default function PersonnelDetailPage() {
  return <PersonnelDetailView />;
}
