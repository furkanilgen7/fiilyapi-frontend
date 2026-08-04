import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SitePlanningView } from "./SitePlanningView";
import { useSitePlan } from "@/lib/api/hooks/useSitePlan";
import { useSession } from "@/components/shell/SessionProvider";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

// F-PL T2 · Planlama ekranının OKUMA davranışları: gruplama, seyrek hücre
// eşlemesi, hafta sonu vurgusu, pending/devre-dışı öğeler ve hafta gezinmesi.
// Saf türevler kendi dosyalarında test edilir (week / grid-derive).

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "p-1", siteId: "s-1" }),
  usePathname: () => "/projeler/p-1/santiyeler/s-1/gunluk-kayit/planlama",
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/useSitePlan", () => ({ useSitePlan: vi.fn() }));
vi.mock("@/lib/api/hooks/useSites", () => ({ useSite: vi.fn(() => ({ data: undefined })) }));

const BASE_ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "sef@ornek.com",
  full_name: "Sercan Öztürk",
  title: null,
  role_key: "site_chief",
  status: "active",
} as unknown as MeResponse;

function mockSession(permissions?: Record<string, string>) {
  const me = permissions === undefined ? BASE_ME : { ...BASE_ME, permissions };
  vi.mocked(useSession).mockReturnValue({ me: me as MeResponse, isLoading: false });
}

/** Fikstür haftası — 2026-08-03 Pazartesi, 2026-08-09 Pazar. */
const WEEK_START = "2026-08-03";

function planWeek(overrides: Record<string, unknown> = {}) {
  return {
    site_id: "s-1",
    site_name: "A-Blok",
    project_id: "p-1",
    project_name: "Güneşkent Konut",
    week_start: WEEK_START,
    week_end: "2026-08-09",
    days: [
      { plan_date: "2026-08-03", is_weekend: false },
      { plan_date: "2026-08-04", is_weekend: false },
      { plan_date: "2026-08-05", is_weekend: false },
      { plan_date: "2026-08-06", is_weekend: false },
      { plan_date: "2026-08-07", is_weekend: false },
      { plan_date: "2026-08-08", is_weekend: true },
      { plan_date: "2026-08-09", is_weekend: true },
    ],
    groups: [
      {
        kind: "crew",
        section_id: "sec-1",
        section_name: "Kat 6–10 Kaba",
        section_manager_name: "Sercan Öztürk",
        rows: [
          {
            id: "pr-1",
            kind: "crew",
            section_id: "sec-1",
            label: "Kalıpçı",
            planned_worker_count: 14,
            sort_order: 0,
            // SEYREK: yalnız Çarşamba dolu — Pazartesi/Salı hücresi YOK.
            cells: [{ plan_date: "2026-08-05", text: "Kat 9 Kalıp", tag: "blue" }],
          },
        ],
      },
      {
        kind: "equipment",
        section_id: null,
        section_name: null,
        section_manager_name: null,
        rows: [
          {
            id: "pr-4",
            kind: "equipment",
            section_id: null,
            label: "Tower Crane",
            planned_worker_count: null,
            sort_order: 1,
            cells: [{ plan_date: "2026-08-03", text: "✓ Çalışıyor", tag: "green" }],
          },
        ],
      },
    ],
    goals: [
      {
        id: "pg-1",
        title: "Kat 9 kalıp montajı tamamla",
        note: "Sorumlu: Kalıpçı Ekibi",
        is_done: true,
        status: "completed",
        sort_order: 0,
      },
      {
        id: "pg-2",
        title: "Kat 9 döşeme betonu dök",
        note: null,
        is_done: false,
        status: "waiting",
        sort_order: 1,
      },
    ],
    active_sprint: { id: "ps-1", name: "Kat 8–9 Tamamlama" },
    ...overrides,
  };
}

function mockPlan(overrides: Record<string, unknown> = {}) {
  vi.mocked(useSitePlan).mockReturnValue({
    data: planWeek(),
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useSitePlan>);
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams(`week=${WEEK_START}`);
  mockSession();
});

describe("SitePlanningView — başlık ve mod anahtarı", () => {
  it("baslik ve alt metin santiye/proje adlarindan kurulur (P88-89)", () => {
    mockPlan();
    render(<SitePlanningView />);
    expect(
      screen.getByRole("heading", { name: "Planlama — A-Blok Şantiyesi" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Haftalık & aylık iş planı · Güneşkent Konut"),
    ).toBeInTheDocument();
  });

  it("mod anahtarinda Planlama AKTIFtir, digerleri gercek baglantidir (P80-84)", () => {
    mockPlan();
    render(<SitePlanningView />);
    const modeSwitch = screen.getByRole("group", { name: "Görünüm seçimi" });
    expect(modeSwitch.querySelector('[aria-current="page"]')?.textContent).toBe("Planlama");
    expect(screen.getByRole("link", { name: "Kayıt Gir" })).toHaveAttribute(
      "href",
      "/projeler/p-1/santiyeler/s-1/gunluk-kayit",
    );
    expect(screen.getByRole("link", { name: "Hakediş Özeti" })).toHaveAttribute(
      "href",
      "/projeler/p-1/santiyeler/s-1/gunluk-kayit/ozet",
    );
  });

  it("Ay ve Sprint kipleri DEVRE DISI, Hafta aciktir (P92-96, spec S2)", () => {
    mockPlan();
    render(<SitePlanningView />);
    expect(screen.getByRole("button", { name: "Hafta" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Ay" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sprint" })).toBeDisabled();
    expect(screen.getByText(/“Ay” ve “Sprint” görünümleri henüz açılmadı/)).toBeInTheDocument();
  });
});

describe("SitePlanningView — ızgara", () => {
  it("hafta araligi ve aktif sprint basilir (P105/P107)", () => {
    mockPlan();
    render(<SitePlanningView />);
    expect(screen.getByText("3 – 9 Ağustos 2026")).toBeInTheDocument();
    expect(screen.getByText("Aktif Sprint: Kat 8–9 Tamamlama")).toBeInTheDocument();
  });

  it("sprint yoksa 'Aktif Sprint' etiketi HIC basilmaz", () => {
    mockPlan({ data: planWeek({ active_sprint: null }) });
    render(<SitePlanningView />);
    expect(screen.queryByText(/Aktif Sprint/)).not.toBeInTheDocument();
  });

  it("yedi gun sutunu gercek takvimden uretilir (P111-117)", () => {
    mockPlan();
    render(<SitePlanningView />);
    for (const weekday of ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]) {
      expect(screen.getByText(weekday), weekday).toBeInTheDocument();
    }
    expect(screen.getByText("3 Ağu")).toBeInTheDocument();
    expect(screen.getByText("9 Ağu")).toBeInTheDocument();
  });

  it("hafta sonu vurgusu days[].is_weekend'den gelir", () => {
    // Backend Cuma'yı tatil ilan ederse ekran ONA uyar, takvime değil.
    const week = planWeek();
    const days = week.days.map((day) =>
      day.plan_date === "2026-08-07" ? { ...day, is_weekend: true } : day,
    );
    mockPlan({ data: { ...week, days } });
    const { container } = render(<SitePlanningView />);
    const weekendHeads = container.querySelectorAll(".plan-grid__day--weekend");
    expect(weekendHeads).toHaveLength(3);
  });

  it("bolum grubu adi + sorumlusu, ekipman grubu SABIT baslik basar", () => {
    mockPlan();
    render(<SitePlanningView />);
    expect(screen.getByText("Kat 6–10 Kaba")).toBeInTheDocument();
    expect(screen.getByText("Bölüm sorumlusu: Sercan Öztürk")).toBeInTheDocument();
    expect(screen.getByText("Makine & Ekipman")).toBeInTheDocument();
  });

  it("ekip satiri isci sayisini parantezde, ekipman satiri yalniz adi basar", () => {
    mockPlan();
    render(<SitePlanningView />);
    expect(screen.getByText("Kalıpçı (14)")).toBeInTheDocument();
    expect(screen.getByText("Tower Crane")).toBeInTheDocument();
  });

  it("SEYREK hucre dogru gune duser (indekse gore kaymaz)", () => {
    mockPlan();
    const { container } = render(<SitePlanningView />);
    const rows = container.querySelectorAll(".plan-grid__row");
    // İlk satır başlık; ikinci satır bölüm grubu; üçüncüsü "Kalıpçı".
    const crewRow = Array.from(rows).find((row) =>
      row.querySelector(".plan-grid__lead")?.textContent === "Kalıpçı (14)",
    );
    const cells = crewRow?.querySelectorAll(".plan-grid__cell") ?? [];
    expect(cells).toHaveLength(7);
    expect(cells[0]?.textContent).toBe(""); // Pzt boş
    expect(cells[2]?.textContent).toBe("Kat 9 Kalıp"); // Çar dolu
    expect(cells[2]?.querySelector(".plan-cell__chip--blue")).not.toBeNull();
  });

  it("grup yoksa gorunur bos-durum metni basar", () => {
    mockPlan({ data: planWeek({ groups: [] }) });
    render(<SitePlanningView />);
    expect(screen.getByText("Bu hafta için plan satırı eklenmemiş.")).toBeInTheDocument();
  });

  it("hata durumunda gorunur mesaj basar (role=alert KULLANILMAZ)", () => {
    mockPlan({ data: undefined, isError: true, error: new Error("boom") });
    render(<SitePlanningView />);
    expect(screen.getByText("Planlama ızgarası yüklenemedi.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("SitePlanningView — hafta gezinme", () => {
  it("‹ ve › haftayi URL'de 7 gun kaydirir", async () => {
    mockPlan();
    render(<SitePlanningView />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Önceki hafta" }));
    expect(replace).toHaveBeenCalledWith(
      "/projeler/p-1/santiyeler/s-1/gunluk-kayit/planlama?week=2026-07-27",
      { scroll: false },
    );

    await user.click(screen.getByRole("button", { name: "Sonraki hafta" }));
    expect(replace).toHaveBeenCalledWith(
      "/projeler/p-1/santiyeler/s-1/gunluk-kayit/planlama?week=2026-08-10",
      { scroll: false },
    );
  });

  it("URL'deki hafta sorguya Pazartesi olarak gecer", () => {
    searchParams = new URLSearchParams("week=2026-08-06"); // Perşembe
    mockPlan();
    render(<SitePlanningView />);
    expect(vi.mocked(useSitePlan)).toHaveBeenCalledWith("s-1", WEEK_START);
  });
});

describe("SitePlanningView — hedefler ve pending kart", () => {
  it("hedefler salt-okunur kutucukla ve durum rozetiyle basilir (P205-227)", () => {
    mockPlan();
    render(<SitePlanningView />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
    for (const box of checkboxes) expect(box).toBeDisabled();
    expect(screen.getByText("Tamamlandı")).toBeInTheDocument();
    expect(screen.getByText("Beklemede")).toBeInTheDocument();
  });

  it("hedef yoksa gorunur bos-durum metni basar", () => {
    mockPlan({ data: planWeek({ goals: [] }) });
    render(<SitePlanningView />);
    expect(screen.getByText("Bu hafta için hedef girilmemiş.")).toBeInTheDocument();
  });

  it("Malzeme Plani karti PENDING'dir; mockup'in sahte satirlari BASILMAZ", () => {
    mockPlan();
    render(<SitePlanningView />);
    expect(
      screen.getByRole("heading", { name: "📦 Malzeme Planı — Bu Hafta" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Haftalık malzeme ihtiyacı henüz açılmadı/)).toBeInTheDocument();
    expect(screen.queryByText(/Nervürlü Demir/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Acil Sipariş/)).not.toBeInTheDocument();
  });
});

describe("SitePlanningView — izin dalları", () => {
  it("gorme izni yoksa AccessDenied basar", () => {
    mockSession({ site_diary: "none" });
    mockPlan();
    render(<SitePlanningView />);
    expect(screen.queryByRole("heading", { name: /^Planlama/ })).not.toBeInTheDocument();
  });

  it("403 yanitinda AccessDenied basar", () => {
    mockPlan({
      data: undefined,
      isError: true,
      error: new BackendError(403, "Yetkiniz yok"),
    });
    render(<SitePlanningView />);
    expect(screen.queryByRole("heading", { name: /^Planlama/ })).not.toBeInTheDocument();
  });

  it("salt-okur kullanicida Kaydet butonu BASILMAZ", () => {
    mockSession({ site_diary: "view" });
    mockPlan();
    render(<SitePlanningView />);
    expect(screen.queryByRole("button", { name: "Kaydet" })).not.toBeInTheDocument();
  });

  it("yazma izni olan kullanicida Kaydet butonu basilir (T3 baglayacak)", () => {
    mockPlan();
    render(<SitePlanningView />);
    expect(screen.getByRole("button", { name: "Kaydet" })).toBeEnabled();
  });
});
