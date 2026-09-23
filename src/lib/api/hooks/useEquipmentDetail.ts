import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { EquipmentResponse } from "./useEquipment";

// F-MK T3 · Ekipman düzenleme kipinin künye sorgusu — `usePersonnelDetail.ts`
// deseniyle AYNI: boş id ile ağa ÇIKILMAZ (form `create` kipinde de bu hook'u
// koşulsuz çağırır, Rules of Hooks gereği).
//
// `GET /equipment/{equipment_id}` yanıtı liste ögesiyle AYNI şemadır
// (`EquipmentResponse`) — ikinci bir takma ad türetilmez.
//
// 🔴 KAYIT 448: bu tipin adı BİLEREK `EquipmentDetailResponse` DEĞİLDİR —
// openapi'nin ÜRETTİĞİ `components["schemas"]["EquipmentDetailResponse"]`
// (schema.d.ts) TAMAMEN FARKLI bir gövdedir (as_of/equipment/maintenance/
// rental, bkz. `useEquipmentDetailScreen.ts`). Aynı adı burada da kullanmak
// iki farklı şekli aynı isim altında gizlerdi.
export type EquipmentEditResponse = EquipmentResponse;

export const EQUIPMENT_DETAIL_QUERY_KEY = "equipment-detail";

export function useEquipmentDetail(
  equipmentId: string,
): UseQueryResult<EquipmentEditResponse, Error> {
  return useQuery({
    enabled: equipmentId.length > 0,
    queryKey: [EQUIPMENT_DETAIL_QUERY_KEY, equipmentId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/equipment/{equipment_id}", {
          params: { path: { equipment_id: equipmentId } },
        }),
      ),
  });
}
