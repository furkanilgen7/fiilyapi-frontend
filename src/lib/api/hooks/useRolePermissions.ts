import { useQuery, useQueries } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { PermissionCell } from "@/lib/api/models";

export const ROLE_PERMISSIONS_QUERY_KEY = "role-permissions";

export function rolePermissionsQueryOptions(roleId: string) {
  return {
    queryKey: [ROLE_PERMISSIONS_QUERY_KEY, roleId],
    queryFn: async (): Promise<PermissionCell[]> =>
      unwrap(
        await backendClient.GET("/roles/{role_id}/permissions", {
          params: { path: { role_id: roleId } },
        }),
      ),
  };
}

export function useRolePermissions(roleId: string) {
  return useQuery(rolePermissionsQueryOptions(roleId));
}

// Roller icin paralel query'ler — useQueries degisken uzunluklu diziyi destekler.
export function useAllRolePermissions(roleIds: string[]) {
  return useQueries({ queries: roleIds.map(rolePermissionsQueryOptions) });
}
