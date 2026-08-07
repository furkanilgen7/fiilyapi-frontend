import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { downloadTimesheetExport } from "./timesheet-client";
import { BackendError } from "./unwrap";

// F-PT T1 · puantaj Excel indirmesi — `boq-client.test.ts` kanonu birebir.
const SITE_ID = "44444444-4444-4444-4444-444444444444";
const QUERY = { year: 2026, month: 8 };

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

describe("downloadTimesheetExport", () => {
  it("doğru yola credentials: same-origin ile fetch atar", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadTimesheetExport(SITE_ID, QUERY);

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/sites/${SITE_ID}/timesheet/export.xlsx?year=2026&month=8`,
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("bölüm filtresi section_id olarak sorguya eklenir", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadTimesheetExport(SITE_ID, { ...QUERY, sectionId: "sec-1" });

    // Assert
    expect(String(fetchMock.mock.calls[0][0])).toContain("section_id=sec-1");
  });

  // Token URL'e KONMAZ — httpOnly cookie + same-origin (audit kanonu).
  it("URL'e token koymaz", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadTimesheetExport(SITE_ID, QUERY);

    // Assert
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("token");
  });

  it("siteId encodeURIComponent'ten geçer", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Act
    await downloadTimesheetExport("../../secrets", QUERY);

    // Assert
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/backend/sites/..%2F..%2Fsecrets/timesheet/export.xlsx?year=2026&month=8",
    );
  });

  it("dosya adını Content-Disposition'dan alır", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(xlsxResponse('attachment; filename="puantaj-A-BLOK-2026-08.xlsx"')),
    );
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {});

    // Act
    await downloadTimesheetExport(SITE_ID, QUERY);

    // Assert
    expect(anchor.download).toBe("puantaj-A-BLOK-2026-08.xlsx");
  });

  it("başlık yoksa puantaj.xlsx varsayılanına düşer", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(xlsxResponse()));
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {});

    // Act
    await downloadTimesheetExport(SITE_ID, QUERY);

    // Assert
    expect(anchor.download).toBe("puantaj.xlsx");
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
    await expect(downloadTimesheetExport(SITE_ID, QUERY)).rejects.toThrow(
      "tarayıcı indirmeyi reddetti",
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("2xx dışı yanıt BackendError fırlatır ve status/gövde taşınır", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Bu şantiyeye erişim yetkiniz yok." }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    // Act
    const error = await downloadTimesheetExport(SITE_ID, QUERY).catch((err: unknown) => err);

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(403);
    expect((error as BackendError).body).toEqual({ detail: "Bu şantiyeye erişim yetkiniz yok." });
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
