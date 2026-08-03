import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SubcontractorProgressPaymentsView } from "./SubcontractorProgressPaymentsView";
import {
  useSubcontractorProgressPayments,
  useSubcontractorProgressPaymentSummary,
} from "@/lib/api/hooks/useSubcontractorProgressPayments";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useSession } from "@/components/shell/SessionProvider";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

vi.mock(
  "@/lib/api/hooks/useSubcontractorProgressPayments",
  async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/api/hooks/useSubcontractorProgressPayments")>()),
    useSubcontractorProgressPayments: vi.fn(),
    useSubcontractorProgressPaymentSummary: vi.fn(),
  }),
);
vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProjects: vi.fn(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/hakedisler/taseron",
  useSearchParams: () => new URLSearchParams(),
}));

const BASE_ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "ayse@ornek.com",
  full_name: "Ayşe Yılmaz",
  title: null,
  role_key: "procurement",
  status: "active",
} as unknown as MeResponse;

function mockSession(permissions?: Record<string, string>) {
  const me = permissions === undefined ? BASE_ME : { ...BASE_ME, permissions };
  vi.mocked(useSession).mockReturnValue({ me: me as MeResponse, isLoading: false });
}

function mockListQuery(value: Partial<ReturnType<typeof useSubcontractorProgressPayments>>) {
  vi.mocked(useSubcontractorProgressPayments).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

function mockSummaryQuery(value: Partial<ReturnType<typeof useSubcontractorProgressPaymentSummary>>) {
  vi.mocked(useSubcontractorProgressPaymentSummary).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SubcontractorProgressPaymentsView />
    </QueryClientProvider>,
  );
}

describe("SubcontractorProgressPaymentsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession({ progress_payments: "draft" });
    vi.mocked(useProjects).mockReturnValue({
      data: { items: [], counts: {} },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    mockSummaryQuery({});
  });

  it("baslik + sekme seridini basar (Taseron aktif)", () => {
    mockListQuery({ data: { items: [], total: 0, limit: 50, offset: 0 } });
    renderView();
    expect(screen.getByRole("heading", { name: "Taşeron Hakedişi" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Taşeron" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "İşveren" })).toHaveAttribute("aria-selected", "false");
  });

  it("403'te erisim reddi basar", () => {
    mockListQuery({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    renderView();
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Taşeron Hakedişi" })).not.toBeInTheDocument();
  });

  it("yazma yetkisi varken 'Yeni Hakediş' butonu gorunur, salt-okunurda gorunmez", () => {
    mockListQuery({ data: { items: [], total: 0, limit: 50, offset: 0 } });
    renderView();
    expect(screen.getByRole("link", { name: "+ Yeni Hakediş" })).toHaveAttribute(
      "href",
      "/hakedisler/taseron/yeni",
    );
  });

  it("salt-okunur yetkide 'Yeni Hakediş' butonu gorunmez", () => {
    mockSession({ progress_payments: "view" });
    mockListQuery({ data: { items: [], total: 0, limit: 50, offset: 0 } });
    renderView();
    expect(screen.queryByRole("link", { name: "+ Yeni Hakediş" })).not.toBeInTheDocument();
  });

  it("KPI serit ozet verisiyle basar", () => {
    mockListQuery({ data: { items: [], total: 0, limit: 50, offset: 0 } });
    mockSummaryQuery({
      data: {
        total_gross: "4820000.00",
        pending_gross: "1240000.00",
        paid_period_gross: "2100000.00",
        active_subcontractor_count: 12,
        period_year: 2026,
        period_month: 7,
      },
    });
    renderView();
    expect(screen.getByTestId("thk-kpi-strip")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
