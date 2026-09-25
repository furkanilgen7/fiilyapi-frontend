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

  it("renderItemCells: headers ile aynı uzunluk; kazanılmış + PF KALEM düğümünden (`progress.items`, EV-BORC-2)", () => {
    const cols = columns();
    const cells = cols.renderItemCells?.(ITEM_KALIP) ?? [];
    expect(cells).toHaveLength(cols.headers.length);
    render(<>{cells}</>);
    expect(screen.getByText("79,1")).toBeInTheDocument();
    // Yaprak PF'si 0,94; kalem PF'si kaleme doğrudan yazılan saati de sayar → 0,44 (istemci hesaplamaz).
    expect(screen.getByText("0,44")).toBeInTheDocument();
  });

  it("kazanılmış yaprak toplamından DEĞİL kalem düğümünden okunur", () => {
    const view = dayView();
    const progress = {
      ...view.progress!,
      items: [{ node_id: `i:${ITEM_KALIP}`, qty_day: "93", earned_day: "81.24", spent_day: "18", pf_day: "0.4513" }],
    };
    const cols = buildLineColumns({
      lines: [],
      progress,
      index: buildCodeIndex(codeTree()),
      bands: DEFAULT_PF_BANDS,
      budgetHref: null,
      revisionNumber: 1,
    });
    render(<>{cols.renderItemCells?.(ITEM_KALIP)}</>);
    expect(screen.getByText("81,2")).toBeInTheDocument();
  });

  it("kalem düğümü yoksa (ör. oransız ya da hiç yazılmamış kalem) kazanılmış ve PF '—'", () => {
    const { container } = render(<>{columns().renderItemCells?.(ITEM_PRIZ)}</>);
    expect(container.textContent).toBe("——");
  });

  it("miktarsız kalemin düğümü de basılır (Beton: kazanılmış '0,0')", () => {
    render(<>{columns().renderItemCells?.(ITEM_BETON)}</>);
    expect(screen.getByText("0,0")).toBeInTheDocument();
  });
});
