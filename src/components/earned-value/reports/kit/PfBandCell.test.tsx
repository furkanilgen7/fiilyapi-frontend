import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PfBandCell } from "./PfBandCell";

function renderCell(ui: React.ReactElement) {
  return render(<table><tbody><tr>{ui}</tr></tbody></table>);
}

describe("PfBandCell", () => {
  it("biçimlenmiş değeri basar, bandına göre sınıf alır", () => {
    renderCell(<PfBandCell value="0,97" band="amber" />);
    const cell = screen.getByText("0,97");
    expect(cell.tagName).toBe("TD");
    expect(cell).toHaveClass("pf-band-cell--amber");
  });

  it("değer yoksa EMPTY_CELL basar ve bant NÖTR olur (bant verilmiş olsa bile)", () => {
    renderCell(<PfBandCell value={null} band="red" />);
    const cell = screen.getByText("—");
    expect(cell).toHaveClass("pf-band-cell--none");
    expect(cell).not.toHaveClass("pf-band-cell--red");
  });

  it("as=\"span\" ile span basar (KPI kartı kullanımı)", () => {
    render(<PfBandCell value="1,02" band="green" as="span" />);
    const cell = screen.getByText("1,02");
    expect(cell.tagName).toBe("SPAN");
    expect(cell).toHaveClass("pf-band-cell--green");
  });
});
