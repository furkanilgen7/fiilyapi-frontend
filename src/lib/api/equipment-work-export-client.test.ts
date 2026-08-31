import { describe, it, expect, afterEach, vi } from "vitest";

import {
  downloadEquipmentWorkExport,
  equipmentWorkExportSearchParams,
} from "./equipment-work-export-client";
import { errorResponse, stubExportDownload, xlsxResponse } from "./export-test-stub";
import { BackendError } from "./unwrap";

// EXPORT-XLSX · `GET /equipment/work-summary/export.xlsx`.

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("downloadEquipmentWorkExport", () => {
  it("dönemi ZORUNLU taşır ve credentials: same-origin ile gider", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadEquipmentWorkExport({ year: 2026, month: 8 });

    // Assert
    expect(stub.fetchMock).toHaveBeenCalledWith(
      "/api/backend/equipment/work-summary/export.xlsx?year=2026&month=8",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  it("şantiye süzgecini site_id olarak taşır", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadEquipmentWorkExport({ year: 2026, month: 8, siteId: "s-1" });

    // Assert
    expect(stub.lastQuery()).toEqual({ year: "2026", month: "8", site_id: "s-1" });
  });

  it("şantiye seçili değilken site_id GÖNDERİLMEZ (boş dize değil)", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadEquipmentWorkExport({ year: 2026, month: 8, siteId: "" });

    // Assert
    expect(stub.lastQuery()).toEqual({ year: "2026", month: "8" });
  });

  it("URL'e token koymaz", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadEquipmentWorkExport({ year: 2026, month: 8 });

    // Assert
    expect(stub.lastUrl()).not.toContain("token");
  });

  it("dosya adını Content-Disposition'dan alır", async () => {
    // Arrange
    const stub = stubExportDownload(
      xlsxResponse('attachment; filename="calisma-kaydi-2026-08.xlsx"'),
    );

    // Act
    await downloadEquipmentWorkExport({ year: 2026, month: 8 });

    // Assert
    expect(stub.filename()).toBe("calisma-kaydi-2026-08.xlsx");
  });

  it("başlık yoksa calisma-kaydi.xlsx varsayılanına düşer", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadEquipmentWorkExport({ year: 2026, month: 8 });

    // Assert
    expect(stub.filename()).toBe("calisma-kaydi.xlsx");
  });

  it("obje URL'i revoke edilir", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadEquipmentWorkExport({ year: 2026, month: 8 });

    // Assert
    expect(stub.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("2xx dışı yanıt BackendError fırlatır ve createObjectURL ÇAĞRILMAZ", async () => {
    // Arrange
    const stub = stubExportDownload(errorResponse(422, { detail: "year/month zorunlu" }));

    // Act
    const error = await downloadEquipmentWorkExport({ year: 2026, month: 8 }).catch(
      (err: unknown) => err,
    );

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(422);
    expect(stub.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("equipmentWorkExportSearchParams", () => {
  it("ekranın süzgeç nesnesinin TAMAMINI çevirir", () => {
    // Arrange + Act
    const params = equipmentWorkExportSearchParams({ year: 2026, month: 8, siteId: "s-2" });

    // Assert
    expect(params).toEqual({ year: "2026", month: "8", site_id: "s-2" });
  });
});
