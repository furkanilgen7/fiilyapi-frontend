import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { components } from "@/lib/api/schema";
import { PROJECTS_QUERY_KEY, type ProjectListItem } from "./useProjects";

// NOT: Plan "ProjectCreateRequest" adini varsayiyordu; gercek semada istek govdesi
// "ProjectCreate" (bkz. src/lib/api/schema.d.ts). Gercek adi kullaniyoruz.
export type ProjectCreateRequest = components["schemas"]["ProjectCreate"];

// Task F4 — spec §3.3: "code" bos birakilirsa sunucu otomatik uretir (§3.5),
// ama bu yalniz alan HIC GONDERILMEZSE calisir — bos string "" gonderilirse
// 1..50 dogrulamasi patlar. SiteFormModal'daki cagiran-taraf deseninin (spec
// yorumu, satir 58) aksine burada hook seviyesinde normallestiriyoruz: F12
// henuz yazilmadigindan tek cagiran nokta bu, ileride cagiranlar da bos
// string yollarsa gene korunur.
function normalizeProjectCreateBody(body: ProjectCreateRequest): ProjectCreateRequest {
  const normalized: ProjectCreateRequest = { ...body };
  const trimmedCode = typeof body.code === "string" ? body.code.trim() : body.code;
  if (trimmedCode) {
    normalized.code = trimmedCode;
  } else {
    delete normalized.code;
  }
  return normalized;
}

export function useCreateProject(): UseMutationResult<ProjectListItem, Error, ProjectCreateRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body) =>
      unwrap(await backendClient.POST("/projects", { body: normalizeProjectCreateBody(body) })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] }),
  });
}
