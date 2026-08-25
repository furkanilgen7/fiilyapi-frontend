import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";

import { EquipmentView } from "./EquipmentView";
import { useEquipment } from "@/lib/api/hooks/useEquipment";
import { useEquipmentSummary } from "@/lib/api/hooks/useEquipmentSummary";
import { usePersonnel } from "@/lib/api/hooks/usePersonnel";
import type { PersonnelListItem } from "@/lib/api/hooks/usePersonnel";
import { useSiteOptions } from "@/lib/api/hooks/useSiteOptions";
import { useSession } from "@/components/shell/SessionProvider";
import type { MeResponse } from "@/lib/auth/types";
import type { EquipmentListResponse, EquipmentResponse } from "@/lib/api/hooks/useEquipment";
import type { EquipmentSummaryResponse } from "@/lib/api/hooks/useEquipmentSummary";

vi.mock("@/lib/api/hooks/useEquipment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useEquipment")>()),
  useEquipment: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useEquipmentSummary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useEquipmentSummary")>()),
  useEquipmentSummary: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSiteOptions", () => ({ useSiteOptions: vi.fn() }));
vi.mock("@/lib/api/hooks/usePersonnel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/usePersonnel")>()),
  usePersonnel: vi.fn(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

const EQUIPMENT: EquipmentResponse = {
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
  engine_power_kw: null,
  capacity_description: null,
  hourmeter_hours: null,
  rental_contract_no: null,
  rental_start_date: null,
  rental_end_date: null,
  rental_min_monthly_hours: null,
  rental_payment_terms: null,
  last_service_date: null,
  last_service_hourmeter: null,
  is_company_asset: true,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

function equipmentList(overrides: Partial<EquipmentListResponse> = {}): EquipmentListResponse {
  return { items: [EQUIPMENT], total: 1, limit: 200, offset: 0, ...overrides };
}

const SUMMARY: EquipmentSummaryResponse = {
  working: 18,
  broken: 3,
  maintenance: 5,
  idle: 7,
  monthly_cost: "124000.00",
  monthly_cost_unknown_count: 0,
};

/** React Query sonucunun 20+ alanını fikstürde yeniden üretmemek için (E12 deseni). */
function queryStub<T>(
  data: T,
  extra: Partial<{ isLoading: boolean; isError: boolean; error: unknown }> = {},
) {
  return {
    data,
    isLoading: extra.isLoading ?? false,
    isError: extra.isError ?? false,
    error: extra.error ?? null,
  } as unknown as UseQueryResult<T, Error>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: { equipment: "full" } } as unknown as MeResponse,
    isLoading: false,
  } as ReturnType<typeof useSession>);
  vi.mocked(useEquipment).mockReturnValue(queryStub(equipmentList()));
  vi.mocked(useEquipmentSummary).mockReturnValue(queryStub(SUMMARY));
  vi.mocked(useSiteOptions).mockReturnValue({
    options: [{ siteId: "site-1", projectId: "p-1", label: "Güneşkent A-Blok" }],
    isLoading: false,
    isError: false,
  });
  vi.mocked(usePersonnel).mockReturnValue(
    queryStub({
      items: [{ id: "op-1", full_name: "H. Çelik" }] as unknown as PersonnelListItem[],
      total: 1,
      limit: 200,
      offset: 0,
    }),
  );
});

describe("EquipmentView — M1 başlık, sekme, KPI ve kart ızgarası", () => {
  it("mockup başlığı basılır, kabuk YENİDEN çizilmez", () => {
    render(<EquipmentView />);
    expect(screen.getByRole("heading", { name: "Makine & Ekipman" })).toBeInTheDocument();
    expect(screen.queryByText("Gösterge Paneli")).not.toBeInTheDocument();
  });

  it("sekme şeridi basılır, 'Ekipman Listesi' aktiftir", () => {
    render(<EquipmentView />);
    expect(screen.getByRole("tab", { name: "Ekipman Listesi" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("liste her zaman AÇIK limit tavanıyla istenir (kırpma korkuluğu)", () => {
    render(<EquipmentView />);
    expect(vi.mocked(useEquipment).mock.calls[0][0]).toEqual({ limit: 200 });
  });

  it("kart ızgarasında ekipman kartı görünür, üç bağımsız kaynak birleşir", () => {
    render(<EquipmentView />);
    const grid = screen.getByTestId("makine-grid");
    expect(grid).toHaveTextContent("Tower Crane TC-48");
    expect(grid).toHaveTextContent("Güneşkent A-Blok"); // useSiteOptions
    expect(grid).toHaveTextContent("H. Çelik"); // usePersonnel
  });

  it("liste kırpılırsa görünür uyarı basılır", () => {
    vi.mocked(useEquipment).mockReturnValue(queryStub(equipmentList({ total: 900 })));
    render(<EquipmentView />);
    expect(screen.getByTestId("makine-truncation-notice")).toHaveTextContent("liste eksik");
  });

  it("izinsiz kullanıcı erişim reddi görür", () => {
    vi.mocked(useSession).mockReturnValue({
      me: { permissions: { equipment: "none" } } as unknown as MeResponse,
      isLoading: false,
    } as ReturnType<typeof useSession>);
    render(<EquipmentView />);
    expect(screen.queryByRole("heading", { name: "Makine & Ekipman" })).not.toBeInTheDocument();
  });

  it("kayıtlı ekipman yoksa görünür bir boş-durum notu basar", () => {
    vi.mocked(useEquipment).mockReturnValue(
      queryStub(equipmentList({ items: [], total: 0 })),
    );
    render(<EquipmentView />);
    expect(screen.getByText("Kayıtlı ekipman yok.")).toBeInTheDocument();
    expect(screen.queryByTestId("makine-grid")).not.toBeInTheDocument();
  });
});
