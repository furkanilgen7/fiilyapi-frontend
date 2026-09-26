import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

import { SiteWeeklyQurrView } from "./SiteWeeklyQurrView";
import { useSite } from "@/lib/api/hooks/useSites";
import { useCompany } from "@/lib/api/hooks/useCompany";
import { WeeklyQurrScreen } from "../qurr/WeeklyQurrScreen";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "guneskent", siteId: "a-blok" }),
}));
vi.mock("@/lib/api/hooks/useSites", () => ({ useSite: vi.fn() }));
vi.mock("@/lib/api/hooks/useCompany", () => ({ useCompany: vi.fn() }));
vi.mock("../qurr/WeeklyQurrScreen", () => ({ WeeklyQurrScreen: vi.fn(() => null) }));

describe("SiteWeeklyQurrView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useSite'i ADRES anahtarıyla çağırır, WeeklyQurrScreen'e kanonik UUID + firma/proje/şantiye adı verir", () => {
    vi.mocked(useSite).mockReturnValue({
      data: {
        id: "s-1",
        name: "A-Blok Şantiyesi",
        status: "completed",
        project: { id: "p-1", name: "Güneşkent Konut" },
      },
    } as never);
    vi.mocked(useCompany).mockReturnValue({ data: { name: "FİİL Yapı" } } as never);

    render(<SiteWeeklyQurrView />);

    expect(useSite).toHaveBeenCalledWith("a-blok", { project: "guneskent" });
    expect(WeeklyQurrScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "s-1",
        siteName: "A-Blok Şantiyesi",
        companyName: "FİİL Yapı",
        projectName: "Güneşkent Konut",
        siteCompleted: true,
      }),
      undefined,
    );
  });

  it("links.weeklyReport çağıranın kendi uç yolunu üretir", () => {
    vi.mocked(useSite).mockReturnValue({
      data: { id: "s-1", name: "A", status: "active", project: { id: "p-1", name: "P" } },
    } as never);
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<SiteWeeklyQurrView />);
    const props = vi.mocked(WeeklyQurrScreen).mock.calls[0]![0];
    expect(props.links.weeklyReport(12)).toBe("/projeler/guneskent/santiyeler/a-blok/haftalik-qurr?hafta=12");
  });

  /**
   * FIX-F2 · Ajan B madde 4 — KANIT. `useSite` hata dönerse (404/ağ, forbidden
   * DEĞİL) `site.data` `undefined` kalır ve `siteId=""` `WeeklyQurrScreen`e
   * geçer; içerideki rapor sorgusu boş id'de sessizce idle'da durur — hiç
   * hata basılmadan SONSUZ İSKELET görünür. Emsal (`SitePlanningView.tsx:91`).
   */
  it("useSite hata dönerse (forbidden DEĞİL) WeeklyQurrScreen render EDİLMEZ, hata basılır", () => {
    vi.mocked(useSite).mockReturnValue({ data: undefined, isError: true, error: new Error("network") } as never);
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<SiteWeeklyQurrView />);
    expect(WeeklyQurrScreen).not.toHaveBeenCalled();
  });
});
