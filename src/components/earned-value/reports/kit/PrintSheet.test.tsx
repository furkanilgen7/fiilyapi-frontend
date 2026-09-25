import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrintSheet } from "./PrintSheet";

describe("PrintSheet — A4 yatay çerçeve (GİR:299-386)", () => {
  it("içeriği basar ve sayfa/toplam sayısını data niteliğine yazar", () => {
    const { container } = render(
      <PrintSheet page={2} pageCount={3}>
        <div>içerik</div>
      </PrintSheet>,
    );
    expect(screen.getByText("içerik")).toBeInTheDocument();
    const sheet = container.querySelector(".ev-print-sheet");
    expect(sheet).toHaveAttribute("data-page", "2");
    expect(sheet).toHaveAttribute("data-page-count", "3");
  });

  it("altlık verilince 'Sayfa N / M' basılır", () => {
    render(
      <PrintSheet page={2} pageCount={3} footer={<span>Üretim 24.09.2026</span>}>
        <div>içerik</div>
      </PrintSheet>,
    );
    expect(screen.getByText("Üretim 24.09.2026")).toBeInTheDocument();
    expect(screen.getByText("Sayfa 2 / 3")).toBeInTheDocument();
  });

  it("altlık verilmezse hiç basılmaz", () => {
    render(
      <PrintSheet page={1} pageCount={1}>
        <div>içerik</div>
      </PrintSheet>,
    );
    expect(screen.queryByText(/Sayfa/)).toBeNull();
  });
});
