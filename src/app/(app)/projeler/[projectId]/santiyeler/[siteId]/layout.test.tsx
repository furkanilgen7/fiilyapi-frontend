import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import SiteDetailLayout from "./layout";
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

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: PROJECT_ID, siteId: SITE_ID }),
  usePathname: () => `/projeler/${PROJECT_ID}/santiyeler/${SITE_ID}`,
}));

describe("SiteDetailLayout — drill sidebar geri hedefi (spec §3.1, task-8 brief)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("geri linki bir seviye yukari (proje) gider, etiket PROJENIN ADIDIR (sabit metin degil)", () => {
    vi.mocked(useProject).mockReturnValue({
      data: { name: "Güneşkent Konut" },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    vi.mocked(useSite).mockReturnValue({
      data: { name: "A-Blok Şantiyesi" },
      isLoading: false,
      isError: false,
      error: null,
    } as never);

    render(
      <SiteDetailLayout>
        <div>içerik</div>
      </SiteDetailLayout>,
    );

    const backLink = screen.getByRole("link", { name: "← Güneşkent Konut" });
    expect(backLink).toHaveAttribute("href", `/projeler/${PROJECT_ID}`);
  });

  it("santiyenin 6 sekmesini aktif santiye grubunda basar", () => {
    vi.mocked(useProject).mockReturnValue({
      data: { name: "Güneşkent Konut" },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
    vi.mocked(useSite).mockReturnValue({
      data: { name: "A-Blok Şantiyesi" },
      isLoading: false,
      isError: false,
      error: null,
    } as never);

    render(
      <SiteDetailLayout>
        <div>içerik</div>
      </SiteDetailLayout>,
    );

    expect(screen.getByRole("link", { name: /Bölümler/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Günlük Kayıt/ })).toBeInTheDocument();
  });

  it("cocuk icerigi basar", () => {
    vi.mocked(useProject).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);
    vi.mocked(useSite).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);

    render(
      <SiteDetailLayout>
        <div>merhaba</div>
      </SiteDetailLayout>,
    );

    expect(screen.getByText("merhaba")).toBeInTheDocument();
  });
});
