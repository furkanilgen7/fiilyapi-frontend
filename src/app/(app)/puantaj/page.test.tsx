import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

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
        // D1 kaniti: E5'te FM ve G kodlu hucreler de VARDIR.
        { work_date: "2026-08-04", code: "overtime", overtime_hours: "3.00", section_id: "sec-1" },
        {
          work_date: "2026-08-05",
          code: "temporary_duty",
          overtime_hours: null,
          section_id: "sec-1",
        },
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

// D1 — E5 mockup'i SP'den AYRIDIR (kullanici karari 2026-08-07).
describe("PuantajPage · E5 mockup ayrimi", () => {
  it("legend DORT ogedir (E5 79-84) — 'Geçici Görev (G)' aciklanmaz", () => {
    render(<PuantajPage />);
    for (const label of ["Çalıştı (Ç)", "İzin (İ)", "Tatil (T)", "Fazla Mesai (FM)"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText("Geçici Görev (G)")).not.toBeInTheDocument();
    expect(screen.queryByText("Geçici Görev")).not.toBeInTheDocument();
  });

  it("legend'de olmasa da G kodlu HUCRE rozeti BASILIR (kayit gizlenmez)", () => {
    render(<PuantajPage />);
    const body = screen.getByRole("rowheader", { name: /Ahmet Yılmaz/ }).closest("tr");
    expect(body).not.toBeNull();
    expect(within(body as HTMLElement).getByText("G")).toBeInTheDocument();
    expect(within(body as HTMLElement).getByText("FM")).toBeInTheDocument();
  });

  it("ayak satirinda '+' ve 'G' isareti BASILMAZ — E5 203 duz sayi gosterir", () => {
    render(<PuantajPage />);
    const footer = screen.getByRole("rowheader", { name: "Günlük Toplam" }).closest("tr");
    expect(footer).not.toBeNull();
    const texts = within(footer as HTMLElement)
      .getAllByRole("cell")
      .map((cell) => cell.textContent ?? "");
    expect(texts).not.toContain("1+");
    expect(texts).not.toContain("0G");
    expect(texts.some((text) => text.includes("+") || text.includes("G"))).toBe(false);
    // FM'li gun (04 Agu) duz "1" basar — sayi degismez, yalniz isaret yoktur.
    expect(texts[3]).toBe("1");
  });
});
