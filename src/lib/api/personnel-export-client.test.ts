import { describe, it, expect, afterEach, vi } from "vitest";

import { errorResponse, stubExportDownload, xlsxResponse } from "./export-test-stub";
import {
  downloadPersonnelExport,
  personnelExportSearchParams,
} from "./personnel-export-client";
import { BackendError } from "./unwrap";

// EXPORT-XLSX · `GET /personnel/export.xlsx`.

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("downloadPersonnelExport", () => {
  it("süzgeçsiz çağrıda sorgu dizesi HİÇ olmaz", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPersonnelExport({});

    // Assert
    expect(stub.fetchMock).toHaveBeenCalledWith(
      "/api/backend/personnel/export.xlsx",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("ekranın beş sunucu süzgecini de sunucu adlarıyla taşır", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPersonnelExport({
      q: "mehmet",
      source: "subcontractor",
      subcontractorId: "sub-1",
      isActive: true,
      projectId: "p-1",
    });

    // Assert
    expect(stub.lastQuery()).toEqual({
      q: "mehmet",
      source: "subcontractor",
      subcontractor_id: "sub-1",
      is_active: "true",
      project_id: "p-1",
    });
  });

  /** `is_active=false` DÜŞMEZ: "pasifleri göster" bilinçli bir süzgeçtir. */
  it("is_active=false süzgeci sorguda KALIR", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPersonnelExport({ isActive: false });

    // Assert
    expect(stub.lastQuery()).toEqual({ is_active: "false" });
  });

  /**
   * 🔴 SAYFALAMA SÜZGEÇ DEĞİLDİR — personel sayfalaması zaten İSTEMCİDEDİR
   * ("1–6 gösteriliyor" bir pencere), Excel'i altı satıra kısmak saçma olurdu.
   */
  it("limit/offset GEÇMEZ", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPersonnelExport({ q: "a", limit: 200, offset: 0 });

    // Assert
    expect(stub.lastQuery()).toEqual({ q: "a" });
  });

  it("URL'e token koymaz", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPersonnelExport({ q: "a" });

    // Assert
    expect(stub.lastUrl()).not.toContain("token");
  });

  it("dosya adını Content-Disposition'dan alır", async () => {
    // Arrange
    const stub = stubExportDownload(xlsxResponse('attachment; filename="personel-2026.xlsx"'));

    // Act
    await downloadPersonnelExport({});

    // Assert
    expect(stub.filename()).toBe("personel-2026.xlsx");
  });

  it("başlık yoksa personel.xlsx varsayılanına düşer", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPersonnelExport({});

    // Assert
    expect(stub.filename()).toBe("personel.xlsx");
  });

  it("obje URL'i revoke edilir", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPersonnelExport({});

    // Assert
    expect(stub.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("2xx dışı yanıt BackendError fırlatır ve createObjectURL ÇAĞRILMAZ", async () => {
    // Arrange
    const stub = stubExportDownload(errorResponse(403, { detail: "Personel yetkiniz yok." }));

    // Act
    const error = await downloadPersonnelExport({}).catch((err: unknown) => err);

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(403);
    expect((error as BackendError).body).toEqual({ detail: "Personel yetkiniz yok." });
    expect(stub.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("personnelExportSearchParams", () => {
  /**
   * 🔴 `trade` SUNUCUDA YOKTUR — çevrim onu uydurmaz. Ekran, meslek süzgeci
   * açıkken düğmeyi devre dışı bırakarak sızıntıyı kapatır (`PersonnelListView`).
   */
  it("meslek gibi sunucuda olmayan bir anahtar üretmez", () => {
    // Arrange + Act
    const params = personnelExportSearchParams({ q: "a", projectId: "p-1" });

    // Assert
    expect(Object.keys(params).sort()).toEqual(["project_id", "q"]);
  });
});
