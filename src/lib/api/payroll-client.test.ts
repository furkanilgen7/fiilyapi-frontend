import { describe, it, expect, afterEach, vi } from "vitest";

import { errorResponse, stubExportDownload, xlsxResponse } from "./export-test-stub";
import { downloadPayrollExport, downloadPayrollPeriodsExport } from "./payroll-client";
import { BackendError } from "./unwrap";

// EXPORT-XLSX · BG:22 dönem-üstü Excel (`GET /payroll/periods/export.xlsx`) +
// mevcut TEK DÖNEM ucunun (`.../{id}/export`) regresyon kapısı.

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("downloadPayrollPeriodsExport", () => {
  it("doğru yola credentials: same-origin ile fetch atar", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPayrollPeriodsExport();

    // Assert
    expect(stub.fetchMock).toHaveBeenCalledWith(
      "/api/backend/payroll/periods/export.xlsx",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  /**
   * 🔴 Uç SÜZGEÇ ALMAZ — liste ucu da `year` almaz (yıl seçici İSTEMCİDE
   * süzer, `PayrollHistoryView` K6). Uydurma bir `year` 422 verirdi; ekran
   * kapsam farkını GÖRÜNÜR bir cümleyle söyler.
   */
  it("sorgu dizesi TAŞIMAZ", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPayrollPeriodsExport();

    // Assert
    expect(stub.lastUrl()).not.toContain("?");
  });

  it("dosya adını Content-Disposition'dan alır", async () => {
    // Arrange
    const stub = stubExportDownload(
      xlsxResponse('attachment; filename="bordro-donemleri-2026.xlsx"'),
    );

    // Act
    await downloadPayrollPeriodsExport();

    // Assert
    expect(stub.filename()).toBe("bordro-donemleri-2026.xlsx");
  });

  it("başlık yoksa bordro-donemleri.xlsx varsayılanına düşer", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPayrollPeriodsExport();

    // Assert
    expect(stub.filename()).toBe("bordro-donemleri.xlsx");
  });

  it("obje URL'i revoke edilir", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPayrollPeriodsExport();

    // Assert
    expect(stub.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("2xx dışı yanıt BackendError fırlatır ve createObjectURL ÇAĞRILMAZ", async () => {
    // Arrange
    const stub = stubExportDownload(errorResponse(403, { detail: "Bordro yetkiniz yok." }));

    // Act
    const error = await downloadPayrollPeriodsExport().catch((err: unknown) => err);

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(403);
    expect(stub.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("downloadPayrollExport (TEK dönem — göç regresyonu)", () => {
  it("dönem kimliğini encodeURIComponent'ten geçirir", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPayrollExport("../../secrets");

    // Assert
    expect(stub.lastUrl()).toBe("/api/backend/payroll/periods/..%2F..%2Fsecrets/export");
  });

  it("başlık yoksa bordro.xlsx varsayılanına düşer", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadPayrollExport("pp-1");

    // Assert
    expect(stub.filename()).toBe("bordro.xlsx");
  });
});
