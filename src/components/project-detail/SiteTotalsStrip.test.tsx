import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteTotalsStrip } from "./SiteTotalsStrip";
import type { SiteListResponse } from "@/lib/api/hooks/useSites";

// Bu dilimde SiteListTotals'in TAMAMI yer tutucu (backend spec §4.1, schema
// yorumu). Dorduncu KPI'nin de "—" bastigini ve kimseyi sessizce dusurmedigini
// dogrulamak bu testin amaci (spec §4.4, §7.1).
const TOTALS: SiteListResponse["totals"] = {
  total_progress_payment: { available: false, value: null, pending_module: "progress_payments" },
  subcontractor_count: { available: false, count: null, pending_module: "subcontracts" },
  active_worker_count: { available: false, count: null, pending_module: "timesheet" },
  average_margin: { available: false, value: null, pending_module: "project_costs" },
};

describe("SiteTotalsStrip", () => {
  it("dort KPI karti da etiketiyle basar", () => {
    render(<SiteTotalsStrip totals={TOTALS} />);
    expect(screen.getByText("Toplam Hakediş")).toBeInTheDocument();
    expect(screen.getByText("Toplam Taşeron")).toBeInTheDocument();
    expect(screen.getByText("Aktif İşçi")).toBeInTheDocument();
    expect(screen.getByText("Ortalama Marj")).toBeInTheDocument();
  });

  it("dort KPI da yer tutucu oldugu icin em dash basar ve gercek sayi uydurmaz", () => {
    render(<SiteTotalsStrip totals={TOTALS} />);
    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(4);
  });

  it("her yer tutucu hucre dogru turkce title tasir", () => {
    render(<SiteTotalsStrip totals={TOTALS} />);
    expect(screen.getByTitle("Hakediş modülüyle birlikte gelir")).toBeInTheDocument();
    expect(screen.getByTitle("Taşeron sözleşmeleriyle birlikte gelir")).toBeInTheDocument();
    expect(screen.getByTitle("Puantaj modülüyle birlikte gelir")).toBeInTheDocument();
    expect(screen.getByTitle("Maliyet takibiyle birlikte gelir")).toBeInTheDocument();
  });

  it("hicbir KPI karti sessizce dusurulmez — dort etiket + dort deger birlikte var", () => {
    const { container } = render(<SiteTotalsStrip totals={TOTALS} />);
    const cards = container.querySelectorAll(".site-totals__card");
    expect(cards).toHaveLength(4);
  });
});
