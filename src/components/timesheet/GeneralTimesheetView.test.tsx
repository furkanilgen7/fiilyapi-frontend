import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GeneralTimesheetView } from "./GeneralTimesheetView";
import { useSession } from "@/components/shell/SessionProvider";
import { usePersonnel } from "@/lib/api/hooks/usePersonnel";
import { useSiteOptions } from "@/lib/api/hooks/useSiteOptions";
import { useTimesheet } from "@/lib/api/hooks/useTimesheet";
import { useSaveTimesheet } from "@/lib/api/hooks/useTimesheetMutations";
import type { MeResponse } from "@/lib/auth/types";

// F-PT T5 · E5 ekranının KENDİ davranışları. ŞP ekranı `SiteTimesheetView`
// dosyasında kapsanır; buradaki iddialar E5'in ŞP'den AYRILDIĞI yerlere
// odaklanır (Meslek kolonu, dörtlü legend, işaretsiz ayak satırı, şantiye
// seçicisi) + iki ekranın da paylaştığı ay gezinmesinin YIL SINIRI.

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/puantaj",
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/usePersonnel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/usePersonnel")>()),
  usePersonnel: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useTimesheet", () => ({ useTimesheet: vi.fn() }));
vi.mock("@/lib/api/hooks/useTimesheetMutations", () => ({ useSaveTimesheet: vi.fn() }));
vi.mock("@/lib/api/timesheet-client", () => ({ downloadTimesheetExport: vi.fn() }));
vi.mock("@/lib/api/hooks/useSiteOptions", () => ({ useSiteOptions: vi.fn() }));

const BASE_ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "patron@ornek.com",
  full_name: "Ahmet Yılmaz",
  role_key: "patron",
  status: "active",
} as unknown as MeResponse;

function mockSession(level: string) {
  vi.mocked(useSession).mockReturnValue({
    me: { ...BASE_ME, permissions: { timesheet: level, personnel: "none" } } as MeResponse,
    isLoading: false,
  });
}

/** İki kişi · 3 Ağu: biri çalıştı, biri FM · 4 Ağu: biri geçici görevde. */
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
        // Ondalık saatler: toplam 0.1 + 0.2 float aritmetiğiyle 0.30000000000000004
        // olurdu; ekran STRING toplamı (`lib/decimal.ts`) kullanır.
        { work_date: "2026-08-03", code: "overtime", overtime_hours: "0.10", section_id: "sec-1" },
        { work_date: "2026-08-04", code: "temporary_duty", overtime_hours: null, section_id: "sec-1" },
        { work_date: "2026-08-05", code: "overtime", overtime_hours: "0.20", section_id: "sec-1" },
      ],
    },
  ],
};

function mockMatrix(matrix: unknown, extra: { isLoading?: boolean; isError?: boolean } = {}) {
  vi.mocked(useTimesheet).mockReturnValue({
    data: matrix,
    isLoading: extra.isLoading ?? false,
    isError: extra.isError ?? false,
    error: null,
  } as never);
}

/** Ayak satırı (`Günlük Toplam`) — işaret kuralı varyanta göre AYRIDIR. */
function footerRow() {
  const row = screen.getByRole("rowheader", { name: "Günlük Toplam" }).closest("tr");
  if (row === null) throw new Error("ayak satiri yok");
  return row;
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams({ site: "s-1", year: "2026", month: "8" });
  mockSession("full");
  vi.mocked(useSaveTimesheet).mockReturnValue({ mutateAsync: vi.fn() } as never);
  vi.mocked(usePersonnel).mockReturnValue({
    data: { items: [], total: 0, limit: 200, offset: 0 },
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useSiteOptions).mockReturnValue({
    options: [
      { siteId: "s-1", projectId: "p-1", label: "Güneşkent A-Blok" },
      { siteId: "s-2", projectId: "p-1", label: "Güneşkent B-Blok" },
    ],
    isLoading: false,
    isError: false,
  });
  mockMatrix(MATRIX);
});

describe("GeneralTimesheetView · E5 mockup iskeleti", () => {
  it("Meslek AYRI kolondur ve alt satir meta basilmaz (E5 93/116)", () => {
    render(<GeneralTimesheetView />);
    expect(screen.getByRole("heading", { level: 1, name: "Puantaj" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Meslek" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Tür" })).not.toBeInTheDocument();
    expect(screen.getByText("Kalıpçı Usta")).toBeInTheDocument();
    // ŞP'nin "meslek — firma" alt satiri E5'te YOKTUR.
    expect(screen.queryByText("Demir Ustası — Akın İnşaat")).not.toBeInTheDocument();
  });

  it("legend DORTLUDUR — 'Gecici Gorev' aciklanmaz (E5 79-84)", () => {
    render(<GeneralTimesheetView />);
    // E5 harfli etiket kullanir ("Çalıştı (Ç)"); ŞP'de yalin etikettir.
    for (const label of ["Çalıştı (Ç)", "İzin (İ)", "Tatil (T)", "Fazla Mesai (FM)"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText(/Geçici Görev/)).not.toBeInTheDocument();
    // Ama G KODLU HUCRE yine basilir (kayit gizlenmez).
    expect(document.querySelector(".ts-cell--temporary-duty")).not.toBeNull();
  });

  it("ayak satiri YALNIZ SAYI basar — FM'li gunde bile '+' yok (E5 203)", () => {
    render(<GeneralTimesheetView />);
    const footer = within(footerRow());
    // 3 Agu: biri calisti + biri FM ⇒ 2 (ŞP olsa "2+" olurdu).
    expect(footer.getByText("2", { exact: true })).toBeInTheDocument();
    expect(footer.queryByText("2+")).not.toBeInTheDocument();
    expect(footer.queryByText(/G$/)).not.toBeInTheDocument();
  });

  it("ozet seridi (SP 116-120) E5'te YOKTUR", () => {
    render(<GeneralTimesheetView />);
    expect(document.querySelector(".ts-summary")).toBeNull();
    expect(screen.queryByLabelText("Bölüm")).not.toBeInTheDocument();
  });
});

describe("GeneralTimesheetView · ay gezinmesi (YIL SINIRI)", () => {
  it("Aralik'ta '›' bir SONRAKI yilin Ocak'ina gecer", async () => {
    searchParams = new URLSearchParams({ site: "s-1", year: "2026", month: "12" });
    render(<GeneralTimesheetView />);
    await userEvent.click(screen.getByRole("button", { name: "Sonraki ay" }));
    expect(replace).toHaveBeenCalledWith("/puantaj?site=s-1&year=2027&month=1", { scroll: false });
  });

  it("Ocak'ta '‹' bir ONCEKI yilin Aralik'ina gecer", async () => {
    searchParams = new URLSearchParams({ site: "s-1", year: "2026", month: "1" });
    render(<GeneralTimesheetView />);
    await userEvent.click(screen.getByRole("button", { name: "Önceki ay" }));
    expect(replace).toHaveBeenCalledWith("/puantaj?site=s-1&year=2025&month=12", { scroll: false });
  });

  it("santiye secimi URL'ye yazilir (donem KORUNUR)", async () => {
    render(<GeneralTimesheetView />);
    await userEvent.selectOptions(screen.getByLabelText("Şantiye"), "s-2");
    expect(replace).toHaveBeenCalledWith("/puantaj?site=s-2&year=2026&month=8", { scroll: false });
  });
});

describe("GeneralTimesheetView · turevlerin uc durumlari", () => {
  it("ondalik FM toplami STRING toplamidir (float 0.1+0.2 hatasi YOK)", () => {
    render(<GeneralTimesheetView />);
    // E5'te ozet seridi yoktur; toplam satir/ayak turevlerinden okunur —
    // hucre basliginda (title) saat gorunur.
    const cells = document.querySelectorAll<HTMLElement>(".ts-cell--overtime");
    expect([...cells].map((cell) => cell.title)).toEqual([
      "Fazla Mesai · 0,1 saat",
      "Fazla Mesai · 0,2 saat",
    ]);
  });

  it("BOS ay: satir yok ama gun iskeleti ve sifir toplam DURUR", () => {
    mockMatrix({ ...MATRIX, rows: [] });
    render(<GeneralTimesheetView />);
    expect(screen.getByRole("columnheader", { name: "31" })).toBeInTheDocument();
    expect(
      screen.getByText("Bu ay için puantaj kaydı ve aktif personel bulunmuyor."),
    ).toBeInTheDocument();
    // Ayak satirinin genel adam-gunu 0'dir; her gun hucresi de 0 basar.
    const footer = within(footerRow());
    expect(footer.getAllByText("0")).toHaveLength(32);
  });

  it("santiye secilmemisken neden GORUNUR yazar, sessiz bos tablo yok", () => {
    searchParams = new URLSearchParams({ year: "2026", month: "8" });
    vi.mocked(useSiteOptions).mockReturnValue({ options: [], isLoading: false, isError: false });
    // Santiye yoksa matris ucu HIC cagrilmaz — veri de gelmez.
    mockMatrix(undefined);
    render(<GeneralTimesheetView />);
    expect(screen.getByText("Şantiye seçin.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dışa Aktar" })).toBeDisabled();
  });
});

describe("GeneralTimesheetView · izin dallari", () => {
  it("PM (none) AccessDenied gorur", () => {
    mockSession("none");
    render(<GeneralTimesheetView />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "Puantaj" })).not.toBeInTheDocument();
  });

  it("saha muhendisi (view) matrisi gorur; hucreler TIKLANAMAZ, Kaydet DEVRE DISI", () => {
    mockSession("view");
    render(<GeneralTimesheetView />);
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeDisabled();
    expect(screen.getByText(/Puantaj kaydetme yetkiniz yok/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /puantajı$/ })).not.toBeInTheDocument();
    // Excel OKUMA ucudur — salt-okunur kullanicida da aciktir.
    expect(screen.getByRole("button", { name: "Dışa Aktar" })).toBeEnabled();
  });

  it("personnel yetkisi olmayanda 'Personel Ekle' girisi HIC basilmaz", () => {
    render(<GeneralTimesheetView />);
    expect(screen.queryByRole("link", { name: "Personel Ekle" })).not.toBeInTheDocument();
  });
});
