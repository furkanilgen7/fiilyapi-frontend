import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSiteOptions } from "./useSiteOptions";
import { PROJECT_LIST_MAX_LIMIT } from "./useProjects";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

/**
 * Sunucu varsayılanı: `backend/app/modules/projects/router.py:98`
 * (`limit: _LIMIT = 50`). Sahte sunucu bu tavanı GERÇEKTEN uygular — çağıran
 * `limit` göndermezse 51. proje yanıta HİÇ girmez.
 */
const SERVER_DEFAULT_LIMIT = 50;
const PROJECT_COUNT = 60;

const PROJECTS = Array.from({ length: PROJECT_COUNT }, (_, index) => ({
  id: `p-${index + 1}`,
  code: `PRJ-${index + 1}`,
  name: `Proje ${index + 1}`,
}));

const COUNTS = { all: PROJECT_COUNT, taahhut: PROJECT_COUNT, kendi_yatirim: 0, kat_karsiligi: 0, completed: 0 };

function fakeBackendGet(path: string, init?: unknown) {
  const query = (init as { params?: { query?: { limit?: number; offset?: number } } })?.params?.query;
  if (path === "/projects") {
    const limit = query?.limit ?? SERVER_DEFAULT_LIMIT;
    const offset = query?.offset ?? 0;
    return Promise.resolve({
      data: {
        counts: COUNTS,
        items: PROJECTS.slice(offset, offset + limit),
        limit,
        offset,
        total: PROJECT_COUNT,
      },
      error: undefined,
      response: new Response(),
    });
  }
  if (path === "/projects/{project_id}/sites") {
    const projectId = (init as { params: { path: { project_id: string } } }).params.path.project_id;
    const no = projectId.split("-")[1];
    return Promise.resolve({
      data: { items: [{ id: `s-${no}`, name: `Şantiye ${no}` }] },
      error: undefined,
      response: new Response(),
    });
  }
  throw new Error(`beklenmeyen yol: ${path}`);
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSiteOptions — proje listesi tavanı", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(backendClient.GET).mockImplementation(fakeBackendGet as never);
  });

  it("sunucu varsayilani 50 iken 51. projenin santiyesi de secenege girer", async () => {
    const { result } = renderHook(() => useSiteOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.options.map((option) => option.label)).toContain("Proje 51 Şantiye 51");
    expect(result.current.options).toHaveLength(PROJECT_COUNT);
  });

  it("proje listesi ucuna tavan limitini ACIKCA gonderir", async () => {
    const { result } = renderHook(() => useSiteOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(backendClient.GET).toHaveBeenCalledWith("/projects", {
      params: { query: { limit: PROJECT_LIST_MAX_LIMIT } },
    });
  });
});
