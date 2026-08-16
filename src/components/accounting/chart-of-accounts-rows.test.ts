import { describe, expect, it } from "vitest";

import type { ChartAccountResponse } from "@/lib/api/hooks/useChartOfAccounts";

import {
  accountStatusLabel,
  accountStatusTone,
  accountTypeLabel,
  accountTypeVariant,
  balanceTone,
  buildChartRows,
  classBandLabel,
  classBandTheme,
  formatBalance,
  indentSteps,
} from "./chart-of-accounts-rows";

function account(partial: Partial<ChartAccountResponse> & { code: string }): ChartAccountResponse {
  return {
    id: `id-${partial.code}`,
    name: "Hesap",
    account_type: "asset",
    is_active: true,
    is_contra: false,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    balance: "0.00",
    class_code: partial.code[0] ?? "1",
    level: partial.code.length === 2 ? 1 : partial.code.includes(".") ? 3 : 2,
    ...partial,
  };
}

// --- 🔴 Tür ≠ Durum ------------------------------------------------------

describe("Tür (account_type) ile Durum (is_active) AYRI şeylerdir", () => {
  it("Tür dört rozeti HP'deki gibi etiketler (78/154/192/199)", () => {
    expect(accountTypeLabel("asset")).toBe("Aktif");
    expect(accountTypeLabel("liability")).toBe("Pasif");
    expect(accountTypeLabel("revenue")).toBe("Gelir");
    expect(accountTypeLabel("expense")).toBe("Gider");
  });

  it("Tür renkleri: asset/revenue yeşil, liability/expense kırmızı", () => {
    expect(accountTypeVariant("asset")).toBe("success");
    expect(accountTypeVariant("revenue")).toBe("success");
    expect(accountTypeVariant("liability")).toBe("danger");
    expect(accountTypeVariant("expense")).toBe("danger");
  });

  it("Durum etiketleri Tür rozetlerinin KELİMELERİNİ kullanmaz", () => {
    expect(accountStatusLabel(true)).toBe("Kullanımda");
    expect(accountStatusLabel(false)).toBe("Kullanım dışı");
    // Karışma bekçisi: "Aktif"/"Pasif" YALNIZ Tür sütunundadır.
    expect(accountStatusLabel(true)).not.toBe(accountTypeLabel("asset"));
    expect(accountStatusLabel(false)).not.toBe(accountTypeLabel("liability"));
  });

  it("🔴 HP:154-156 — `Pasif` TÜRÜNDEKİ hesap KULLANIMDA olabilir", () => {
    const amortisman = account({
      code: "257",
      name: "Birikmiş Amortismanlar (-)",
      account_type: "liability",
      is_active: true,
    });
    expect(accountTypeLabel(amortisman.account_type)).toBe("Pasif");
    expect(accountStatusTone(amortisman.is_active)).toBe("on");
    expect(accountStatusLabel(amortisman.is_active)).toBe("Kullanımda");
  });

  it("kaldırılmış hesabın noktası GRİdir (mockup örneklememiş — şef kararı)", () => {
    expect(accountStatusTone(true)).toBe("on");
    expect(accountStatusTone(false)).toBe("off");
  });
});

// --- Bakiye --------------------------------------------------------------

describe("bakiye biçimi ve tonu", () => {
  it("HP:155 — negatif bakiye PARANTEZ içindedir, eksi işaretiyle değil", () => {
    expect(formatBalance("-620000.00")).toBe("(620.000)");
    expect(formatBalance("-620000.00")).not.toContain("-");
  });

  it("pozitif bakiye olduğu gibi biçimlenir (HP:79)", () => {
    expect(formatBalance("284800.00")).toBe("284.800");
  });

  it("negatif bakiye HER TÜRDE kırmızıdır", () => {
    expect(balanceTone("-620000.00", "asset")).toBe("danger");
    expect(balanceTone("-1.00", "revenue")).toBe("danger");
  });

  it("pozitif bakiye TÜRÜN rengini izler (HP:79/167/193/200)", () => {
    expect(balanceTone("284800.00", "asset")).toBe("success"); // HP:79
    expect(balanceTone("2184000.00", "liability")).toBe("danger"); // HP:167
    expect(balanceTone("24870500.00", "revenue")).toBe("success"); // HP:193
    expect(balanceTone("5840000.00", "expense")).toBe("danger"); // HP:200
  });

  it("sıfır bakiye pozitif gibi ele alınır (parantez YOK)", () => {
    expect(formatBalance("0.00")).toBe("0");
    expect(balanceTone("0.00", "asset")).toBe("success");
  });
});

// --- Sınıf bantları ------------------------------------------------------

describe("SINIF bantları", () => {
  it("mockup'ın dört bandı BİREBİR (HP:69/135/161/187)", () => {
    expect(classBandLabel("1")).toBe("SINIF 1 — DÖNEN VARLIKLAR");
    expect(classBandLabel("2")).toBe("SINIF 2 — DURAN VARLIKLAR");
    expect(classBandLabel("3")).toBe("SINIF 3 — KISA VADELİ YÜKÜMLÜLÜKLER");
    expect(classBandLabel("5")).toBe("SINIF 5 — GELİR TABLOSU HESAPLARI");
    expect(classBandTheme("1")).toBe("1");
    expect(classBandTheme("5")).toBe("5");
  });

  it("🔴 çizilmemiş sınıfta BAŞLIK İCAT EDİLMEZ, düz `SINIF N` basılır", () => {
    for (const code of ["4", "6", "7", "8", "9"]) {
      expect(classBandLabel(code)).toBe(`SINIF ${code}`);
      expect(classBandLabel(code)).not.toContain("—");
      expect(classBandTheme(code)).toBe("neutral");
    }
  });
});

// --- Satır akışı ---------------------------------------------------------

describe("buildChartRows", () => {
  it("veri yokken boş akış döner", () => {
    expect(buildChartRows(undefined)).toEqual([]);
    expect(buildChartRows([])).toEqual([]);
  });

  it("bant YALNIZ class_code değiştiğinde açılır", () => {
    const rows = buildChartRows([
      account({ code: "10", class_code: "1" }),
      account({ code: "100", class_code: "1" }),
      account({ code: "252", class_code: "2" }),
    ]);
    expect(rows.filter((r) => r.kind === "class")).toHaveLength(2);
    expect(rows.map((r) => r.kind)).toEqual(["class", "group", "account", "class", "account"]);
  });

  it("🔴 `level === 1` GRUP, `level >= 2` VERİ satırıdır (HP:71-73 vs HP:76)", () => {
    const rows = buildChartRows([
      account({ code: "10", level: 1 }),
      account({ code: "100", level: 2 }),
      account({ code: "100.01", level: 3 }),
    ]);
    const kinds = rows.filter((r) => r.kind !== "class").map((r) => r.kind);
    // HP:76'daki `100` (level 2) mockup'ta Tür/Bakiye/Durum taşıyan TAM bir
    // satırdır — grup satırına çevrilirse o üç sütun kaybolurdu.
    expect(kinds).toEqual(["group", "account", "account"]);
  });

  it("girinti adımı: level 2 → 2 adım (HP:76 = 32px), level 3 → 3 adım", () => {
    expect(indentSteps(1)).toBe(0);
    expect(indentSteps(2)).toBe(2);
    expect(indentSteps(3)).toBe(3);
    // Sunucu dördüncü düzey açmaz; yine de kırpılır (tanımsız CSS sınıfı yok).
    expect(indentSteps(9)).toBe(3);
  });

  it("sıralama İSTEMCİDE değiştirilmez — sunucunun sırası korunur", () => {
    const given = [
      account({ code: "300", class_code: "3" }),
      account({ code: "100", class_code: "1" }),
    ];
    const codes = buildChartRows(given)
      .filter((r) => r.kind !== "class")
      .map((r) => r.account.code);
    expect(codes).toEqual(["300", "100"]);
  });
});
