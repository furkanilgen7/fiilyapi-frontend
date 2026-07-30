import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

import BoqPage from "./page";
import { useSite } from "@/lib/api/hooks/useSites";
import { useBoq } from "@/lib/api/hooks/useBoq";
import { BackendError } from "@/lib/api/unwrap";
import { useSession } from "@/components/shell/SessionProvider";
import type { SiteDetail } from "@/lib/api/hooks/useSites";
import type { BoqListResponse } from "@/lib/api/hooks/useBoq";

vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));

vi.mock("@/lib/api/hooks/useBoq", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useBoq")>()),
  useBoq: vi.fn(),
}));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: PROJECT_ID, siteId: SITE_ID }),
}));

// Izin kapisi oturum yukunden okunur (spec §2.5.2); sayfa testinde gercek
// hook calisir, yalniz oturum kaynagi taklit edilir.
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

/** `level` verilmezse bugünkü hâl: MeResponse'ta izin alanı yok. */
function mockPermission(level?: string) {
  const base = { id: "u1", email: "a@b.c", full_name: "A", role_key: "admin", status: "active" };
  vi.mocked(useSession).mockReturnValue({
    me: (level === undefined ? base : { ...base, permissions: { boq: level } }) as never,
    isLoading: false,
  });
}

const SITE = {
  id: SITE_ID,
  name: "A-Blok Şantiyesi",
  project: { id: PROJECT_ID, name: "Güneşkent Konut" },
} as unknown as SiteDetail;

const EMPTY_BOQ: BoqListResponse = {
  groups: [],
  totals: {
    contract_total: { available: false, value: null, pending_module: "contracts" },
    realized_total: { available: false, value: null, pending_module: "progress_payments" },
    remaining_total: { available: false, value: null, pending_module: "progress_payments" },
    revision_total: { available: false, value: null, pending_module: "contracts" },
    grand_total: "0.00",
    grand_progress_pct: { available: false, value: null, pending_module: "progress_payments" },
  },
};

function mockSite(value: Partial<ReturnType<typeof useSite>>) {
  vi.mocked(useSite).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

function mockBoq(value: Partial<ReturnType<typeof useBoq>>) {
  vi.mocked(useBoq).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

describe("BoqPage — durum dalları (spec §9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermission();
    mockSite({ data: SITE });
  });

  it("yükleniyorken Yükleniyor… basar", () => {
    mockBoq({ isLoading: true });
    render(<BoqPage />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("403 alındığında AccessDenied basar", () => {
    mockBoq({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    render(<BoqPage />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "İş Kalemleri (BOQ)" })).not.toBeInTheDocument();
  });

  it("diğer hatada İş kalemleri yüklenemedi basar", () => {
    mockBoq({ isError: true, error: new Error("patladi") });
    render(<BoqPage />);
    expect(screen.getByText("İş kalemleri yüklenemedi")).toBeInTheDocument();
  });
});

describe("BoqPage — başlık şeridi ve breadcrumb (mockup 62–67)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermission();
    mockSite({ data: SITE });
    mockBoq({ data: EMPTY_BOQ });
  });

  it("başlık İş Kalemleri (BOQ) olarak tek h1 ile basılır", () => {
    render(<BoqPage />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("İş Kalemleri (BOQ)");
  });

  it("iki eylem butonu mockup metinleriyle basılır (66, 67)", () => {
    const { container } = render(<BoqPage />);
    const titleBar = container.querySelector(".boq__title-bar") as HTMLElement;
    expect(within(titleBar).getByRole("button", { name: "Excel İndir" })).toBeInTheDocument();
    expect(within(titleBar).getByRole("button", { name: "+ İş Kalemi" })).toBeInTheDocument();
  });

  it("veri geldiğinde poz tablosunu basar", () => {
    render(<BoqPage />);
    expect(screen.getByText("İş kalemleri listesi")).toBeInTheDocument();
    expect(screen.getByText("Bu şantiyede henüz iş kalemi tanımlanmadı.")).toBeInTheDocument();
  });

  it("breadcrumb şantiyeye geri link verir ve proje/şantiye adını gösterir", () => {
    render(<BoqPage />);
    const back = screen.getByRole("link", { name: "← A-Blok Şantiyesi" });
    expect(back).toHaveAttribute("href", `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}`);
    expect(screen.getByText(/Güneşkent Konut \/ A-Blok Şantiyesi/)).toBeInTheDocument();
  });

  // Onaylı sapma C (spec §2.3, §13): sözleşme numarası uydurulmaz, görünür yer
  // tutucu da basılmaz.
  it("breadcrumb sözleşme numarası basmaz", () => {
    const { container } = render(<BoqPage />);
    const crumb = container.querySelector(".boq__crumb") as HTMLElement;
    expect(crumb).toBeInTheDocument();
    expect(crumb.textContent).not.toMatch(/SZL-/);
    expect(crumb.textContent).not.toMatch(/Sözleşme/);
  });

  // spec §9 sonu: şeridin verisi zaten sorguya bağlı değil (dördü de yer tutucu).
  it("kart şeridi yükleme ve hata durumlarında da basılır", () => {
    mockBoq({ isLoading: true });
    const { unmount } = render(<BoqPage />);
    expect(screen.getAllByTestId("boq-kpi")).toHaveLength(4);
    unmount();

    mockBoq({ isError: true, error: new Error("patladi") });
    render(<BoqPage />);
    expect(screen.getAllByTestId("boq-kpi")).toHaveLength(4);
  });

  it("şantiye yüklenmemişken breadcrumb hiç basılmaz (uydurma etiket yok)", () => {
    mockSite({ isLoading: true });
    render(<BoqPage />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "İş Kalemleri (BOQ)" })).toBeInTheDocument();
  });
});

describe("BoqPage — istemci izin kapısı (spec §2.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSite({ data: SITE });
    mockBoq({ data: EMPTY_BOQ });
  });

  it("canWrite false iken + İş Kalemi butonu DOM'da yok", () => {
    mockPermission("view");
    render(<BoqPage />);
    expect(screen.queryByRole("button", { name: "+ İş Kalemi" })).not.toBeInTheDocument();
  });

  // "Excel İndir" okuma ucudur (`boq:view` yeter) — gizlenmez.
  it("canWrite false iken Excel İndir butonu görünür kalır", () => {
    mockPermission("view");
    render(<BoqPage />);
    expect(screen.getByRole("button", { name: "Excel İndir" })).toBeInTheDocument();
  });

  it("canWrite true iken + İş Kalemi butonu görünür", () => {
    mockPermission("full");
    render(<BoqPage />);
    expect(screen.getAllByRole("button", { name: "+ İş Kalemi" }).length).toBeGreaterThan(0);
  });

  // ⚠️ Bilinmezlik kuralı (spec §2.5.3): MeResponse'ta izin alanı BE-A'ya kadar
  // YOK. Kural ters çevrilirse tam yetkili kullanıcı ekranı salt-okunur görür.
  it("izin alanı yokken yazma butonu görünür kalır (bugünkü davranış)", () => {
    mockPermission();
    render(<BoqPage />);
    expect(screen.getAllByRole("button", { name: "+ İş Kalemi" }).length).toBeGreaterThan(0);
  });

  // Boş durumdaki buton başlık şeridindeki butonun ikizidir; aynı kapıya bağlanır,
  // yoksa salt-okunur kullanıcıya çalışmayan bir yazma yüzeyi kalır.
  it("canWrite false iken boş durumdaki + İş Kalemi butonu da basılmaz", () => {
    mockPermission("view");
    render(<BoqPage />);
    expect(screen.getByText("Bu şantiyede henüz iş kalemi tanımlanmadı.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ İş Kalemi" })).not.toBeInTheDocument();
  });
});
