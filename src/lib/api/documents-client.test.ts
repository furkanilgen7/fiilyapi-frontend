import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { downloadDocument, uploadDocument } from "./documents-client";
import { BackendError } from "./unwrap";

// F-BC T1 · belge indirme/yükleme istemcisi (`boq-client.test.ts` kanonu).

const DOC_ID = "11111111-1111-1111-1111-111111111111";
const PROJECT_ID = "22222222-2222-2222-2222-222222222222";

const createObjectURL = vi.fn(() => "blob:fake");
const revokeObjectURL = vi.fn();

function fileResponse(contentType: string, disposition?: string): Response {
  return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
    status: 200,
    headers: {
      "content-type": contentType,
      ...(disposition ? { "content-disposition": disposition } : {}),
    },
  });
}

function errorResponse(status: number, detail: string): Response {
  return new Response(JSON.stringify({ detail }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
  // jsdom gerçek `<a>` tıklamasında "navigation not implemented" hatası basar;
  // indirme davranışı zaten `download` özniteliğiyle doğrulanıyor.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadDocument", () => {
  it("BFF indirme yoluna credentials: same-origin ile gider", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(fileResponse("application/pdf"));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadDocument(DOC_ID, "sozlesme.pdf");

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/documents/${DOC_ID}/download`,
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("token");
  });

  it("documentId encodeURIComponent'ten geçer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(fileResponse("application/pdf"));
    vi.stubGlobal("fetch", fetchMock);
    await downloadDocument("../../secrets", "belge");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/backend/documents/..%2F..%2Fsecrets/download",
    );
  });

  it("dosya adını Content-Disposition'dan alır (uzantı sabit DEĞİL)", async () => {
    const anchor = document.createElement("a");
    const clickSpy = vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        fileResponse("image/vnd.dwg", 'attachment; filename="kat-plani-Rev3.dwg"'),
      ),
    );

    await downloadDocument(DOC_ID, "belge");

    expect(anchor.download).toBe("kat-plani-Rev3.dwg");
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("başlık yoksa çağıranın verdiği ada düşer", async () => {
    const anchor = document.createElement("a");
    vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fileResponse("application/pdf")));

    await downloadDocument(DOC_ID, "metraj.xlsx");

    expect(anchor.download).toBe("metraj.xlsx");
  });

  // F-TH tuzağı: BFF `status >= 400` gövdelerini JSON olarak geçirir; istemci
  // Türkçe `detail`i YUTMAZ.
  it.each([
    [403, "Bu belgeye erişim yetkiniz yok."],
    [404, "Belge bulunamadı."],
  ])("%s yanıtında BackendError fırlatır", async (status, detail) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(status, detail)));

    await expect(downloadDocument(DOC_ID, "belge")).rejects.toMatchObject({
      status,
      body: { detail },
    });
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("hata BackendError tipindedir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(403, "yasak")));
    await expect(downloadDocument(DOC_ID, "belge")).rejects.toBeInstanceOf(BackendError);
  });
});

describe("uploadDocument", () => {
  const file = new File(["%PDF-1.4"], "sozlesme.pdf", { type: "application/pdf" });

  function createdResponse(): Response {
    return new Response(JSON.stringify({ id: "doc-1", filename: "sozlesme.pdf" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }

  it("FormData ile POST eder; Content-Type ELLE KURULMAZ (boundary tarayıcıdan)", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(createdResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await uploadDocument({ file, projectId: PROJECT_ID });

    // Assert
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/backend/documents");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("zorunlu alanlar gövdededir; verilmeyen kapsam alanları GEÇMEZ", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createdResponse());
    vi.stubGlobal("fetch", fetchMock);

    await uploadDocument({ file, projectId: PROJECT_ID });

    const form = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(form.get("project_id")).toBe(PROJECT_ID);
    expect(form.get("file")).toBe(file);
    expect(form.has("site_id")).toBe(false);
    expect(form.has("folder_id")).toBe(false);
    expect(form.has("description")).toBe(false);
  });

  it("isteğe bağlı alanlar verilirse gövdeye eklenir", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createdResponse());
    vi.stubGlobal("fetch", fetchMock);

    await uploadDocument({
      file,
      projectId: PROJECT_ID,
      siteId: "s-1",
      folderId: "df-1",
      description: "İmzalı nüsha",
    });

    const form = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(form.get("site_id")).toBe("s-1");
    expect(form.get("folder_id")).toBe("df-1");
    expect(form.get("description")).toBe("İmzalı nüsha");
  });

  it("oluşturulan belge künyesini döndürür", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createdResponse()));
    const created = await uploadDocument({ file, projectId: PROJECT_ID });
    expect(created.id).toBe("doc-1");
  });

  // 413 (boyut) ve 422 (uzantı) gövdeleri EKRANDA Türkçe basılacak — yutulmaz.
  it.each([
    [413, "Dosya boyutu sınırı aşıldı."],
    [422, "Bu dosya türü kabul edilmiyor."],
  ])("%s yanıtında BackendError fırlatır", async (status, detail) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(status, detail)));
    await expect(uploadDocument({ file, projectId: PROJECT_ID })).rejects.toMatchObject({
      status,
      body: { detail },
    });
  });
});
