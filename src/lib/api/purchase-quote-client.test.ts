import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { downloadQuoteComparisonExport } from "./purchase-quote-client";
import { BackendError } from "./unwrap";

// F-SA T4 · teklif karşılaştırması Excel indirmesi — `timesheet-client.test.ts`
// kanonu birebir (ikili indirme deseninin emsalden kopyalandığının kanıtı).
const REQUEST_ID = "11111111-1111-1111-1111-111111111111";

const createObjectURL = vi.fn(() => "blob:fake");
const revokeObjectURL = vi.fn();

function xlsxResponse(disposition?: string): Response {
  return new Response(new Uint8Array([0x50, 0x4b]), {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ...(disposition ? { "content-disposition": disposition } : {}),
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadQuoteComparisonExport", () => {
  it("doğru yola credentials: same-origin ile fetch atar", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadQuoteComparisonExport(REQUEST_ID);

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/purchase-requests/${REQUEST_ID}/quotes/export.xlsx`,
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("URL'e token koymaz", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadQuoteComparisonExport(REQUEST_ID);

    // Assert
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("token");
  });

  it("requestId encodeURIComponent'ten geçer", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadQuoteComparisonExport("../../secrets");

    // Assert
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/backend/purchase-requests/..%2F..%2Fsecrets/quotes/export.xlsx",
    );
  });

  it("dosya adını Content-Disposition'dan alır", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(xlsxResponse('attachment; filename="teklif-SAT-2026-0042.xlsx"')),
    );
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {});

    // Act
    await downloadQuoteComparisonExport(REQUEST_ID);

    // Assert
    expect(anchor.download).toBe("teklif-SAT-2026-0042.xlsx");
  });

  it("başlık yoksa teklif-karsilastirma.xlsx varsayılanına düşer", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(xlsxResponse()));
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {});

    // Act
    await downloadQuoteComparisonExport(REQUEST_ID);

    // Assert
    expect(anchor.download).toBe("teklif-karsilastirma.xlsx");
  });

  it("revokeObjectURL finally içinde çağrılır (hata durumunda da)", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(xlsxResponse()));
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {
      throw new Error("tarayıcı indirmeyi reddetti");
    });

    // Act + Assert
    await expect(downloadQuoteComparisonExport(REQUEST_ID)).rejects.toThrow(
      "tarayıcı indirmeyi reddetti",
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  // WORKFLOW §4: `status >= 400` HER ZAMAN JSON dalıdır — BFF ikili başlık
  // gönderse bile hata gövdesi kaybolmaz.
  it("2xx dışı yanıt BackendError fırlatır ve status/gövde taşınır", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Bu talebe erişim yetkiniz yok." }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    // Act
    const error = await downloadQuoteComparisonExport(REQUEST_ID).catch((err: unknown) => err);

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(403);
    expect((error as BackendError).body).toEqual({ detail: "Bu talebe erişim yetkiniz yok." });
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
