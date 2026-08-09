import { SubcontractorsView } from "@/components/subcontractors/SubcontractorsView";

// F-P5 T5 · TL (`/sozlesmeler/taseronlar`) — SZL'nin taşeron sekmesindeki
// "Taşeron Firmaları →" girişinin hedefi. Bu gerçek segment `[...slug]`
// catch-all'ını bu yol için devre dışı bırakır (özel segment her zaman
// catch-all'dan önce eşleşir), yani rota artık ComingSoon DEĞİL.
//
// `useSearchParams` KULLANILMAZ (süzgeç state'i bileşen içindedir, URL'de
// değil) — bu yüzden Suspense sınırı gerekmez.
export default function TaseronlarPage() {
  return <SubcontractorsView />;
}
