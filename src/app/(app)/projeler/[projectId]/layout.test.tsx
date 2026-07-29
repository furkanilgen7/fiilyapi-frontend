import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import ProjectDetailLayout from "./layout";
import { useProject } from "@/lib/api/hooks/useProjects";
import { useSite } from "@/lib/api/hooks/useSites";

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProject: vi.fn(),
}));

vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const SITE_ID = "44444444-4444-4444-4444-444444444444";

// Rota parametreleri + pathname test bazinda degistirilebilsin diye mutable.
const route = {
  params: {} as { projectId: string; siteId?: string },
  pathname: "",
};

vi.mock("next/navigation", () => ({
  useParams: () => route.params,
  usePathname: () => route.pathname,
}));

function atProjectLevel() {
  route.params = { projectId: PROJECT_ID };
  route.pathname = `/projeler/${PROJECT_ID}`;
}

function atSiteLevel() {
  route.params = { projectId: PROJECT_ID, siteId: SITE_ID };
  route.pathname = `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}`;
}

function mockQueries() {
  vi.mocked(useProject).mockReturnValue({
    data: { name: "Güneşkent Konut" }, isLoading: false, isError: false, error: null,
  } as never);
  vi.mocked(useSite).mockReturnValue({
    data: { name: "A-Blok Şantiyesi" }, isLoading: false, isError: false, error: null,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQueries();
});

describe("ProjectDetailLayout — Proje Detay seviyesi (spec §3.1)", () => {
  it("geri linki /projeler'e gider, etiket 'Projeler'", () => {
    atProjectLevel();
    render(<ProjectDetailLayout><div>içerik</div></ProjectDetailLayout>);
    expect(screen.getByRole("link", { name: "← Projeler" })).toHaveAttribute("href", "/projeler");
  });

  it("nav 'Proje gezinme' etiketini tasir ve santiye sekmeleri gorunmez", () => {
    atProjectLevel();
    render(<ProjectDetailLayout><div>içerik</div></ProjectDetailLayout>);
    expect(screen.getByRole("navigation", { name: "Proje gezinme" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Günlük Kayıt/ })).not.toBeInTheDocument();
  });

  it("cocuk icerigi basar", () => {
    atProjectLevel();
    render(<ProjectDetailLayout><div>merhaba</div></ProjectDetailLayout>);
    expect(screen.getByText("merhaba")).toBeInTheDocument();
  });
});

// Bu blok eski santiyeler/[siteId]/layout.tsx testinin kapsamini devralir:
// kabuk artik TEK seviyede (proje layout'unda) kurulur, siteId rota
// parametresinden okunur.
describe("ProjectDetailLayout — Şantiye Detay seviyesi (spec §3.1, §5.1)", () => {
  it("geri linki bir seviye yukari (proje) gider, etiket PROJENIN ADIDIR", () => {
    atSiteLevel();
    render(<ProjectDetailLayout><div>içerik</div></ProjectDetailLayout>);
    expect(screen.getByRole("link", { name: "← Güneşkent Konut" })).toHaveAttribute(
      "href",
      `/projeler/${PROJECT_ID}`,
    );
  });

  it("santiyenin 6 sekmesini aktif santiye grubunda basar", () => {
    atSiteLevel();
    render(<ProjectDetailLayout><div>içerik</div></ProjectDetailLayout>);
    expect(screen.getByRole("link", { name: /Bölümler/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Günlük Kayıt/ })).toBeInTheDocument();
  });

  it("nav 'Şantiye gezinme' etiketini tasir", () => {
    atSiteLevel();
    render(<ProjectDetailLayout><div>içerik</div></ProjectDetailLayout>);
    expect(screen.getByRole("navigation", { name: "Şantiye gezinme" })).toBeInTheDocument();
  });

  it("cocuk icerigi basar", () => {
    atSiteLevel();
    render(<ProjectDetailLayout><div>merhaba</div></ProjectDetailLayout>);
    expect(screen.getByText("merhaba")).toBeInTheDocument();
  });
});

// KOD INCELEME BULGUSU (kritik): App Router layout'lari IC ICE gectigi icin
// santiye rotasi kendi drill layout'unu kurunca iki <nav class="drill-sidebar">
// birden render ediliyordu — ikisi de position:fixed oldugundan ekranda tek
// gorunuyor, ama ikisi de DOM'da, Tab sirasinda ve ekran okuyucu yer imlerinde
// kaliyordu; ustelik icerik ofseti iki kez uygulaniyordu.
describe("Drill kabugu TEK seviyede kurulur (regresyon korumasi)", () => {
  it("santiye rotasinda tam olarak BIR drill-sidebar nav'i render edilir", () => {
    atSiteLevel();
    const { container } = render(<ProjectDetailLayout><div>içerik</div></ProjectDetailLayout>);
    expect(container.querySelectorAll("nav.drill-sidebar")).toHaveLength(1);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("tam olarak BIR drill icerik sarmalayicisi (.drill-content) render edilir", () => {
    atSiteLevel();
    const { container } = render(<ProjectDetailLayout><div>içerik</div></ProjectDetailLayout>);
    expect(container.querySelectorAll(".drill-content")).toHaveLength(1);
  });

  it("santiye rota klasoru kendi layout dosyasini TASIMAZ (ic ice kabuk yasak)", () => {
    const siteRouteDir = join(
      process.cwd(),
      "src/app/(app)/projeler/[projectId]/santiyeler/[siteId]",
    );
    const files = readdirSync(siteRouteDir);
    expect(files.filter((f) => /^layout\.(t|j)sx?$/.test(f))).toEqual([]);
  });
});
