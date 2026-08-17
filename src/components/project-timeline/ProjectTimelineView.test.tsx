import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { ProjectTimelineView } from "./ProjectTimelineView";
import { useProjectTimeline, type TimelineProject } from "@/lib/api/hooks/useProjectTimeline";
import { BackendError } from "@/lib/api/unwrap";

vi.mock("@/lib/api/hooks/useProjectTimeline", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjectTimeline")>()),
  useProjectTimeline: vi.fn(),
}));

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => "/projeler/takvim",
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const mocked = vi.mocked(useProjectTimeline);

const TODAY = "2026-07-17";

const PROJECTS: TimelineProject[] = [
  {
    id: "p-1",
    code: "PRJ-1",
    name: "Güneşkent Konut",
    status: "active",
    start_date: "2025-01-01",
    end_date: "2026-12-31",
    contract_amount: "22400000.00",
    sections: [
      {
        id: "sec-1",
        name: "Temel & Bodrum",
        status: "completed",
        start_date: "2025-01-01",
        end_date: "2025-07-31",
        sort_order: 1,
        depends_on_section_id: null,
        milestones: [{ id: "ms-1", title: "Temel tamamlandı", milestone_date: "2025-07-31" }],
      },
      {
        id: "sec-0",
        name: "Hazırlık (tarihsiz)",
        status: "planned",
        start_date: null,
        end_date: null,
        sort_order: 0,
        depends_on_section_id: null,
        milestones: [],
      },
    ],
  },
  {
    id: "p-2",
    code: "PRJ-2",
    name: "Belediye Yol",
    status: "completed",
    start_date: "2026-01-01",
    end_date: "2026-08-31",
    contract_amount: "5100000.00",
    sections: [],
  },
];

function pending() {
  return { isLoading: true, isError: false, data: undefined, error: null } as never;
}
function failed(error: Error) {
  return { isLoading: false, isError: true, data: undefined, error } as never;
}
function loaded(items: TimelineProject[], today = TODAY) {
  return { isLoading: false, isError: false, data: { today, items }, error: null } as never;
}

beforeEach(() => {
  nav.search = "";
  nav.replace.mockReset();
  mocked.mockReset();
});

describe("ProjectTimelineView — sorgu dalları (T1)", () => {
  it("yükleniyor dalı", () => {
    mocked.mockReturnValue(pending());
    render(<ProjectTimelineView />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("hata dalı — sessizce boş takvim GÖSTERMEZ", () => {
    mocked.mockReturnValue(failed(new Error("kopuk")));
    render(<ProjectTimelineView />);
    expect(screen.getByText("Proje takvimi yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByTestId("tkv-rows")).not.toBeInTheDocument();
  });

  it("403 dalı erişim reddi basar", () => {
    mocked.mockReturnValue(failed(new BackendError(403, { detail: "yok" })));
    render(<ProjectTimelineView />);
    expect(screen.queryByText("Proje takvimi yüklenemedi")).not.toBeInTheDocument();
  });

  it("BOŞ portföyde ızgara kurulmaz ama özet şeridi kalır", () => {
    mocked.mockReturnValue(loaded([]));
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-empty")).toHaveTextContent("Portföyde proje yok");
    expect(screen.getByTestId("tkv-summary")).toBeInTheDocument();
    expect(screen.getByTestId("tkv-active-count")).toHaveTextContent("0");
  });

  it("projeler var ama HİÇBİRİNDE tarih yoksa AYRI mesaj basar", () => {
    mocked.mockReturnValue(
      loaded([{ ...PROJECTS[1]!, start_date: null, end_date: null, sections: [] }]),
    );
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-empty")).toHaveTextContent("zaman ızgarası kurulamıyor");
  });
});

describe("ProjectTimelineView — ızgara (T3)", () => {
  beforeEach(() => mocked.mockReturnValue(loaded(PROJECTS)));

  it("pencere VERİDEN türer — mockup'ın sabit 'Oca 2025 – Ara 2026'sı DEĞİL (K8)", () => {
    render(<ProjectTimelineView />);
    // Veri Oca 2025 – Ara 2026 kapsar; p-2'nin bitişi Ağu 2026 pencereyi
    // genişletmez ama tarihi olmayan bölüm de daraltmaz.
    expect(screen.getByTestId("tkv-range")).toHaveTextContent("Oca 2025 – Ara 2026");
    expect(screen.getAllByTestId("tkv-column")).toHaveLength(24);
  });

  it("her proje ve her bölüm bir SATIRDIR; bölümsüz proje de satır alır", () => {
    render(<ProjectTimelineView />);
    const left = screen.getByTestId("tkv-left");
    expect(within(left).getByText("Güneşkent Konut")).toBeInTheDocument();
    expect(within(left).getByText("Belediye Yol")).toBeInTheDocument();
    expect(within(left).getByText("Temel & Bodrum")).toBeInTheDocument();
    expect(within(left).getByText("Hazırlık (tarihsiz)")).toBeInTheDocument();
  });

  it("bölümler sort_order'a göre sıralanır — sunucunun dizi sırasına güvenilmez", () => {
    render(<ProjectTimelineView />);
    const names = screen
      .getByTestId("tkv-left")
      .querySelectorAll(".tkv__sec-name");
    expect([...names].map((node) => node.textContent)).toEqual([
      "Hazırlık (tarihsiz)",
      "Temel & Bodrum",
    ]);
  });

  it("🔴 K2: barlarda İLERLEME YÜZDESİ BASILMAZ", () => {
    render(<ProjectTimelineView />);
    for (const bar of screen.getAllByTestId("tkv-section-bar")) {
      expect(bar.textContent ?? "").not.toMatch(/%/);
    }
    for (const bar of screen.getAllByTestId("tkv-project-bar")) {
      expect(bar.textContent ?? "").not.toMatch(/%/);
    }
  });

  it("🔴 K2: bar TEK PARÇADIR — satırda ikinci bir 'kalan' barı yoktur", () => {
    render(<ProjectTimelineView />);
    const rows = screen.getByTestId("tkv-rows").querySelectorAll(".tkv__row--section");
    for (const row of rows) {
      expect(row.querySelectorAll(".tkv__bar")).toHaveLength(
        row.querySelector("[data-testid='tkv-no-bar']") ? 0 : 1,
      );
    }
  });

  it("bar rengi YALNIZ status'tan gelir", () => {
    render(<ProjectTimelineView />);
    const bar = screen.getAllByTestId("tkv-section-bar")[0];
    expect(bar).toHaveAttribute("data-status", "completed");
    expect(bar?.className).toContain("tkv__bar--completed");
  });

  it("🔴 K5: bar tıklaması PROJEYE gider (timeline site_id taşımaz)", () => {
    render(<ProjectTimelineView />);
    expect(screen.getAllByTestId("tkv-section-bar")[0]).toHaveAttribute("href", "/projeler/p-1");
    expect(screen.getAllByTestId("tkv-project-bar")[0]).toHaveAttribute("href", "/projeler/p-1");
  });

  it("tarihi eksik satır bar çizmez ama SATIR KALIR ve işaretlenir (K8)", () => {
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-no-bar")).toBeInTheDocument();
    expect(screen.getByTestId("tkv-notes")).toHaveTextContent("bar çizmez");
  });

  it("milestone elması çizilir", () => {
    render(<ProjectTimelineView />);
    const milestone = screen.getByTestId("tkv-milestone");
    expect(milestone).toHaveAttribute("aria-label", "Temel tamamlandı kilometre taşı");
    // 31 Temmuz 2025 → ay endeksi 6 + 30/31, 24 aylık pencerede.
    expect(milestone).toHaveStyle({ left: `${((6 + 30 / 31) / 24) * 100}%` });
  });

  it("🔴 bugün çizgisi SUNUCU damgasından çizilir, istemci saatinden DEĞİL", () => {
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    render(<ProjectTimelineView />);
    // 17 Temmuz 2026 → ay endeksi 18 + 16/31, 24 aylık pencerede.
    const expected = ((18 + 16 / 31) / 24) * 100;
    expect(screen.getByTestId("tkv-today-line")).toHaveStyle({ left: `${expected}%` });
    expect(screen.getByTestId("tkv-today-stamp")).toHaveTextContent("17 Temmuz 2026");
    vi.useRealTimers();
  });

  it("proje satırı KATLANIR — bölümler gizlenir, proje satırı kalır", () => {
    render(<ProjectTimelineView />);
    const toggle = screen.getByRole("button", { expanded: true, name: /Güneşkent Konut/ });
    fireEvent.click(toggle);
    expect(screen.queryByText("Temel & Bodrum")).not.toBeInTheDocument();
    expect(screen.getByText("Güneşkent Konut")).toBeInTheDocument();
    // K8: pencere KATLAMADAN etkilenmez — barlar yerinden oynamaz.
    expect(screen.getByTestId("tkv-range")).toHaveTextContent("Oca 2025 – Ara 2026");
    expect(screen.getAllByTestId("tkv-column")).toHaveLength(24);
  });
});

describe("ProjectTimelineView — görünüm anahtarı (K4)", () => {
  beforeEach(() => mocked.mockReturnValue(loaded(PROJECTS)));

  it("Aylık varsayılandır", () => {
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-zoom-monthly")).toHaveAttribute("aria-current", "true");
  });

  it("Yıllık kip ızgarayı GERÇEKTEN değiştirir (24 ay → 2 yıl sütunu)", () => {
    nav.search = "gorunum=yillik";
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-zoom-yearly")).toHaveAttribute("aria-current", "true");
    const columns = screen.getAllByTestId("tkv-column");
    expect(columns).toHaveLength(2);
    expect(columns.map((node) => node.textContent)).toEqual(["2025", "2026"]);
  });

  it("Yıllık düğmesi URL'e yazar (durum paylaşılabilir)", () => {
    render(<ProjectTimelineView />);
    fireEvent.click(screen.getByTestId("tkv-zoom-yearly"));
    expect(nav.replace).toHaveBeenCalledWith("/projeler/takvim?gorunum=yillik", { scroll: false });
  });

  it("🔴 K4: Haftalık DEVRE DIŞIDIR ve gerekçesi EKRANA basılır (title'a saklanmaz)", () => {
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-zoom-weekly")).toBeDisabled();
    expect(screen.getByTestId("tkv-notes")).toHaveTextContent("Haftalık ızgara çizilmedi");
  });

  it("🔴 K2 gerekçesi de EKRANA basılır", () => {
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-notes")).toHaveTextContent("İlerleme yüzdesi ölçülmüyor");
  });
});

describe("ProjectTimelineView — portföy özeti (K6)", () => {
  beforeEach(() => mocked.mockReturnValue(loaded(PROJECTS)));

  it("Toplam Sözleşme gövdedeki tutarların toplamıdır", () => {
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-total-contract")).toHaveTextContent("₺ 27,5M");
  });

  it("Aktif Proje sayımı basılır", () => {
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-active-count")).toHaveTextContent("1");
  });

  it("Yaklaşan Teslimat bugünden sonraki EN ERKEN bitiştir", () => {
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-next-delivery")).toHaveTextContent("Ağu 2026");
  });

  it("🔴 K6: Toplam Hakediş PENDING'dir — sayı UYDURULMAZ, gerekçe GÖRÜNÜR", () => {
    render(<ProjectTimelineView />);
    expect(screen.getByTestId("tkv-total-payment")).toHaveTextContent("—");
    expect(screen.getByTestId("tkv-summary")).toHaveTextContent(
      "Portföy hakediş toplamı tek uçtan gelmiyor",
    );
  });
});
