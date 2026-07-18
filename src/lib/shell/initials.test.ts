import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("iki kelimeden bas harfleri alir", () => {
    expect(initials("Ahmet Yılmaz")).toBe("AY");
  });
  it("tek kelimede ilk harfi alir", () => {
    expect(initials("Ahmet")).toBe("A");
  });
  it("bos/bosluk icin bos string", () => {
    expect(initials("   ")).toBe("");
    expect(initials("")).toBe("");
  });
  it("uc kelimede ilk iki kelimeyi kullanir", () => {
    expect(initials("Ali Veli Han")).toBe("AV");
  });
});
