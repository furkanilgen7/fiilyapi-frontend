import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { GeneralPanelView } from "./GeneralPanelView";
import { useCompany } from "@/lib/api/hooks/useCompany";
import { useEvSiteParam } from "../kit/site-scope/useEvSiteParam";
import { PanelScreen } from "../panel/PanelScreen";

// PLN-F3.6a · Kök ikiz — `useEvSiteParam` şantiye durumunu çözer, `key`
// şantiyeye bağlıdır (çapraz-şantiye veri bulaşması bekçisi, `GeneralSiteDiaryView` deseni).

vi.mock("@/lib/api/hooks/useCompany", () => ({ useCompany: vi.fn() }));
vi.mock("../kit/site-scope/useEvSiteParam", () => ({ useEvSiteParam: vi.fn() }));
vi.mock("../panel/PanelScreen", () => ({ PanelScreen: vi.fn(() => null) }));

const PICKER = <div data-testid="picker" />;

describe("GeneralPanelView", () => {
  it("selected şantiyeden siteId/siteName/projectName/siteCompleted + picker geçirir", () => {
    vi.mocked(useEvSiteParam).mockReturnValue({
      siteOptions: { options: [], groups: [], isLoading: false, isError: false },
      selected: {
        siteId: "s-2",
        siteName: "Fabrika",
        projectId: "p-2",
        projectName: "Çelik OSB",
        isCompleted: true,
      },
      picker: PICKER,
    });
    vi.mocked(useCompany).mockReturnValue({ data: { name: "FİİL Yapı" } } as never);

    render(<GeneralPanelView />);

    expect(PanelScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "s-2",
        siteName: "Fabrika",
        companyName: "FİİL Yapı",
        projectName: "Çelik OSB",
        siteCompleted: true,
        picker: PICKER,
      }),
      undefined,
    );
  });

  it("şantiye henüz seçilmediyse boş dizge + false", () => {
    vi.mocked(useEvSiteParam).mockReturnValue({
      siteOptions: { options: [], groups: [], isLoading: true, isError: false },
      selected: undefined,
      picker: PICKER,
    });
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<GeneralPanelView />);
    expect(PanelScreen).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "", siteName: "", companyName: "", projectName: "", siteCompleted: false }),
      undefined,
    );
  });

  it("links.diary seçili şantiyeyi ?site= ile TAŞIR", () => {
    vi.mocked(useEvSiteParam).mockReturnValue({
      siteOptions: { options: [], groups: [], isLoading: false, isError: false },
      selected: { siteId: "s-2", siteName: "F", projectId: "p-2", projectName: "P", isCompleted: false },
      picker: PICKER,
    });
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<GeneralPanelView />);
    const props = vi.mocked(PanelScreen).mock.calls[0]![0];
    expect(props.links.diary()).toBe("/gunluk-kayit?site=s-2");
  });
});
