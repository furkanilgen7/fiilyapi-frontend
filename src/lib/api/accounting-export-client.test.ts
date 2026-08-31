import { describe, it, expect, afterEach } from "vitest";

import {
  chartExportSearchParams,
  downloadChartOfAccountsExport,
  downloadJournalExport,
  downloadTrialBalanceExport,
  journalExportSearchParams,
} from "./accounting-export-client";
import { errorResponse, stubExportDownload, xlsxResponse } from "./export-test-stub";
import { BackendError } from "./unwrap";
import { vi } from "vitest";

// EXPORT-XLSX · muhasebenin ÜÇ Excel ucu. `timesheet-client.test.ts` /
// `units-export-client.test.ts` kanonu birebir izlenir.

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("downloadTrialBalanceExport", () => {
  it("dönemi year+month olarak taşır ve credentials: same-origin ile gider", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadTrialBalanceExport({ year: 2026, month: 7 });

    // Assert
    expect(stub.fetchMock).toHaveBeenCalledWith(
      "/api/backend/trial-balance/export.xlsx?year=2026&month=7",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });

  /**
   * `useTrialBalance` de göndermez (mockup kontrol çizmiyor, sunucu varsayılanı
   * `false`) — ekran ile dosya AYNI kümeyi gösterir.
   */
  it("include_empty GÖNDERMEZ — ekranın sorgusuyla birebir", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadTrialBalanceExport({ year: 2026, month: 7 });

    // Assert
    expect(stub.lastQuery()).toEqual({ year: "2026", month: "7" });
  });

  it("URL'e token koymaz", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadTrialBalanceExport({ year: 2026, month: 7 });

    // Assert
    expect(stub.lastUrl()).not.toContain("token");
  });

  it("dosya adını Content-Disposition'dan alır", async () => {
    // Arrange
    const stub = stubExportDownload(
      xlsxResponse('attachment; filename="mizan-2026-07.xlsx"'),
    );

    // Act
    await downloadTrialBalanceExport({ year: 2026, month: 7 });

    // Assert
    expect(stub.filename()).toBe("mizan-2026-07.xlsx");
  });

  it("başlık yoksa mizan.xlsx varsayılanına düşer", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadTrialBalanceExport({ year: 2026, month: 7 });

    // Assert
    expect(stub.filename()).toBe("mizan.xlsx");
  });

  it("obje URL'i her hâlükârda revoke edilir (finally)", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadTrialBalanceExport({ year: 2026, month: 7 });

    // Assert
    expect(stub.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("2xx dışı yanıt BackendError fırlatır ve createObjectURL ÇAĞRILMAZ", async () => {
    // Arrange
    const stub = stubExportDownload(
      errorResponse(422, { detail: "year/month zorunlu" }),
    );

    // Act
    const error = await downloadTrialBalanceExport({ year: 2026, month: 7 }).catch(
      (err: unknown) => err,
    );

    // Assert
    expect(error).toBeInstanceOf(BackendError);
    expect((error as BackendError).status).toBe(422);
    expect((error as BackendError).body).toEqual({ detail: "year/month zorunlu" });
    expect(stub.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("downloadChartOfAccountsExport", () => {
  it("süzgeçsiz çağrıda sorgu dizesi HİÇ olmaz", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadChartOfAccountsExport({});

    // Assert
    expect(stub.lastUrl()).toBe("/api/backend/chart-of-accounts/export.xlsx");
  });

  it("ekranın arama/tür/aktiflik süzgeçlerini sunucu adlarıyla taşır", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadChartOfAccountsExport({ q: "kasa", accountType: "liability", isActive: false });

    // Assert
    expect(stub.lastQuery()).toEqual({
      q: "kasa",
      account_type: "liability",
      is_active: "false",
    });
  });

  /**
   * 🔴 SAYFALAMA SÜZGEÇ DEĞİLDİR: ekran tavanla (200) tek sayfa çeker; Excel'i
   * o tavana kısmak kullanıcının GÖRDÜĞÜNDEN AZ dosya üretirdi.
   */
  it("limit/offset GEÇMEZ", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadChartOfAccountsExport({ q: "kasa", limit: 200, offset: 0 });

    // Assert
    expect(stub.lastQuery()).toEqual({ q: "kasa" });
  });

  it("başlık yoksa hesap-plani.xlsx varsayılanına düşer", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadChartOfAccountsExport({});

    // Assert
    expect(stub.filename()).toBe("hesap-plani.xlsx");
  });

  it("403 BackendError fırlatır ve indirme BAŞLAMAZ", async () => {
    // Arrange
    const stub = stubExportDownload(errorResponse(403, { detail: "Yetkiniz yok." }));

    // Act
    const error = await downloadChartOfAccountsExport({}).catch((err: unknown) => err);

    // Assert
    expect((error as BackendError).status).toBe(403);
    expect(stub.createObjectURL).not.toHaveBeenCalled();
  });
});

describe("downloadJournalExport", () => {
  it("dönemi ZORUNLU, hesabı OPSİYONEL olarak taşır", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadJournalExport({ year: 2026, month: 7, accountId: "acc-1" });

    // Assert
    expect(stub.lastQuery()).toEqual({ year: "2026", month: "7", account_id: "acc-1" });
  });

  it("hesap seçili değilken account_id GÖNDERİLMEZ (boş dize değil)", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadJournalExport({ year: 2026, month: 7 });

    // Assert
    expect(stub.lastQuery()).toEqual({ year: "2026", month: "7" });
  });

  it("limit/offset/enabled sızmaz", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadJournalExport({ year: 2026, month: 7, limit: 200, offset: 0, enabled: true });

    // Assert
    expect(stub.lastQuery()).toEqual({ year: "2026", month: "7" });
  });

  it("başlık yoksa yevmiye-defteri.xlsx varsayılanına düşer", async () => {
    // Arrange
    const stub = stubExportDownload();

    // Act
    await downloadJournalExport({ year: 2026, month: 7 });

    // Assert
    expect(stub.filename()).toBe("yevmiye-defteri.xlsx");
  });

  it("404 BackendError fırlatır ve indirme BAŞLAMAZ", async () => {
    // Arrange
    const stub = stubExportDownload(errorResponse(404, { detail: "Dönem yok." }));

    // Act
    const error = await downloadJournalExport({ year: 2026, month: 7 }).catch(
      (err: unknown) => err,
    );

    // Assert
    expect((error as BackendError).status).toBe(404);
    expect(stub.createObjectURL).not.toHaveBeenCalled();
  });
});

/**
 * 🔴 SIZINTI BEKÇİSİ (SAF KATMAN) — çevrim fonksiyonları ekranın hook'a
 * verdiği NESNENİN TAMAMINI karşılar. Bir süzgeç düşerse burası kırmızıya
 * döner; ekran testleri de ayrıca uçtan uca ölçer.
 */
describe("süzgeç çevrimi — ekran nesnesinin TAMAMI karşılanır", () => {
  it("chartExportSearchParams üç süzgecin hepsini çevirir", () => {
    // Arrange + Act
    const params = chartExportSearchParams({
      q: "100",
      accountType: "asset",
      isActive: true,
      limit: 200,
    });

    // Assert
    expect(params).toEqual({ q: "100", account_type: "asset", is_active: "true" });
  });

  it("journalExportSearchParams dört süzgecin hepsini çevirir", () => {
    // Arrange + Act
    const params = journalExportSearchParams({
      year: 2026,
      month: 7,
      accountId: "acc-1",
      status: "posted",
      limit: 200,
    });

    // Assert
    expect(params).toEqual({
      year: "2026",
      month: "7",
      account_id: "acc-1",
      status: "posted",
    });
  });
});
