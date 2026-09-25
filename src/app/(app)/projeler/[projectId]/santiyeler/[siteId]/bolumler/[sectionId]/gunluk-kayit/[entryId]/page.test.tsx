import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import SiteDiaryDetailPage from "./page";
import { useSiteDiaryEntry } from "@/lib/api/hooks/useSiteDiary";
import { useSection } from "@/lib/api/hooks/useSection";
import { useSite } from "@/lib/api/hooks/useSites";
import { useSession } from "@/components/shell/SessionProvider";

// Sayfa yalnız orkestrasyon bileşenini bağlar — davranış
// `SiteDiaryDetailView.test.tsx`te; bu dosya "rota bileşene bağlanıyor mu" duman testi.
vi.mock("@/lib/api/hooks/useSiteDiary", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSiteDiary")>()),
  useSiteDiaryEntry: vi.fn(),
}));
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
  useParams: () => ({ projectId: "p", siteId: "s", sectionId: "b", entryId: "e-1" }),
}));

describe("SiteDiaryDetailPage — duman testi", () => {
  it("yükleniyor iskeletini basar", () => {
    const pending = { data: undefined, isLoading: true, isError: false, error: null };
    vi.mocked(useSession).mockReturnValue({ me: undefined, isLoading: true } as never);
    vi.mocked(useSite).mockReturnValue(pending as never);
    vi.mocked(useSection).mockReturnValue(pending as never);
    vi.mocked(useSiteDiaryEntry).mockReturnValue(pending as never);

    render(<SiteDiaryDetailPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Günlük kayıt yükleniyor");
    expect(useSiteDiaryEntry).toHaveBeenCalledWith("e-1", { sectionId: undefined, enabled: false });
  });
});
