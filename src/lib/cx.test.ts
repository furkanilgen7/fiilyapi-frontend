import { describe, it, expect } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("truthy siniflari boslukla birlestirir", () => {
    expect(cx("a", "b")).toBe("a b");
  });
  it("false/null/undefined degerleri atlar", () => {
    expect(cx("a", false, null, undefined, "b")).toBe("a b");
  });
  it("hicbir gecerli sinif yoksa bos string doner", () => {
    expect(cx(false, null, undefined)).toBe("");
  });
});
