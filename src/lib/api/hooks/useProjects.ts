import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { ProjectResponse, ProjectAccessResponse } from "@/lib/api/models";

export const PROJECTS_QUERY_KEY = "projects";

export function useProjects(): UseQueryResult<ProjectResponse[], Error> {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/projects", {})),
  });
}

export function useProjectAccess(userId: string): UseQueryResult<ProjectAccessResponse, Error> {
  return useQuery({
    queryKey: ["project-access", userId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/users/{user_id}/project-access", {
          params: { path: { user_id: userId } },
        }),
      ),
  });
}
