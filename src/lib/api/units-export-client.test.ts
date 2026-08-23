import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { downloadUnitsExport } from "./units-export-client";
import { BackendError } from "./unwrap";

// F-PKK T1 · KKP 24 "Excel" — paylaşım tablosunun Excel çıktısı.
// `purchase-quote-client.test.ts` / `timesheet-client.test.ts` kanonu birebir
// (ikili indirme deseninin emsalden kopyalandığının kanıtı).
const PROJECT_ID = "22222222-2222-2222-2222-222222222222";

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

describe("downloadUnitsExport", () => {
  it("doğru yola credentials: same-origin ile fetch atar", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadUnitsExport(PROJECT_ID);

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/projects/${PROJECT_ID}/units/export.xlsx`,
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  /**
   * Uç SÜZGEÇ ALMAZ (şema açıklaması: *"KKP'nin Excel dugmesi paylasim
   * tablosunun TAMAMINI indirir; kismi dosya, tfoot toplamlariyla … celisen
   * bir belge uretirdi"*). Bu yüzden URL'de sorgu dizesi HİÇ olmaz — ekranın
   * `owner_side`/`block_id` süzgeçleri buraya SIZAMAZ.
   */
  it("sorgu dizesi TASIMAZ - uc suzgec almaz", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadUnitsExport(PROJECT_ID);

    // Assert
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("?");
  });

  it("URL'e token koymaz", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadUnitsExport(PROJECT_ID);

    // Assert
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("token");
  });

  it("projectId encodeURIComponent'ten geçer", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadUnitsExport("../../secrets");

    // Assert
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/backend/projects/..%2F..%2Fsecrets/units/export.xlsx",
    );
  });

  it("dosya adını Content-Disposition'dan alır", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(xlsxResponse('attachment; filename="paylasim-KKS-2026-001.xlsx"')),
    );
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {});

    // Act
    await downloadUnitsExport(PROJECT_ID);

    // Assert
    expect(anchor.download).toBe("paylasim-KKS-2026-001.xlsx");
  });

  it("başlık yoksa paylasim-tablosu.xlsx varsayılanına düşer", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(xlsxResponse()));
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {});

    // Act
    await downloadUnitsExport(PROJECT_ID);

    // Assert
    expect(anchor.download).toBe("paylasim-tablosu.xlsx");
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
    await expect(downloadUnitsExport(PROJECT_ID)).rejects.toThrow("tarayıcı indirmeyi reddetti");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  // WORKFLOW §4: `status >= 400` HER ZAMAN JSON dalıdır — BFF ikili başlık
  // gönderse bile hata gövdesi kaybolmaz. Kat karşılığı OLMAYAN proje burada
  // 404 alır ve gövde ekrana taşınır.
  it("2xx dışı yanıt BackendError fırlatır ve status/gövde taşınır", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Proje bulunamadı." }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    // Act
    const error = await downloadUnitsExport(PROJECT_ID).catch((err: unknown) => err);

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(404);
    expect((error as BackendError).body).toEqual({ detail: "Proje bulunamadı." });
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
