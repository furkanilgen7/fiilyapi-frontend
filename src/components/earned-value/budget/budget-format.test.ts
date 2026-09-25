import { describe, it, expect } from "vitest";

import {
  formatDateShort,
  formatMhr,
  formatRateInput,
  fillMessage,
  genitive,
  leafLabel,
  localTodayIso,
  parseRateInput,
} from "./budget-format";

describe("formatMhr — mockup `nf(v)` tam sayı, binlik ayraçlı (BÜT:517)", () => {
  it.each([
    ["27626", "27.626"],
    ["2375.6", "2.376"],
    ["2375.5", "2.376"],
    ["0", "0"],
    ["-114", "−114"],
  ])("%s → %s", (input, expected) => {
    expect(formatMhr(input)).toBe(expected);
  });

  it("boş değer EMPTY_CELL", () => {
    expect(formatMhr(null)).toBe("—");
  });
});

describe("formatRateInput — oran hücresi metni (BÜT:519 `fr`)", () => {
  it.each([
    ["1.800000", "1,80"],
    ["0.125", "0,125"],
    ["12", "12,00"],
    ["1400", "1400,00"],
  ])("%s → %s", (input, expected) => {
    expect(formatRateInput(input)).toBe(expected);
  });

  it("oran yoksa boş dize (placeholder görünür)", () => {
    expect(formatRateInput(null)).toBe("");
  });
});

describe("parseRateInput", () => {
  it("TR virgüllü değeri ondalık string'e çevirir", () => {
    expect(parseRateInput("1,80")).toEqual({ kind: "value", value: "1.80" });
  });

  it("boş girdi = oranı SİL (unit_mhr null)", () => {
    expect(parseRateInput("  ")).toEqual({ kind: "empty" });
  });

  it.each(["abc", "-1", "1,2,3"])("geçersiz/negatif %s reddedilir", (input) => {
    expect(parseRateInput(input)).toEqual({ kind: "invalid" });
  });
});

describe("leafLabel — F0-6: 'Tüm şantiye' (dolaylı) = 'Bölümsüz' (doğrudan)", () => {
  it("bölümlü yaprak bölüm adını taşır", () => {
    expect(leafLabel({ section_name: "Temel", is_direct: true })).toBe("Temel");
  });

  it("bölümsüz doğrudan → Bölümsüz", () => {
    expect(leafLabel({ section_name: null, is_direct: true })).toBe("Bölümsüz");
  });

  it("bölümsüz dolaylı → Tüm şantiye", () => {
    expect(leafLabel({ section_name: null, is_direct: false })).toBe("Tüm şantiye");
  });

});

describe("formatDateShort — mockup `dstr` gg.aa.yy (BÜT:681)", () => {
  it("ISO → 06.05.26", () => {
    expect(formatDateShort("2026-05-06")).toBe("06.05.26");
  });

  it("null → EMPTY_CELL", () => {
    expect(formatDateShort(null)).toBe("—");
  });
});

describe("localTodayIso", () => {
  it("yerel takvim günü, sıfır dolgulu", () => {
    expect(localTodayIso(new Date(2026, 8, 4, 23, 30))).toBe("2026-09-04");
  });
});

describe("genitive — özel ad tamlayan eki (M4 \"Peyzaj'ın …\")", () => {
  it.each([
    ["Peyzaj", "Peyzaj'ın"],
    ["Elektrik", "Elektrik'in"],
    ["Kaba İnşaat", "Kaba İnşaat'ın"],
    ["Duvar & Sıva", "Duvar & Sıva'nın"],
    ["Mekanik Tesisat", "Mekanik Tesisat'ın"],
    ["Boru", "Boru'nun"],
    ["Ölçü", "Ölçü'nün"],
    ["Köprü Göz", "Köprü Göz'ün"],
  ])("%s → %s", (name, out) => {
    expect(genitive(name)).toBe(out);
  });
});

describe("fillMessage — Katalogdan öner bildirimi (BÜT:667 + CEO p)", () => {
  const base = { filled_item_count: 0, ambiguous: [] };
  it("belirsiz varsa yönlendirme eklenir (sayı yetim kalmaz)", () => {
    expect(fillMessage({ ...base, filled_leaf_count: 3, ambiguous_count: 1, unmatched_count: 0 })).toBe(
      "3 boş satır katalogdan dolduruldu · 1 kalemde eşleşme belirsiz · ayrıntı için oran hücresindeki önerilere bakın",
    );
  });
  it("belirsiz yoksa yönlendirme YOK", () => {
    expect(fillMessage({ ...base, filled_leaf_count: 2, ambiguous_count: 0, unmatched_count: 1 })).toBe(
      "2 boş satır katalogdan dolduruldu · 1 kalemde katalog eşleşmesi yok",
    );
  });
  it("hiçbir şey olmadıysa mockup metni", () => {
    expect(fillMessage({ ...base, filled_leaf_count: 0, ambiguous_count: 0, unmatched_count: 0 })).toBe(
      "Boş oran yok · mevcut oranlar korunuyor",
    );
  });
});
