import { describe, expect, it } from "vitest";
import { isActivePath } from "./isActive";

describe("isActivePath", () => {
  it('"/" yalniz tam eslesir', () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/ayarlar", "/")).toBe(false);
  });

  it("prefix eslesir (alt rotalar da aktif)", () => {
    expect(isActivePath("/ayarlar/kullanicilar", "/ayarlar/kullanicilar")).toBe(true);
    expect(isActivePath("/ayarlar/kullanicilar/5", "/ayarlar/kullanicilar")).toBe(true);
    expect(isActivePath("/ayarlar/roller", "/ayarlar/kullanicilar")).toBe(false);
  });
});
