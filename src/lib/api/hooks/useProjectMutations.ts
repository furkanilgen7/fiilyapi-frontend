import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import { PROJECTS_QUERY_KEY, type ProjectListItem } from "./useProjects";

// NOT: Plan "ProjectCreateRequest" adini varsayiyordu; gercek semada istek govdesi
// "ProjectCreate" (bkz. src/lib/api/schema.d.ts). Gercek adi kullaniyoruz.
export type ProjectCreateRequest = components["schemas"]["ProjectCreate"];

export function useCreateProject(): UseMutationResult<ProjectListItem, Error, ProjectCreateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) => unwrap(await backendClient.POST("/projects", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] }),
  });
}
