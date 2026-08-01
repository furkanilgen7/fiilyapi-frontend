import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import ProgressPaymentDetailPage from "./page";
import {
  useProgressPayment,
  useProgressPaymentSummary,
} from "@/lib/api/hooks/useProgressPayments";

vi.mock("next/navigation", () => ({
  useParams: () => ({ paymentId: "22222222-2222-2222-2222-222222222222" }),
}));
vi.mock("@/lib/api/hooks/useProgressPayments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/hooks/useProgressPayments")>()),
  useProgressPayment: vi.fn(),
  useProgressPaymentSummary: vi.fn(),
}));

// P7 T3 brief: `/hakedisler/[paymentId]` gercek rota eklenince [...slug]
// catch-all bu segment icin devre disi kalir — bu test, sayfanin ComingSoon
// YERİNE gercek hakedis detayini bastigini dogrular.
describe("ProgressPaymentDetailPage rotasi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProgressPayment).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as never);
    vi.mocked(useProgressPaymentSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      isSuccess: false,
      error: null,
    } as never);
  });

  it("ComingSoon DEGIL gercek hakedis detay yuklenme durumunu basar", () => {
    render(<ProgressPaymentDetailPage />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    expect(screen.queryByText("Bu modül yakında eklenecek.")).not.toBeInTheDocument();
  });
});
