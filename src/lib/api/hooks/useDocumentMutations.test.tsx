import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useCreateDocumentFolder, useUploadDocument } from "./useDocumentMutations";
import { DOCUMENTS_QUERY_KEY } from "./useDocuments";
import { DOCUMENT_FOLDERS_QUERY_KEY } from "./useDocumentFolders";
import { backendClient } from "@/lib/api/client";
import { uploadDocument } from "@/lib/api/documents-client";
import { BackendError } from "@/lib/api/unwrap";

// F-BC T1 · yükleme + klasör oluşturma (`usePersonnelMutations.test.tsx` deseni).
vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));
vi.mock("@/lib/api/documents-client", () => ({ uploadDocument: vi.fn() }));

const PROJECT_ID = "p-1";
const CREATED_FOLDER = {
  id: "df-9",
  project_id: PROJECT_ID,
  site_id: null,
  parent_id: null,
  name: "Sözleşmeler",
  created_at: "2026-08-09T09:00:00Z",
};
const CREATED_DOCUMENT = {
  id: "doc-9",
  folder_id: "df-1",
  project_id: PROJECT_ID,
  site_id: null,
  filename: "sozlesme.pdf",
  mime_type: "application/pdf",
  size_bytes: 1024,
  description: null,
  uploaded_by_name: "Ahmet Yılmaz",
  created_at: "2026-08-09T09:00:00Z",
};

function spyOnInvalidate(queryClient: QueryClient) {
  return vi.spyOn(queryClient, "invalidateQueries");
}

let client: QueryClient;
let invalidateSpy: ReturnType<typeof spyOnInvalidate>;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function okResponse(data: unknown) {
  return { data, error: undefined, response: new Response() } as never;
}

function errorResponse(status: number, detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) } as never;
}

function invalidatedKeys(): unknown[] {
  return invalidateSpy.mock.calls.map(
    (call) => (call[0] as { queryKey: unknown[] }).queryKey[0],
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  invalidateSpy = spyOnInvalidate(client);
});

describe("useUploadDocument", () => {
  const file = new File(["%PDF"], "sozlesme.pdf", { type: "application/pdf" });

  it("multipart istemcisini cagirir ve iki listeyi tazeler", async () => {
    // Arrange
    vi.mocked(uploadDocument).mockResolvedValue(CREATED_DOCUMENT);
    const { result } = renderHook(() => useUploadDocument(), { wrapper });

    // Act
    await act(async () => {
      await result.current.mutateAsync({ file, projectId: PROJECT_ID, folderId: "df-1" });
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(uploadDocument).toHaveBeenCalledWith({
      file,
      projectId: PROJECT_ID,
      folderId: "df-1",
    });
    // Yeni belge klasör sayısını da etkileyebilir → iki liste birden tazelenir.
    expect(invalidatedKeys()).toEqual(
      expect.arrayContaining([DOCUMENTS_QUERY_KEY, DOCUMENT_FOLDERS_QUERY_KEY]),
    );
  });

  it("413/422 hatasi YUTULMAZ, cagirana ulasir", async () => {
    vi.mocked(uploadDocument).mockRejectedValue(
      new BackendError(413, { detail: "Dosya boyutu sınırı aşıldı." }),
    );
    const { result } = renderHook(() => useUploadDocument(), { wrapper });

    await act(async () => {
      await result.current
        .mutateAsync({ file, projectId: PROJECT_ID })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as BackendError).status).toBe(413);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useCreateDocumentFolder", () => {
  it("POST /projects/{id}/document-folders cagirir; govde AYNEN gecer", async () => {
    // Arrange
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse(CREATED_FOLDER));
    const { result } = renderHook(() => useCreateDocumentFolder(PROJECT_ID), { wrapper });

    // Act
    await act(async () => {
      await result.current.mutateAsync({ name: "Sözleşmeler" });
    });

    // Assert
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(backendClient.POST).toHaveBeenCalledWith("/projects/{project_id}/document-folders", {
      params: { path: { project_id: PROJECT_ID } },
      body: { name: "Sözleşmeler" },
    });
    expect(invalidatedKeys()).toContain(DOCUMENT_FOLDERS_QUERY_KEY);
  });

  // Şantiye klasörü: `site_id` GÖVDEDE taşınır (yol parametresi değil).
  it("site_id govdede gecer", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(okResponse(CREATED_FOLDER));
    const { result } = renderHook(() => useCreateDocumentFolder(PROJECT_ID), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "Ruhsatlar", site_id: "s-1" });
    });

    expect(backendClient.POST).toHaveBeenCalledWith("/projects/{project_id}/document-folders", {
      params: { path: { project_id: PROJECT_ID } },
      body: { name: "Ruhsatlar", site_id: "s-1" },
    });
  });

  it("409 ad cakismasi YUTULMAZ", async () => {
    vi.mocked(backendClient.POST).mockResolvedValue(
      errorResponse(409, "Bu adda bir klasör zaten var."),
    );
    const { result } = renderHook(() => useCreateDocumentFolder(PROJECT_ID), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "Sözleşmeler" }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error as BackendError;
    expect(error).toBeInstanceOf(BackendError);
    expect(error.status).toBe(409);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
