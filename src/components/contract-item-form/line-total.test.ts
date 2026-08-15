import { describe, it, expect } from "vitest";

import { lineTotalPreview } from "./line-total";

describe("lineTotalPreview", () => {
  it("miktar × birim fiyat verir", () => {
    expect(lineTotalPreview("10", "25.5")).toBe(255);
  });

  it("girdilerden biri boşken `null` döner (sessiz `0` YAZILMAZ)", () => {
    expect(lineTotalPreview("", "25")).toBeNull();
    expect(lineTotalPreview("10", "  ")).toBeNull();
  });

  it("sayı olmayan girdide `null` döner", () => {
    expect(lineTotalPreview("abc", "25")).toBeNull();
  });
});
