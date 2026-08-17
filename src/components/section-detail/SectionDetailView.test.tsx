import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SectionDetailView } from "./SectionDetailView";
import { useSection } from "@/lib/api/hooks/useSection";
import { useSite } from "@/lib/api/hooks/useSites";
import { useSession } from "@/components/shell/SessionProvider";
import { BackendError } from "@/lib/api/unwrap";
import type { SectionDetailResponse } from "@/lib/api/hooks/useSection";
import type { SiteDetail } from "@/lib/api/hooks/useSites";

vi.mock("@/lib/api/hooks/useSection", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSection")>()),
  useSection: vi.fn(),
}));

vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));

vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";
const SECTION_ID = "55555555-5555-5555-5555-555555555555";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: PROJECT_ID, siteId: SITE_ID, sectionId: SECTION_ID }),
}));

/** `level` verilmezse alanı taşımayan eski oturum (bilinmezlik dalı, §2.5.3). */
function mockPermission(level?: string) {
  const base = { id: "u1", email: "a@b.c", full_name: "A", role_key: "admin", status: "active" };
  vi.mocked(useSession).mockReturnValue({
    me: (level === undefined ? base : { ...base, permissions: { sites: level } }) as never,
    isLoading: false,
  });
}

const SITE = { id: SITE_ID, name: "A-Blok Şantiyesi", project: { id: PROJECT_ID } } as unknown as SiteDetail;

const BASE_SECTION: SectionDetailResponse = {
  id: SECTION_ID,
  code: "A-01",
  name: "Kat 6–10 Kaba İnşaat",
  status: "active",
  manager_user_id: null,
  manager_name: "Sercan Öztürk",
  start_date: "2026-01-01",
  end_date: "2026-09-30",
  sort_order: 3,
  depends_on_section_id: null,
  milestones: [],
  progress_pct: { available: false, value: null, pending_module: "boq" },
  boq_item_count: { available: false, count: null, pending_module: "boq" },
  budget: { available: false, value: null, pending_module: "boq" },
  worker_count: { available: false, count: null, pending_module: "timesheet" },
  site_id: SITE_ID,
  section_type: "structural",
  description: null,
  deputy_manager_user_id: null,
  deputy_manager_name: null,
  planned_worker_count: null,
  budget_amount: "3520000.00",
  is_draft: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function mockQueries(section: Partial<ReturnType<typeof useSection>> = {}, site: Partial<ReturnType<typeof useSite>> = {}) {
  vi.mocked(useSection).mockReturnValue({
    data: BASE_SECTION,
    isLoading: false,
    isError: false,
    error: null,
    ...section,
  } as never);
  vi.mocked(useSite).mockReturnValue({
    data: SITE,
    isLoading: false,
    isError: false,
    error: null,
    ...site,
  } as never);
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SectionDetailView />
    </QueryClientProvider>,
  );
}

describe("SectionDetailView — yükleme/hata durumları", () => {
  beforeEach(() => vi.clearAllMocks());

  it("yuklenirken mesaj basar", () => {
    mockPermission("view");
    mockQueries({ isLoading: true, data: undefined });
    renderView();
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("403'te erisim reddi basar", () => {
    mockPermission("view");
    mockQueries({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    renderView();
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("diger hatalarda mesaj basar", () => {
    mockPermission("view");
    mockQueries({ isError: true, error: new Error("patladi") });
    renderView();
    expect(screen.getByText("Bölüm yüklenemedi")).toBeInTheDocument();
  });

  it("sites:view yoksa (none) AccessDenied basar", () => {
    mockPermission("none");
    mockQueries();
    renderView();
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });
});

describe("SectionDetailView — durum rozeti (4 durum, D59)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["planned", "Planlandı"],
    ["active", "Aktif"],
    ["on_hold", "Beklemede"],
    ["completed", "Tamamlandı"],
  ] as const)("%s -> '%s' basar", (status, label) => {
    mockPermission("full");
    mockQueries({ data: { ...BASE_SECTION, status } });
    renderView();
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("SectionDetailView — KPI şeridi (budget_amount gerçek, diğerleri yer tutucu)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Bölüm Bedeli budget_amount'tan gerçek basılır", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.getByText("₺ 3,5M")).toBeInTheDocument();
  });

  it("budget_amount null ise zarif düşüş (—) basılır, sahte sayı yazılmaz", () => {
    mockPermission("view");
    mockQueries({ data: { ...BASE_SECTION, budget_amount: null } });
    renderView();
    expect(screen.getByTestId("section-hero-kpi-budget")).toHaveTextContent("—");
  });

  it("Fiziksel İlerleme/Aktif İşçi/İş Kalemleri yer tutucu — sahte sayı yok", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.getByTestId("section-hero-kpi-progress")).toHaveTextContent("—");
    expect(screen.getByTestId("section-hero-kpi-worker")).toHaveTextContent("—");
    expect(screen.getByTestId("section-hero-kpi-boq")).toHaveTextContent("—");
  });

  it("'Gerçekleşen' alt satırı her zaman yer tutucu basılır (D78)", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.getByText(/Gerçekleşen:/)).toHaveTextContent("Gerçekleşen: —");
  });

  it("'3 gecikme riski' basılmaz — backend üretmiyor, yer tutucu basılır (D88)", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.queryByText(/gecikme riski/i)).not.toBeInTheDocument();
  });

  it("Kalan Gün end_date'ten türetilir, gerçek bir sayı basar", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    const cell = screen.getByTestId("section-hero-kpi-days");
    expect(cell).not.toHaveTextContent("—");
  });

  it("end_date null ise Kalan Gün dürüst '—' basar", () => {
    mockPermission("view");
    mockQueries({ data: { ...BASE_SECTION, end_date: null } });
    renderView();
    expect(screen.getByTestId("section-hero-kpi-days")).toHaveTextContent("—");
  });
});

describe("SectionDetailView — izin kapısı (Düzenle butonu)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sites:full varsa 'Düzenle' görünür", () => {
    mockPermission("full");
    mockQueries();
    renderView();
    expect(screen.getByRole("link", { name: "Düzenle" })).toBeInTheDocument();
  });

  it("sites:full yoksa (view) 'Düzenle' basılmaz", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.queryByRole("link", { name: "Düzenle" })).not.toBeInTheDocument();
  });

  it("'Hakediş Oluştur' her zaman gerçek linkle basılır", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.getByRole("link", { name: "Hakediş Oluştur" })).toHaveAttribute(
      "href",
      `/hakedisler/yeni?project=${PROJECT_ID}`,
    );
  });
});

describe("SectionDetailView — sekmeler (D99-105, hepsi BÖLÜM BAĞI bekleyen içerik)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("5 sekme başlığı mockup sırasıyla basılır", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "İş Kalemleri",
      "İşçiler & Puantaj",
      "Malzeme",
      "Hakediş",
      "Günlük Kayıt",
    ]);
  });

  it("sekme değiştirince ilgili modülün yer tutucu kartı basılır", async () => {
    const user = userEvent.setup();
    mockPermission("view");
    mockQueries();
    renderView();
    await user.click(screen.getByRole("tab", { name: "Malzeme" }));
    const panel = screen.getByRole("tabpanel");
    // 🔴 F-BOLLINK: gerekçe artık "Stok modülüyle birlikte gelir" DEĞİL —
    // stok modülü YAZILI, eksik olan BÖLÜM BAĞI. Eski metin yanlış bilgiydi.
    expect(within(panel).getByText(/Malzeme hareketleri bu bölüme henüz kırılmıyor/)).toBeInTheDocument();
    expect(within(panel).queryByText(/Stok modülüyle birlikte gelir/)).not.toBeInTheDocument();
  });

  it("hiçbir sekme 'modül yok' demez — beşi de bölüm bağı gerekçesi taşır", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.getAttribute("data-content-pending")).toMatch(/^section_/);
      expect(tab).toHaveAttribute("data-module-written", "true");
    }
  });
});

describe("SectionDetailView — alt kart bağlantıları (K1 · K2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("'Puantaj →' bölüm süzgecini TAŞIR (hedef ekran ?section= okur)", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.getByRole("link", { name: "Puantaj →" })).toHaveAttribute(
      "href",
      `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/puantaj?section=${SECTION_ID}`,
    );
  });

  it("'Tümü →' bölüm süzgeci TAŞIMAZ — hedef ekran okumuyor, ölü parametre yazılmaz", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.getByRole("link", { name: "Tümü →" })).toHaveAttribute(
      "href",
      `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}/stok`,
    );
  });

  it("iki bağlantı da BAYAT 'Bu bölüm yakında' ipucunu taşımaz (rotalar yazılı)", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    for (const name of ["Puantaj →", "Tümü →"]) {
      const link = screen.getByRole("link", { name });
      expect(link).not.toHaveAttribute("title", "Bu bölüm yakında");
      expect(link.getAttribute("title")).toMatch(/açar/);
    }
  });
});

describe("SectionDetailView — alt satır kartları (D213-273)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("worker_count yer tutucuyken başlıkta sahte sayı basılmaz", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.getByText("Bu Bölümdeki İşçiler")).toBeInTheDocument();
  });

  it("worker_count gerçekse başlıkta gerçek sayı basılır", () => {
    mockPermission("view");
    mockQueries({
      data: { ...BASE_SECTION, worker_count: { available: true, count: 48, pending_module: "timesheet" } },
    });
    renderView();
    expect(screen.getByText("Bu Bölümdeki İşçiler (48)")).toBeInTheDocument();
  });

  it("Bölüm Malzeme Durumu kartı başlığıyla basılır", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(screen.getByText("Bölüm Malzeme Durumu")).toBeInTheDocument();
  });
});
