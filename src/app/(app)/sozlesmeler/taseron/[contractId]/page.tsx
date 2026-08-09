import { SubcontractorContractDetailView } from "@/components/contracts/SubcontractorContractDetailView";

// F-P5 T7 · TSD (`/sozlesmeler/taseron/[contractId]`) — Taşeron Sözleşme
// Detayı (`Taşeron Sözleşme Detay.dc.html`). Segment SÖZLEŞME kimliğidir.
// Buraya ZATEN link basan iki yüzey var (T2 SZL taşeron satırları, T5 TL
// "Detay →") ve F-TH'nin devre-dışı "Sözleşmeyi Gör" linkleri bu rota
// yazıldığı için aktifleşti.
//
// `/sozlesmeler/taseron/yeni` STATİK segmenti bu dinamik segmentten önce
// eşleşir (Next.js kuralı) — FSO formu etkilenmez.
//
// `useSearchParams` KULLANILMAZ (ekranda URL durumu yok) — Suspense sınırı
// gerekmez.
export default async function TaseronSozlesmeDetayPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;
  return <SubcontractorContractDetailView contractId={contractId} />;
}
