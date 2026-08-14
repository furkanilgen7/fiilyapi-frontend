import { EquipmentView } from "@/components/equipment/EquipmentView";

// F-MK T2 · M1 (Ekipman Listesi) gerçek rotası — özel segment catch-all'dan
// önce eşleşir (Next.js App Router kanonu, `/stok` deseni), yani kabuk
// sidebar'ındaki "Makine & Ekipman" artık ComingSoon'a DÜŞMEZ.
export default function MakinePage() {
  return <EquipmentView />;
}
