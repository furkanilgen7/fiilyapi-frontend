"use client";

import { useParams } from "next/navigation";

import { EquipmentDetailView } from "@/components/equipment-detail/EquipmentDetailView";

// F-MKD · `/makine/{id}` — Ekipman Detay (mockup `Makine - Ekipman Detay.dc.html`).
//
// 🔴 Bu segment ÖNCE YOKTU: `[id]/duzenle` vardı ama `[id]` yoktu, yani M2
// formunun üst rotası açılmıyordu. Statik kardeşler (`/makine/yeni`,
// `/makine/kira`, `/makine/calisma`, `/makine/yakit`) App Router'da dinamik
// segmentten ÖNCE eşleşir — `equipment.spec.ts:152` bunu zaten ölçüyor.
export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <EquipmentDetailView equipmentId={id} />;
}
