import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import ProjectDetailPage from "./page";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSites } from "@/lib/api/hooks/useSites";
import { BackendError } from "@/lib/api/unwrap";
import { SITE_CONTRACT_DEFAULTS } from "@/lib/api/hooks/site-fixtures";

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProject: vi.fn(),
}));

vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSites: vi.fn(),
}));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: PROJECT_ID }),
  usePathname: () => `/projeler/${PROJECT_ID}`,
}));

const PROJECT = {
  id: PROJECT_ID,
  code: "SZL-2025-001",
  name: "Güneşkent Konut",
  project_type: "taahhut" as const,
  category: "Konut Projesi",
  city: "Ankara",
  status: "active" as const,
  start_date: null,
  end_date: null,
  contract_no: "SZL-2025-001",
  contract_amount: "22400000.00",
  employer_name: "Güneşkent Gayrimenkul A.Ş.",
  employer: null,
  contract: null,
  budget_lines: { material: "0", labor: "0", subcontractor: "0", overhead: "0" },
  is_draft: false,
  budget: "0",
  progress_pct: "0",
  contracting: null,
  investment: null,
  land_share: null,
  site_count: 2,
};

function mockQuery(value: Partial<ReturnType<typeof useProject>>) {
  vi.mocked(useProject).mockReturnValue({
    data: undefined, isLoading: false, isError: false, error: null, ...value,
  } as never);
}

const SITE = {
  ...SITE_CONTRACT_DEFAULTS,
  id: "44444444-4444-4444-4444-444444444444",
  code: "A-BLOK",
  name: "A-Blok Şantiyesi",
  status: "active" as const,
  address: "Kuyubaşı Mah.",
  city: "Ankara",
  city_inherited: false,
  site_manager_name: "S. Öztürk",
  start_date: "2025-03-01",
  end_date: "2026-12-31",
  delivery_date: null,
  remaining_days: 157,
  section_count: 5,
  worker_count: { available: false, count: null, pending_module: "timesheet" },
  progress_pct: { available: false, value: null, pending_module: "progress_payments" },
};

function mockSites(value: Partial<ReturnType<typeof useSites>>) {
  vi.mocked(useSites).mockReturnValue({
    data: undefined, isLoading: false, isError: false, error: null, ...value,
  } as never);
}

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSites({
      data: {
        counts: { all: 1, active: 1, on_hold: 0, completed: 0, draft: 0 },
        items: [SITE],
        totals: {
          total_progress_payment: { available: false, value: null, pending_module: "progress_payments" },
          subcontractor_count: { available: false, count: null, pending_module: "subcontracts" },
          active_worker_count: { available: false, count: null, pending_module: "timesheet" },
          average_margin: { available: false, value: null, pending_module: "project_costs" },
        },
      },
    });
  });

  it("yuklenirken mesaj basar", () => {
    mockQuery({ isLoading: true });
    render(<ProjectDetailPage />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("403'te erisim reddi basar", () => {
    mockQuery({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    render(<ProjectDetailPage />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("diger hatalarda mesaj basar", () => {
    mockQuery({ isError: true, error: new Error("patladi") });
    render(<ProjectDetailPage />);
    expect(screen.getByText("Proje yüklenemedi")).toBeInTheDocument();
  });

  it("basariyla hero + baslik + ekle butonunu basar", () => {
    mockQuery({ data: PROJECT });
    render(<ProjectDetailPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Güneşkent Konut" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Şantiyeler (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Şantiye Ekle" })).toBeInTheDocument();
  });

  it("santiyesiz projede durust bos durum basar (spec §7.4)", () => {
    mockQuery({ data: { ...PROJECT, site_count: 0 } });
    render(<ProjectDetailPage />);
    expect(screen.getByText("Bu projede henüz şantiye yok.")).toBeInTheDocument();
    expect(screen.queryByTestId("site-list-grid")).not.toBeInTheDocument();
  });

  it("bos durum kendi + Santiye Ekle eylemini tasir ve hata gibi gorunmez", () => {
    mockQuery({ data: { ...PROJECT, site_count: 0 } });
    render(<ProjectDetailPage />);
    const buttons = screen.getAllByRole("button", { name: "+ Şantiye Ekle" });
    // Ust bar + bos durum: ayni eylemi paylasan iki buton (spec §7.4).
    expect(buttons).toHaveLength(2);
    const emptyState = screen.getByText("Bu projede henüz şantiye yok.").closest("div");
    expect(emptyState?.className).not.toMatch(/error|warning|danger/i);
  });

  it("bos durumda da Alt KPI seridi basar (yer tutucu totals gecerli veri kalir)", () => {
    mockQuery({ data: { ...PROJECT, site_count: 0 } });
    render(<ProjectDetailPage />);
    expect(screen.getByTestId("site-totals-strip")).toBeInTheDocument();
  });

  it("santiyesi olan projede SiteCard izgarasini gercek veriyle basar", () => {
    mockQuery({ data: PROJECT });
    render(<ProjectDetailPage />);
    expect(screen.getByTestId("site-list-grid")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "A-Blok Şantiyesi" })).toBeInTheDocument();
    expect(screen.queryByText("Bu projede henüz şantiye yok.")).not.toBeInTheDocument();
  });

  it("santiyesi olan projede Alt KPI seridi de basar (spec §4.4)", () => {
    mockQuery({ data: PROJECT });
    render(<ProjectDetailPage />);
    expect(screen.getByTestId("site-totals-strip")).toBeInTheDocument();
    expect(screen.getByText("Toplam Hakediş")).toBeInTheDocument();
  });

  it("santiye listesi yuklenirken mesaj basar", () => {
    mockQuery({ data: PROJECT });
    mockSites({ isLoading: true });
    render(<ProjectDetailPage />);
    expect(screen.getAllByText("Yükleniyor…").length).toBeGreaterThan(0);
  });
});

// KOD INCELEME BULGUSU: santiye sorgusu proje sorgusundan BAGIMSIZ basarisiz
// olabilir; yalniz `.data` dallanildigi icin 500/403 durumunda ekran sonsuza
// kadar "Yükleniyor…" gosteriyor, kullaniciya hicbir sey soylenmiyordu.
describe("ProjectDetailPage — santiye sorgusu bagimsiz basarisiz olabilir", () => {
  beforeEach(() => mockQuery({ data: PROJECT }));

  it("santiye listesi 500 verirse durust hata mesaji basar, 'Yükleniyor…'da takilmaz", () => {
    mockSites({ isError: true, error: new Error("patladi") });
    render(<ProjectDetailPage />);
    expect(screen.getByText("Şantiyeler yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByText("Yükleniyor…")).not.toBeInTheDocument();
    expect(screen.queryByTestId("site-list-grid")).not.toBeInTheDocument();
    // Proje hero'su ayakta kalir — yalniz liste dilimi hata gosterir.
    expect(screen.getByRole("heading", { level: 1, name: "Güneşkent Konut" })).toBeInTheDocument();
  });

  it("santiye listesi 403 verirse erisim reddi basar", () => {
    mockSites({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    render(<ProjectDetailPage />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByText("Yükleniyor…")).not.toBeInTheDocument();
  });

  it("hata durumunda alt KPI seridi uydurma deger basmaz", () => {
    mockSites({ isError: true, error: new Error("patladi") });
    render(<ProjectDetailPage />);
    expect(screen.queryByTestId("site-totals-strip")).not.toBeInTheDocument();
  });
});
