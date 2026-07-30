import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { SiteCreateView } from "./SiteCreateView";
import { useProject } from "@/lib/api/hooks/useProjects";
import { BackendError } from "@/lib/api/unwrap";
import { pendingModuleLabel } from "@/lib/pending-modules";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: PROJECT_ID }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Kisi seciciler kendi sorgusunu acar; bu dosya KABUGU test eder, seciciyi degil.
// Ayrintili durumlar (403 dahil) SiteInfoCard.test.tsx'te sinanir.
vi.mock("@/lib/api/hooks/useUserOptions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useUserOptions")>()),
  useUserOptions: vi.fn(() => ({
    options: [],
    isForbidden: false,
    isLoading: false,
    isError: false,
  })),
}));

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProject: vi.fn(),
}));

const PROJECT = {
  id: PROJECT_ID,
  name: "Güneşkent Konut",
  code: "SZL-2025-001",
  project_type: "taahhut",
} as never;

function mockProject(overrides: Record<string, unknown> = {}) {
  vi.mocked(useProject).mockReturnValue({
    data: PROJECT,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockProject();
});

describe("SiteCreateView — kabuk (mockup 35–60)", () => {
  it("kirinti yolu uc seviyelidir: Projeler / {proje adi} / Yeni Santiye", () => {
    render(<SiteCreateView />);
    const nav = screen.getByRole("navigation", { name: "Kırıntı yolu" });
    expect(within(nav).getByText("Projeler")).toBeInTheDocument();
    expect(within(nav).getByText("Güneşkent Konut")).toBeInTheDocument();
    expect(within(nav).getByText("Yeni Şantiye")).toBeInTheDocument();
  });

  it("Projeler kirintisi /projeler'e, orta kirinti /projeler/{id}'ye baglanir", () => {
    render(<SiteCreateView />);
    const nav = screen.getByRole("navigation", { name: "Kırıntı yolu" });
    expect(within(nav).getByRole("link", { name: "Projeler" })).toHaveAttribute(
      "href",
      "/projeler",
    );
    expect(
      within(nav).getByRole("link", { name: "Güneşkent Konut" }),
    ).toHaveAttribute("href", `/projeler/${PROJECT_ID}`);
  });

  it("aktif kirinti bagsizdir", () => {
    render(<SiteCreateView />);
    const nav = screen.getByRole("navigation", { name: "Kırıntı yolu" });
    const current = within(nav).getByText("Yeni Şantiye");
    expect(current.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: "Yeni Şantiye" })).toBeNull();
  });

  it("h1 'Yeni Santiye Ekle' basar ve sayfada tek h1 vardir", () => {
    render(<SiteCreateView />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Yeni Şantiye Ekle");
  });

  it("alt baslik mockup satir 50 metnini basar", () => {
    render(<SiteCreateView />);
    expect(
      screen.getByText(
        "Şantiye bir projeye bağlıdır — poz kotaları proje sözleşmesinden dağıtılır",
      ),
    ).toBeInTheDocument();
  });

  it("Bagli Proje bilgi kutusu proje adi, kodu ve tipini basar", () => {
    render(<SiteCreateView />);
    const info = screen.getByTestId("site-form-project-info");
    expect(info).toHaveTextContent("Bağlı Proje:");
    expect(info).toHaveTextContent("Güneşkent Konut (SZL-2025-001) · Taahhüt");
    expect(info).toHaveTextContent(
      "Şantiye oluşturulduktan sonra poz dağılımı ekranından bu şantiyeye kota atayabilirsiniz.",
    );
  });

  it("Poz Dagilimi baglantisi tiklanamaz span'dir ve pendingModuleLabel('contracts') title'i tasir", () => {
    render(<SiteCreateView />);
    const link = screen.getByText("Poz Dağılımı →");
    expect(link.tagName).toBe("SPAN");
    expect(link).toHaveAttribute("title", pendingModuleLabel("contracts"));
    expect(screen.queryByRole("link", { name: "Poz Dağılımı →" })).toBeNull();
  });
});

describe("SiteCreateView — belgeler + alt eylem şeridi (T9)", () => {
  it("belgeler karti govdeye baglidir", () => {
    render(<SiteCreateView />);
    expect(
      screen.getByRole("heading", { name: /📎 Şantiye Belgeleri/ }),
    ).toBeInTheDocument();
  });

  it("tum sayfada input[type=file] YOK", () => {
    const { container } = render(<SiteCreateView />);
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("ust bar ve alt serit ayni uc eylemi sunar", () => {
    const { container } = render(<SiteCreateView />);
    const topbar = container.querySelector(".pf-topbar__actions");
    const strip = container.querySelector(".pf-actions");

    // Üst bar: İptal + Şantiyeyi Oluştur (mockup 41–42)
    expect(within(topbar as HTMLElement).getByRole("button", { name: "İptal" })).toBeInTheDocument();
    expect(
      within(topbar as HTMLElement).getByRole("button", { name: "Şantiyeyi Oluştur" }),
    ).toBeInTheDocument();

    // Alt şerit: İptal + Taslak Kaydet + Şantiyeyi Oluştur (mockup 225–227)
    expect(within(strip as HTMLElement).getByRole("button", { name: "İptal" })).toBeInTheDocument();
    expect(
      within(strip as HTMLElement).getByRole("button", { name: "Taslak Kaydet" }),
    ).toBeInTheDocument();
    expect(
      within(strip as HTMLElement).getByRole("button", { name: "Şantiyeyi Oluştur" }),
    ).toBeInTheDocument();
  });
});

describe("SiteCreateView — proje sorgusu durumlari (spec §12)", () => {
  it("proje yuklenirken kirinti yolunda ... basar, form alanlari devre disi degildir", () => {
    mockProject({ data: undefined, isLoading: true });
    const { container } = render(<SiteCreateView />);

    const nav = screen.getByRole("navigation", { name: "Kırıntı yolu" });
    expect(within(nav).getByText("…")).toBeInTheDocument();
    // Bilgi kutusu satır yüksekliğini koruyan gri şeride döner.
    expect(screen.getByTestId("site-form-project-info-skeleton")).toBeInTheDocument();
    // Form gövdesi basılır ve eylemler devre dışı DEĞİLDİR.
    expect(screen.getByTestId("site-form-body")).toBeInTheDocument();
    const topbar = container.querySelector(".pf-topbar__actions") as HTMLElement;
    expect(
      within(topbar).getByRole("button", { name: "Şantiyeyi Oluştur" }),
    ).not.toBeDisabled();
  });

  it("proje 404 ise 'Proje bulunamadi' ve /projeler donus baglantisi basar, form basilmaz", () => {
    mockProject({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new BackendError(404, "Not Found"),
    });
    render(<SiteCreateView />);

    expect(screen.getByText("Proje bulunamadı")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projeler" })).toHaveAttribute(
      "href",
      "/projeler",
    );
    expect(screen.queryByTestId("site-form-body")).toBeNull();
  });

  it("proje 403 ise AccessDenied basar", () => {
    mockProject({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new BackendError(403, "Forbidden"),
    });
    render(<SiteCreateView />);

    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByTestId("site-form-body")).toBeNull();
  });
});
