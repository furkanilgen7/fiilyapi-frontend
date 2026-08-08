import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import SozlesmelerPage from "./page";
import { useContracts } from "@/lib/api/hooks/useContracts";

vi.mock("@/lib/api/hooks/useContracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useContracts")>()),
  useContracts: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/sozlesmeler",
  useSearchParams: () => new URLSearchParams(),
}));

// F-P5 T2: `/sozlesmeler` nav'da vardı ama `[...slug]` catch-all'ına düşüyordu.
// Bu test rotanın artık ComingSoon DEĞİL gerçek SZL listesini bastığını
// doğrular (`/hakedisler` deseniyle aynı).
describe("SozlesmelerPage rotası", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useContracts).mockReturnValue({
      data: {
        summary: {
          total_amount: "0",
          active_count: 0,
          progress_payment_total: null,
          expiring_this_month_count: 0,
        },
        items: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    } as never);
  });

  it("ComingSoon DEĞİL gerçek Sözleşmeler görünümünü basar", () => {
    render(<SozlesmelerPage />);
    expect(screen.getByRole("heading", { name: "Sözleşmeler" })).toBeInTheDocument();
    expect(screen.queryByText("Bu modül yakında eklenecek.")).not.toBeInTheDocument();
  });
});
