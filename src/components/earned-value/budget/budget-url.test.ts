import { describe, it, expect } from "vitest";

import { nextSearch, parseStep, REV_PARAM, STEP_PARAM } from "./budget-url";

describe("parseStep — `?adim=` URL durumu", () => {
  it.each([
    [null, 1],
    ["1", 1],
    ["3", 3],
    ["4", 4],
    ["0", 1],
    ["9", 1],
    ["abc", 1],
  ] as const)("%s → %s", (raw, step) => {
    expect(parseStep(raw)).toBe(step);
  });
});

describe("nextSearch — diğer parametreler (`?site=`) KORUNUR", () => {
  it("adım yazılır, revizyon silinir", () => {
    const current = new URLSearchParams("site=s-1&rev=r-1");
    const out = nextSearch(current, { step: 2, revisionId: null });
    expect(out.get("site")).toBe("s-1");
    expect(out.get(STEP_PARAM)).toBe("2");
    expect(out.has(REV_PARAM)).toBe(false);
  });

  it("verilmeyen anahtar dokunulmaz; adım 1 URL'den düşer (varsayılan)", () => {
    const out = nextSearch(new URLSearchParams("adim=3&rev=r-1"), { step: 1 });
    expect(out.has(STEP_PARAM)).toBe(false);
    expect(out.get(REV_PARAM)).toBe("r-1");
  });
});
