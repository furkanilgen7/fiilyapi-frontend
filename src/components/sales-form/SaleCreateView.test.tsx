import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SaleCreateView } from "./SaleCreateView";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useProjectUnits, type UnitResponse } from "@/lib/api/hooks/useProjectUnits";
import { useCustomers } from "@/lib/api/hooks/useCustomers";
import { useCreateCustomer } from "@/lib/api/hooks/useCustomerMutations";
import {
  useCreateSale,
  useGenerateSalePlan,
  useSaveSaleInstallments,
} from "@/lib/api/hooks/useSaleMutations";
import { useUserOptions } from "@/lib/api/hooks/useUserOptions";
import { useSession } from "@/components/shell/SessionProvider";
import type { MeResponse } from "@/lib/auth/types";

vi.mock("@/lib/api/hooks/useProjects", () => ({ useProjects: vi.fn() }));
vi.mock("@/lib/api/hooks/useProjectUnits", () => ({ useProjectUnits: vi.fn() }));
vi.mock("@/lib/api/hooks/useCustomers", () => ({ useCustomers: vi.fn() }));
vi.mock("@/lib/api/hooks/useCustomerMutations", () => ({ useCreateCustomer: vi.fn() }));
vi.mock("@/lib/api/hooks/useSaleMutations", () => ({
  useCreateSale: vi.fn(),
  useGenerateSalePlan: vi.fn(),
  useSaveSaleInstallments: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useUserOptions", () => ({
  useUserOptions: vi.fn(),
  userOptionLabel: (u: { full_name: string }) => u.full_name,
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

let searchParams = new URLSearchParams();
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => searchParams,
}));

function queryStub(data: unknown, extra: Record<string, unknown> = {}) {
  return { data, isLoading: false, isError: false, error: null, ...extra } as never;
}

function mutationStub() {
  return { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false } as never;
}

function makeUnit(overrides: Partial<UnitResponse> = {}): UnitResponse {
  return {
    id: "u-1",
    label: "A Blok · 3",
    layout: "4+1",
    gross_area_m2: "178.00",
    net_area_m2: "152.00",
    list_price: "1480000.00",
    unit_price_per_m2: "8314.61",
    unit_cost: { available: true, value: "980000.00", pending_module: null },
    ...overrides,
  } as UnitResponse;
}

function mockUnits(unit: UnitResponse) {
  vi.mocked(useProjectUnits).mockReturnValue(
    queryStub({ blocks: [{ block: { id: "blk-1", name: "A Blok" }, units: [unit] }] }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: { sales: "full" } } as unknown as MeResponse,
    isLoading: false,
  } as ReturnType<typeof useSession>);
  vi.mocked(useProjects).mockReturnValue(queryStub({ items: [{ id: "p-2", name: "Villa B" }] }));
  vi.mocked(useCustomers).mockReturnValue(queryStub({ items: [] }));
  vi.mocked(useUserOptions).mockReturnValue({ options: [], isLoading: false, isError: false, isForbidden: false } as never);
  vi.mocked(useCreateCustomer).mockReturnValue(mutationStub());
  vi.mocked(useCreateSale).mockReturnValue(mutationStub());
  vi.mocked(useGenerateSalePlan).mockReturnValue(mutationStub());
  vi.mocked(useSaveSaleInstallments).mockReturnValue(mutationStub());
  mockUnits(makeUnit());
});

function selectUnit() {
  fireEvent.change(screen.getByTestId("satis-form-proje"), { target: { value: "p-2" } });
  fireEvent.change(screen.getByTestId("satis-form-unite"), { target: { value: "u-1" } });
}

describe("SaleCreateView — başlık ve kabuk", () => {
  it("başlık basılır; mockup'ın kendi üst barı yeniden çizilmez", () => {
    render(<SaleCreateView />);
    expect(screen.getByRole("heading", { name: "Yeni Satış Kaydı", level: 1 })).toBeInTheDocument();
  });
});

describe("SaleCreateView — Bu Satıştan Kâr (server türevi)", () => {
  it("ünite maliyeti SUNUCUDAN gelir; kâr = bedel − maliyet, marj basılır", () => {
    render(<SaleCreateView />);
    selectUnit();
    expect(screen.getByTestId("satis-form-maliyet")).toHaveTextContent("₺980.000");

    fireEvent.change(screen.getByTestId("satis-form-satis-bedeli"), {
      target: { value: "1440000" },
    });
    const kar = screen.getByTestId("satis-form-kar");
    expect(kar).toHaveTextContent("₺460.000");
    expect(kar).toHaveTextContent("%31,94 marj");
  });

  it("maliyet zarfı available:false ise maliyet ve kâr '—' (istemci UYDURMAZ)", () => {
    mockUnits(makeUnit({ unit_cost: { available: false, value: null, pending_module: "project_costs" } as UnitResponse["unit_cost"] }));
    render(<SaleCreateView />);
    selectUnit();
    fireEvent.change(screen.getByTestId("satis-form-satis-bedeli"), {
      target: { value: "1440000" },
    });
    expect(screen.getByTestId("satis-form-maliyet")).toHaveTextContent("—");
    expect(screen.getByTestId("satis-form-kar")).toHaveTextContent("—");
  });
});

describe("SaleCreateView — belgeler kartı PENDING", () => {
  it("gerçek yükleme yüzeyi YOKTUR (input[type=file] render edilmez); kutular 'Yakında'", () => {
    const { container } = render(<SaleCreateView />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByText("Satış Belgeleri")).toBeInTheDocument();
    expect(screen.getAllByText("Yakında").length).toBeGreaterThan(0);
  });
});

describe("SaleCreateView — ödeme planı boş durumu", () => {
  it("plan üretilene kadar tablo yerine görünür not basılır (TOPLAM yok)", () => {
    render(<SaleCreateView />);
    expect(screen.getByTestId("satis-form-plan-bos")).toBeInTheDocument();
    expect(screen.queryByTestId("satis-form-plan-toplam")).toBeNull();
  });
});

describe("SaleCreateView — Plan Oluştur akış sırası (POST → generate-plan)", () => {
  it("önce satış oluşturulur, sonra plan üretilir; TOPLAM sunucudan basılır (Σ görünümü)", async () => {
    const createMock = vi.fn().mockResolvedValue({ id: "sl-new-1" });
    const generateMock = vi.fn().mockResolvedValue({
      sale_price: "1440000.00",
      total_amount: "1440000.00",
      items: [
        { id: "si-1", sale_id: "sl-new-1", sequence_no: 1, label: "Peşinat", due_date: "2026-09-01", amount: "440000.00", payment_method: "transfer", paid_amount: "0.00", paid_at: null, remaining_amount: "440000.00", is_overdue: false },
        { id: "si-2", sale_id: "sl-new-1", sequence_no: 2, label: "1. Taksit", due_date: "2026-10-01", amount: "1000000.00", payment_method: null, paid_amount: "0.00", paid_at: null, remaining_amount: "1000000.00", is_overdue: false },
      ],
    });
    vi.mocked(useCreateSale).mockReturnValue({ mutate: vi.fn(), mutateAsync: createMock, isPending: false } as never);
    vi.mocked(useGenerateSalePlan).mockReturnValue({ mutate: vi.fn(), mutateAsync: generateMock, isPending: false } as never);
    vi.mocked(useCustomers).mockReturnValue(queryStub({ items: [{ id: "cus-1", customer_type: "person", name: "Ayşe", national_id: "12345678901", tax_number: null, phone: "0532", email: null, address: null }] }));

    render(<SaleCreateView />);
    selectUnit();
    // Kayıtlı müşteri seç (yeni müşteri POST'unu bu testte atlıyoruz).
    fireEvent.change(screen.getByTestId("satis-form-musteri-sec"), { target: { value: "cus-1" } });
    fireEvent.change(screen.getByTestId("satis-form-satis-bedeli"), { target: { value: "1440000" } });

    fireEvent.click(screen.getByTestId("satis-form-plan-olustur"));
    await screen.findByTestId("satis-form-plan-tablo");

    // Sıra: önce POST sales, sonra generate-plan.
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(generateMock).toHaveBeenCalledWith("sl-new-1");
    // TOPLAM sunucunun total_amount'undan (Σ = sale_price).
    expect(screen.getByTestId("satis-form-plan-toplam")).toHaveTextContent("₺1.440.000");
  });
});
