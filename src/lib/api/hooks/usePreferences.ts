import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { PreferencesRead, PreferencesUpdate } from "@/lib/api/models";

export const PREFERENCES_QUERY_KEY = "preferences";

export function usePreferences(): UseQueryResult<PreferencesRead, Error> {
  return useQuery({
    queryKey: [PREFERENCES_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/settings/preferences", {})),
  });
}

export function useUpdatePreferences(): UseMutationResult<PreferencesRead, Error, PreferencesUpdate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: PreferencesUpdate) =>
      unwrap(await backendClient.PUT("/settings/preferences", { body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PREFERENCES_QUERY_KEY] });
    },
  });
}
