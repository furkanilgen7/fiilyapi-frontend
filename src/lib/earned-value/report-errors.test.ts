import { describe, it, expect } from "vitest";

import { weeklyReportFailure } from "./report-errors";
import { BackendError } from "@/lib/api/unwrap";

// PLN-F3.1 · QURR 409 NO_BASELINE / 404 NO_WEEK ayrımı (F3-SOZLESME.md §0, §2).

describe("weeklyReportFailure", () => {
  it("409 + backend'in NO_BASELINE metni → no_baseline", () => {
    const err = new BackendError(409, { detail: "Şantiyede aktif (dondurulmuş) baseline yok" });
    expect(weeklyReportFailure(err)).toBe("no_baseline");
  });

  it("404 + backend'in NO_WEEK metni → no_week", () => {
    const err = new BackendError(404, { detail: "Hafta proje takviminde yok" });
    expect(weeklyReportFailure(err)).toBe("no_week");
  });

  it("403 → forbidden (metin ne olursa olsun)", () => {
    expect(weeklyReportFailure(new BackendError(403, { detail: "Yetki yok" }))).toBe("forbidden");
  });

  it("409 ama metin farklı → other (yalnız durum kodu yetmez)", () => {
    expect(weeklyReportFailure(new BackendError(409, { detail: "başka bir kilit" }))).toBe("other");
  });

  it("404 ama metin farklı → other", () => {
    expect(weeklyReportFailure(new BackendError(404, { detail: "Kayıt bulunamadı" }))).toBe("other");
  });

  it("BackendError değilse (ağ hatası) → other", () => {
    expect(weeklyReportFailure(new Error("network"))).toBe("other");
  });

  it("gövdesiz BackendError → other", () => {
    expect(weeklyReportFailure(new BackendError(409, undefined))).toBe("other");
  });
});
