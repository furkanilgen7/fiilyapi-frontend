import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { PersonnelKpiStrip } from "./PersonnelKpiStrip";
import type { PersonnelKpis } from "./personnel-derive";

function kpis(overrides: Partial<PersonnelKpis> = {}): PersonnelKpis {
  return { total: 6, isClipped: false, companyCount: 2, subcontractorCount: 3, ...overrides };
}

describe("PersonnelKpiStrip", () => {
  it("üç TÜREV kartı sunucu değerlerini basar", () => {
    render(<PersonnelKpiStrip kpis={kpis()} />);
    const strip = screen.getByTestId("personel-kpi-strip");
    expect(strip).toHaveTextContent("Toplam Personel");
    expect(strip).toHaveTextContent("6");
    expect(strip).toHaveTextContent("2");
    expect(strip).toHaveTextContent("3");
  });

  it("kırpılmada Şirket/Taşeron sayıları pending'e düşer, gerekçe görünür", () => {
    render(<PersonnelKpiStrip kpis={kpis({ isClipped: true, companyCount: null, subcontractorCount: null })} />);
    expect(screen.getByTestId("personel-kpi-company-pending")).toHaveTextContent("—");
    expect(screen.getByTestId("personel-kpi-subcontractor-pending")).toHaveTextContent("—");
  });

  it("Sahada Aktif / İzinde / Aylık Maliyet HER ZAMAN pending'dir, uydurma sayı basılmaz", () => {
    render(<PersonnelKpiStrip kpis={kpis()} />);
    expect(screen.getByTestId("personel-kpi-onsite-pending")).toHaveTextContent("—");
    expect(screen.getByTestId("personel-kpi-onleave-pending")).toHaveTextContent("—");
    expect(screen.getByTestId("personel-kpi-cost-pending")).toHaveTextContent("—");
    expect(screen.getByText(/Sahada aktiflik takibi bu sürümde yok/)).toBeInTheDocument();
    // Mockup'ın örnek "118"/"14"/"₺892K" değerleri UYDURULMAZ.
    expect(screen.queryByText("118")).not.toBeInTheDocument();
    expect(screen.queryByText("₺892K")).not.toBeInTheDocument();
  });

  it("kpis undefined ise (yükleniyor/hata) her kart pending görünümdedir", () => {
    render(<PersonnelKpiStrip kpis={undefined} />);
    expect(screen.getByTestId("personel-kpi-strip")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
