import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { backendClient } from "@/lib/api/client";
import { useSiteOptions } from "@/lib/api/hooks/useSiteOptions";

import { GeneralManHourBudgetView } from "./GeneralManHourBudgetView";
import { defaultState, mockPermission, renderWithQuery, wireBackend } from "./budget-screen-harness";

// PLN-F1.6 · kök ikiz `/planlama/adam-saat-butcesi?site=` (GeneralSiteDiaryView deseni).

vi.mock("@/lib/api/client", () => ({
  backendClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("@/lib/api/hooks/useSiteOptions", () => ({ useSiteOptions: vi.fn() }));

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  usePathname: () => "/planlama/adam-saat-butcesi",
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

const OPTIONS = [
  { siteId: "s-1", projectId: "p-1", label: "Güneşkent A-Blok" },
  { siteId: "s-2", projectId: "p-2", label: "Çelik OSB Fabrika" },
];

function setup(query: string, options = OPTIONS, loading = false) {
  searchParams = new URLSearchParams(query);
  wireBackend(defaultState());
  mockPermission("draft");
  vi.mocked(useSiteOptions).mockReturnValue({ options, isLoading: loading, isError: false });
  return { user: userEvent.setup(), ...renderWithQuery(<GeneralManHourBudgetView />) };
}

beforeEach(() => vi.clearAllMocks());

describe("GeneralManHourBudgetView", () => {
  it("`?site=` yokken ilk şantiyeye hizalanır ve o şantiyenin bütçesi istenir", async () => {
    setup("");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/planlama/adam-saat-butcesi?site=s-1", { scroll: false }));
    await waitFor(() =>
      expect(backendClient.GET).toHaveBeenCalledWith("/sites/{site_id}/earned-value/budget", {
        params: { path: { site_id: "s-1" } },
      }),
    );
  });

  it("şantiye değişince revizyon/adım anahtarları düşer", async () => {
    const { user } = setup("site=s-1&rev=r-9&adim=3");
    await screen.findByText("Taslak — Rev 2");
    await user.selectOptions(screen.getByRole("combobox", { name: "Şantiye" }), "s-2");
    expect(replace).toHaveBeenLastCalledWith("/planlama/adam-saat-butcesi?site=s-2", { scroll: false });
  });

  it("şantiye yoksa gerekçe yazılır, iskelet basılmaz", () => {
    setup("", []);
    expect(screen.getByText("Bütçesi hazırlanabilecek şantiye bulunmuyor.")).toBeInTheDocument();
    expect(screen.queryByText("Bütçe yükleniyor")).not.toBeInTheDocument();
  });

  it("bağlantılar seçili şantiyenin proje rotasından kurulur", async () => {
    setup("site=s-2");
    expect(await screen.findByRole("link", { name: "İş Kalemleri (BOQ)" })).toHaveAttribute(
      "href",
      "/projeler/p-2/santiyeler/s-2/is-kalemleri",
    );
  });
});
