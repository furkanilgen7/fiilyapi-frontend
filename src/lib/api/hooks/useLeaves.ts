import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";

/**
 * F-IZN T3 · `/personel/izinler` (İzin Yönetimi) ekranının İKİ okuma ucu.
 * Yorumlardaki sayılar `İK - İzin Yönetimi.dc.html`in SATIR numaralarıdır.
 *
 * Tipler `pnpm gen:api` çıktısından takma ad olarak alınır (`useHrDocuments.ts`
 * deseni) — elle arayüz yazmak YASAK.
 *
 * ⚠️ İki ayrı istek ZORUNLUDUR ve bu bilinçlidir: KPI'lar + bakiye tablosu
 * (46-50 · 122-170) özet ucundan, onay bekleyen talep tablosu (54-113) ise
 * sayfalanabilir liste ucundan gelir. Özet gövdesinde talep SATIRLARI YOKTUR.
 */
export type HrLeavesSummaryResponse = components["schemas"]["HrLeavesSummaryResponse"];
export type LeaveBalanceResponse = components["schemas"]["LeaveBalanceResponse"];
export type LeaveRequestResponse = components["schemas"]["LeaveRequestResponse"];
export type LeaveRequestListResponse = components["schemas"]["LeaveRequestListResponse"];

export const HR_LEAVES_SUMMARY_QUERY_KEY = "hr-leaves-summary";
export const LEAVE_REQUESTS_QUERY_KEY = "leave-requests";

/**
 * `GET /hr/leaves/summary?year=` — beş KPI (46-50) + bakiye tablosu (122-170).
 *
 * ⚠️ `year` sorgu parametresi 120'deki yıl seçicisine bağlıdır ve sorgu
 * anahtarının PARÇASIDIR: yıl değişince önbellek ayrı bir girdiye düşer,
 * bayat bakiye tablosu ekranda kalmaz.
 *
 * ⚠️ BFF: bu ucun ilk path segmenti "hr"dir ve izin listesinde ZATEN AÇIKtır
 * (F-IZN T2 devri) — ayrı bir kök gerekmez.
 */
export function useHrLeavesSummary(year: number): UseQueryResult<HrLeavesSummaryResponse, Error> {
  return useQuery({
    queryKey: [HR_LEAVES_SUMMARY_QUERY_KEY, year],
    queryFn: async () =>
      unwrap(await backendClient.GET("/hr/leaves/summary", { params: { query: { year } } })),
  });
}

/**
 * `GET /leave-requests?status=pending` — 54-113 "Onay Bekleyen İzin Talepleri".
 *
 * 🔴 K3: bu ekran YALNIZ `pending` listeler. `approved`/`rejected` sekmesi ya da
 * durum süzgeci İCAT EDİLMEZ (mockup'ta yoktur); istek durumu SABİTtir, çağıran
 * onu değiştiremesin diye parametre bile almaz.
 */
export function usePendingLeaveRequests(): UseQueryResult<LeaveRequestListResponse, Error> {
  return useQuery({
    queryKey: [LEAVE_REQUESTS_QUERY_KEY, "pending"],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/leave-requests", { params: { query: { status: "pending" } } }),
      ),
  });
}
