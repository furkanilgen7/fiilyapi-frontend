import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import EditProgressPaymentPage from "./page";
import { ProgressPaymentForm } from "@/components/progress-payments/ProgressPaymentForm";

const PAYMENT_ID = "22222222-2222-2222-2222-222222222222";

vi.mock("next/navigation", () => ({
  useParams: () => ({ paymentId: PAYMENT_ID }),
}));

vi.mock("@/components/progress-payments/ProgressPaymentForm", () => ({
  ProgressPaymentForm: vi.fn(() => <div data-testid="pp-form-stub" />),
}));

// P7 T5 · gerçek rota — [...slug] catch-all yerine ComingSoon DEĞİL
// ProgressPaymentForm'un edit kipte basıldığını doğrular.
describe("EditProgressPaymentPage rotası", () => {
  it("ProgressPaymentForm'u edit kipinde paymentId ile basar", () => {
    render(<EditProgressPaymentPage />);
    expect(screen.getByTestId("pp-form-stub")).toBeInTheDocument();
    expect(vi.mocked(ProgressPaymentForm)).toHaveBeenCalledWith(
      { mode: "edit", paymentId: PAYMENT_ID },
      undefined,
    );
  });
});
