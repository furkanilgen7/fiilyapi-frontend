import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { ModuleResponse } from "@/lib/api/models";

export const MODULES_QUERY_KEY = "modules";

export function useModules(): UseQueryResult<ModuleResponse[], Error> {
  return useQuery({
    queryKey: [MODULES_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/modules", {})),
  });
}
