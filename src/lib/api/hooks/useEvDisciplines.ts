import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type {
  EvDisciplineCreate,
  EvDisciplineRead,
  EvDisciplineUpdate,
} from "@/lib/api/models";

import { EV_CATALOG_QUERY_KEY } from "./useEvCatalog";

/**
 * PLN-F1.5 · Şirket disiplin listesi (K2) — GENEL API.
 *
 * İki tüketici: Birim Oran Kataloğu (Disiplin yönetimi modalı, M6) ve
 * Adam-Saat Bütçesi (BOQ grubu → disiplin seçici). Bu yüzden okuma
 * (`useEvDisciplines`) ile mutasyonlar AYRI export edilir; seçici yalnız
 * listeyi çeker, yazma kancalarını hiç bağlamaz.
 */
export const EV_DISCIPLINES_QUERY_KEY = "ev-disciplines";

export function useEvDisciplines(): UseQueryResult<EvDisciplineRead[], Error> {
  return useQuery({
    queryKey: [EV_DISCIPLINES_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/earned-value/disciplines", {})),
  });
}

/** Katalog satırları disiplin adını/rengini gömer → ikisi birlikte tazelenir. */
function invalidateDisciplineViews(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: [EV_DISCIPLINES_QUERY_KEY] }),
    qc.invalidateQueries({ queryKey: [EV_CATALOG_QUERY_KEY] }),
  ]);
}

export interface UpdateEvDisciplineVars {
  id: string;
  body: EvDisciplineUpdate;
}

export function useCreateEvDiscipline(): UseMutationResult<EvDisciplineRead, Error, EvDisciplineCreate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: EvDisciplineCreate) =>
      unwrap(await backendClient.POST("/earned-value/disciplines", { body })),
    onSuccess: () => invalidateDisciplineViews(qc),
  });
}

/** Kısmi güncelleme — kod kullanımdayken de değişebilir (§3.10 F0-7). */
export function useUpdateEvDiscipline(): UseMutationResult<
  EvDisciplineRead,
  Error,
  UpdateEvDisciplineVars
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: UpdateEvDisciplineVars) =>
      unwrap(
        await backendClient.PATCH("/earned-value/disciplines/{discipline_id}", {
          params: { path: { discipline_id: id } },
          body,
        }),
      ),
    onSuccess: () => invalidateDisciplineViews(qc),
  });
}

/** Yalnız kullanılmayan disiplin silinir (B1-9, `admin`); kullanımdaysa 409. */
export function useDeleteEvDiscipline(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(
        await backendClient.DELETE("/earned-value/disciplines/{discipline_id}", {
          params: { path: { discipline_id: id } },
        }),
      );
    },
    onSuccess: () => invalidateDisciplineViews(qc),
  });
}
