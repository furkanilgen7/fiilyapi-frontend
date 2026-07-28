import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import ProjectDetailPage from "./page";
import { useProject } from "@/lib/api/hooks/useProjects";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProject: vi.fn(),
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

describe("ProjectDetailPage", () => {
  beforeEach(() => vi.clearAllMocks());

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
    expect(screen.queryByTestId("site-list-slot")).not.toBeInTheDocument();
  });

  it("santiyesi olan projede liste alani (Task 5) icin yer birakir, sahte veri basmaz", () => {
    mockQuery({ data: PROJECT });
    render(<ProjectDetailPage />);
    expect(screen.getByTestId("site-list-slot")).toBeInTheDocument();
    expect(screen.queryByText("Bu projede henüz şantiye yok.")).not.toBeInTheDocument();
  });
});
