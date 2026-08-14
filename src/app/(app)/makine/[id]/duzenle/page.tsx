"use client";

import { useParams } from "next/navigation";

import { EquipmentForm } from "@/components/equipment-form/EquipmentForm";

// F-MK T3 · "Ekipmanı Düzenle" rotası (spec K4) — M1 kartındaki "Düzenle"
// eylemi buraya gelir. Ekipman DETAY sayfası YOKTUR ve bu bilinçlidir:
// hiçbir mockup detay sayfası çizmiyor, ama `PATCH /equipment/{id}` ucu var
// ve kullanıcının kart bilgisini düzeltmesi için başka yol yok.
//
// `EquipmentForm` `useSearchParams` KULLANMAZ (dönüş rotası sabittir:
// `/makine`), bu yüzden Suspense sınırı gerekmez.
export default function EditEquipmentPage() {
  const { id } = useParams<{ id: string }>();
  return <EquipmentForm mode="edit" equipmentId={id} />;
}
