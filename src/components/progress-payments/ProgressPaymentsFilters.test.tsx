import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProgressPaymentsFilters } from "./ProgressPaymentsFilters";
import { useProjects } from "@/lib/api/hooks/useProjects";

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProjects: vi.fn(),
}));

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/hakedisler",
  useSearchParams: () => searchParams,
}));

describe("ProgressPaymentsFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    vi.mocked(useProjects).mockReturnValue({
      data: {
        items: [
          { id: "p-1", name: "Güneşkent A-Blok" },
          { id: "p-2", name: "Marina Rezidans" },
        ],
        counts: {},
      },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
  });

  it("proje suzgeci gorunur: 'Tum Projeler' + proje secenekleri basilir", () => {
    render(<ProgressPaymentsFilters />);
    const select = screen.getByRole("combobox", { name: "Proje filtresi" });
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toEqual(["Tüm Projeler", "Güneşkent A-Blok", "Marina Rezidans"]);
  });

  it("URL'deki project_id secili gorunur (kullanici neye baktigini bilir)", () => {
    searchParams = new URLSearchParams("project_id=p-2");
    render(<ProgressPaymentsFilters />);
    expect(screen.getByRole("combobox", { name: "Proje filtresi" })).toHaveValue("p-2");
  });

  it("parametre yokken secici 'Tum Projeler'de durur", () => {
    render(<ProgressPaymentsFilters />);
    expect(screen.getByRole("combobox", { name: "Proje filtresi" })).toHaveValue("");
  });

  it("proje secimi project_id'yi URL'e yazar", async () => {
    const user = userEvent.setup();
    render(<ProgressPaymentsFilters />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Proje filtresi" }), "p-1");
    expect(replace).toHaveBeenCalledWith("/hakedisler?project_id=p-1", { scroll: false });
  });

  it("'Tum Projeler' secilince project_id URL'den DUSER (suzgec temizlenebilir)", async () => {
    searchParams = new URLSearchParams("project_id=p-1");
    const user = userEvent.setup();
    render(<ProgressPaymentsFilters />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Proje filtresi" }), "");
    expect(replace).toHaveBeenCalledWith("/hakedisler", { scroll: false });
  });

  it("ilgisiz URL parametreleri temizlemede korunur", async () => {
    searchParams = new URLSearchParams("project_id=p-1&tab=ozet");
    const user = userEvent.setup();
    render(<ProgressPaymentsFilters />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Proje filtresi" }), "");
    expect(replace).toHaveBeenCalledWith("/hakedisler?tab=ozet", { scroll: false });
  });
});
