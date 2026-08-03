import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import SubcontractorProgressPaymentDetailPage from "./page";
import {
  useSubcontractorContract,
  useSubcontractorProgressPayment,
} from "@/lib/api/hooks/useSubcontractorProgressPayments";
import { useSite } from "@/lib/api/hooks/useSites";

vi.mock("next/navigation", () => ({
  useParams: () => ({ paymentId: "22222222-2222-2222-2222-222222222222" }),
}));
vi.mock("@/lib/api/hooks/useSubcontractorProgressPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSubcontractorProgressPayments")>()),
  useSubcontractorProgressPayment: vi.fn(),
  useSubcontractorContract: vi.fn(),
}));
vi.mock("@/lib/api/hooks/useSites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useSites")>()),
  useSite: vi.fn(),
}));

// F-TH T4 brief §⭐ ÖLÜ YÜZEY YASAĞI: `/hakedisler/taseron/[paymentId]`
// gerçek rota — [...slug] catch-all YERİNE gerçek taşeron hakediş detayını
// bastığını doğrular (P7 T3'ün `[paymentId]/page.test.tsx` deseniyle AYNI).
describe("SubcontractorProgressPaymentDetailPage rotasi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSubcontractorProgressPayment).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);
    vi.mocked(useSubcontractorContract).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as never);
    vi.mocked(useSite).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as never);
  });

  it("ComingSoon DEGIL gercek taseron hakedis detay yuklenme durumunu basar", () => {
    render(<SubcontractorProgressPaymentDetailPage />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(screen.queryByText("Bu modül yakında eklenecek.")).not.toBeInTheDocument();
  });
});
