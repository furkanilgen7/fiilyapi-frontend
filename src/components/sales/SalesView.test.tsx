import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SalesView } from "./SalesView";
import { PRICE_LIST_PENDING_REASON } from "./sales-labels";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useProjectUnits } from "@/lib/api/hooks/useProjectUnits";
import { useSales } from "@/lib/api/hooks/useSales";
import { useSalesSummary } from "@/lib/api/hooks/useSalesSummary";
import { useSession } from "@/components/shell/SessionProvider";
import { BackendError } from "@/lib/api/unwrap";
import type { MeResponse } from "@/lib/auth/types";

vi.mock("@/lib/api/hooks/useProjects", () => ({ useProjects: vi.fn() }));
vi.mock("@/lib/api/hooks/useProjectUnits", () => ({ useProjectUnits: vi.fn() }));
vi.mock("@/lib/api/hooks/useSales", () => ({ useSales: vi.fn() }));
vi.mock("@/lib/api/hooks/useSalesSummary", () => ({ useSalesSummary: vi.fn() }));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));

const replaceMock = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  usePathname: () => "/satis",
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => searchParams,
}));

function queryStub(data: unknown, extra: Partial<{ isLoading: boolean; isError: boolean; error: unknown }> = {}) {
  return {
    data,
    isLoading: extra.isLoading ?? false,
    isError: extra.isError ?? false,
    error: extra.error ?? null,
  } as never;
}

const PROJECTS = {
  items: [
    { id: "p-1", name: "Yeşilvadi Rezidans" },
    { id: "p-2", name: "Mavişehir Villaları" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  vi.mocked(useSession).mockReturnValue({
    me: { permissions: { sales: "full" } } as unknown as MeResponse,
    isLoading: false,
  } as ReturnType<typeof useSession>);
  vi.mocked(useProjects).mockReturnValue(queryStub(PROJECTS));
  vi.mocked(useSales).mockReturnValue(queryStub({ items: [], totals: undefined }));
  vi.mocked(useSalesSummary).mockReturnValue(queryStub(undefined));
  vi.mocked(useProjectUnits).mockReturnValue(queryStub({ blocks: [] }));
});

describe("SalesView — başlık ve kabuk sınırı", () => {
  it("sayfa başlığı basılır; mockup'ın kendi kabuğu YENİDEN çizilmez", () => {
    render(<SalesView />);
    expect(screen.getByRole("heading", { name: "Satış Yönetimi", level: 1 })).toBeInTheDocument();
    // Mockup'ın sol menüsü (30-49) kabuğun işidir.
    expect(screen.queryByText("Tüm Projeler")).not.toBeInTheDocument();
  });

  it("mockup'ın dört bölümü de basılır (KPI · harita · tablo · yaklaşan)", () => {
    render(<SalesView />);
    expect(screen.getByTestId("satis-kpi-strip")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Blok Doluluk Haritası" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Satış Sözleşmeleri & Tahsilat" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Yaklaşan Tahsilatlar (30 Gün)" }),
    ).toBeInTheDocument();
  });
});

/**
 * ⚠️ PROJE SEÇİCİ — onaylı türetim. Uçlar proje kapsamlıdır
 * (`/projects/{id}/sales`) ama rota proje-geneldir (`/satis`, spec K1);
 * köprü seçicidir (emsal: `/puantaj` şantiye seçicisi).
 */
describe("SalesView — proje seçici (onaylı türetim) ve URL durumu", () => {
  it("seçim yoksa listenin İLK projesi kullanılır ve uçlar onunla çağrılır", () => {
    render(<SalesView />);
    expect(vi.mocked(useSales).mock.calls[0][0]).toBe("p-1");
    expect(vi.mocked(useSalesSummary).mock.calls[0][0]).toBe("p-1");
  });

  it("URL'deki proje seçimi kazanır", () => {
    searchParams = new URLSearchParams("proje=p-2");
    render(<SalesView />);
    expect(vi.mocked(useSales).mock.calls[0][0]).toBe("p-2");
  });

  it("proje değişimi URL'ye yazılır (paylaşılabilir durum)", () => {
    render(<SalesView />);
    fireEvent.change(screen.getByLabelText("Proje seçimi"), { target: { value: "p-2" } });
    expect(replaceMock).toHaveBeenCalledWith("/satis?proje=p-2", { scroll: false });
  });

  it("durum süzgeci URL'ye yazılır ve proje seçimini KORUR", () => {
    searchParams = new URLSearchParams("proje=p-2");
    render(<SalesView />);
    fireEvent.change(screen.getByLabelText("Durum filtresi"), { target: { value: "overdue" } });
    expect(replaceMock).toHaveBeenCalledWith("/satis?proje=p-2&durum=overdue", { scroll: false });
  });
});

/**
 * 🛑 F-TH KALICI KURALI: rotası olmayan mockup öğesi SİLİNMEZ, devre dışı basılır.
 */
describe("SalesView — 'Fiyat Listesi' (24) devre dışı, gerekçeli", () => {
  it("düğme SİLİNMEZ; devre dışıdır ve gerekçesi `title`dadır", () => {
    render(<SalesView />);
    const button = screen.getByRole("button", { name: "Fiyat Listesi" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", PRICE_LIST_PENDING_REASON);
  });

  it("gerekçe ekranda METİN olarak da görünür (sessiz düşüş yok)", () => {
    render(<SalesView />);
    expect(screen.getByTestId("satis-fiyat-listesi-notu")).toHaveTextContent(
      /Fiyat Listesi.*henüz tasarlanmadı/,
    );
  });
});

describe("SalesView — satış formu girişi (25)", () => {
  it("'+ Satış Kaydı' /satis/yeni rotasına gider", () => {
    render(<SalesView />);
    expect(screen.getByRole("link", { name: "+ Satış Kaydı" })).toHaveAttribute(
      "href",
      "/satis/yeni",
    );
  });

  // ⚠️ Okuma seviyesinin adı `view`dır ("read" TANINMAZ bir dizedir ve
  // bilinmezlik kuralına düşerek yazma yüzeyini AÇIK bırakırdı).
  it("yalnız okuma ('view') yetkisi olan kullanıcıya form girişi BASILMAZ", () => {
    vi.mocked(useSession).mockReturnValue({
      me: { permissions: { sales: "view" } } as unknown as MeResponse,
      isLoading: false,
    } as ReturnType<typeof useSession>);
    render(<SalesView />);
    expect(screen.queryByRole("link", { name: "+ Satış Kaydı" })).not.toBeInTheDocument();
  });

  // ⚠️ Bilinmezlik kuralı: izin alanı YOK olmak ekranı kapatmaz; yalnız
  // AÇIKÇA "none" kapatır — test bu yüzden "none" verir.
  it("izni 'none' olan kullanıcı ekranı göremez", () => {
    vi.mocked(useSession).mockReturnValue({
      me: { permissions: { sales: "none" } } as unknown as MeResponse,
      isLoading: false,
    } as ReturnType<typeof useSession>);
    render(<SalesView />);
    expect(screen.queryByRole("heading", { name: "Satış Yönetimi" })).not.toBeInTheDocument();
  });
});

/**
 * Ünite ucunun kapısı `projects` modülüdür (`sales` DEĞİL) — 403 ekranı
 * DÜŞÜRMEZ, yalnız harita kartı gerekçeyle boş kalır.
 */
describe("SalesView — ünite 403'ü ekranı düşürmez", () => {
  it("harita yetkisizken tablo ve KPI çalışmaya devam eder", () => {
    vi.mocked(useProjectUnits).mockReturnValue(
      queryStub(undefined, { isError: true, error: new BackendError(403, null) }),
    );
    render(<SalesView />);
    expect(screen.getByTestId("satis-harita-notu")).toHaveTextContent(/ünite \(proje\) yetkisi/);
    expect(
      screen.getByRole("heading", { name: "Satış Sözleşmeleri & Tahsilat" }),
    ).toBeInTheDocument();
  });
});
