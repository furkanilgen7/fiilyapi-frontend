// @vitest-environment node
// `balance-sheet.test.ts` ile AYNI gerekçe: DOM'suz saf katman + dosya
// sistemini okuyan yapısal bekçi.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type {
  CashFlowStatementSection,
  MonthlyCashPoint,
} from "@/lib/api/hooks/useCashFlowStatement";

import {
  CHART_BASELINE,
  CHART_FILL_BOTTOM,
  CHART_LABEL_TRACK,
  CHART_TOP,
  CHART_WIDTH,
  absDecimalString,
  buildMonthlyCashGeometry,
  cashFlowDirection,
  cashFlowPeriodOptions,
  cashFlowPeriodValue,
  cashFlowRangeLabel,
  compareDecimalStrings,
  defaultCashFlowPeriod,
  formatSignedAmount,
  parseCashFlowPeriod,
  sectionKpiLabel,
} from "./cash-flow-statement";

function point(year: number, month: number, closing: string): MonthlyCashPoint {
  return { year, month, closing_cash: closing };
}

describe("NA:37 — dönem seçici BİRİKİMLİ aralıktır (bilançonun nokta-zamanı DEĞİL)", () => {
  it("Temmuz 2026'da mockup'ın İKİ seçeneğini birebir üretir", () => {
    // NA:37 `Ocak–Temmuz 2026` + `2025 Yılı`.
    const options = cashFlowPeriodOptions(new Date(2026, 6, 20, 9, 0, 0));
    expect(options.map((o) => o.label)).toEqual(["Ocak–Temmuz 2026", "2025 Yılı"]);
    expect(options.map((o) => o.value)).toEqual(["2026-07", "2025-12"]);
  });

  it("varsayılan dönem YEREL takvimden gelir ve listenin İLK seçeneğidir", () => {
    // 🔴 K10: sunucu "bugün"ü HİÇ okumaz — `year`/`month` kararı burada verilir.
    expect(defaultCashFlowPeriod(new Date(2026, 6, 20, 9, 0, 0))).toEqual({
      year: 2026,
      month: 7,
    });
    // Aralık ayında ay 12'dir; `toISOString()` tabanlı bir üretim TR saatinde
    // ayın son gününde bir sonraki aya kayardı (TB5 dersi).
    expect(defaultCashFlowPeriod(new Date(2026, 11, 31, 23, 30, 0))).toEqual({
      year: 2026,
      month: 12,
    });
  });

  it("OCAK'ta aralık TEK aydır — `Ocak–Ocak 2026` yazılmaz", () => {
    expect(cashFlowRangeLabel({ year: 2026, month: 1 })).toBe("Ocak 2026");
    expect(cashFlowRangeLabel({ year: 2026, month: 7 })).toBe("Ocak–Temmuz 2026");
  });

  it("🔴 aralık ayracı U+2013'tür (ASCII `-` DEĞİL) — mizanla AYNI glif", () => {
    const label = cashFlowRangeLabel({ year: 2026, month: 7 });
    expect(label).toContain("–");
    expect(label).not.toContain("-");
  });

  it("seçenek değeri dönem çiftine geri çözülür (gidiş-dönüş kayıpsız)", () => {
    const fallback = { year: 2026, month: 7 };
    expect(cashFlowPeriodValue({ year: 2025, month: 12 })).toBe("2025-12");
    expect(parseCashFlowPeriod("2025-12", fallback)).toEqual({ year: 2025, month: 12 });
    expect(parseCashFlowPeriod("2026-01", fallback)).toEqual({ year: 2026, month: 1 });
  });

  it("bozuk değer SESSİZCE `NaN` dönmez — geri düşüş dönemi kullanılır", () => {
    const fallback = { year: 2026, month: 7 };
    expect(parseCashFlowPeriod("", fallback)).toEqual(fallback);
    expect(parseCashFlowPeriod("abc", fallback)).toEqual(fallback);
    expect(parseCashFlowPeriod("2026-13", fallback)).toEqual(fallback);
    expect(parseCashFlowPeriod("2026-00", fallback)).toEqual(fallback);
  });
});

describe("NA:71-75 — İŞARETLİ tutar sunumu", () => {
  it("giriş `+` önekiyle, çıkış `-` önekiyle basılır (mockup'ın boşluklu biçimi)", () => {
    expect(formatSignedAmount("24994700.00")).toBe("+ 24.994.700"); // NA:71
    expect(formatSignedAmount("-12480000.00")).toBe("- 12.480.000"); // NA:72
  });

  it("SIFIR ne `+` ne `-` alır — sıfır bir yön DEĞİLDİR", () => {
    expect(cashFlowDirection("0.00")).toBe("zero");
    expect(cashFlowDirection("-0.000")).toBe("zero");
    expect(formatSignedAmount("0.00")).toBe("0");
  });

  it("yön STRING işaretinden türer, `Number()` gidiş-dönüşünden değil", () => {
    expect(cashFlowDirection("5842000.00")).toBe("in");
    expect(cashFlowDirection("-800000.00")).toBe("out");
    expect(cashFlowDirection("+1200.50")).toBe("in");
  });

  /**
   * 🔴 AYRIŞMA NOKTASI (para portu kanonu): yalnız iki uygulamanın aynı cevabı
   * verdiği aralıkta kalan bir değer testi mutasyonu GEÇİRİR.
   */
  it("🔴 2⁵³ ÜSTÜNDE mutlak değer kuruşu KORUR — `Number()` yolu burada kırılır", () => {
    const raw = "-9007199254740993.01";
    // Kanıt: `Number()` yolu kuruşu yutar ve tamsayıyı BİR YUKARI kaydırır.
    expect(String(Math.abs(Number(raw)))).toBe("9007199254740994");
    expect(absDecimalString(raw)).toBe("9007199254740993.01");
    expect(cashFlowDirection(raw)).toBe("out");
  });

  it("🔴 2⁵³ ÜSTÜNDE karşılaştırma da ayrışır — `Number()` ikisini EŞİT görür", () => {
    const a = "9007199254740993.00";
    const b = "9007199254740992.00";
    expect(Number(a) === Number(b)).toBe(true); // float çözünürlüğü bitti
    expect(compareDecimalStrings(a, b)).toBe(1);
    expect(compareDecimalStrings(b, a)).toBe(-1);
    expect(compareDecimalStrings(a, a)).toBe(0);
  });

  it("🔴 NEGATİF taraf da doğru sıralanır (nakit bakiyesi eksiye düşebilir)", () => {
    expect(compareDecimalStrings("-500000.00", "250000.00")).toBe(-1);
    expect(compareDecimalStrings("-500000.00", "-750000.00")).toBe(1);
    expect(formatSignedAmount("-500000.00")).toBe("- 500.000");
  });
});

describe("NA:45 — KPI kartı etiketi bölümün KENDİ alanlarından türer", () => {
  function section(code: string, title: string): CashFlowStatementSection {
    return { key: "op", code, title, subtotal_label: "x", subtotal: "0", lines: [] };
  }

  it("başlıktaki `A.` kod öneki DÜŞÜRÜLÜR — KPI kartında kod harfi yoktur", () => {
    // NA:45 kart etiketi kod harfi TAŞIMAZ; NA:69 tablo bandı TAŞIR. Kesim
    // bölümün KENDİ `code` alanıyla yapılır — metin İÇİNDE desen aranmaz.
    expect(sectionKpiLabel(section("A", "A. İŞLETME FAALİYETLERİNDEN NAKITLER"))).toBe(
      "İŞLETME FAALİYETLERİNDEN NAKITLER",
    );
    expect(sectionKpiLabel(section("C", "C. FİNANSMAN FAALİYETLERİNDEN NAKITLER"))).toBe(
      "FİNANSMAN FAALİYETLERİNDEN NAKITLER",
    );
  });

  it("önek yoksa başlık OLDUĞU GİBİ kalır — sunucu metni kırpılmaz", () => {
    expect(sectionKpiLabel(section("A", "İşletme Faaliyetleri"))).toBe("İşletme Faaliyetleri");
    expect(sectionKpiLabel(section("B", "BB. Bir Şey"))).toBe("BB. Bir Şey");
  });
});

describe("NA:119-140 — `Aylık Nakit Pozisyonu` SAF geometrisi", () => {
  const SERIES: readonly MonthlyCashPoint[] = [
    point(2026, 1, "2447500.00"),
    point(2026, 2, "2900000.00"),
    point(2026, 3, "3400000.00"),
    point(2026, 4, "4100000.00"),
    point(2026, 5, "4900000.00"),
    point(2026, 6, "5600000.00"),
    point(2026, 7, "6249500.00"),
  ];

  it("nokta sayısı seriyle birebirdir ve x ekseni TAM genişliğe yayılır", () => {
    const geometry = buildMonthlyCashGeometry(SERIES);
    expect(geometry.points).toHaveLength(7);
    expect(geometry.points[0]?.x).toBe(0);
    expect(geometry.points[6]?.x).toBe(CHART_WIDTH);
  });

  it("y ekseni serinin EN KÜÇÜĞÜ ile EN BÜYÜĞÜ arasında ölçeklenir", () => {
    const geometry = buildMonthlyCashGeometry(SERIES);
    expect(geometry.points[0]?.y).toBe(CHART_BASELINE); // en küçük ⇒ taban
    expect(geometry.points[6]?.y).toBe(CHART_TOP); // en büyük ⇒ tavan
  });

  it("🔴 HER koordinat TAM SAYIdır — kesirli geometri kareyi oynatır", () => {
    const geometry = buildMonthlyCashGeometry(SERIES);
    for (const { x, y } of geometry.points) {
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
    }
    for (const label of geometry.labels) {
      expect(Number.isInteger(label.x)).toBe(true);
    }
    expect(geometry.linePath).not.toMatch(/\.\d/);
    expect(geometry.areaPath).not.toMatch(/\.\d/);
  });

  it("çizgi yolu ilk noktadan başlar, son noktada biter", () => {
    const geometry = buildMonthlyCashGeometry(SERIES);
    expect(geometry.linePath.startsWith(`M0,${CHART_BASELINE}`)).toBe(true);
    expect(geometry.linePath.endsWith(`L${CHART_WIDTH},${CHART_TOP}`)).toBe(true);
  });

  it("dolgu yolu taban çizgisinde AÇILIR ve KAPANIR (NA:127)", () => {
    const geometry = buildMonthlyCashGeometry(SERIES);
    expect(geometry.areaPath.startsWith(`M0,${CHART_FILL_BOTTOM}`)).toBe(true);
    expect(geometry.areaPath.endsWith(`L${CHART_WIDTH},${CHART_FILL_BOTTOM}Z`)).toBe(true);
  });

  it("NA:139 uç nokta SON aydadır", () => {
    const geometry = buildMonthlyCashGeometry(SERIES);
    expect(geometry.endDot).toEqual({ x: CHART_WIDTH, y: CHART_TOP });
  });

  it("NA:131-137 ay etiketleri KISA Türkçe adlardır ve kendi rayına yayılır", () => {
    const geometry = buildMonthlyCashGeometry(SERIES);
    expect(geometry.labels.map((l) => l.text)).toEqual([
      "Oca",
      "Şub",
      "Mar",
      "Nis",
      "May",
      "Haz",
      "Tem",
    ]);
    // 🔴 Etiket rayı ÇİZGİ rayından DARdır: son etiket x=320'de basılsaydı
    // metin kadrajın DIŞINA taşardı (NA:137 son etiket x=262).
    expect(geometry.labels[0]?.x).toBe(0);
    expect(geometry.labels[6]?.x).toBe(CHART_LABEL_TRACK);
    expect(geometry.labels[0]?.key).toBe("2026-01");
  });

  it("🔴 2⁵³ ÜSTÜ bakiyelerde bile tavan/taban DOĞRU aya düşer", () => {
    // `Number()` ile min/max arayan bir uygulama bu iki değeri EŞİT görür ve
    // tavanı yanlış aya koyardı.
    const huge: readonly MonthlyCashPoint[] = [
      point(2026, 1, "9007199254740992.00"),
      point(2026, 2, "9007199254740993.00"),
    ];
    expect(Number("9007199254740992.00") === Number("9007199254740993.00")).toBe(true);
    const geometry = buildMonthlyCashGeometry(huge);
    expect(geometry.points[0]?.y).toBe(CHART_BASELINE);
    expect(geometry.points[1]?.y).toBe(CHART_TOP);
  });

  it("DÜZ seri (tüm aylar eşit) tabanda kalır — sıfıra bölme YOK", () => {
    const flat: readonly MonthlyCashPoint[] = [
      point(2026, 1, "100.00"),
      point(2026, 2, "100.00"),
    ];
    const geometry = buildMonthlyCashGeometry(flat);
    expect(geometry.points.map((p) => p.y)).toEqual([CHART_BASELINE, CHART_BASELINE]);
  });

  it("BOŞ seri çizim ÜRETMEZ — uydurma bir eğri basılmaz", () => {
    const geometry = buildMonthlyCashGeometry([]);
    expect(geometry.points).toEqual([]);
    expect(geometry.linePath).toBe("");
    expect(geometry.areaPath).toBe("");
    expect(geometry.endDot).toBeNull();
    expect(geometry.labels).toEqual([]);
  });

  it("TEK aylık seri de çökmeden basılır", () => {
    const geometry = buildMonthlyCashGeometry([point(2026, 1, "100.00")]);
    expect(geometry.points).toEqual([{ x: 0, y: CHART_BASELINE }]);
    expect(geometry.endDot).toEqual({ x: 0, y: CHART_BASELINE });
    expect(geometry.labels.map((l) => l.text)).toEqual(["Oca"]);
  });
});

describe("🔴 YAPISAL BEKÇİ — para yardımcıları float'a düşmez", () => {
  const source = readFileSync(
    fileURLToPath(new URL("./cash-flow-statement.ts", import.meta.url)),
    "utf8",
  );

  /**
   * Adı verilen `export function`ın GÖVDESİNİ kaynaktan keser (bir sonraki
   * üst düzey bildirime kadar) ve yorumları soyar.
   *
   * 🔴 Bekçi DAR olmalıdır: grafik geometrisi `Math.round`a MEŞRU olarak
   * muhtaçtır (kesirli koordinat CI karesini oynatır) — modülün tamamına
   * `Math.` yasağı koymak o kanonla ÇELİŞİRDİ. Yasak yalnız PARA
   * yardımcılarını bağlar.
   */
  function bodyOf(name: string): string {
    const start = source.indexOf(`export function ${name}`);
    expect(start, `\`${name}\` kaynakta bulunamadı`).toBeGreaterThan(-1);
    const rest = source.slice(start + 1);
    const endOffset = rest.search(/\n(?:export |function |\/\*\*)/);
    const body = endOffset === -1 ? rest : rest.slice(0, endOffset);
    return body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  }

  const MONEY_HELPERS = [
    "absDecimalString",
    "cashFlowDirection",
    "formatSignedAmount",
    "compareDecimalStrings",
  ];

  it("hiçbir para yardımcısı `Number(` ya da `Math.` kullanmaz", () => {
    // Boş küme üzerinde dönen bir `for` HİÇBİR ŞEY kanıtlamaz.
    expect(MONEY_HELPERS).toHaveLength(4);
    for (const name of MONEY_HELPERS) {
      const body = bodyOf(name);
      expect(body.length, `\`${name}\` gövdesi boş kesildi`).toBeGreaterThan(20);
      expect(body, `\`${name}\` \`Number(\` kullanıyor`).not.toMatch(/\bNumber\(/);
      expect(body, `\`${name}\` \`Math.\` kullanıyor`).not.toMatch(/\bMath\./);
    }
  });

  it("karşılaştırma kayıpsız `subtractDecimalStrings` üzerinden yapılır", () => {
    expect(bodyOf("compareDecimalStrings")).toContain("subtractDecimalStrings");
  });
});
