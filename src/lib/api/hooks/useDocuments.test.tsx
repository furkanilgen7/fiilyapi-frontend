import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useDocuments, DOCUMENTS_QUERY_KEY } from "./useDocuments";
import { useDocumentFolders, DOCUMENT_FOLDERS_QUERY_KEY } from "./useDocumentFolders";
import { backendClient } from "@/lib/api/client";
import { BackendError } from "@/lib/api/unwrap";

// F-BC T1 · Belge Arşivi okuma hook'lari (`useSitePlan.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));

const PROJECT_ID = "p-1";
const SITE_ID = "s-1";
const FOLDERS = { folders: [] };
const DOCUMENTS = { documents: [] };

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

describe("useDocumentFolders", () => {
  it("GET /projects/{id}/document-folders cagirir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(FOLDERS));

    const { result } = renderHook(() => useDocumentFolders(PROJECT_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}/document-folders", {
      params: { path: { project_id: PROJECT_ID }, query: {} },
    });
    expect(client.getQueryData([DOCUMENT_FOLDERS_QUERY_KEY, PROJECT_ID, null])).toEqual(FOLDERS);
  });

  /**
   * KAPSAM SEMANTİĞİ (backend BC kuralı, spec §2): `site_id` GEÇMEMEK
   * "hepsi" DEĞİL, "yalnız proje düzeyi (`IS NULL`)" demektir. Bu yüzden
   * `siteId` verilmediğinde parametre gövdeye BOŞ DİZE olarak da EKLENMEZ.
   */
  it("siteId verilirse site_id sorgu parametresi olarak gecer", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(FOLDERS));

    const { result } = renderHook(() => useDocumentFolders(PROJECT_ID, SITE_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/projects/{project_id}/document-folders", {
      params: { path: { project_id: PROJECT_ID }, query: { site_id: SITE_ID } },
    });
    expect(client.getQueryData([DOCUMENT_FOLDERS_QUERY_KEY, PROJECT_ID, SITE_ID])).toEqual(FOLDERS);
  });

  it("bos projectId ile aga CIKMAZ", async () => {
    const { result } = renderHook(() => useDocumentFolders(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("403'te BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    const { result } = renderHook(() => useDocumentFolders(PROJECT_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as BackendError;
    expect(error).toBeInstanceOf(BackendError);
    expect(error.status).toBe(403);
  });
});

describe("useDocuments", () => {
  it("GET /documents cagirir; project_id ZORUNLU sorgu parametresidir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(DOCUMENTS));

    const { result } = renderHook(() => useDocuments(PROJECT_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/documents", {
      params: { query: { project_id: PROJECT_ID } },
    });
  });

  it("siteId/folderId/q verilirse sorguya eklenir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(DOCUMENTS));

    const { result } = renderHook(
      () => useDocuments(PROJECT_ID, { siteId: SITE_ID, folderId: "df-1", q: "ruhsat" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.GET).toHaveBeenCalledWith("/documents", {
      params: {
        query: { project_id: PROJECT_ID, site_id: SITE_ID, folder_id: "df-1", q: "ruhsat" },
      },
    });
    expect(
      client.getQueryData([DOCUMENTS_QUERY_KEY, PROJECT_ID, SITE_ID, "df-1", "ruhsat"]),
    ).toEqual(DOCUMENTS);
  });

  // E12'de `site_id` GEÇİLMEZ → yalnız proje düzeyi kayıtlar. Boş dize
  // gönderilseydi backend 422 döner, `null` gönderilseydi kapsam sızardı.
  it("siteId verilmezse site_id sorguda HIC yer almaz", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(okResponse(DOCUMENTS));

    const { result } = renderHook(() => useDocuments(PROJECT_ID, { q: "ruhsat" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = vi.mocked(backendClient.GET).mock.calls[0][1] as {
      params: { query: Record<string, unknown> };
    };
    expect(Object.keys(query.params.query)).toEqual(["project_id", "q"]);
  });

  it("bos projectId ile aga CIKMAZ", async () => {
    const { result } = renderHook(() => useDocuments(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(backendClient.GET).not.toHaveBeenCalled();
  });

  it("403'te BackendError firlatir", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue(errorResponse(403, "yetkisiz"));

    const { result } = renderHook(() => useDocuments(PROJECT_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(403);
  });
});
