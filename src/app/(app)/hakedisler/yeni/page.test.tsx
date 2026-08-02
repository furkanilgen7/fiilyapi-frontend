import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import NewProgressPaymentPage from "./page";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./NewProgressPaymentContent", () => ({
  NewProgressPaymentContent: () => <div data-testid="pp-content-stub" />,
}));

// P7 T5 · gerçek rota — [...slug] catch-all yerine ComingSoon DEĞİL, Suspense
// içinde `NewProgressPaymentContent`i bastığını doğrular (Next 15
// `useSearchParams` Suspense kuralı, bkz. `projeler/page.tsx` kanonu).
describe("NewProgressPaymentPage rotası", () => {
  it("NewProgressPaymentContent'i Suspense içinde basar", () => {
    render(<NewProgressPaymentPage />);
    expect(screen.getByTestId("pp-content-stub")).toBeInTheDocument();
  });
});
