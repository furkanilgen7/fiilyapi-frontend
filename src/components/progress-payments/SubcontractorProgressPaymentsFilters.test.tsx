import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

import { SubcontractorProgressPaymentsFilters } from "./SubcontractorProgressPaymentsFilters";
import { useProjects } from "@/lib/api/hooks/useProjects";

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProjects: vi.fn(),
}));

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/hakedisler/taseron",
  useSearchParams: () => searchParams,
}));

function renderFilters() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SubcontractorProgressPaymentsFilters />
    </QueryClientProvider>,
  );
}

describe("SubcontractorProgressPaymentsFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    vi.mocked(useProjects).mockReturnValue({
      data: { items: [{ id: "p-1", name: "Güneşkent A-Blok" }], counts: {} },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
  });

  it("dort kontrolu de basar: proje, donem, durum, arama", () => {
    renderFilters();
    expect(screen.getByRole("combobox", { name: "Proje filtresi" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Dönem filtresi" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Durum filtresi" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Taşeron ara...")).toBeInTheDocument();
  });

  it("durum secicisi mockup'taki 4 secenegi birebir basar (draft YOK)", () => {
    renderFilters();
    const select = screen.getByRole("combobox", { name: "Durum filtresi" });
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toEqual(["Tüm Durumlar", "Onay Bekliyor", "Onaylandı", "Ödendi"]);
  });

  it("proje secimi degisince project_id URL'e yazilir", async () => {
    const user = userEvent.setup();
    renderFilters();
    await user.selectOptions(screen.getByRole("combobox", { name: "Proje filtresi" }), "p-1");
    expect(replace).toHaveBeenCalledWith("/hakedisler/taseron?project_id=p-1", { scroll: false });
  });

  it("durum secimi degisince status URL'e yazilir", async () => {
    const user = userEvent.setup();
    renderFilters();
    await user.selectOptions(screen.getByRole("combobox", { name: "Durum filtresi" }), "Onaylandı");
    expect(replace).toHaveBeenCalledWith("/hakedisler/taseron?status=approved", { scroll: false });
  });

  it("mevcut URL'deki q degeri arama kutusuna baslangic degeri olarak yansir", () => {
    searchParams = new URLSearchParams("q=Akin");
    renderFilters();
    expect(screen.getByPlaceholderText("Taşeron ara...")).toHaveValue("Akin");
  });

  it("arama kutusu yazildiginda debounce sonrasi q URL'e yazilir", () => {
    vi.useFakeTimers();
    renderFilters();
    fireEvent.change(screen.getByPlaceholderText("Taşeron ara..."), { target: { value: "Akin" } });
    expect(replace).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenCalledWith("/hakedisler/taseron?q=Akin", { scroll: false });
    vi.useRealTimers();
  });
});
