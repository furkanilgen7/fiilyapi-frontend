import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { GeneralWeeklyQurrView } from "./GeneralWeeklyQurrView";
import { useCompany } from "@/lib/api/hooks/useCompany";
import { useEvSiteParam } from "../kit/site-scope/useEvSiteParam";
import { WeeklyQurrScreen } from "../qurr/WeeklyQurrScreen";

vi.mock("@/lib/api/hooks/useCompany", () => ({ useCompany: vi.fn() }));
vi.mock("../kit/site-scope/useEvSiteParam", () => ({ useEvSiteParam: vi.fn() }));
vi.mock("../qurr/WeeklyQurrScreen", () => ({ WeeklyQurrScreen: vi.fn(() => null) }));

const PICKER = <div data-testid="picker" />;

describe("GeneralWeeklyQurrView", () => {
  it("selected şantiyeden alanları + picker geçirir", () => {
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

    render(<GeneralWeeklyQurrView />);

    expect(WeeklyQurrScreen).toHaveBeenCalledWith(
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

  it("links.weeklyReport seçili şantiyeyi ?site= ile TAŞIR (lider denetimi F3.6a-ek)", () => {
    vi.mocked(useEvSiteParam).mockReturnValue({
      siteOptions: { options: [], groups: [], isLoading: false, isError: false },
      selected: { siteId: "s-2", siteName: "F", projectId: "p-2", projectName: "P", isCompleted: false },
      picker: PICKER,
    });
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<GeneralWeeklyQurrView />);
    const props = vi.mocked(WeeklyQurrScreen).mock.calls[0]![0];
    expect(props.links.weeklyReport()).toBe("/planlama/haftalik-qurr?site=s-2");
    expect(props.links.weeklyReport(21)).toBe("/planlama/haftalik-qurr?site=s-2&hafta=21");
  });
});
