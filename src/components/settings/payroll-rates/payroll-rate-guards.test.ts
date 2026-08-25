import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  BOUND_DECIMALS_REASON,
  BOUND_NOT_POSITIVE_REASON,
  BOUND_TOO_LARGE_REASON,
  BRACKET_SET_EMPTY_REASON,
  BRACKET_SET_LAST_BOUNDED_REASON,
  BRACKET_SET_NOT_INCREASING_REASON,
  RATE_DECIMALS_REASON,
  RATE_EMPTY_REASON,
  RATE_INVALID_REASON,
  RATE_NEGATIVE_REASON,
  RATE_TOO_LARGE_REASON,
  checkBracketBound,
  checkBracketSet,
  checkRatePct,
  type BracketDraft,
} from "./payroll-rate-guards";

function draft(upperBound: string, ratePct: string, key = upperBound + ratePct): BracketDraft {
  return { key, upperBound, ratePct };
}

describe("checkRatePct — sözleşmenin REDDEDECEĞİNİ reddeder", () => {
  it("geçerli oranı ondalık string olarak döner (TR virgülü noktaya çevrilir)", () => {
    expect(checkRatePct("20,5")).toEqual({ ok: true, value: "20.5" });
    expect(checkRatePct("0.759")).toEqual({ ok: true, value: "0.759" });
    expect(checkRatePct("100")).toEqual({ ok: true, value: "100" });
    expect(checkRatePct("0")).toEqual({ ok: true, value: "0" });
  });
  it("boş değeri reddeder", () => {
    expect(checkRatePct("  ")).toEqual({ ok: false, reason: RATE_EMPTY_REASON });
  });
  it("negatif oranı reddeder (Pydantic `ge=0`)", () => {
    expect(checkRatePct("-1")).toEqual({ ok: false, reason: RATE_NEGATIVE_REASON });
  });
  it("100'ün üstünü reddeder (Pydantic `le=100`)", () => {
    expect(checkRatePct("100.001")).toEqual({ ok: false, reason: RATE_TOO_LARGE_REASON });
    expect(checkRatePct("101")).toEqual({ ok: false, reason: RATE_TOO_LARGE_REASON });
  });
  it("dört haneli tam sayıyı reddeder (`max_digits=6`, `decimal_places=3`)", () => {
    expect(checkRatePct("1000")).toEqual({ ok: false, reason: RATE_TOO_LARGE_REASON });
  });
  it("dörtten fazla değil, ÜÇTEN fazla ondalık basamağı reddeder", () => {
    expect(checkRatePct("1.2345")).toEqual({ ok: false, reason: RATE_DECIMALS_REASON });
    expect(checkRatePct("1.234")).toEqual({ ok: true, value: "1.234" });
  });
  it("rakamsız girdiyi reddeder", () => {
    expect(checkRatePct("abc")).toEqual({ ok: false, reason: RATE_INVALID_REASON });
    expect(checkRatePct(".")).toEqual({ ok: false, reason: RATE_INVALID_REASON });
  });
  it("baştaki sıfırları hane saymaz (`Decimal` de saymaz)", () => {
    expect(checkRatePct("0014")).toEqual({ ok: true, value: "0014" });
  });
});

describe("checkBracketBound", () => {
  it("sıfırı reddeder (`exclusiveMinimum: 0`)", () => {
    expect(checkBracketBound("0")).toEqual({ ok: false, reason: BOUND_NOT_POSITIVE_REASON });
  });
  it("13 haneli tam sayıyı reddeder (`max_digits=14`, `decimal_places=2`)", () => {
    expect(checkBracketBound("1234567890123")).toEqual({
      ok: false,
      reason: BOUND_TOO_LARGE_REASON,
    });
    expect(checkBracketBound("999999999999")).toEqual({ ok: true, value: "999999999999" });
  });
  it("üç ondalık basamağı reddeder", () => {
    expect(checkBracketBound("100.123")).toEqual({ ok: false, reason: BOUND_DECIMALS_REASON });
  });
});

describe("checkBracketSet — `normalize_brackets`in beş kuralı", () => {
  const gecerli: BracketDraft[] = [
    draft("190000", "15"),
    draft("400000", "20"),
    draft("1500000", "27"),
    draft("5300000", "35"),
    draft("", "40", "son"),
  ];

  it("2026 ücret tarifesini kabul eder ve `ordinal`i satır sırasından üretir", () => {
    const sonuc = checkBracketSet(gecerli);
    expect(sonuc).toEqual({
      ok: true,
      items: [
        { ordinal: 1, upper_bound: "190000", rate_pct: "15" },
        { ordinal: 2, upper_bound: "400000", rate_pct: "20" },
        { ordinal: 3, upper_bound: "1500000", rate_pct: "27" },
        { ordinal: 4, upper_bound: "5300000", rate_pct: "35" },
        { ordinal: 5, upper_bound: null, rate_pct: "40" },
      ],
    });
  });

  it("kural 1 — boş seti reddeder (`minItems: 1`)", () => {
    expect(checkBracketSet([])).toEqual({
      ok: false,
      index: null,
      reason: BRACKET_SET_EMPTY_REASON,
    });
  });

  it("kural 3 — azalan sınırı reddeder", () => {
    const bozuk = [draft("400000", "15"), draft("190000", "20"), draft("", "40", "son")];
    expect(checkBracketSet(bozuk)).toEqual({
      ok: false,
      index: 1,
      reason: BRACKET_SET_NOT_INCREASING_REASON,
    });
  });

  it("kural 3 — EŞİT sınırı da reddeder (aynı matrah iki dilime düşerdi)", () => {
    const bozuk = [draft("190000", "15", "a"), draft("190000", "20", "b"), draft("", "40", "son")];
    expect(checkBracketSet(bozuk).ok).toBe(false);
  });

  it("kural 3 — kuruş farkını GÖRÜR (12 haneli sınır `Number()`da eşitlenirdi)", () => {
    const artan = [
      draft("999999999999.98", "15"),
      draft("999999999999.99", "20"),
      draft("", "40", "son"),
    ];
    expect(checkBracketSet(artan).ok).toBe(true);
    const azalan = [
      draft("999999999999.99", "15"),
      draft("999999999999.98", "20"),
      draft("", "40", "son"),
    ];
    expect(checkBracketSet(azalan).ok).toBe(false);
  });

  it("kural 4 — ORTADA sınırsız dilimi reddeder", () => {
    const bozuk = [draft("", "15", "a"), draft("400000", "20"), draft("", "40", "son")];
    const sonuc = checkBracketSet(bozuk);
    expect(sonuc.ok).toBe(false);
    expect(sonuc.ok === false && sonuc.index).toBe(0);
  });

  it("kural 5 — SINIRLI son dilimi reddeder (üstündeki matrah vergisiz kalırdı)", () => {
    const bozuk = [draft("190000", "15"), draft("400000", "40")];
    expect(checkBracketSet(bozuk)).toEqual({
      ok: false,
      index: 1,
      reason: BRACKET_SET_LAST_BOUNDED_REASON,
    });
  });

  it("tek dilimli sınırsız set geçerlidir", () => {
    expect(checkBracketSet([draft("", "15", "tek")]).ok).toBe(true);
  });

  it("negatif oranı satır kimliğiyle birlikte reddeder", () => {
    const bozuk = [draft("190000", "15"), draft("400000", "-1"), draft("", "40", "son")];
    expect(checkBracketSet(bozuk)).toEqual({
      ok: false,
      index: 1,
      reason: RATE_NEGATIVE_REASON,
    });
  });
});

/**
 * 🔴 YAPISAL YASAK — F-FAT2 kanonunun ("port edilen her para formülü için
 * AYRIŞMA NOKTASI aranarak bulunur; ayrıca yapısal yasak konur") bu dilimdeki
 * uygulaması.
 *
 * **Ayrışma noktası ARANDI ve SÖZLEŞMENİN İÇİNDE BULUNAMADI — ölçüm:** üst
 * sınırın tavanı `max_digits=14, decimal_places=2`dir, yani en büyük geçerli
 * değer `999999999999.99` = **99.999.999.999.999 kuruş**. `Number.MAX_SAFE_INTEGER`
 * 9.007.199.254.740.991'dir; sözleşmenin izin verdiği HER değer double'da TAM
 * durur. Fiilen ölçüldü: `boundAsCents` gövdesi
 * `BigInt(Math.round(Number(v) * 100))` ile değiştirildiğinde **20 testin 20'si
 * yeşil kaldı** — yani bir DEĞER testi bu mutasyonu ASLA yakalayamaz.
 *
 * Bu, kayıpsız aritmetiğin gereksiz olduğu anlamına gelmez: kısıt backend'in
 * `max_digits`idir ve tek bir hane artışı ayrışmayı DOĞURUR. Değer testi bu
 * sınıfa yapısal olarak kör olduğu için bekçi kodun KENDİSİNE konur.
 */
describe("boundAsCents — yapısal yasak (değer testinin kör olduğu sınıf)", () => {
  it("kuruş çevrimi BigInt'tir; `Number`/`Math.` KULLANMAZ", () => {
    const kaynak = readFileSync(
      path.join(
        process.cwd(),
        "src/components/settings/payroll-rates/payroll-rate-guards.ts",
      ),
      "utf8",
    );
    const govde = kaynak.slice(
      kaynak.indexOf("function boundAsCents"),
      kaynak.indexOf("export function checkBracketSet"),
    );
    expect(govde).toContain("BigInt");
    expect(govde).not.toMatch(/\bNumber\s*\(/);
    expect(govde).not.toMatch(/\bMath\./);
  });
});
