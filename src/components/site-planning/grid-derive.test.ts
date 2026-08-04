import { describe, it, expect } from "vitest";

import type { SitePlanGroup, SitePlanRowRead } from "@/lib/api/hooks/useSitePlan";

import {
  planCellsByDate,
  planGroupManagerText,
  planGroupTitle,
  planRowLabel,
} from "./grid-derive";

function row(overrides: Partial<SitePlanRowRead> = {}): SitePlanRowRead {
  return {
    id: "pr-1",
    kind: "crew",
    section_id: "sec-1",
    label: "Kalıpçı",
    planned_worker_count: 14,
    sort_order: 0,
    cells: [],
    ...overrides,
  };
}

function group(overrides: Partial<SitePlanGroup> = {}): SitePlanGroup {
  return {
    kind: "crew",
    section_id: "sec-1",
    section_name: "Kat 6–10 Kaba",
    section_manager_name: "Sercan Öztürk",
    rows: [],
    ...overrides,
  };
}

describe("planGroupTitle", () => {
  it("ekip grubunda bolum adini basar", () => {
    expect(planGroupTitle(group())).toBe("Kat 6–10 Kaba");
  });

  it("ekipman grubunda SABIT basligi basar (bolum adi null'dur)", () => {
    expect(
      planGroupTitle(
        group({ kind: "equipment", section_id: null, section_name: null, section_manager_name: null }),
      ),
    ).toBe("Makine & Ekipman");
  });

  it("bolumsuz ekip grubu ekipmanla AYNI basliga dusmez", () => {
    const title = planGroupTitle(group({ section_id: null, section_name: null }));
    expect(title).toBe("Bölümsüz Ekipler");
    expect(title).not.toBe("Makine & Ekipman");
  });
});

describe("planGroupManagerText", () => {
  it("sorumlu varsa etiketli basar", () => {
    expect(planGroupManagerText(group())).toBe("Bölüm sorumlusu: Sercan Öztürk");
  });

  it("sorumlu yoksa hucre BOS kalir", () => {
    expect(planGroupManagerText(group({ section_manager_name: null }))).toBe("");
  });
});

describe("planRowLabel", () => {
  it("isci sayisi varsa parantezle basar", () => {
    expect(planRowLabel(row())).toBe("Kalıpçı (14)");
  });

  it("isci sayisi null ise parantez BASILMAZ", () => {
    expect(planRowLabel(row({ label: "Tower Crane", planned_worker_count: null }))).toBe(
      "Tower Crane",
    );
  });
});

describe("planCellsByDate", () => {
  it("SEYREK hucreleri tarihe gore esler (indekse gore DEGIL)", () => {
    const cells = planCellsByDate(
      row({
        cells: [
          { plan_date: "2026-08-05", text: "Kalıp sökümü", tag: "green" },
          { plan_date: "2026-08-07", text: "Bakım", tag: null },
        ],
      }),
    );
    expect(cells.get("2026-08-03")).toBeUndefined();
    expect(cells.get("2026-08-05")?.text).toBe("Kalıp sökümü");
    expect(cells.get("2026-08-07")?.tag).toBeNull();
  });
});
