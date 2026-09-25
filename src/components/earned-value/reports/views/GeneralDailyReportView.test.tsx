import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { GeneralDailyReportView } from "./GeneralDailyReportView";
import { useCompany } from "@/lib/api/hooks/useCompany";
import { useEvSiteParam } from "../kit/site-scope/useEvSiteParam";
import { DailyReportScreen } from "../daily/DailyReportScreen";

vi.mock("@/lib/api/hooks/useCompany", () => ({ useCompany: vi.fn() }));
vi.mock("../kit/site-scope/useEvSiteParam", () => ({ useEvSiteParam: vi.fn() }));
vi.mock("../daily/DailyReportScreen", () => ({ DailyReportScreen: vi.fn(() => null) }));

const PICKER = <div data-testid="picker" />;

describe("GeneralDailyReportView", () => {
  it("selected şantiyeden alanları + picker geçirir", () => {
    vi.mocked(useEvSiteParam).mockReturnValue({
      siteOptions: { options: [], groups: [], isLoading: false, isError: false },
      selected: {
        siteId: "s-2",
        siteName: "Fabrika",
        projectId: "p-2",
        projectName: "Çelik OSB",
        isCompleted: false,
      },
      picker: PICKER,
    });
    vi.mocked(useCompany).mockReturnValue({ data: { name: "FİİL Yapı" } } as never);

    render(<GeneralDailyReportView />);

    expect(DailyReportScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "s-2",
        siteName: "Fabrika",
        companyName: "FİİL Yapı",
        projectName: "Çelik OSB",
        siteCompleted: false,
        picker: PICKER,
      }),
      undefined,
    );
  });

  it("links.dailyReport seçili şantiyeyi ?site= ile TAŞIR (lider denetimi F3.6a-ek)", () => {
    vi.mocked(useEvSiteParam).mockReturnValue({
      siteOptions: { options: [], groups: [], isLoading: false, isError: false },
      selected: { siteId: "s-2", siteName: "F", projectId: "p-2", projectName: "P", isCompleted: false },
      picker: PICKER,
    });
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);
    render(<GeneralDailyReportView />);
    const props = vi.mocked(DailyReportScreen).mock.calls[0]![0];
    expect(props.links.dailyReport()).toBe("/planlama/gunluk-rapor?site=s-2");
    expect(props.links.dailyReport("2026-09-24")).toBe("/planlama/gunluk-rapor?site=s-2&tarih=2026-09-24");
  });
});
