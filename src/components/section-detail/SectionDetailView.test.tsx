import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SectionDetailView } from "./SectionDetailView";
import { useSection } from "@/lib/api/hooks/useSection";
import { useBoq } from "@/lib/api/hooks/useBoq";
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

// BOQ-SEC-F: İş Kalemleri sekmesi artık CANLI — süzgeçli BOQ sorgusu mock'lanır.
vi.mock("@/lib/api/hooks/useBoq", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useBoq")>()),
  useBoq: vi.fn(),
}));

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

const BOQ_RESPONSE = {
  totals: {
    contract_total: { available: false, value: null, pending_module: "contracts" },
    realized_total: { available: false, value: null, pending_module: "progress_payments" },
    remaining_total: { available: false, value: null, pending_module: "contracts" },
    revision_total: { available: false, value: null, pending_module: "contracts" },
    grand_total: "2220000.00",
    grand_progress_pct: { available: false, value: null, pending_module: "progress_payments" },
  },
  groups: [
    {
      id: "g-1",
      name: "Betonarme İşleri",
      sort_order: 10,
      group_total: "2220000.00",
      items: [
        {
          id: "i-1",
          code: "03.001",
          description: "Kat Döşemesi — C25/30",
          unit: "m³",
          quantity: "1200.000",
          allocated_quantity: "1700.000",
          unallocated_quantity: "300.000",
          unit_price: "1850.00",
          amount: "2220000.00",
          sort_order: 0,
          progress_pct: { available: false, value: null, pending_module: "progress_payments" },
        },
      ],
    },
  ],
};

function mockBoq(overrides: Record<string, unknown> = {}) {
  vi.mocked(useBoq).mockReturnValue({
    data: BOQ_RESPONSE,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as never);
}

function mockQueries(section: Partial<ReturnType<typeof useSection>> = {}, site: Partial<ReturnType<typeof useSite>> = {}) {
  mockBoq();
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
    // 🔴 F-BOLLINK: gerekçe paylaşılan `stock` anahtarının metni DEĞİL —
    // stok modülü YAZILI, eksik olan BÖLÜM BAĞI. Eski metin yanlış bilgiydi.
    // (F-UNIT1 T5: `stock` metni de düzeltildi, iddia yeni metne taşındı.)
    expect(within(panel).getByText(/Malzeme hareketleri bu bölüme henüz kırılmıyor/)).toBeInTheDocument();
    expect(
      within(panel).queryByText(/Stok verisi bu yüzeye henüz bağlanmadı/),
    ).not.toBeInTheDocument();
  });

  // BOQ-SEC-F GÖÇÜ: artık BEŞ değil DÖRT sekme gerekçe taşır — "İş Kalemleri"
  // bölüm bağı AÇILDI ve içerik gerçekten basılıyor. Eski hâli aynen bıraksaydık
  // test, canlı sekmeden hâlâ "henüz kırılmıyor" gerekçesi isterdi.
  it("gerekçe taşıyan sekmeler 'modül yok' demez — hepsi bölüm bağı gerekçesidir", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    const tabs = screen.getAllByRole("tab");
    const live = tabs.filter((tab) => tab.getAttribute("data-content-live") === "true");
    const pending = tabs.filter((tab) => tab.getAttribute("data-content-live") !== "true");

    // Canlı sekme TAM OLARAK BİRDİR (İş Kalemleri) ve gerekçe TAŞIMAZ.
    expect(live.map((tab) => tab.textContent)).toEqual(["İş Kalemleri"]);
    expect(live[0]).not.toHaveAttribute("data-content-pending");

    expect(pending).toHaveLength(4);
    for (const tab of pending) {
      expect(tab.getAttribute("data-content-pending")).toMatch(/^section_/);
    }
    for (const tab of tabs) {
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

/**
 * BOQ-SEC-F T5 — İş Kalemleri sekmesi bölüm bağını GERÇEKTEN kullanır.
 *
 * 🔑 Bu blok "sekme canlı mı" sorusunu DOM'dan cevaplar (F-IZN kanonu: bir
 * yüzeyin ölüden canlıya geçtiğini görsel kapı KANITLAMAZ).
 */
describe("SectionDetailView — İş Kalemleri sekmesi (BOQ-SEC-F)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("varsayılan sekmede gerçek tablo basılır, yer tutucu kart DEĞİL", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("İş Kalemleri — Kat 6–10 Kaba İnşaat")).toBeInTheDocument();
    expect(within(panel).getByText("03.001")).toBeInTheDocument();
    expect(within(panel).queryByText(/henüz görüntülenemiyor/)).not.toBeInTheDocument();
  });

  it("🔴 BOQ sorgusu BÖLÜM SÜZGECİYLE çağrılır — süzgeçsiz çağrı bütün şantiyeyi basardı", () => {
    mockPermission("view");
    mockQueries();
    renderView();
    expect(useBoq).toHaveBeenCalledWith(SITE_ID, SECTION_ID);
  });

  it("yüklenirken boş tablo BASILMAZ — 'kalem atanmadı' yalanı söylenmez", () => {
    mockPermission("view");
    mockQueries();
    mockBoq({ data: undefined, isLoading: true });
    renderView();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Yükleniyor…")).toBeInTheDocument();
    expect(within(panel).queryByTestId("section-boq-empty")).not.toBeInTheDocument();
  });

  it("hata (ör. başka şantiyenin bölümü → 404) sessizce boş listeye DÜŞMEZ", () => {
    mockPermission("view");
    mockQueries();
    mockBoq({ data: undefined, isError: true, error: new BackendError(404, null) });
    renderView();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("İş kalemleri yüklenemedi")).toBeInTheDocument();
    expect(within(panel).queryByTestId("section-boq-empty")).not.toBeInTheDocument();
  });

  it("öbür sekmeler HÂLÂ gerekçeli yer tutucu basar (canlılık sızmaz)", async () => {
    const user = userEvent.setup();
    mockPermission("view");
    mockQueries();
    renderView();
    await user.click(screen.getByRole("tab", { name: "Hakediş" }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(/Hakediş bu bölüme henüz kırılmıyor/)).toBeInTheDocument();
    expect(within(panel).queryByText("03.001")).not.toBeInTheDocument();
  });
});
