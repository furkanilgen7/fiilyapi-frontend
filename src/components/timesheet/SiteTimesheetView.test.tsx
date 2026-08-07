import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SiteTimesheetView } from "./SiteTimesheetView";
import { useSession } from "@/components/shell/SessionProvider";
import { usePersonnel } from "@/lib/api/hooks/usePersonnel";
import { useTimesheet } from "@/lib/api/hooks/useTimesheet";
import { useSiteSections } from "@/lib/api/hooks/useSiteSections";
import type { MeResponse } from "@/lib/auth/types";

// F-PT T2 · ŞP ekranının OKUMA davranışları: iki kolon düzeni, Tür rozeti,
// bölüm filtresi (İSTEMCİ TARAFI — K2), özet şeridi ve izin dalları.
// Saf türevler kendi dosyalarında test edilir (derive / month).

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "p-1", siteId: "s-1" }),
  usePathname: () => "/projeler/p-1/santiyeler/s-1/puantaj",
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/usePersonnel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/usePersonnel")>()),
  usePersonnel: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useTimesheet", () => ({ useTimesheet: vi.fn() }));
vi.mock("@/lib/api/hooks/useSiteSections", () => ({ useSiteSections: vi.fn() }));
vi.mock("@/lib/api/hooks/useSites", () => ({
  useSite: vi.fn(() => ({
    data: { id: "s-1", name: "A-Blok", project: { id: "p-1", name: "Güneşkent Konut" } },
  })),
}));

const BASE_ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "sef@ornek.com",
  full_name: "Sercan Öztürk",
  role_key: "site_chief",
  status: "active",
} as unknown as MeResponse;

function mockSession(level: string) {
  vi.mocked(useSession).mockReturnValue({
    me: { ...BASE_ME, permissions: { timesheet: level } } as MeResponse,
    isLoading: false,
  });
}

const MATRIX = {
  site_id: "s-1",
  site_name: "A-Blok",
  project_id: "p-1",
  project_name: "Güneşkent Konut",
  year: 2026,
  month: 8,
  section_id: null,
  section_name: null,
  worker_count: 2,
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
    {
      personnel_id: "per-2",
      full_name: "Cem Aksoy",
      trade: "Demir Ustası",
      source: "subcontractor",
      subcontractor_name: "Akın İnşaat",
      man_days: 0,
      cells: [
        { work_date: "2026-08-03", code: "overtime", overtime_hours: "3.00", section_id: "sec-2" },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams({ year: "2026", month: "8" });
  mockSession("full");
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
  vi.mocked(useSiteSections).mockReturnValue({
    data: {
      items: [
        { id: "sec-1", name: "Kat 6–10 Kaba İnşaat" },
        { id: "sec-2", name: "Kat 1–5 İnce İşler" },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
});

describe("SiteTimesheetView · mockup iskeleti", () => {
  it("baslik + alt satir + Tur kolonu + ay basar (SP 90, 91, 126)", () => {
    render(<SiteTimesheetView />);
    expect(screen.getByRole("heading", { name: "A-Blok — Puantaj" })).toBeInTheDocument();
    expect(screen.getByText("Güneşkent Konut · Ağustos 2026")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tür" })).toBeInTheDocument();
    // E5'in AYRI "Meslek" kolonu SP'de YOKTUR — alt satira iner.
    expect(screen.queryByRole("columnheader", { name: "Meslek" })).not.toBeInTheDocument();
    expect(screen.getByText("Demir Ustası — Akın İnşaat")).toBeInTheDocument();
    expect(screen.getByText("Taşeron")).toBeInTheDocument();
    expect(screen.getByText("Şirket")).toBeInTheDocument();
  });

  it("ayin TUM gunlerini sutun yapar (mockup'in '…' kirpmasi kopyalanmaz)", () => {
    render(<SiteTimesheetView />);
    expect(screen.getByRole("columnheader", { name: "31" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "…" })).not.toBeInTheDocument();
  });

  it("bes kodun tamami legend'de aciklanir (SP 107-111) — E5'ten AYRI", () => {
    render(<SiteTimesheetView />);
    for (const label of ["Çalıştı", "İzin", "Tatil", "Fazla Mesai", "Geçici Görev"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("ozet seridi isci/adam-gun/FM saatini basar (SP 118-119)", () => {
    render(<SiteTimesheetView />);
    expect(screen.getByText("2 işçi")).toBeInTheDocument();
    expect(screen.getByText("2 adam/gün · 3 saat fazla mesai")).toBeInTheDocument();
  });
});

describe("SiteTimesheetView · K2 bolum filtresi", () => {
  it("GET'e section_id GECMEZ — filtre yalniz gorunumu suzer", () => {
    searchParams = new URLSearchParams({ year: "2026", month: "8", section: "sec-1" });
    render(<SiteTimesheetView />);
    // Ucuncu argumanin verilmemesi K2'nin yapisal guvencesidir.
    expect(vi.mocked(useTimesheet).mock.calls[0]?.[2]).toBeUndefined();
  });

  it("suzgec acikken ozet ve ayak satiri suzulmus kumeden hesaplanir", () => {
    searchParams = new URLSearchParams({ year: "2026", month: "8", section: "sec-1" });
    render(<SiteTimesheetView />);
    // Özet şeridi seçili bölümün adını taşır (option ile aynı metin — şerit
    // düğümü sınıfından ayrıştırılır).
    expect(document.querySelector(".ts-summary__title")?.textContent).toBe(
      "Kat 6–10 Kaba İnşaat",
    );
    expect(screen.getByText("1 işçi")).toBeInTheDocument();
    expect(screen.getByText("1 adam/gün · 0 saat fazla mesai")).toBeInTheDocument();
  });

  it("bolum secimi URL'ye yazilir (ag istegi tetiklemez)", async () => {
    render(<SiteTimesheetView />);
    await userEvent.selectOptions(screen.getByLabelText("Bölüm"), "sec-2");
    expect(replace).toHaveBeenCalledWith(
      "/projeler/p-1/santiyeler/s-1/puantaj?year=2026&month=8&section=sec-2",
      { scroll: false },
    );
  });
});

describe("SiteTimesheetView · ayak satiri isaretleri", () => {
  it("FM'li gun '2+' basar — '+' sayiyi DEGISTIRMEZ (iki kisi calisti, biri FM)", () => {
    render(<SiteTimesheetView />);
    const footer = screen.getByRole("rowheader", { name: "Günlük Toplam" }).closest("tr");
    expect(footer).not.toBeNull();
    expect(within(footer as HTMLElement).getByText("2+")).toBeInTheDocument();
  });
});

describe("SiteTimesheetView · izin dallari", () => {
  it("PM (none) AccessDenied gorur", () => {
    mockSession("none");
    render(<SiteTimesheetView />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "A-Blok — Puantaj" })).not.toBeInTheDocument();
  });

  it("saha muhendisi (view) matrisi gorur, Kaydet DEVRE DISI + gerekce basilir", () => {
    mockSession("view");
    render(<SiteTimesheetView />);
    expect(screen.getByRole("heading", { name: "A-Blok — Puantaj" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeDisabled();
    expect(
      screen.getByText(/Puantaj kaydetme yetkiniz yok/),
    ).toBeInTheDocument();
  });

  it("yazma izinli kullanicida Kaydet/Excel MOCKUP'TAKI YERINDE durur (T3'e kadar devre disi)", () => {
    render(<SiteTimesheetView />);
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excel" })).toBeDisabled();
    expect(screen.getByText(/bir sonraki adımda bağlanacak/)).toBeInTheDocument();
  });
});
