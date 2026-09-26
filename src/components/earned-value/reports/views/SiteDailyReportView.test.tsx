import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

import { SiteDailyReportView } from "./SiteDailyReportView";
import { useSite } from "@/lib/api/hooks/useSites";
import { useCompany } from "@/lib/api/hooks/useCompany";
import { DailyReportScreen } from "../daily/DailyReportScreen";

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "guneskent", siteId: "a-blok" }),
}));
vi.mock("@/lib/api/hooks/useSites", () => ({ useSite: vi.fn() }));
vi.mock("@/lib/api/hooks/useCompany", () => ({ useCompany: vi.fn() }));
vi.mock("../daily/DailyReportScreen", () => ({ DailyReportScreen: vi.fn(() => null) }));

describe("SiteDailyReportView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useSite'i ADRES anahtarıyla çağırır, DailyReportScreen'e kanonik UUID + firma/proje/şantiye adı verir", () => {
    vi.mocked(useSite).mockReturnValue({
      data: {
        id: "s-1",
        name: "A-Blok Şantiyesi",
        status: "active",
        project: { id: "p-1", name: "Güneşkent Konut" },
      },
    } as never);
    vi.mocked(useCompany).mockReturnValue({ data: { name: "FİİL Yapı" } } as never);

    render(<SiteDailyReportView />);

    expect(useSite).toHaveBeenCalledWith("a-blok", { project: "guneskent" });
    expect(DailyReportScreen).toHaveBeenCalledWith(
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

  it("links.dailyReport çağıranın kendi uç yolunu üretir", () => {
    vi.mocked(useSite).mockReturnValue({
      data: { id: "s-1", name: "A", status: "active", project: { id: "p-1", name: "P" } },
    } as never);
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<SiteDailyReportView />);
    const props = vi.mocked(DailyReportScreen).mock.calls[0]![0];
    expect(props.links.dailyReport("2026-09-24")).toBe(
      "/projeler/guneskent/santiyeler/a-blok/gunluk-ilerleme-raporu?tarih=2026-09-24",
    );
  });

  /**
   * FIX-F2 · Ajan B madde 4 — KANIT. `useSite` hata dönerse (404/ağ, forbidden
   * DEĞİL) `site.data` `undefined` kalır ve `siteId=""` `DailyReportScreen`e
   * geçer; içerideki rapor sorgusu boş id'de sessizce idle'da durur — hiç
   * hata basılmadan SONSUZ İSKELET görünür. Emsal (`SitePlanningView.tsx:91`).
   */
  it("useSite hata dönerse (forbidden DEĞİL) DailyReportScreen render EDİLMEZ, hata basılır", () => {
    vi.mocked(useSite).mockReturnValue({ data: undefined, isError: true, error: new Error("network") } as never);
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<SiteDailyReportView />);
    expect(DailyReportScreen).not.toHaveBeenCalled();
  });
});
