import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import SiteDetailPage from "./page";
import { useSite } from "@/lib/api/hooks/useSites";
import { BackendError } from "@/lib/api/unwrap";
import type { SiteDetail } from "@/lib/api/hooks/useSites";

vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: PROJECT_ID, siteId: SITE_ID }),
  usePathname: () => `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}`,
}));

const SITE: SiteDetail = {
  id: SITE_ID,
  code: "A-BLOK",
  name: "A-Blok Şantiyesi",
  status: "active",
  address: "Kuyubaşı Mah.",
  city: "Ankara",
  city_inherited: false,
  site_manager_name: "Sercan Öztürk",
  start_date: "2025-03-01",
  end_date: "2026-12-31",
  delivery_date: null,
  remaining_days: 157,
  section_count: 5,
  worker_count: { available: false, count: null, pending_module: "timesheet" },
  progress_pct: { available: false, value: null, pending_module: "progress_payments" },
  project: {
    id: PROJECT_ID,
    name: "Güneşkent Konut",
    city: "Ankara",
    employer_name: "Güneşkent Gayrimenkul A.Ş.",
  },
  section_status_counts: { planned: 2, active: 1, completed: 2 },
  sections: [],
  total_progress_payment: { available: false, value: null, pending_module: "progress_payments" },
  contract_amount: { available: false, value: null, pending_module: "contracts" },
};

function mockQuery(value: Partial<ReturnType<typeof useSite>>) {
  vi.mocked(useSite).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

describe("SiteDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("yuklenirken mesaj basar", () => {
    mockQuery({ isLoading: true });
    render(<SiteDetailPage />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("403'te erisim reddi basar", () => {
    mockQuery({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    render(<SiteDetailPage />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("diger hatalarda mesaj basar", () => {
    mockQuery({ isError: true, error: new Error("patladi") });
    render(<SiteDetailPage />);
    expect(screen.getByText("Şantiye yüklenemedi")).toBeInTheDocument();
  });

  it("basariyla hero + sekme barini basar", () => {
    mockQuery({ data: SITE });
    render(<SiteDetailPage />);
    expect(screen.getByRole("heading", { level: 1, name: "A-Blok Şantiyesi" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Şantiye detay sekmeleri" })).toBeInTheDocument();
  });

  it("bolumsuz santiyede durust bos durum basar (spec §7.4)", () => {
    mockQuery({ data: { ...SITE, section_count: 0 } });
    render(<SiteDetailPage />);
    expect(screen.getByText("Bu şantiyede henüz bölüm tanımlanmadı.")).toBeInTheDocument();
  });

  it("bolumlu santiyede bos durum metnini basmaz", () => {
    mockQuery({ data: SITE });
    render(<SiteDetailPage />);
    expect(screen.queryByText("Bu şantiyede henüz bölüm tanımlanmadı.")).not.toBeInTheDocument();
  });
});
