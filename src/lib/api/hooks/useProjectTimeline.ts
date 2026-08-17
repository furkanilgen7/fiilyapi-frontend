import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

/**
 * F-TKV T1 — Proje Takvimi (Gantt) portföy ucu: `GET /projects/timeline` (P11).
 *
 * Uç HAM veri döner ve **hiçbir sorgu parametresi almaz** (şema açıklaması:
 * "ay izgarasi, zoom kipi ve bar genisligi ISTEMCI isidir") → sorgu anahtarı
 * süzgeç taşımaz.
 *
 * 🔴 `today` SUNUCU damgasıdır (`core.timezone`). İstemcinin `new Date()`ine
 * bırakılırsa TR gecesi 00:00-03:00 arasında "bugün" çizgisi bir gün kayar —
 * bu yüzden bugün çizgisi de "geçti mi" türevleri de HEP bu alandan okunur.
 *
 * BFF kökü `projects` zaten izinlidir (`route.ts:12`) — yeni kök gerekmez.
 */
export type ProjectTimelineResponse = components["schemas"]["ProjectTimelineResponse"];
export type TimelineProject = components["schemas"]["TimelineProject"];
export type TimelineSection = components["schemas"]["TimelineSection"];
export type TimelineMilestone = components["schemas"]["TimelineMilestone"];

export const PROJECT_TIMELINE_QUERY_KEY = "project-timeline";

export function useProjectTimeline(): UseQueryResult<ProjectTimelineResponse, Error> {
  return useQuery({
    queryKey: [PROJECT_TIMELINE_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/projects/timeline", {})),
  });
}
