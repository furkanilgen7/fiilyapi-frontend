import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusMark } from "./StatusMark";

describe("StatusMark — GİR Durum kolonu (GİR:188,326 st())", () => {
  it("ahead → 'İleride' etiketi ve tonu", () => {
    render(<StatusMark status="ahead" />);
    const mark = screen.getByText("İleride").closest(".ev-status-mark");
    expect(mark).toHaveClass("ev-status-mark--ahead");
    expect(mark?.querySelector("svg polygon")).not.toBeNull();
  });

  it("late → 'Geride' etiketi ve tonu", () => {
    render(<StatusMark status="late" />);
    const mark = screen.getByText("Geride").closest(".ev-status-mark");
    expect(mark).toHaveClass("ev-status-mark--late");
  });

  it("normal → 'Normal' etiketi, daire glif", () => {
    render(<StatusMark status="normal" />);
    const mark = screen.getByText("Normal").closest(".ev-status-mark");
    expect(mark).toHaveClass("ev-status-mark--normal");
    expect(mark?.querySelector("svg circle")).not.toBeNull();
  });

  it("none → glifsiz EMPTY_CELL ('—'), veri yok", () => {
    render(<StatusMark status="none" />);
    const mark = screen.getByText("—").closest(".ev-status-mark");
    expect(mark).toHaveClass("ev-status-mark--none");
    expect(mark?.querySelector("svg")).toBeNull();
  });

  it("her durumda TEK bir glif SVG'si basılır (▲/▼/● çıplak metin DEĞİL)", () => {
    render(<StatusMark status="ahead" />);
    // Glif metin düğümü olarak DEĞİL, SVG olarak basılmalı (symbol-subset-guard).
    expect(screen.queryByText("▲")).toBeNull();
    expect(document.querySelector(".ev-status-mark svg")).not.toBeNull();
  });
});
