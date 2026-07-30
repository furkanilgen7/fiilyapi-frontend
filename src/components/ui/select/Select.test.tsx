import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Select } from "./Select";

describe("Select", () => {
  it("secenekleri bir combobox olarak render eder", () => {
    render(
      <Select aria-label="Sehir" defaultValue="ist">
        <option value="ist">Istanbul</option>
        <option value="ank">Ankara</option>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Sehir" })).toHaveValue("ist");
  });

  it("error durumunda hata sinifini uygular", () => {
    render(
      <Select aria-label="Sehir" status="error">
        <option value="a">A</option>
      </Select>,
    );
    expect(screen.getByRole("combobox").className).toContain("select--error");
  });

  it("disabled iken devre disidir", () => {
    render(
      <Select aria-label="Sehir" disabled>
        <option value="a">A</option>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  // T2 — satır-içi düzenleme tablosu varyantı (şantiye mockup .row-in, satır 27)
  it("size verilmezse form varyanti kalir (row YOK)", () => {
    render(<Select aria-label="Sorumlu"><option value="">Seciniz…</option></Select>);
    expect(screen.getByRole("combobox").className).not.toContain("select--row");
  });

  it("size=row ui-select--row sinifini ekler", () => {
    render(<Select aria-label="Sorumlu" size="row"><option value="">Seciniz…</option></Select>);
    expect(screen.getByRole("combobox").className).toContain("select--row");
  });

  it("size prop'u DOM'un size ozniteligine sizmaz", () => {
    render(<Select aria-label="Sorumlu" size="row"><option value="">Seciniz…</option></Select>);
    expect(screen.getByRole("combobox")).not.toHaveAttribute("size");
  });
});
