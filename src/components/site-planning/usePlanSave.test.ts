import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import {
  useSaveSitePlanCells,
  useSaveSitePlanGoals,
  useSaveSitePlanRows,
  useSaveSitePlanSprint,
} from "@/lib/api/hooks/useSitePlanMutations";

import { usePlanSave } from "./usePlanSave";
import type { PlanDraft } from "./plan-draft";
import type { PlanDraftAction } from "./plan-draft-reducer";

// KAYIT 318 · `steps` hafta değişince otomatik sıfırlanmalı — aksi hâlde
// önceki haftanın "kaydedildi/kaydedilemedi" satırları ve "Yeniden dene"
// düğmesi yeni haftaya sızar.

vi.mock("@/lib/api/hooks/useSitePlanMutations", () => ({
  useSaveSitePlanRows: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ rows: [] }) })),
  useSaveSitePlanCells: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) })),
  useSaveSitePlanGoals: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) })),
  useSaveSitePlanSprint: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) })),
}));

function dirtyDraft(weekStart: string): PlanDraft {
  return {
    weekStart,
    groups: [],
    rows: [
      {
        key: "new-row-1",
        serverId: null,
        kind: "crew",
        sectionId: "sec-1",
        label: "Kalıpçı",
        plannedWorkerCount: null,
        cells: {},
      },
    ],
    goals: [],
    sprintName: "",
    nextLocalId: 2,
    dirty: { rows: true, cells: false, goals: false, sprint: false },
  };
}

describe("usePlanSave — hafta değişimi", () => {
  it("weekStart değişince steps sıfırlanır", async () => {
    vi.mocked(useSaveSitePlanRows).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error("boom")),
    } as never);
    vi.mocked(useSaveSitePlanCells).mockReturnValue({ mutateAsync: vi.fn() } as never);
    vi.mocked(useSaveSitePlanGoals).mockReturnValue({ mutateAsync: vi.fn() } as never);
    vi.mocked(useSaveSitePlanSprint).mockReturnValue({ mutateAsync: vi.fn() } as never);

    const dispatch = vi.fn<(action: PlanDraftAction) => void>();
    const { result, rerender } = renderHook(
      ({ week }: { week: string }) => usePlanSave("s-1", week, dispatch),
      { initialProps: { week: "2026-08-03" } },
    );

    const draft = dirtyDraft("2026-08-03");

    await act(async () => {
      await result.current.save(draft);
    });

    expect(result.current.steps.length).toBeGreaterThan(0);
    expect(result.current.hasFailure).toBe(true);

    rerender({ week: "2026-08-10" });

    expect(result.current.steps).toHaveLength(0);
    expect(result.current.hasFailure).toBe(false);
  });
});
