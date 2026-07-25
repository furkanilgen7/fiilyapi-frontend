import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { DashboardView } from "./DashboardView";
import { useDashboardSummary } from "@/lib/api/hooks/useDashboardSummary";

vi.mock("@/lib/api/hooks/useDashboardSummary", () => ({
  useDashboardSummary: vi.fn(),
}));

const summary = {
  role_name: "Patron",
  active_project_count: 1,
  projects: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      code: "GK-A",
      name: "Güneşkent A-Blok",
      status: "active" as const,
      budget: "1500000.00",
      progress_pct: "42.50",
    },
  ],
  portfolio: { available: false, value: null, pending_module: "progress_payments" },
  receivables: { available: false, value: null, pending_module: "invoicing" },
  average_margin: { available: false, value: null, pending_module: "progress_payments" },
  pending_approvals: { available: false, count: 0, items: [], pending_module: "approvals" },
  risks: { available: false, items: [], pending_module: "inventory" },
};

describe("DashboardView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("breadcrumb, baslik ve proje kartini basar", () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: summary,
      isLoading: false,
      isError: false,
    } as never);

    render(<DashboardView />);

    expect(screen.getByRole("heading", { name: "Gösterge Paneli" })).toBeInTheDocument();
    expect(screen.getByText("Patron Görünümü")).toBeInTheDocument();
    expect(screen.getByText("1 Aktif Proje")).toBeInTheDocument();
    expect(screen.getByText("Güneşkent A-Blok")).toBeInTheDocument();
  });

  it("sayac sifirken onay rozetini basmaz", () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: summary,
      isLoading: false,
      isError: false,
    } as never);

    render(<DashboardView />);

    expect(screen.queryByTestId("dash-approvals-badge")).not.toBeInTheDocument();
  });

  it("hata durumunda mesaj basar", () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);

    render(<DashboardView />);

    expect(screen.getByText("Gösterge paneli yüklenemedi")).toBeInTheDocument();
  });
});
