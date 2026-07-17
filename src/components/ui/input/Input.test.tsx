import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("bir textbox render eder ve yazmayi kabul eder", async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Ad" onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Ad" }), "ab");
    expect(onChange).toHaveBeenCalled();
  });

  it("error durumunda hata sinifini uygular", () => {
    render(<Input aria-label="Ad" status="error" />);
    expect(screen.getByRole("textbox").className).toContain("input--error");
  });

  it("numeric iken mono sinifini uygular", () => {
    render(<Input aria-label="Tutar" numeric />);
    expect(screen.getByRole("textbox").className).toContain("input--numeric");
  });

  it("sol ikonu render eder", () => {
    render(<Input aria-label="Ara" leftIcon={<span data-testid="ic" />} />);
    expect(screen.getByTestId("ic")).toBeInTheDocument();
  });

  it("disabled iken devre disidir", () => {
    render(<Input aria-label="Ad" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
