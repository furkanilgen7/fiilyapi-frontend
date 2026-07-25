import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { CompanyRead, CompanyUpdate } from "@/lib/api/models";

export const COMPANY_QUERY_KEY = "company";

export function useCompany(): UseQueryResult<CompanyRead, Error> {
  return useQuery({
    queryKey: [COMPANY_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/company", {})),
  });
}

export function useUpdateCompany(): UseMutationResult<CompanyRead, Error, CompanyUpdate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CompanyUpdate) => unwrap(await backendClient.PUT("/company", { body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COMPANY_QUERY_KEY] });
    },
  });
}
