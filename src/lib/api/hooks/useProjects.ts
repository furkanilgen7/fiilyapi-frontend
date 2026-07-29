import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import type { ProjectAccessResponse } from "@/lib/api/models";

// NOT: Plan "ProjectResponse" adini varsayiyordu; gercek semada oge tipi
// "ProjectListItem" (bkz. src/lib/api/schema.d.ts). Gercek adi kullaniyoruz.
export type ProjectListResponse = components["schemas"]["ProjectListResponse"];
export type ProjectListItem = components["schemas"]["ProjectListItem"];
export type ProjectDetail = components["schemas"]["ProjectDetailResponse"];
export type ProjectCounts = ProjectListResponse["counts"];
export type ProjectTypeFilter = "taahhut" | "kendi_yatirim" | "kat_karsiligi";

export interface ProjectListFilter {
  type?: ProjectTypeFilter;
  status?: "completed";
}

export const PROJECTS_QUERY_KEY = "projects";
export const PROJECT_ACCESS_QUERY_KEY = "project-access";

export function useProjects(
  filter: ProjectListFilter = {},
): UseQueryResult<ProjectListResponse, Error> {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, filter.type ?? null, filter.status ?? null],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/projects", {
          params: {
            query: {
              ...(filter.type ? { type: filter.type } : {}),
              ...(filter.status ? { status: filter.status } : {}),
            },
          },
        }),
      ),
  });
}

export const PROJECT_QUERY_KEY = "project";

// Proje Detay (P2) — hero seridi + sekmeler icin tekil proje.
export function useProject(projectId: string): UseQueryResult<ProjectDetail, Error> {
  return useQuery({
    queryKey: [PROJECT_QUERY_KEY, projectId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/projects/{project_id}", {
          params: { path: { project_id: projectId } },
        }),
      ),
  });
}

export function useProjectAccess(userId: string): UseQueryResult<ProjectAccessResponse, Error> {
  return useQuery({
    queryKey: [PROJECT_ACCESS_QUERY_KEY, userId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/users/{user_id}/project-access", {
          params: { path: { user_id: userId } },
        }),
      ),
  });
}
