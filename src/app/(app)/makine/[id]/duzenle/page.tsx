"use client";

import { useParams } from "next/navigation";

import { EquipmentForm } from "@/components/equipment-form/EquipmentForm";

// F-MK T3 · "Ekipmanı Düzenle" rotası (spec K4) — M1 kartındaki "Düzenle"
// eylemi buraya gelir.
//
// 🔴 F-MKD güncellemesi: "Ekipman DETAY sayfası YOKTUR" cümlesi KALDIRILDI —
// `Makine - Ekipman Detay.dc.html` mockup'ı VAR, `MK-4` backend'i
// (`GET /equipment/{id}/detail`) canlıda ve `/makine/{id}` bu turda yazıldı.
// Bayat bir gerekçe, artık çalışan bir ekranı yalanlar (F-PRJTAB kanonu).
//
// `EquipmentForm` `useSearchParams` KULLANMAZ (dönüş rotası sabittir:
// `/makine`), bu yüzden Suspense sınırı gerekmez.
export default function EditEquipmentPage() {
  const { id } = useParams<{ id: string }>();
  return <EquipmentForm mode="edit" equipmentId={id} />;
}
