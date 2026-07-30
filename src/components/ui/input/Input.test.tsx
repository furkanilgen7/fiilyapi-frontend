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

  // T2 — satır-içi düzenleme tablosu varyantı (şantiye mockup .row-in, satır 27)
  it("size verilmezse form varyanti sinifi basilir (row YOK)", () => {
    render(<Input aria-label="Ad" />);
    const el = screen.getByRole("textbox");
    expect(el.className).toContain("input");
    expect(el.className).not.toContain("input--row");
  });

  it("size=row ui-input--row sinifini ekler", () => {
    render(<Input aria-label="Bolum adi" size="row" />);
    expect(screen.getByRole("textbox").className).toContain("input--row");
  });

  it("size=row status=error ile birlikte calisir", () => {
    render(<Input aria-label="Bolum adi" size="row" status="error" />);
    const el = screen.getByRole("textbox");
    expect(el.className).toContain("input--row");
    expect(el.className).toContain("input--error");
  });

  it("size prop'u DOM'un size ozniteligine sizmaz", () => {
    render(<Input aria-label="Bolum adi" size="row" />);
    expect(screen.getByRole("textbox")).not.toHaveAttribute("size");
  });
});
