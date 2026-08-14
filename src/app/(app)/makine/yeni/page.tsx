import { EquipmentForm } from "@/components/equipment-form/EquipmentForm";

// F-MK T3 · "Yeni Makine / Ekipman" tam sayfa formu (M2) — `EquipmentForm`ın
// `create` kipi. Düzenleme kipi `/makine/[id]/duzenle` rotasındadır ve AYNI
// bileşendir (spec K4, `PersonnelForm` iki-kip emsali).
export default function EquipmentCreatePage() {
  return <EquipmentForm mode="create" />;
}
