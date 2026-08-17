import { describe, expect, it } from "vitest";

import { portfolioSummary } from "./summary";
import type { TimelineProject } from "@/lib/api/hooks/useProjectTimeline";

function project(overrides: Partial<TimelineProject> = {}): TimelineProject {
  return {
    id: "p-1",
    code: "PRJ-1",
    name: "Kule A",
    status: "active",
    start_date: "2025-01-01",
    end_date: "2026-12-31",
    contract_amount: "1000.00",
    sections: [],
    ...overrides,
  };
}

const TODAY = "2026-07-17";

describe("portfolioSummary — K6", () => {
  it("Toplam Sözleşme gövdedeki tutarların TOPLAMIDIR (kuruş kaybetmez)", () => {
    const summary = portfolioSummary(
      [
        project({ contract_amount: "22400000.55" }),
        project({ id: "p-2", contract_amount: "10700000.45" }),
      ],
      TODAY,
    );
    expect(summary.totalContract).toBe("33100001.00");
  });

  it("tutarsız projeler toplamı DÜŞÜRMEZ, yalnız atlanır", () => {
    const summary = portfolioSummary(
      [project({ contract_amount: "5100000.00" }), project({ id: "p-2", contract_amount: null })],
      TODAY,
    );
    expect(summary.totalContract).toBe("5100000.00");
  });

  it("hiç tutar yoksa null döner — 0 UYDURULMAZ", () => {
    expect(portfolioSummary([project({ contract_amount: null })], TODAY).totalContract).toBeNull();
    expect(portfolioSummary([], TODAY).totalContract).toBeNull();
  });

  it("Aktif Proje YALNIZ status==='active' sayar", () => {
    const summary = portfolioSummary(
      [
        project({ status: "active" }),
        project({ id: "p-2", status: "planning" }),
        project({ id: "p-3", status: "completed" }),
        project({ id: "p-4", status: "on_hold" }),
        project({ id: "p-5", status: "active" }),
      ],
      TODAY,
    );
    expect(summary.activeCount).toBe(2);
  });

  it("Yaklaşan Teslimat, bugün DAHİL en erken bitiştir", () => {
    const summary = portfolioSummary(
      [
        project({ end_date: "2027-03-31" }),
        project({ id: "p-2", end_date: "2026-08-31" }),
        project({ id: "p-3", end_date: "2026-12-01" }),
      ],
      TODAY,
    );
    expect(summary.nextDeliveryIso).toBe("2026-08-31");
  });

  it("GEÇMİŞ bitişler yaklaşan sayılmaz", () => {
    const summary = portfolioSummary(
      [project({ end_date: "2025-01-01" }), project({ id: "p-2", end_date: "2026-09-30" })],
      TODAY,
    );
    expect(summary.nextDeliveryIso).toBe("2026-09-30");
  });

  it("SINIR GÜNÜ: bitişi tam bugün olan proje YAKLAŞANDIR", () => {
    const summary = portfolioSummary([project({ end_date: TODAY })], TODAY);
    expect(summary.nextDeliveryIso).toBe(TODAY);
  });

  it("hepsi geçmişteyse alan boş kalır — en eski geçmiş tarih BASILMAZ", () => {
    const summary = portfolioSummary([project({ end_date: "2025-01-01" })], TODAY);
    expect(summary.nextDeliveryIso).toBeNull();
  });

  it("tarihi olmayan / geçersiz tarihli proje yaklaşan teslimatı kirletmez", () => {
    const summary = portfolioSummary(
      [
        project({ end_date: null }),
        project({ id: "p-2", end_date: "2026-02-30" }),
        project({ id: "p-3", end_date: "2026-11-30" }),
      ],
      TODAY,
    );
    expect(summary.nextDeliveryIso).toBe("2026-11-30");
  });

  it("boş portföyde üç alan da boştur", () => {
    expect(portfolioSummary([], TODAY)).toEqual({
      totalContract: null,
      activeCount: 0,
      nextDeliveryIso: null,
    });
  });
});
