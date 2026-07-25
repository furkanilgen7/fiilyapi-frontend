import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { NotificationPrefItem, NotificationPrefsUpdate } from "@/lib/api/models";

export const NOTIF_QUERY_KEY = "notification-prefs";

export function useNotificationPrefs(): UseQueryResult<NotificationPrefItem[], Error> {
  return useQuery({
    queryKey: [NOTIF_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/settings/notifications", {})),
  });
}

export function useUpdateNotificationPrefs(): UseMutationResult<NotificationPrefItem[], Error, NotificationPrefsUpdate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: NotificationPrefsUpdate) => unwrap(await backendClient.PUT("/settings/notifications", { body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTIF_QUERY_KEY] });
    },
  });
}
