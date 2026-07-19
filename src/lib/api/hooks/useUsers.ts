import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { UserListResponse } from "@/lib/api/models";

export const USERS_QUERY_KEY = "users";
export const PAGE_SIZE = 20;

export function useUsers(params: { limit: number; offset: number }): UseQueryResult<UserListResponse, Error> {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, params.limit, params.offset],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/users", {
          params: { query: { limit: params.limit, offset: params.offset } },
        }),
      ),
  });
}
