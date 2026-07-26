import { describe, it, expect } from "vitest";

import { parseProjectTab, tabToFilter, PROJECT_TABS } from "./tabs";

describe("parseProjectTab", () => {
  it("gecerli anahtari doner", () => {
    expect(parseProjectTab("kat_karsiligi")).toBe("kat_karsiligi");
  });
  it("bos ve gecersiz degerde all doner", () => {
    expect(parseProjectTab(null)).toBe("all");
    expect(parseProjectTab("sacma")).toBe("all");
  });
});

describe("tabToFilter", () => {
  it("all filtresizdir", () => {
    expect(tabToFilter("all")).toEqual({});
  });
  it("tip sekmeleri type filtresine gider", () => {
    expect(tabToFilter("taahhut")).toEqual({ type: "taahhut" });
    expect(tabToFilter("kendi_yatirim")).toEqual({ type: "kendi_yatirim" });
  });
  it("tamamlanan status filtresine gider", () => {
    expect(tabToFilter("completed")).toEqual({ status: "completed" });
  });
});

it("bes sekme mockup sirasindadir", () => {
  expect(PROJECT_TABS.map((t) => t.label)).toEqual([
    "Tümü", "Taahhüt", "Kendi Yatırım", "Kat Karşılığı", "Tamamlanan",
  ]);
});
