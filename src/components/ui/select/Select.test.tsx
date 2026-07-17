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
});
