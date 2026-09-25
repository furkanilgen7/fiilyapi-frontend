import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEvSiteOptions } from "@/lib/api/hooks/useEvSettings";
import { useEvSiteParam } from "./useEvSiteParam";

// PLN-F3.6a · `GeneralManHourBudgetView`in `?site=` deseni ORTAK bir kite
// çıkarıldı — bu test o davranışın AYNI kaldığını (yalnız yeni bir dosyaya
// taşındığını) doğrular.

vi.mock("@/lib/api/hooks/useEvSettings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useEvSettings")>()),
  useEvSiteOptions: vi.fn(),
}));

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  usePathname: () => "/planlama/panel",
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

const OPTIONS = [
  { siteId: "s-1", siteName: "A-Blok", projectId: "p-1", projectName: "Güneşkent", isCompleted: false },
  { siteId: "s-2", siteName: "Fabrika", projectId: "p-2", projectName: "Çelik OSB", isCompleted: true },
];

function mockOptions(options = OPTIONS, loading = false) {
  vi.mocked(useEvSiteOptions).mockReturnValue({ options, groups: [], isLoading: loading, isError: false });
}

function Probe() {
  const { selected, picker } = useEvSiteParam();
  return (
    <div>
      <p>seçili: {selected?.siteId ?? "yok"}</p>
      {picker}
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams = new URLSearchParams();
  mockOptions();
});

describe("useEvSiteParam", () => {
  it("`?site=` yokken ilk DEVAM EDEN şantiyeye hizalanır ve URL'e yazılır", async () => {
    render(<Probe />);
    expect(await screen.findByText("seçili: s-1")).toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/planlama/panel?site=s-1", { scroll: false }));
  });

  it("hepsi tamamlanmışsa ilk seçeneğe hizalanır (tamamlanmış şantiye salt-okunur açılabilir)", async () => {
    mockOptions([OPTIONS[1]!]);
    render(<Probe />);
    expect(await screen.findByText("seçili: s-2")).toBeInTheDocument();
  });

  it("BİLİNMEYEN `?site=` URL'de DÜZELTİLİR", async () => {
    searchParams = new URLSearchParams({ site: "yok-boyle-santiye" });
    render(<Probe />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/planlama/panel?site=s-1", { scroll: false }));
  });

  it("URL zaten hizalıysa TEKRAR yazılmaz", () => {
    searchParams = new URLSearchParams({ site: "s-2" });
    render(<Probe />);
    expect(replace).not.toHaveBeenCalled();
  });

  it("şantiye YOKKEN URL'e uydurma değer yazılmaz", () => {
    mockOptions([]);
    render(<Probe />);
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Planlaması olan şantiye bulunmuyor.")).toBeInTheDocument();
  });

  it("seçici ile şantiye değiştirilince URL'e yazılır; DİĞER parametreler DÜŞER (önceki şantiyenin takvimine ait değildir)", async () => {
    searchParams = new URLSearchParams({ site: "s-1", tarih: "2026-01-01" });
    const user = userEvent.setup();
    render(<Probe />);
    await user.selectOptions(screen.getByLabelText("Şantiye"), "s-2");
    expect(replace).toHaveBeenLastCalledWith("/planlama/panel?site=s-2", { scroll: false });
  });

  it("paramName özelleştirilebilir", async () => {
    searchParams = new URLSearchParams({ konum: "s-2" });
    function CustomProbe() {
      const { selected } = useEvSiteParam({ paramName: "konum" });
      return <p>seçili: {selected?.siteId ?? "yok"}</p>;
    }
    render(<CustomProbe />);
    expect(await screen.findByText("seçili: s-2")).toBeInTheDocument();
  });
});
