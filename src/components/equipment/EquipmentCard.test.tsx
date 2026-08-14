import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { EquipmentCard } from "./EquipmentCard";
import type { EquipmentResponse } from "@/lib/api/hooks/useEquipment";

const BASE: EquipmentResponse = {
  id: "eq-1",
  name: "Tower Crane TC-48",
  category: "crane",
  brand: "Liebherr",
  model: null,
  serial_no: null,
  plate_no: null,
  model_year: null,
  ownership: "owned",
  purchase_amount: null,
  purchase_date: null,
  depreciation_years: null,
  supplier_id: null,
  financing: null,
  market_value: null,
  rate_amount: "3200.00",
  rate_period: "daily",
  site_id: "site-1",
  operator_id: "op-1",
  status: "working",
  status_note: null,
  status_expected_date: null,
  fuel_type: null,
  norm_consumption: null,
  norm_unit: null,
  maintenance_period: null,
  monthly_capacity_hours: 0,
  is_company_asset: true,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

describe("EquipmentCard — M1 88-165", () => {
  it("K12 — 'working' durumu İKİ kutu basar (Günlük Kira, Operatör)", () => {
    render(<EquipmentCard equipment={BASE} siteLabel="Güneşkent A-Blok" operatorName="H. Çelik" />);
    const boxes = screen.getByTestId("makine-card-fact-boxes");
    expect(boxes).toHaveTextContent("Günlük Kira");
    expect(boxes).toHaveTextContent("Operatör");
    expect(boxes).toHaveTextContent("₺ 3.200");
    expect(boxes).toHaveTextContent("H. Çelik");
    expect(screen.queryByTestId("makine-card-warning-box")).not.toBeInTheDocument();
  });

  it("K12 — 'broken' durumu TEK geniş uyarı kutusu basar", () => {
    const broken: EquipmentResponse = {
      ...BASE,
      status: "broken",
      status_note: "Pompa arızası — servis bekleniyor",
      status_expected_date: "2026-07-21",
    };
    render(<EquipmentCard equipment={broken} siteLabel="Güneşkent A-Blok" operatorName={null} />);
    const box = screen.getByTestId("makine-card-warning-box");
    expect(box).toHaveTextContent("Pompa arızası");
    expect(box).toHaveTextContent("21 Temmuz 2026");
    expect(screen.queryByTestId("makine-card-fact-boxes")).not.toBeInTheDocument();
  });

  it("K12 — 'maintenance' durumu da TEK uyarı kutusu basar", () => {
    const maintenance: EquipmentResponse = {
      ...BASE,
      status: "maintenance",
      status_note: "Periyodik bakım yapılıyor",
      status_expected_date: "2026-07-19",
    };
    render(
      <EquipmentCard equipment={maintenance} siteLabel="Stok Deposu" operatorName={null} />,
    );
    const box = screen.getByTestId("makine-card-warning-box");
    expect(box).toHaveTextContent("Periyodik bakım yapılıyor");
    expect(box).toHaveTextContent("Dönüş");
    expect(screen.queryByTestId("makine-card-fact-boxes")).not.toBeInTheDocument();
  });

  it("K3 — rate_amount null ise '—' basar, '0' BASMAZ", () => {
    const noRate: EquipmentResponse = { ...BASE, rate_amount: null };
    render(<EquipmentCard equipment={noRate} siteLabel="Güneşkent A-Blok" operatorName="H. Çelik" />);
    const boxes = screen.getByTestId("makine-card-fact-boxes");
    expect(boxes).toHaveTextContent("—");
    expect(boxes).not.toHaveTextContent("₺ 0");
    expect(boxes.textContent).not.toMatch(/(?<!₺ )\b0\b/);
  });

  it("K3 — operatör atanmadıysa '—' basar (undefined ise 'Yükleniyor…')", () => {
    render(<EquipmentCard equipment={BASE} siteLabel="Güneşkent A-Blok" operatorName={null} />);
    expect(screen.getByTestId("makine-card-fact-boxes")).toHaveTextContent("—");
  });

  it("üç bağımsız kaynak henüz yüklenmemişken 'Yükleniyor…' basar, uydurma veri basmaz", () => {
    render(<EquipmentCard equipment={BASE} siteLabel={undefined} operatorName={undefined} />);
    expect(screen.getAllByText("Yükleniyor…").length).toBeGreaterThan(0);
  });

  it("K6 — site_id null ise 'Depoda (Atanmadı)' basar", () => {
    const unassigned: EquipmentResponse = { ...BASE, site_id: null };
    render(<EquipmentCard equipment={unassigned} siteLabel={null} operatorName="H. Çelik" />);
    expect(screen.getByText(/Depoda \(Atanmadı\)/)).toBeInTheDocument();
  });

  it("K11 — kategori emojisi kart başlığında görünür", () => {
    render(<EquipmentCard equipment={BASE} siteLabel="Güneşkent A-Blok" operatorName="H. Çelik" />);
    expect(screen.getByTestId("makine-card")).toHaveTextContent("🏗");
  });

  it("K4 — 'Düzenle' bağlantısı /makine/{id}/duzenle'ye gider", () => {
    render(<EquipmentCard equipment={BASE} siteLabel="Güneşkent A-Blok" operatorName="H. Çelik" />);
    expect(screen.getByTestId("makine-card-edit-link")).toHaveAttribute(
      "href",
      "/makine/eq-1/duzenle",
    );
  });
});
