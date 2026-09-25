import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { backendErrorMessage } from "@/lib/api/error-message";
import { unwrap } from "@/lib/api/unwrap";
import type { EvAllocationSave, EvDayLock, EvDayView } from "@/lib/api/models";

import { EV_DAY_KEYS } from "./useEvDay";
import { SITE_DIARY_ENTRIES_QUERY_KEY, SITE_DIARY_ENTRY_QUERY_KEY } from "./useSiteDiary";
import { TIMESHEET_QUERY_KEY, TIMESHEET_WEEK_QUERY_KEY } from "./useTimesheet";

// PLN-F2.1 · Saha YAZMA uçları (planlama tarafı). Planlama çekirdek anahtarlarını
// bilebilir (yön planlama → çekirdek); tersi YASAK (spec §2.7).

/** Ağ/gövdesiz hatada basılacak sabit metin. */
export const DAY_ALLOCATION_SAVE_FALLBACK = "Saat dağıtımı kaydedilemedi.";

/**
 * Dağıtım kaydı hatasının Türkçe metni. Backend 409'ları ("gün kilitli",
 * "baseline yok", "tamamlanmış şantiye") Türkçe `detail` taşır — ekran onu
 * AYNEN basar; istemci kendi cümlesini uydurmaz.
 */
export function dayAllocationErrorMessage(error: unknown): string {
  return backendErrorMessage(error, DAY_ALLOCATION_SAVE_FALLBACK);
}

/**
 * `PUT /sites/{id}/earned-value/days/{day}/allocation` — TAM DEĞİŞTİRME:
 * gövdede olmayan kod/hücre SİLİNİR. Gövde çağıranın kurduğu kümedir; hook
 * hiçbir şey kırpmaz/eklemez. Yanıt güncel `DayView`dır → gün anahtarına
 * YAZILIR (ikinci GET yok). Kopya kaynağı (son gönderilmiş gün) değişmiş
 * olabileceği için önceki-dağılım anahtarları tazelenir.
 */
export function useSaveDayAllocation(
  siteId: string,
  day: string,
): UseMutationResult<EvDayView, Error, EvAllocationSave> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(
        await backendClient.PUT("/sites/{site_id}/earned-value/days/{day}/allocation", {
          params: { path: { site_id: siteId, day } },
          body,
        }),
      ),
    onSuccess: (view) => {
      client.setQueryData([EV_DAY_KEYS.day, siteId, day], view);
      void client.invalidateQueries({ queryKey: [EV_DAY_KEYS.previousAllocation, siteId] });
    },
  });
}

/**
 * `POST /sites/{id}/earned-value/days/{day}/unlock` — "Kilidi aç (yetkili)",
 * gerekçeli, GÜN düzeyi (approve). Kilit günlüğü VE puantajı bağladığı için
 * başarıda gün görünümü, şantiyenin günlük sorguları ve puantaj sorguları
 * tazelenir. Tekil günlük anahtarı kayıt kimliğiyle kurulduğundan (gün değil)
 * kök önekiyle tazelenir.
 */
export function useUnlockDay(
  siteId: string,
  day: string,
): UseMutationResult<EvDayLock, Error, string> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (reason) =>
      unwrap(
        await backendClient.POST("/sites/{site_id}/earned-value/days/{day}/unlock", {
          params: { path: { site_id: siteId, day } },
          body: { reason },
        }),
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [EV_DAY_KEYS.day, siteId, day] });
      void client.invalidateQueries({ queryKey: [SITE_DIARY_ENTRIES_QUERY_KEY, siteId] });
      void client.invalidateQueries({ queryKey: [SITE_DIARY_ENTRY_QUERY_KEY] });
      void client.invalidateQueries({ queryKey: [TIMESHEET_WEEK_QUERY_KEY, siteId] });
      void client.invalidateQueries({ queryKey: [TIMESHEET_QUERY_KEY, siteId] });
    },
  });
}
