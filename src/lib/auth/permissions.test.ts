// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  ACCESS_LEVELS,
  DELETE_LEVELS,
  WRITE_LEVELS,
  canDelete,
  canWrite,
  hasAtLeast,
  isAccessLevel,
  type AccessLevel,
} from "./permissions";
import type { MeResponse } from "./types";

describe("permissions — /auth/me sözleşmesi (BE-A)", () => {
  // ⚠️ SOZLESME KORKULUGU (derleme zamani). `MeResponse.permissions` degeri
  // `AccessLevel` olmali. Backend alani `dict[str, str]` olarak yayimlarsa tip
  // `string`'e genisler, asagidaki `@ts-expect-error` KULLANILMAZ hale gelir ve
  // `pnpm typecheck` kirmizi doner — sessizce genisleme mumkun degildir.
  it("MeResponse.permissions değeri AccessLevel olarak tiplenir", () => {
    const valid: MeResponse["permissions"] = { boq: "full", contracts: "view" };
    // @ts-expect-error tanınmayan seviye dizesi derlemede reddedilmelidir
    const invalid: MeResponse["permissions"] = { boq: "superuser" };

    expect(valid.boq).toBe("full");
    // Calisma aninda dogrulama sinirimiz `isAccessLevel`'dir: derleyici
    // atlatilsa bile uydurma seviye yazma yetkisi dogurmaz.
    expect(isAccessLevel(invalid.boq)).toBe(false);
  });
});

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
  // ⚠️ KAPI TESTİ — BE-A'dan SONRA DA KALIR: bu kural ters çevrilirse
  // (bilinmiyorsa gizle) tam yetkili kullanıcı ekranı salt-okunur görür —
  // sessiz yetenek kaybı. Alanı taşımayan eski oturum, henüz yüklenmemiş
  // oturum ve haritada olmayan modül anahtarı hâlâ bu dala düşer.
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

describe("permissions — canDelete (kullanıcı kararı: silme yalnız sistem yöneticisinde)", () => {
  // Backend'de üç silme ucu (`DELETE /boq/items`, `/units`, `/blocks`) `admin`
  // kapısına çekildi. `full` seviyeli kullanıcı YAZAR ama SİLEMEZ — silme
  // yüzeyi `canWrite` ile kapılanırsa tıklayınca 403 alır.
  it("yalnız admin siler; full dahil diğer hiçbir seviye silemez", () => {
    const decisions = ACCESS_LEVELS.map((level) => [level, canDelete(level)]);
    expect(decisions).toEqual([
      ["none", false],
      ["view", false],
      ["draft", false],
      ["request", false],
      ["approve", false],
      ["full", false],
      ["admin", true],
    ]);
  });

  it("DELETE_LEVELS yalnız admin'i sayar", () => {
    expect([...DELETE_LEVELS]).toEqual(["admin"]);
  });

  // ⚠️ KAPI TESTİ — `canWrite` ile AYNI gerekçe: alanı taşımayan eski oturumda
  // gizleme devreye girerse sistem yöneticisi silme yüzeyini kaybeder.
  it("canDelete(undefined) true döner — bilinmezlik yasak sayılmaz", () => {
    expect(canDelete(undefined)).toBe(true);
  });

  // Silme yazmanın ALT KÜMESİDİR: silebilen herkes yazabilmelidir, tersi değil.
  it("silebilen her seviye yazabilir de", () => {
    for (const level of DELETE_LEVELS) expect(canWrite(level)).toBe(true);
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

describe("permissions — hasAtLeast (P7 T4 brief: sıralama tabanlı ortak eşik)", () => {
  // ⚠️ KAPI TESTİ — `canWrite`/`canDelete` ile BİREBİR aynı bilinmezlik kuralı
  // ve TERS ÇEVRİLEMEZ: seviye bilinmiyorsa `true`. Aksi halde oturum yükü
  // henüz gelmemiş tam yetkili kullanıcı butonları sessizce kaybeder.
  it("hasAtLeast(undefined, ...) true döner — bilinmezlik yasak sayılmaz", () => {
    expect(hasAtLeast(undefined, "approve")).toBe(true);
    expect(hasAtLeast(undefined, "admin")).toBe(true);
  });

  it("eşik seviyenin tam kendisinde true döner (sınır değer dahil)", () => {
    expect(hasAtLeast("approve", "approve")).toBe(true);
    expect(hasAtLeast("admin", "admin")).toBe(true);
  });

  it("eşiğin altındaki seviyede false, üstündeki seviyede true döner", () => {
    expect(hasAtLeast("request", "approve")).toBe(false);
    expect(hasAtLeast("full", "approve")).toBe(true);
    expect(hasAtLeast("full", "admin")).toBe(false);
  });

  it("yedi seviyenin tamamı için 'approve' eşiğine göre karar verir", () => {
    const decisions = ACCESS_LEVELS.map((level) => [level, hasAtLeast(level, "approve")]);
    expect(decisions).toEqual([
      ["none", false],
      ["view", false],
      ["draft", false],
      ["request", false],
      ["approve", true],
      ["full", true],
      ["admin", true],
    ]);
  });

  it("yedi seviyenin tamamı için 'admin' eşiğine göre karar verir", () => {
    const decisions = ACCESS_LEVELS.map((level) => [level, hasAtLeast(level, "admin")]);
    expect(decisions).toEqual([
      ["none", false],
      ["view", false],
      ["draft", false],
      ["request", false],
      ["approve", false],
      ["full", false],
      ["admin", true],
    ]);
  });

  it("sınır değer: indexOf tanımadığı 'required' -1 döner, her seviye onu geçer", () => {
    // `hasAtLeast`in çağrı sözleşmesi `required: AccessLevel` — TypeScript bu
    // dalı derleme zamanında engeller. Yine de çalışma zamanı davranışını
    // BİLEREK belgeler: `ACCESS_LEVELS.indexOf` tanımadığı değerde -1 döner,
    // `levelIndex >= -1` her zaman doğrudur (`"as"` ile tip sınırı burada
    // yalnız testin kendisinde aşılır, üretim kodunda YASAK kalır).
    const unknownRequired = "superuser" as AccessLevel;
    expect(hasAtLeast("none", unknownRequired)).toBe(true);
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
