import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ProjectPickerStep } from "./ProjectPickerStep";
import { useProjects } from "@/lib/api/hooks/useProjects";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/lib/api/hooks/useProjects", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProjects")>()),
  useProjects: vi.fn(),
}));

function render_() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProjectPickerStep />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProjectPickerStep", () => {
  it("proje listesini Select içinde basar", () => {
    vi.mocked(useProjects).mockReturnValue({
      data: { items: [{ id: "p-1", name: "Güneşkent Konut" }] },
      isLoading: false,
      isError: false,
    } as never);
    render_();
    expect(screen.getByRole("option", { name: "Güneşkent Konut" })).toBeInTheDocument();
  });

  it("proje seçilip Devam Et'e basılınca ?project= ile yönlendirir", async () => {
    vi.mocked(useProjects).mockReturnValue({
      data: { items: [{ id: "p-1", name: "Güneşkent Konut" }] },
      isLoading: false,
      isError: false,
    } as never);
    render_();
    await userEvent.selectOptions(screen.getByRole("combobox"), "p-1");
    await userEvent.click(screen.getByRole("button", { name: "Devam Et" }));
    expect(pushMock).toHaveBeenCalledWith("/hakedisler/yeni?project=p-1");
  });

  it("proje seçilmeden Devam Et devre dışıdır", () => {
    vi.mocked(useProjects).mockReturnValue({
      data: { items: [{ id: "p-1", name: "Güneşkent Konut" }] },
      isLoading: false,
      isError: false,
    } as never);
    render_();
    expect(screen.getByRole("button", { name: "Devam Et" })).toBeDisabled();
  });
});
