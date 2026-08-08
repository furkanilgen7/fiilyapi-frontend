import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SiteTimesheetView } from "./SiteTimesheetView";
import { useSession } from "@/components/shell/SessionProvider";
import { usePersonnel } from "@/lib/api/hooks/usePersonnel";
import { useTimesheet } from "@/lib/api/hooks/useTimesheet";
import { useSaveTimesheet, type TimesheetSave } from "@/lib/api/hooks/useTimesheetMutations";
import { useSiteSections } from "@/lib/api/hooks/useSiteSections";
import { downloadTimesheetExport } from "@/lib/api/timesheet-client";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

// F-PT T2 · ŞP ekranının OKUMA davranışları: iki kolon düzeni, Tür rozeti,
// bölüm filtresi (İSTEMCİ TARAFI — K2), özet şeridi ve izin dalları.
// F-PT T3 · hücre popover'ı, KAPSAM KURALI kanıtı, 409 ve Excel indirme.
// Saf türevler kendi dosyalarında test edilir (derive / month / timesheet-draft).

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
vi.mock("@/lib/api/hooks/useTimesheetMutations", () => ({ useSaveTimesheet: vi.fn() }));
vi.mock("@/lib/api/timesheet-client", () => ({ downloadTimesheetExport: vi.fn() }));
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

/** `PUT` gövdeleri — kapsam kanıtı bunların üzerinden yürür. */
let saveBodies: TimesheetSave[] = [];

/** İlk gövdenin hücreleri (`cells` şemada opsiyoneldir). */
function savedCells() {
  return saveBodies[0]?.cells ?? [];
}

function mockSave(behaviour: { reject?: Error } = {}) {
  vi.mocked(useSaveTimesheet).mockReturnValue({
    mutateAsync: vi.fn(async (body: TimesheetSave) => {
      saveBodies.push(body);
      if (behaviour.reject) throw behaviour.reject;
      return MATRIX;
    }),
  } as never);
}

/** Hücreye tıklayıp popover'dan kod seçer ve uygular. */
async function editCell(cellLabel: string, codeLabel: string) {
  await userEvent.click(screen.getByRole("button", { name: `${cellLabel} puantajı` }));
  const popover = screen.getByRole("dialog", { name: `${cellLabel} — puantaj hücresi` });
  await userEvent.click(within(popover).getByRole("button", { name: codeLabel }));
  await userEvent.click(within(popover).getByRole("button", { name: "Uygula" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  saveBodies = [];
  searchParams = new URLSearchParams({ year: "2026", month: "8" });
  mockSession("full");
  mockSave();
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

  it("saha muhendisi (view) matrisi gorur; hucreler TIKLANAMAZ, Kaydet DEVRE DISI + gerekce", () => {
    mockSession("view");
    render(<SiteTimesheetView />);
    expect(screen.getByRole("heading", { name: "A-Blok — Puantaj" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeDisabled();
    expect(screen.getByText(/Puantaj kaydetme yetkiniz yok/)).toBeInTheDocument();
    // Salt-okunur gorunum: hucre butonu HIC basilmaz (T2 davranisi korunur).
    expect(screen.queryByRole("button", { name: /puantajı$/ })).not.toBeInTheDocument();
    // Rozetler ise yerinde durur.
    expect(document.querySelectorAll(".ts-cell").length).toBeGreaterThan(0);
  });

  it("yazma izinlide Kaydet degisiklik YOKKEN devre disi, Excel her zaman acik", () => {
    render(<SiteTimesheetView />);
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excel" })).toBeEnabled();
    // T2'nin "sonraki adimda baglanacak" kalintisi KALMADI.
    expect(screen.queryByText(/bir sonraki adımda bağlanacak/)).not.toBeInTheDocument();
  });
});

describe("SiteTimesheetView · hucre popover'i (T3)", () => {
  it("DOLU hucre acilir, kod degistirilir ve matris ANINDA yansitir", async () => {
    render(<SiteTimesheetView />);
    await editCell("Ahmet Yılmaz · 3 Ağu", "İzin (İ)");
    expect(screen.getByText(/Kaydedilmemiş 1 hücre değişikliği var/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeEnabled();
  });

  it("BOS hucre de acilir — kaydi olmayan gune kod girilebilir", async () => {
    render(<SiteTimesheetView />);
    await editCell("Ahmet Yılmaz · 12 Ağu", "Çalıştı (Ç)");
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    const cells = savedCells();
    expect(cells).toContainEqual({
      personnel_id: "per-1",
      work_date: "2026-08-12",
      code: "worked",
      overtime_hours: null,
      section_id: null,
    });
  });

  it("HIC kaydi olmayan personel satiri da duzenlenebilir", async () => {
    vi.mocked(usePersonnel).mockReturnValue({
      data: {
        items: [
          { id: "per-9", full_name: "Zeki Uçar", trade: "Sıvacı", source: "company" },
        ],
        total: 1,
        limit: 200,
        offset: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    render(<SiteTimesheetView />);
    await editCell("Zeki Uçar · 4 Ağu", "Çalıştı (Ç)");
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(savedCells()).toContainEqual({
      personnel_id: "per-9",
      work_date: "2026-08-04",
      code: "worked",
      overtime_hours: null,
      section_id: null,
    });
  });

  it("FM secilince saat alani acilir; saat GOVDEYE gecer", async () => {
    render(<SiteTimesheetView />);
    const label = "Ahmet Yılmaz · 7 Ağu";
    await userEvent.click(screen.getByRole("button", { name: `${label} puantajı` }));
    const popover = screen.getByRole("dialog", { name: `${label} — puantaj hücresi` });
    expect(within(popover).queryByLabelText("Fazla mesai saati")).not.toBeInTheDocument();
    await userEvent.click(within(popover).getByRole("button", { name: "Fazla Mesai (FM)" }));
    await userEvent.type(within(popover).getByLabelText("Fazla mesai saati"), "3,5");
    await userEvent.click(within(popover).getByRole("button", { name: "Uygula" }));
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(savedCells()).toContainEqual({
      personnel_id: "per-1",
      work_date: "2026-08-07",
      code: "overtime",
      overtime_hours: "3.5",
      section_id: null,
    });
  });

  it("gecersiz saat REDDEDILIR ve gerekce popover'da kalir", async () => {
    render(<SiteTimesheetView />);
    const label = "Ahmet Yılmaz · 7 Ağu";
    await userEvent.click(screen.getByRole("button", { name: `${label} puantajı` }));
    const popover = screen.getByRole("dialog", { name: `${label} — puantaj hücresi` });
    await userEvent.click(within(popover).getByRole("button", { name: "Fazla Mesai (FM)" }));
    await userEvent.type(within(popover).getByLabelText("Fazla mesai saati"), "25");
    await userEvent.click(within(popover).getByRole("button", { name: "Uygula" }));
    expect(within(popover).getByText(/en çok 24 olmalı/)).toBeInTheDocument();
    expect(screen.queryByText(/Kaydedilmemiş/)).not.toBeInTheDocument();
  });

  it("Escape IPTALDIR — taslaga hicbir sey yazilmaz", async () => {
    render(<SiteTimesheetView />);
    const label = "Ahmet Yılmaz · 3 Ağu";
    await userEvent.click(screen.getByRole("button", { name: `${label} puantajı` }));
    const popover = screen.getByRole("dialog", { name: `${label} — puantaj hücresi` });
    await userEvent.click(within(popover).getByRole("button", { name: "İzin (İ)" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/Kaydedilmemiş/)).not.toBeInTheDocument();
  });

  it("Temizle hucreyi GOVDEDEN dusurur (silme)", async () => {
    render(<SiteTimesheetView />);
    const label = "Ahmet Yılmaz · 3 Ağu";
    await userEvent.click(screen.getByRole("button", { name: `${label} puantajı` }));
    const popover = screen.getByRole("dialog", { name: `${label} — puantaj hücresi` });
    await userEvent.click(within(popover).getByRole("button", { name: "Temizle" }));
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(
      savedCells().some(
        (cell) => cell.personnel_id === "per-1" && cell.work_date === "2026-08-03",
      ),
    ).toBe(false);
  });
});

/* ═══ KAPSAM KANITI (ekran düzeyinde) ══════════════════════════════════════
 * `PUT` dönem+şantiye kapsamında DEĞİŞTİRMEDİR. Bölüm filtresi AÇIKKEN
 * gövde yine ŞANTİYENİN TAM kümesi olmalı; süzülmüş `rows`tan kurulsaydı
 * aşağıdaki iddia düşerdi ve canlıda sec-2'nin ayı silinirdi.
 * ═══════════════════════════════════════════════════════════════════════ */
describe("SiteTimesheetView · KAPSAM KURALI", () => {
  it("bolum filtresi ACIKKEN kaydet → govde DIGER bolumun hucresini DE tasir", async () => {
    searchParams = new URLSearchParams({ year: "2026", month: "8", section: "sec-1" });
    render(<SiteTimesheetView />);

    // Görünüm süzülmüş: sec-2'li Cem Aksoy'un hücresi ekranda YOK.
    expect(screen.getByText("1 işçi")).toBeInTheDocument();

    await editCell("Ahmet Yılmaz · 3 Ağu", "İzin (İ)");
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    const cells = savedCells();
    // Düzenlenen sec-1 hücresi + DOKUNULMAYAN sec-2 hücresi.
    expect(cells).toHaveLength(2);
    expect(cells).toContainEqual({
      personnel_id: "per-2",
      work_date: "2026-08-03",
      code: "overtime",
      overtime_hours: "3.00",
      section_id: "sec-2",
    });
    // Aktif filtre, dokunulmayan hücrenin bölümünü DEĞİŞTİRMEZ.
    expect(cells.find((cell) => cell.personnel_id === "per-1")?.section_id).toBe("sec-1");
  });

  it("filtre acikken acilan YENI hucre o bolumu alir", async () => {
    searchParams = new URLSearchParams({ year: "2026", month: "8", section: "sec-1" });
    render(<SiteTimesheetView />);
    await editCell("Ahmet Yılmaz · 12 Ağu", "Çalıştı (Ç)");
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(
      savedCells().find((cell) => cell.work_date === "2026-08-12")?.section_id,
    ).toBe("sec-1");
  });
});

describe("SiteTimesheetView · kaydetme sonucu", () => {
  it("basarili kayittan sonra 'kaydedildi' yazar ve taslak duser", async () => {
    render(<SiteTimesheetView />);
    await editCell("Ahmet Yılmaz · 3 Ağu", "İzin (İ)");
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByText("Puantaj kaydedildi.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeDisabled();
  });

  it("409 kisi-gun cakismasi Turkce mesajla basilir ve taslak KORUNUR", async () => {
    mockSave({
      reject: new BackendError(409, {
        detail: "Mehmet Kılıç 3 Ağustos günü B-Blok şantiyesinde kayıtlı.",
      }),
    });
    render(<SiteTimesheetView />);
    await editCell("Ahmet Yılmaz · 3 Ağu", "İzin (İ)");
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(
      await screen.findByText(
        "Kişi-gün çakışması: Mehmet Kılıç 3 Ağustos günü B-Blok şantiyesinde kayıtlı.",
      ),
    ).toBeInTheDocument();
    // Taslak yazilmadigi icin KAYBOLMAZ — kullanici yeniden deneyebilir.
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeEnabled();
  });
});

describe("SiteTimesheetView · Excel indirme", () => {
  it("bolum suzgeci SUNUCUYA gecirilir (K2 istisnasi)", async () => {
    searchParams = new URLSearchParams({ year: "2026", month: "8", section: "sec-1" });
    render(<SiteTimesheetView />);
    await userEvent.click(screen.getByRole("button", { name: "Excel" }));
    expect(vi.mocked(downloadTimesheetExport)).toHaveBeenCalledWith("s-1", {
      year: 2026,
      month: 8,
      sectionId: "sec-1",
    });
  });

  it("filtre kapaliyken section_id GECMEZ", async () => {
    render(<SiteTimesheetView />);
    await userEvent.click(screen.getByRole("button", { name: "Excel" }));
    expect(vi.mocked(downloadTimesheetExport)).toHaveBeenCalledWith("s-1", {
      year: 2026,
      month: 8,
    });
  });

  it("indirme hatasi GORUNUR Turkce mesaj birakir", async () => {
    vi.mocked(downloadTimesheetExport).mockRejectedValueOnce(
      new BackendError(404, { detail: "Şantiye bulunamadı." }),
    );
    render(<SiteTimesheetView />);
    await userEvent.click(screen.getByRole("button", { name: "Excel" }));
    expect(await screen.findByText("Şantiye bulunamadı.")).toBeInTheDocument();
  });
});
