import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { GeneralWeeklyQurrView } from "./GeneralWeeklyQurrView";
import { useEvSiteOptions } from "@/lib/api/hooks/useEvSettings";
import { useCompany } from "@/lib/api/hooks/useCompany";
import { WeeklyQurrScreen } from "../qurr/WeeklyQurrScreen";

/**
 * PLN-F3.6a-ek (lider denetimi) · UÇTAN UCA — `useEvSiteParam` GERÇEKTİR
 * (mock'lanmadı): URL'deki `?site=` gerçekten `WeeklyQurrScreen`e kadar
 * akıyor mu? Diğer testler (`GeneralWeeklyQurrView.test.tsx`) `useEvSiteParam`i
 * mock'lar (birim testi); bu dosya YALNIZ bu tek soruyu, sahte katman
 * OLMADAN doğrular — QURR↔GİR↔Panel arası `?site=` taşınmasının GERÇEKTEN
 * çalıştığının kanıtı.
 */
vi.mock("@/lib/api/hooks/useEvSettings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useEvSettings")>()),
  useEvSiteOptions: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useCompany", () => ({ useCompany: vi.fn() }));
vi.mock("../qurr/WeeklyQurrScreen", () => ({ WeeklyQurrScreen: vi.fn(() => null) }));

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  usePathname: () => "/planlama/haftalik-qurr",
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

const OPTIONS = [
  { siteId: "s-1", siteName: "A-Blok", projectId: "p-1", projectName: "Güneşkent", isCompleted: false },
  { siteId: "s-2", siteName: "Fabrika", projectId: "p-2", projectName: "Çelik OSB", isCompleted: false },
];

describe("GeneralWeeklyQurrView — uçtan uca ?site= akışı", () => {
  it("URL'deki `?site=s-2` GERÇEKTEN WeeklyQurrScreen'e kadar akar (Panel'den/GİR'den TAŞINMIŞ şantiye kaybolmaz)", () => {
    searchParams = new URLSearchParams({ site: "s-2" });
    vi.mocked(useEvSiteOptions).mockReturnValue({ options: OPTIONS, groups: [], isLoading: false, isError: false });
    vi.mocked(useCompany).mockReturnValue({ data: undefined } as never);

    render(<GeneralWeeklyQurrView />);

    expect(WeeklyQurrScreen).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "s-2", siteName: "Fabrika", projectName: "Çelik OSB" }),
      undefined,
    );
    // URL zaten hizalı → seçici hiçbir şeyi düzeltmek için yazmaz.
    expect(replace).not.toHaveBeenCalled();
  });
});
