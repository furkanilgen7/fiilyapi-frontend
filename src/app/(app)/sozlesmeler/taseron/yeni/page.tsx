import { SubcontractorContractCreateView } from "@/components/subcontractor-contract-form";

// F-P5 T6 · FSO (`/sozlesmeler/taseron/yeni`) — Yeni Taşeron Sözleşmesi formu
// (`Form - Sözleşme Oluştur.dc.html`). SZL'nin taşeron sekmesindeki
// "+ Yeni Sözleşme" düğmesinin hedefi (spec §7 S2). Bu gerçek segment
// `[...slug]` catch-all'ını bu yol için devre dışı bırakır.
//
// `useSearchParams` KULLANILMAZ (form durumu bileşenin içindedir) — Suspense
// sınırı gerekmez.
export default function YeniTaseronSozlesmesiPage() {
  return <SubcontractorContractCreateView />;
}
