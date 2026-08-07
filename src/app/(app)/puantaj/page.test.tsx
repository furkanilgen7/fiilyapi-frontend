import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import PuantajPage from "./page";
import { useSession } from "@/components/shell/SessionProvider";
import { usePersonnel } from "@/lib/api/hooks/usePersonnel";
import { useSiteOptions } from "@/lib/api/hooks/useSiteOptions";
import { useTimesheet } from "@/lib/api/hooks/useTimesheet";
import type { MeResponse } from "@/lib/auth/types";

// F-PT T2 · `/puantaj` gerçek rota eklenince [...slug] catch-all bu segment
// için devre dışı kalır — bu test sayfanın ComingSoon YERİNE gerçek E5
// matrisini bastığını doğrular (catch-all'ın kendisi Next.js dosya-tabanlı
// yönlendirmenin garantisidir, ayrıca test edilmez).

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/puantaj",
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/useSiteOptions", () => ({ useSiteOptions: vi.fn() }));
vi.mock("@/lib/api/hooks/usePersonnel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/usePersonnel")>()),
  usePersonnel: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useTimesheet", () => ({ useTimesheet: vi.fn() }));

const MATRIX = {
  site_id: "s-1",
  site_name: "A-Blok",
  project_id: "p-1",
  project_name: "Güneşkent Konut",
  year: 2026,
  month: 8,
  section_id: null,
  section_name: null,
  worker_count: 1,
  total_man_days: 0,
  total_overtime_hours: "0",
  day_totals: [],
  rows: [
    {
      personnel_id: "per-1",
      full_name: "Ahmet Yılmaz",
      trade: "Kalıpçı Usta",
      source: "company",
      subcontractor_name: null,
      man_days: 0,
      cells: [
        { work_date: "2026-08-03", code: "worked", overtime_hours: null, section_id: "sec-1" },
      ],
    },
  ],
};

function mockSession(level: string) {
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: { timesheet: level } } as unknown as MeResponse,
    isLoading: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams({ year: "2026", month: "8" });
  mockSession("full");
  vi.mocked(useSiteOptions).mockReturnValue({
    options: [{ siteId: "s-1", projectId: "p-1", label: "Güneşkent Konut A-Blok" }],
    isLoading: false,
    isError: false,
  });
  vi.mocked(usePersonnel).mockReturnValue({
    data: { items: [], total: 0, limit: 200, offset: 0 },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useTimesheet).mockReturnValue({
    data: MATRIX,
    isLoading: false,
    isError: false,
    error: null,
  } as never);
});

describe("PuantajPage rotasi", () => {
  it("ComingSoon DEGIL gercek Puantaj matrisini basar", () => {
    render(<PuantajPage />);
    expect(screen.getByRole("heading", { name: "Puantaj" })).toBeInTheDocument();
    expect(screen.queryByText("Bu modül yakında eklenecek.")).not.toBeInTheDocument();
  });

  it("E5'in AYRI 'Meslek' kolonu ve santiye secicisi vardir (E5 78, 93)", () => {
    render(<PuantajPage />);
    expect(screen.getByRole("columnheader", { name: "Meslek" })).toBeInTheDocument();
    expect(screen.getByText("Kalıpçı Usta")).toBeInTheDocument();
    expect(screen.getByLabelText("Şantiye")).toBeInTheDocument();
    // SP'nin "Tür" kolonu E5'te YOKTUR.
    expect(screen.queryByRole("columnheader", { name: "Tür" })).not.toBeInTheDocument();
  });

  it("PM (none) AccessDenied gorur", () => {
    mockSession("none");
    render(<PuantajPage />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("saha muhendisi (view) matrisi gorur, Kaydet devre disi + gerekce basilir", () => {
    mockSession("view");
    render(<PuantajPage />);
    expect(screen.getByRole("heading", { name: "Puantaj" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeDisabled();
    expect(screen.getByText(/Puantaj kaydetme yetkiniz yok/)).toBeInTheDocument();
  });

  it("'Disa Aktar' mockup'taki yerinde durur (T3'e kadar devre disi)", () => {
    render(<PuantajPage />);
    expect(screen.getByRole("button", { name: "Dışa Aktar" })).toBeDisabled();
  });
});
