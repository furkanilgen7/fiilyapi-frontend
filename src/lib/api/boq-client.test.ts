import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { downloadBoqExport } from "./boq-client";
import { BackendError } from "./unwrap";

const SITE_ID = "44444444-4444-4444-4444-444444444444";

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

describe("downloadBoqExport (spec §8.2)", () => {
  it("doğru yola credentials: same-origin ile fetch atar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);
    await downloadBoqExport(SITE_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/sites/${SITE_ID}/boq/export`,
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  // Token URL'e KONMAZ — httpOnly cookie + same-origin (audit kanonu).
  it("URL'e token/parametre koymaz", async () => {
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);
    await downloadBoqExport(SITE_ID);
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("token");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("?");
  });

  it("siteId encodeURIComponent'ten geçer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(xlsxResponse());
    vi.stubGlobal("fetch", fetchMock);
    await downloadBoqExport("../../secrets");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/backend/sites/..%2F..%2Fsecrets/boq/export",
    );
  });

  it("dosya adını Content-Disposition'dan alır", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(xlsxResponse('attachment; filename="is-kalemleri-STE-01.xlsx"')),
    );
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {});
    await downloadBoqExport(SITE_ID);
    expect(anchor.download).toBe("is-kalemleri-STE-01.xlsx");
  });

  it("başlık yoksa is-kalemleri.xlsx varsayılanına düşer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(xlsxResponse()));
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {});
    await downloadBoqExport(SITE_ID);
    expect(anchor.download).toBe("is-kalemleri.xlsx");
  });

  it("revokeObjectURL finally içinde çağrılır (hata durumunda da)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(xlsxResponse()));
    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {
      throw new Error("tarayıcı indirmeyi reddetti");
    });
    await expect(downloadBoqExport(SITE_ID)).rejects.toThrow("tarayıcı indirmeyi reddetti");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("2xx dışı yanıt BackendError fırlatır", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Bu işlem için yetkiniz yok" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(downloadBoqExport(SITE_ID)).rejects.toBeInstanceOf(BackendError);
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("hata durumunda status ve gövde BackendError'a taşınır", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "yok" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const error = await downloadBoqExport(SITE_ID).catch((err: unknown) => err);
    expect((error as BackendError).status).toBe(403);
    expect((error as BackendError).body).toEqual({ detail: "yok" });
  });
});
