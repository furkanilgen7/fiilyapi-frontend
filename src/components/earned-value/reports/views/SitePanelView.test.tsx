import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { SitePanelView } from "./SitePanelView";
import { useSite } from "@/lib/api/hooks/useSites";
import { useCompany } from "@/lib/api/hooks/useCompany";
import { PanelScreen } from "../panel/PanelScreen";

// PLN-F3.6a · Şantiye rotası sarmalayıcısı — `ManHourBudgetView` deseni:
// rota parametreleri ADRES anahtarıdır, `useSite` kanonik UUID'ye geçer.

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "guneskent", siteId: "a-blok" }),
}));
vi.mock("@/lib/api/hooks/useSites", () => ({ useSite: vi.fn() }));
vi.mock("@/lib/api/hooks/useCompany", () => ({ useCompany: vi.fn() }));
vi.mock("../panel/PanelScreen", () => ({ PanelScreen: vi.fn(() => null) }));

describe("SitePanelView", () => {
  it("useSite'i ADRES anahtarıyla çağırır, PanelScreen'e kanonik UUID + firma/proje/şantiye adı verir", () => {
    vi.mocked(useSite).mockReturnValue({
      data: {
        id: "s-1",
        name: "A-Blok Şantiyesi",
        status: "active",
        project: { id: "p-1", name: "Güneşkent Konut" },
      },
    } as never);
    vi.mocked(useCompany).mockReturnValue({ data: { name: "FİİL Yapı" } } as never);

    render(<SitePanelView />);

    expect(useSite).toHaveBeenCalledWith("a-blok", { project: "guneskent" });
    expect(PanelScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "s-1",
        siteName: "A-Blok Şantiyesi",
        companyName: "FİİL Yapı",
        projectName: "Güneşkent Konut",
        siteCompleted: false,
      }),
      undefined,
    );
  });

  it("tamamlanmış şantiye → siteCompleted true", () => {
    vi.mocked(useSite).mockReturnValue({
      data: { id: "s-1", name: "A", status: "completed", project: { id: "p-1", name: "P" } },
    } as never);
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<SitePanelView />);
    expect(PanelScreen).toHaveBeenCalledWith(expect.objectContaining({ siteCompleted: true }), undefined);
  });

  it("şantiye/firma henüz gelmediyse boş dizgeler basılır (uydurma yok)", () => {
    vi.mocked(useSite).mockReturnValue({ data: undefined } as never);
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<SitePanelView />);
    expect(PanelScreen).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "", siteName: "", companyName: "", projectName: "" }),
      undefined,
    );
  });
});
