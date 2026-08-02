import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { NewProgressPaymentContent } from "./NewProgressPaymentContent";
import { ProgressPaymentForm } from "@/components/progress-payments/ProgressPaymentForm";

let searchParams: URLSearchParams;
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/components/progress-payments/ProgressPaymentForm", () => ({
  ProgressPaymentForm: vi.fn(() => <div data-testid="pp-form-stub" />),
}));
vi.mock("@/components/progress-payments/ProjectPickerStep", () => ({
  ProjectPickerStep: vi.fn(() => <div data-testid="pp-picker-stub" />),
}));

// P7 T5 brief §Belirsizlik çözümü 2: `?project=` yoksa proje seçtiren ara
// adım basılır, boş form gösterilmez.
describe("NewProgressPaymentContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("?project= yoksa ProjectPickerStep basar", () => {
    searchParams = new URLSearchParams();
    render(<NewProgressPaymentContent />);
    expect(screen.getByTestId("pp-picker-stub")).toBeInTheDocument();
    expect(screen.queryByTestId("pp-form-stub")).not.toBeInTheDocument();
  });

  it("?project=<id> varsa ProgressPaymentForm'u create kipinde basar", () => {
    searchParams = new URLSearchParams("project=11111111-1111-1111-1111-111111111111");
    render(<NewProgressPaymentContent />);
    expect(screen.getByTestId("pp-form-stub")).toBeInTheDocument();
    expect(vi.mocked(ProgressPaymentForm)).toHaveBeenCalledWith(
      { mode: "create", projectId: "11111111-1111-1111-1111-111111111111" },
      undefined,
    );
  });
});
