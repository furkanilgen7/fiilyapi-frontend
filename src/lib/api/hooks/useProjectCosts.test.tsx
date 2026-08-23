import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { PROJECT_COSTS_QUERY_KEY, useProjectCosts } from "./useProjectCosts";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-PKK T1 · `GET /projects/{project_id}/costs` — BUGÜNE KADAR HİÇ ÇAĞRILMAMIŞ
// uç. Test `useLandShare.test.tsx` / `useDocuments.test.tsx` desenini birebir
// izler; yeni bir hook deseni İCAT EDİLMEZ.
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const PROJECT_ID = "prj-1";
const COSTS = { project_id: PROJECT_ID, project_type: "kendi_yatirim" };

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function errorResponse(status: number, detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe("useProjectCosts", () => {
  it("GET /projects/{project_id}/costs cagirir ve yaniti onbellege yazar", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(COSTS));

    // Act
    const { result } = renderHook(() => useProjectCosts(PROJECT_ID), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}/costs", {
      params: { path: { project_id: PROJECT_ID } },
    });
    expect(client.getQueryData([PROJECT_COSTS_QUERY_KEY, PROJECT_ID])).toEqual(COSTS);
  });

  // `useProjectUnits`/`useLandShareSummary` emsali: proje kimliği YOKKEN
  // (rota parametresi henüz çözülmemişken) ağa çıkmak sunucuda anlamsız bir
  // 422 üretir ve React Query hatayı ekrana taşır.
  it("bos projectId ile aga CIKMAZ", () => {
    // Act
    const { result } = renderHook(() => useProjectCosts(""), { wrapper });

    // Assert
    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  // Ünite uçlarının kapısı `projects` modülüdür; yalnız `sales` izni olan
  // kullanıcı burada 403 alır ve ekran bunu görünür bir gerekçeyle karşılar.
  it("403'te BackendError firlatir", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    // Act
    const { result } = renderHook(() => useProjectCosts(PROJECT_ID), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(BackendError);
    expect((result.current.error as BackendError).status).toBe(403);
  });

  // Sorgu anahtarı proje kimliğini TAŞIR: iki proje arasında gezinirken
  // birinin maliyeti ötekinin ekranında görünmez.
  it("sorgu anahtari proje basina AYRISIR", async () => {
    // Arrange
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(COSTS));

    // Act
    const { result } = renderHook(() => useProjectCosts("prj-2"), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData([PROJECT_COSTS_QUERY_KEY, "prj-2"])).toEqual(COSTS);
    expect(client.getQueryData([PROJECT_COSTS_QUERY_KEY, PROJECT_ID])).toBeUndefined();
  });
});
