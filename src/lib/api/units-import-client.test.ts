import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  IMPORT_TEMPLATE_FALLBACK_NAME,
  downloadUnitsImportTemplate,
  importUnits,
  validateUnitsImport,
} from "./units-import-client";
import { BackendError } from "./unwrap";

// F-UNIT2 T2b · EI içe aktarma istemcisi (`documents-client.test.ts` kanonu).

const PROJECT_ID = "22222222-2222-2222-2222-222222222222";
const XLSX_MEDIA_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const createObjectURL = vi.fn(() => "blob:fake");
const revokeObjectURL = vi.fn();

function xlsxFile(name = "Yesilvadi_Uniteler_v3.xlsx"): File {
  return new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], name, {
    type: XLSX_MEDIA_TYPE,
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function templateResponse(disposition?: string): Response {
  return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
    status: 200,
    headers: {
      "content-type": XLSX_MEDIA_TYPE,
      ...(disposition ? { "content-disposition": disposition } : {}),
    },
  });
}

const VALIDATION = {
  summary: { total_rows: 24, valid: 22, warning: 1, error: 1 },
  rows: [],
  blocks_to_create: ["D Blok"],
};

const RESULT = {
  summary: { total_rows: 24, valid: 22, warning: 1, error: 1 },
  created: 23,
  skipped: 1,
  blocks_created: 1,
  rows: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Son `fetch` çağrısının gövdesini `FormData` olarak verir. */
function sentForm(fetchMock: ReturnType<typeof vi.fn>): FormData {
  return fetchMock.mock.calls[0][1].body as FormData;
}

describe("validateUnitsImport — POST …/units/import/validate", () => {
  it("BFF doğrulama yoluna multipart gövde ile gider", async () => {
    // Arrange
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(VALIDATION));
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const validation = await validateUnitsImport(PROJECT_ID, {
      file: xlsxFile(),
      includeWarnings: true,
    });

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/projects/${PROJECT_ID}/units/import/validate`,
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
    expect(sentForm(fetchMock)).toBeInstanceOf(FormData);
    expect(validation).toEqual(VALIDATION);
  });

  it("🔴 `Content-Type` başlığını ELLE KURMAZ (boundary'yi tarayıcı üretir)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(VALIDATION));
    vi.stubGlobal("fetch", fetchMock);

    await validateUnitsImport(PROJECT_ID, { file: xlsxFile(), includeWarnings: true });

    // Elle `multipart/form-data` yazmak boundary'siz bir başlık üretir ve
    // backend gövdeyi ayrıştıramaz — HER yükleme 422 olurdu.
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("headers");
  });

  it("token URL'e KOYULMAZ (httpOnly cookie tek taşıyıcıdır)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(VALIDATION));
    vi.stubGlobal("fetch", fetchMock);
    await validateUnitsImport(PROJECT_ID, { file: xlsxFile(), includeWarnings: true });
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("token");
  });

  it("projectId encodeURIComponent'ten geçer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(VALIDATION));
    vi.stubGlobal("fetch", fetchMock);
    await validateUnitsImport("../../secrets", { file: xlsxFile(), includeWarnings: true });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "/api/backend/projects/..%2F..%2Fsecrets/units/import/validate",
    );
  });
});

describe("multipart alanları", () => {
  it("🔴 `include_warnings` DİZE olarak gider (ham boolean değil)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(VALIDATION));
    vi.stubGlobal("fetch", fetchMock);

    await validateUnitsImport(PROJECT_ID, { file: xlsxFile(), includeWarnings: false });

    expect(sentForm(fetchMock).get("include_warnings")).toBe("false");
  });

  it("`include_warnings: true` de AÇIKÇA gönderilir (varsayılana bırakılmaz)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(RESULT));
    vi.stubGlobal("fetch", fetchMock);

    await importUnits(PROJECT_ID, { file: xlsxFile(), includeWarnings: true });

    expect(sentForm(fetchMock).get("include_warnings")).toBe("true");
  });

  it("🔴 `site_id` VERİLMEZSE gövdeye HİÇ eklenmez (boş dize DEĞİL)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(VALIDATION));
    vi.stubGlobal("fetch", fetchMock);

    await validateUnitsImport(PROJECT_ID, { file: xlsxFile(), includeWarnings: true });

    expect(sentForm(fetchMock).has("site_id")).toBe(false);
  });

  it("`site_id` verilirse gövdeye girer (yeni blok açılırken kullanılır)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(VALIDATION));
    vi.stubGlobal("fetch", fetchMock);

    await validateUnitsImport(PROJECT_ID, {
      file: xlsxFile(),
      siteId: "site-1",
      includeWarnings: true,
    });

    expect(sentForm(fetchMock).get("site_id")).toBe("site-1");
  });

  it("dosya `file` alanında ve SEÇİLEN nesnenin kendisidir", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(VALIDATION));
    vi.stubGlobal("fetch", fetchMock);
    const file = xlsxFile();

    await validateUnitsImport(PROJECT_ID, { file, includeWarnings: true });

    expect(sentForm(fetchMock).get("file")).toBe(file);
  });
});

describe("importUnits — POST …/units/import", () => {
  it("aktarım yoluna gider ve `created`/`skipped` yanıtını döner", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(RESULT));
    vi.stubGlobal("fetch", fetchMock);

    const result = await importUnits(PROJECT_ID, { file: xlsxFile(), includeWarnings: true });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `/api/backend/projects/${PROJECT_ID}/units/import`,
    );
    expect(result).toEqual(RESULT);
  });

  // 🔴 422 = "hic gecerli satir yok"; 413 = boyut sınırı. İkisi de YUTULMAZ.
  it.each([
    [422, "Dosya işlenemedi, 24 satırda hata var"],
    [413, "Dosya çok büyük (en fazla 2 MB)"],
    [403, "Bu işlem için yetkiniz yok."],
  ])("%s yanıtında BackendError fırlatır ve Türkçe `detail` korunur", async (status, detail) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail }, status)));

    await expect(
      importUnits(PROJECT_ID, { file: xlsxFile(), includeWarnings: true }),
    ).rejects.toMatchObject({ status, body: { detail } });
  });

  it("hata BackendError tipindedir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: "yasak" }, 403)));
    await expect(
      importUnits(PROJECT_ID, { file: xlsxFile(), includeWarnings: true }),
    ).rejects.toBeInstanceOf(BackendError);
  });
});

describe("downloadUnitsImportTemplate — GET …/units/import/template", () => {
  it("ikili gövdeyi blob olarak indirir ve obje URL'ini serbest bırakır", async () => {
    const anchor = document.createElement("a");
    const clickSpy = vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    const fetchMock = vi.fn().mockResolvedValue(
      templateResponse('attachment; filename="unite-sablonu-KY.xlsx"'),
    );
    vi.stubGlobal("fetch", fetchMock);

    await downloadUnitsImportTemplate(PROJECT_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/projects/${PROJECT_ID}/units/import/template`,
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
    expect(anchor.download).toBe("unite-sablonu-KY.xlsx");
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("başlık yoksa varsayılan ada düşer", async () => {
    const anchor = document.createElement("a");
    vi.spyOn(anchor, "click").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(templateResponse()));

    await downloadUnitsImportTemplate(PROJECT_ID);

    expect(anchor.download).toBe(IMPORT_TEMPLATE_FALLBACK_NAME);
  });

  it("404 yanıtında BackendError fırlatır ve blob AÇILMAZ", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ detail: "Proje bulunamadı." }, 404)),
    );

    await expect(downloadUnitsImportTemplate(PROJECT_ID)).rejects.toMatchObject({
      status: 404,
      body: { detail: "Proje bulunamadı." },
    });
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
