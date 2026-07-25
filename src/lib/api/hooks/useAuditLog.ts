import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchAuditLog } from "@/lib/api/audit-client";
import { buildAuditQuery, type AuditFilters } from "@/lib/settings/audit-query";
import type { AuditListResponse } from "@/lib/api/models";

export const AUDIT_LOG_QUERY_KEY = "audit-log";
export const AUDIT_PAGE_SIZE = 50;

export function useAuditLog(
  filters: AuditFilters,
  offset: number,
): UseQueryResult<AuditListResponse, Error> {
  const query = buildAuditQuery(filters, { limit: AUDIT_PAGE_SIZE, offset });
  return useQuery({
    queryKey: [AUDIT_LOG_QUERY_KEY, query],
    queryFn: () => fetchAuditLog(query),
  });
}
