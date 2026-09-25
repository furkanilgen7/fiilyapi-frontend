import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { EvCodeNode, EvDayView, EvPreviousAllocation } from "@/lib/api/models";

// PLN-F2.1 · Saha (Günlük Kayıt — İlerleme) OKUMA sorguları — backend B2
// `earned_value/day_router`. PLANLAMA tarafıdır: çekirdek günlük ekranı bu
// dosyayı import ETMEZ (spec §2.7); yalnız adaptör (F2.3) kullanır.
//
// Anahtar biçimi: `[KÖK, siteId, …]` — yazma hook'ları (`useEvDayMutations`)
// `[KÖK, siteId]` önekiyle tazeler.

/** Saha sorgu anahtarlarının TEK kaynağı. */
export const EV_DAY_KEYS = {
  /** `GET /days/{day}` — `[day, siteId, day]`. */
  day: "ev-day",
  /** `GET /code-tree` — `[codeTree, siteId]`. */
  codeTree: "ev-code-tree",
  /** `GET /days/{day}/previous-allocation` — `[previousAllocation, siteId, day]`. */
  previousAllocation: "ev-day-previous-allocation",
} as const;

/**
 * `GET /sites/{id}/earned-value/days/{day}` — günün saat dağıtımı: kişi/firma
 * satırları × iş kodları × hücreler, 4'lü şerit toplamları, "⚠ Puantaj
 * değişti" (`rows[].changed`), kilit bandı, gün/hafta no, motorun bugünkü
 * kazanılmış/harcanan/PF'si ve Gönder kontrol listesi. İstemci HESAPLAMAZ.
 */
export function useEvDay(siteId: string, day: string): UseQueryResult<EvDayView, Error> {
  return useQuery({
    enabled: siteId.length > 0 && day.length > 0,
    queryKey: [EV_DAY_KEYS.day, siteId, day],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/days/{day}", {
          params: { path: { site_id: siteId, day } },
        }),
      ),
  });
}

/**
 * `GET /sites/{id}/earned-value/code-tree` — "+ İş kodu ekle" seçicisi.
 * Oransız yaprak `has_rate === false` gelir (seçicide pasif basılır).
 * `enabled` popover açılınca istemek içindir.
 */
export function useEvCodeTree(siteId: string, enabled = true): UseQueryResult<EvCodeNode[], Error> {
  return useQuery({
    enabled: enabled && siteId.length > 0,
    queryKey: [EV_DAY_KEYS.codeTree, siteId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/code-tree", {
          params: { path: { site_id: siteId } },
        }),
      ),
  });
}

/**
 * `GET /sites/{id}/earned-value/days/{day}/previous-allocation` — "Dünkü
 * dağılımı kopyala": son GÖNDERİLMİŞ günün kişi × kod PAYLARI. Doldurma
 * istemcide yapılır (paylar bugünün saatleriyle çarpılır); kaydetmek yine
 * `PUT allocation`dır. Varsayılan KAPALI — düğmeye basınca istenir.
 */
export function usePreviousAllocation(
  siteId: string,
  day: string,
  enabled = false,
): UseQueryResult<EvPreviousAllocation, Error> {
  return useQuery({
    enabled: enabled && siteId.length > 0 && day.length > 0,
    queryKey: [EV_DAY_KEYS.previousAllocation, siteId, day],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/sites/{site_id}/earned-value/days/{day}/previous-allocation", {
          params: { path: { site_id: siteId, day } },
        }),
      ),
  });
}
