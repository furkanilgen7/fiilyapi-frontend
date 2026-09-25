import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { DEFAULT_PF_BANDS } from "@/lib/earned-value";

import { buildCodeIndex } from "./code-tree";
import { ITEM_BETON, ITEM_KALIP, ITEM_PRIZ, SEC_K610, codeTree, dayView } from "./diary-fixtures";
import { buildLineColumns } from "./line-columns";

function columns(revision: number | null = 1) {
  const view = dayView();
  return buildLineColumns({
    lines: [{ key: "a", boqItemId: ITEM_KALIP, sectionId: SEC_K610, quantityToday: "93" }],
    progress: view.progress,
    index: buildCodeIndex(codeTree()),
    bands: DEFAULT_PF_BANDS,
    budgetHref: "/b",
    revisionNumber: revision,
  });
}

describe("buildLineColumns — genişletilmiş yuvalar", () => {
  it("caption: İ:213 'kazanılmış = bugün miktar × birim oran (Rev n)'", () => {
    render(<>{columns(1).caption}</>);
    expect(screen.getByText("kazanılmış = bugün miktar × birim oran (Rev 1)")).toBeInTheDocument();
    expect(columns(null).caption).toBeUndefined();
  });

  it("renderItemCells: headers ile aynı uzunluk; kalemin yapraklarının payload kazanılmışı toplanır", () => {
    const cols = columns();
    const cells = cols.renderItemCells?.(ITEM_KALIP) ?? [];
    expect(cells).toHaveLength(cols.headers.length);
    render(<>{cells}</>);
    expect(screen.getByText("79,1")).toBeInTheDocument();
  });

  it("kalem PF'si payload'da yoksa boş ('—'); yaprağı olmayan kalemde kazanılmış '—'", () => {
    render(<>{columns().renderItemCells?.(ITEM_KALIP)}</>);
    expect(screen.getByText("—")).toHaveClass("ev-diary-pf--none");
    const other = columns().renderItemCells?.(ITEM_PRIZ) ?? [];
    const { container } = render(<>{other}</>);
    expect(container.textContent).toBe("——");
  });

  it("miktarsız yaprağın kazanılmışı 0 toplanır (Beton: '0,0')", () => {
    render(<>{columns().renderItemCells?.(ITEM_BETON)}</>);
    expect(screen.getByText("0,0")).toBeInTheDocument();
  });
});
