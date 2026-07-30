// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import { ACCESS_LEVELS, WRITE_LEVELS, canWrite, isAccessLevel } from "./permissions";

describe("permissions — seviye listeleri (spec §2.5.2)", () => {
  // Backend `AccessLevel` sıralaması (schema.d.ts): none < view < draft <
  // request < approve < full < admin. Liste kayarsa salt-okunur rol yazma
  // yetkisi kazanabilir — bu yüzden birebir sabitlenir.
  it("WRITE_LEVELS backend AccessLevel sıralamasıyla birebir (none/view yazma değildir)", () => {
    expect([...WRITE_LEVELS]).toEqual(["draft", "request", "approve", "full", "admin"]);
    expect(WRITE_LEVELS).not.toContain("none");
    expect(WRITE_LEVELS).not.toContain("view");
  });

  it("ACCESS_LEVELS backend'in yedi seviyesini eksiksiz sayar", () => {
    expect([...ACCESS_LEVELS]).toEqual([
      "none",
      "view",
      "draft",
      "request",
      "approve",
      "full",
      "admin",
    ]);
  });
});

describe("permissions — canWrite (spec §2.5.3 bilinmezlik kuralı)", () => {
  // ⚠️ KAPI TESTİ: bu kural ters çevrilirse (bilinmiyorsa gizle) tam yetkili
  // kullanıcı ekranı salt-okunur görür — sessiz yetenek kaybı. MeResponse'ta
  // izin alanı BE-A'ya kadar YOK, yani bugün fiilen tek geçerli dal budur.
  it("canWrite(undefined) true döner — bilinmezlik yasak sayılmaz", () => {
    expect(canWrite(undefined)).toBe(true);
  });

  it("canWrite('view') false, canWrite('full') true", () => {
    expect(canWrite("view")).toBe(false);
    expect(canWrite("full")).toBe(true);
  });

  it("yedi seviyenin tamamı için karar verir", () => {
    const decisions = ACCESS_LEVELS.map((level) => [level, canWrite(level)]);
    expect(decisions).toEqual([
      ["none", false],
      ["view", false],
      ["draft", true],
      ["request", true],
      ["approve", true],
      ["full", true],
      ["admin", true],
    ]);
  });
});

describe("permissions — isAccessLevel (sınır doğrulaması)", () => {
  it("bilinen seviyeleri kabul eder", () => {
    for (const level of ACCESS_LEVELS) expect(isAccessLevel(level)).toBe(true);
  });

  it("tanınmayan değeri reddeder — uydurma seviye yazma yetkisi doğurmaz", () => {
    expect(isAccessLevel("superuser")).toBe(false);
    expect(isAccessLevel("")).toBe(false);
    expect(isAccessLevel(7)).toBe(false);
    expect(isAccessLevel(null)).toBe(false);
    expect(isAccessLevel(undefined)).toBe(false);
    expect(isAccessLevel({ level: "full" })).toBe(false);
  });
});

describe("permissions — ekran bağımsızlığı (spec §2.5.4)", () => {
  // Bu dosya sonraki tüm ekranlarca kullanılacak; BOQ'ya ya da başka bir
  // modüle özel sabit taşımaz. Sabit rol→seviye haritası da YASAK (§2.5.1):
  // matris Ayarlar'dan çalışma anında değişebiliyor.
  it("modül adı sabiti içermez", () => {
    const source = readFileSync(fileURLToPath(new URL("./permissions.ts", import.meta.url)), "utf8");
    for (const moduleKey of ["boq", "contracts", "progress_payments", "user_management"]) {
      expect(source).not.toContain(`"${moduleKey}"`);
    }
  });
});
