import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import SectionDetailPage from "./page";
import { useSection } from "@/lib/api/hooks/useSection";
import { useSite } from "@/lib/api/hooks/useSites";
import { useSession } from "@/components/shell/SessionProvider";

// Sayfa yalnız orkestrasyon bileşenini bağlar — davranış SectionDetailView.test.tsx'te
// kapsamlı test edilir, bu dosya sadece "rota bileşene bağlanıyor mu" duman testi.
vi.mock("@/lib/api/hooks/useSection", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSection")>()),
  useSection: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));
vi.mock("@/components/shell/SessionProvider", () => ({ useSession: vi.fn() }));
vi.mock("next/navigation", () => ({
  useParams: () => ({
    projectId: "11111111-1111-1111-1111-111111111111",
    siteId: "44444444-4444-4444-4444-444444444444",
    sectionId: "55555555-5555-5555-5555-555555555555",
  }),
}));

describe("SectionDetailPage — duman testi", () => {
  it("yukleniyor durumunu basar", () => {
    vi.mocked(useSession).mockReturnValue({ me: undefined, isLoading: true } as never);
    vi.mocked(useSection).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);
    vi.mocked(useSite).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SectionDetailPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
  });
});
