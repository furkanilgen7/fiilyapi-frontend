import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

import { PROJECT_BLOCKS_QUERY_KEY, type BlockResponse } from "./useProjectBlocks";
import { PROJECT_UNITS_QUERY_KEY, type UnitResponse } from "./useProjectUnits";
import { SALES_SUMMARY_QUERY_KEY } from "./useSalesSummary";

/**
 * F-UNIT1 T2 · `units` modülünün YAZMA yüzeyi — bu dilimde İKİ mutasyon vardır:
 * blok oluşturma (BE formu) ve ünite oluşturma (UE formu).
 *
 * ⚠️ KALICI SINIR: `PATCH /blocks/{id}`, `PATCH /units/{id}`, `DELETE`ler ve
 * toplu üretim/içe aktarma uçları (`.../units/bulk`, `.../units/import`) için
 * hook YAZILMAZ — düzenleme ekranının mockup'ı bu dilimde yoktur, toplu üretim
 * F-UNIT2'nin kapsamıdır. Buraya bir güncelleme/silme hook'u eklemek ekran
 * icadıdır (`useSaleMutations` emsali).
 *
 * ⚠️ BFF İZİN LİSTESİ: iki uç da `projects` segmentiyle başlar ve o kök
 * `ALLOWED_ROOTS`ta ZATEN tanımlıdır. `blocks`/`units` kökleri EKLENMEZ: bu
 * dilimde onları çağıran kod yoktur ve çağıranı olmayan kök BEKÇİSİZDİR
 * (F-MT2 kanonu).
 *
 * ⚠️ ÜRETİLMİŞ TİP TUZAĞI: `sort_order` (ikisinde de) ve `sales_status`
 * (`UnitCreate`) şemada varsayılanlıdır ama `openapi-typescript` çıktısında
 * ZORUNLU görünür; gövdeyi kuran `build-body.ts` üçünü de AÇIKÇA verir.
 */
export type BlockCreate = components["schemas"]["BlockCreate"];
export type UnitCreate = components["schemas"]["UnitCreate"];

/**
 * Blok ya da ünite yazıldığında SUNUCU TÜREVİ taşıyan her şey bayatlar: blok
 * listesi (`estimated_unit_count` + `counts`), ünite ızgarası ve satış KPI
 * özeti (`available_units` ünite sayısından türer). Üçü BİRLİKTE geçersiz
 * kılınır — biri unutulursa ekran eski sayıyı basmaya devam eder
 * (`invalidateSaleDerived` deseni).
 */
function invalidateUnitDerived(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: [PROJECT_BLOCKS_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [PROJECT_UNITS_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [SALES_SUMMARY_QUERY_KEY] });
}

export interface CreateBlockVariables {
  projectId: string;
  body: BlockCreate;
}

/**
 * Yeni blok (`POST /projects/{project_id}/blocks`, BE formu).
 *
 * Gövdenin tek ZORUNLU alanı `name`dir; `site_id` bile opsiyoneldir — uç
 * açıklaması gerekçeyi kendi yazıyor: *"Tek santiyeli projede `site_id`
 * gonderilmezse otomatik atanir"*. Çok şantiyeli projede eksik `site_id` 422
 * döner ve bu hata YUTULMAZ, çağırana aynen iletilir (BE 68'in "seçim zorunlu"
 * ipucu bunun UI karşılığıdır, istemci tarafı reddi DEĞİL).
 */
export function useCreateBlock(): UseMutationResult<BlockResponse, Error, CreateBlockVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, body }) =>
      unwrap(
        await backendClient.POST("/projects/{project_id}/blocks", {
          params: { path: { project_id: projectId } },
          body,
        }),
      ),
    onSuccess: () => invalidateUnitDerived(queryClient),
  });
}

export interface CreateUnitVariables {
  projectId: string;
  body: UnitCreate;
}

/**
 * Yeni ünite (`POST /projects/{project_id}/units`, UE formu).
 *
 * Gövdede `site_id` YOKTUR: şantiye BLOK ÜZERİNDEN türetilir (`units/models.py`
 * — *"tek otorite `blocks`"*). `block_id` bu projeye ait değilse sunucu 404
 * döner (IDOR-9); hata yutulmaz.
 */
export function useCreateUnit(): UseMutationResult<UnitResponse, Error, CreateUnitVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, body }) =>
      unwrap(
        await backendClient.POST("/projects/{project_id}/units", {
          params: { path: { project_id: projectId } },
          body,
        }),
      ),
    onSuccess: () => invalidateUnitDerived(queryClient),
  });
}
