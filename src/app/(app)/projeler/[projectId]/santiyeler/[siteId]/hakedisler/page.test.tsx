import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import SiteHakedislerPage from "./page";
import { useProgressPayments } from "@/lib/api/hooks/useProgressPayments";
import { useSite } from "@/lib/api/hooks/useSites";
import { useSession } from "@/components/shell/SessionProvider";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";
import type { SiteDetail } from "@/lib/api/hooks/useSites";

vi.mock("@/lib/api/hooks/useProgressPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProgressPayments")>()),
  useProgressPayments: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: PROJECT_ID, siteId: SITE_ID }),
}));

const SITE = {
  id: SITE_ID,
  name: "A-Blok Şantiyesi",
  project: { id: PROJECT_ID, name: "Güneşkent Konut" },
} as unknown as SiteDetail;

const PAYMENT_ITEM = {
  id: "22222222-2222-2222-2222-222222222222",
  project_id: PROJECT_ID,
  project_name: "Güneşkent Konut",
  sequence_no: 5,
  period_year: 2026,
  period_month: 7,
  description: "Kat 6–8 döşeme",
  status: "pending_approval" as const,
  gross_total: "2100000.00",
  net_total: "2000000.00",
};

function mockPermission(level?: string) {
  const base = { id: "u1", email: "a@b.c", full_name: "A", role_key: "admin", status: "active" };
  vi.mocked(useSession).mockReturnValue({
    me: (level === undefined ? base : { ...base, permissions: { progress_payments: level } }) as unknown as MeResponse,
    isLoading: false,
  });
}

function mockSite(value: Partial<ReturnType<typeof useSite>>) {
  vi.mocked(useSite).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

function mockPayments(value: Partial<ReturnType<typeof useProgressPayments>>) {
  vi.mocked(useProgressPayments).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...value,
  } as never);
}

// P7 T6: [...slug] catch-all bu segment için devre dışı kalır; sayfa
// ComingSoon YERİNE gerçek şantiye hakediş görünümünü basar.
describe("SiteHakedislerPage rotasi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermission("draft");
    mockSite({ data: SITE });
  });

  it("ComingSoon DEGIL gercek gorunumu basar", () => {
    mockPayments({ data: { items: [] } });
    render(<SiteHakedislerPage />);
    expect(screen.getByRole("heading", { name: "A-Blok Şantiyesi — Hakedişler" })).toBeInTheDocument();
    expect(screen.queryByText("Bu modül yakında eklenecek.")).not.toBeInTheDocument();
  });

  it("proje-düzeyi listeyi çeker — site_id filtresi VERİLMEZ (S4 kararı)", () => {
    mockPayments({ data: { items: [] } });
    render(<SiteHakedislerPage />);
    expect(useProgressPayments).toHaveBeenCalledWith({ project_id: PROJECT_ID });
  });

  it("yukleniyor durumunu basar", () => {
    mockPayments({ isLoading: true });
    render(<SiteHakedislerPage />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });

  it("hata durumunda mesaj basar", () => {
    mockPayments({ isError: true, error: new Error("patladi") });
    render(<SiteHakedislerPage />);
    expect(screen.getByText("Hakedişler yüklenemedi")).toBeInTheDocument();
  });

  it("bos listede bos durum metni basar", () => {
    mockPayments({ data: { items: [] } });
    render(<SiteHakedislerPage />);
    expect(screen.getByText("Henüz hakediş oluşturulmadı")).toBeInTheDocument();
  });

  it("hakediş listesi 403 doner ise AccessDenied basar", () => {
    mockPayments({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    render(<SiteHakedislerPage />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Hakedişler/ })).not.toBeInTheDocument();
  });

  it("şantiye sorgusu 403 doner ise AccessDenied basar", () => {
    mockPayments({ data: { items: [] } });
    mockSite({ isError: true, error: new BackendError(403, { detail: "yasak" }) });
    render(<SiteHakedislerPage />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("satiri basar ve detay linki /hakedisler/{id} adresine gider", () => {
    mockPayments({ data: { items: [PAYMENT_ITEM] } });
    render(<SiteHakedislerPage />);
    const link = screen.getByRole("link", { name: /Güneşkent Konut/ });
    expect(link).toHaveAttribute("href", `/hakedisler/${PAYMENT_ITEM.id}`);
  });

  it("breadcrumb şantiyeye geri link verir ve proje/şantiye adını gösterir", () => {
    mockPayments({ data: { items: [] } });
    render(<SiteHakedislerPage />);
    const back = screen.getByRole("link", { name: "← A-Blok Şantiyesi" });
    expect(back).toHaveAttribute("href", `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}`);
    expect(screen.getByText(/Güneşkent Konut \/ A-Blok Şantiyesi/)).toBeInTheDocument();
  });

  it("yazma yetkisi varken '+ Hakediş Oluştur' butonu proje sorgu parametresiyle gorunur", () => {
    mockPermission("draft");
    mockPayments({ data: { items: [] } });
    render(<SiteHakedislerPage />);
    expect(screen.getByRole("link", { name: "+ Hakediş Oluştur" })).toHaveAttribute(
      "href",
      `/hakedisler/yeni?project=${PROJECT_ID}`,
    );
  });

  it("salt-okunur yetkide '+ Hakediş Oluştur' butonu gorunmez", () => {
    mockPermission("view");
    mockPayments({ data: { items: [] } });
    render(<SiteHakedislerPage />);
    expect(screen.queryByRole("link", { name: "+ Hakediş Oluştur" })).not.toBeInTheDocument();
  });

  // Brief §pending-modules ile BOŞ kalanlar — bu dilimde veri kaynağı YOK,
  // ara çözüm/sahte veri yasak; negatif testler sessizce eklenmediklerini korur.
  // KPI şeridi (coordinator review T6 fix) İSTİSNADIR: dört etiket de basılır,
  // yalnız taşeron/kâr kartları GERÇEK DEĞER taşımaz (pending-modül ipucu).
  it("taşeron sütunu, satır içi '%62 ilerleme' ve PDF butonu BASILMAZ", () => {
    mockPayments({ data: { items: [PAYMENT_ITEM] } });
    render(<SiteHakedislerPage />);
    // Taşeron SÜTUNU (satır içi ikinci liste) basılmaz — yalnız KPI kartı
    // etiketi olarak "Taşeron" geçer, o yüzden satır bazlı proje adı arar.
    expect(screen.queryByText("Akın İnşaat #47")).not.toBeInTheDocument();
    expect(screen.queryByText(/^%\d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ilerleme/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /PDF/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/PDF/)).not.toBeInTheDocument();
  });

  it("KPI şeridi basılır: gerçek kartlar değer taşır, taşeron/kâr kartları pending-modül ipucu taşır", () => {
    mockPayments({ data: { items: [PAYMENT_ITEM] } });
    render(<SiteHakedislerPage />);
    const strip = screen.getByTestId("pp-totals-strip");
    expect(strip).toBeInTheDocument();
    expect(screen.getByText("Onay Bekleyen").nextSibling).toHaveTextContent("1");
    const taseronValue = screen.getByText("Toplam Taşeron Ödemesi").nextSibling as HTMLElement;
    expect(taseronValue.textContent).not.toMatch(/\d/);
    expect(taseronValue).toHaveAttribute("title", "Taşeron sözleşmeleriyle birlikte gelir");
  });

  it("hakediş listesi henüz yüklenmemişken (yükleniyor/hata) KPI şeridi basılmaz", () => {
    mockPayments({ isLoading: true });
    render(<SiteHakedislerPage />);
    expect(screen.queryByTestId("pp-totals-strip")).not.toBeInTheDocument();
  });
});
