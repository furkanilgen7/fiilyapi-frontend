import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { RoleResponse } from "@/lib/api/models";

export const ROLES_QUERY_KEY = "roles";

export function useRoles(): UseQueryResult<RoleResponse[], Error> {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/roles", {})),
  });
}
