import { describe, expect, it } from "vitest";

import { computeAmountPreview, type AmountPreview } from "./invoice-amount-preview";
import type { InvoiceLineDraft } from "./invoice-line-math";

/**
 * 🔴 PARA YÜZEYİ BEKÇİSİ — FK:246-250 önizlemesi.
 *
 * Bu dosyadaki girdi/çıktı çiftlerinin TAMAMI backend'in kendi testinden
 * (`backend/tests/modules/invoicing/test_amounts.py`) alınmıştır; her testin
 * başında kaynak satır numarası yazılıdır. Uydurulmuş tek bir beklenti yoktur.
 *
 * NEDEN BU KADAR SIKI: istemci sunucudan farklı hesaplarsa kullanıcı YANLIŞ
 * RAKAMA bakarak faturayı onaylar. "Test var" ≠ "test bekçilik ediyor"; bu
 * dosya iki mutasyonla ölçüldü (adım sırası bozulunca ve `ROUND_HALF_UP`
 * `Math.round`a çevrilince KIRMIZI).
 */

function line(quantity: string, unitPrice: string, vatRate: string): InvoiceLineDraft {
  return { key: `l${quantity}-${unitPrice}-${vatRate}`, description: "k", unit: "", quantity, unitPrice, vatRate };
}

function ok(
  lines: readonly InvoiceLineDraft[],
  rates: { advance?: string; retention?: string; withholding?: string } = {},
): AmountPreview {
  const result = computeAmountPreview({
    lines,
    advanceRate: rates.advance ?? null,
    retentionRate: rates.retention ?? null,
    withholdingRate: rates.withholding ?? null,
  });
  if (!result.ok) throw new Error(`önizleme hesaplanamadı: ${result.reason}`);
  return result.preview;
}

function sumStrings(values: readonly string[]): string {
  const total = values.reduce((sum, value) => sum + BigInt(value.replace(".", "")), 0n);
  const negative = total < 0n;
  const digits = (negative ? -total : total).toString().padStart(3, "0");
  return `${negative ? "-" : ""}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

// --------------------------------------------------------------------------- //
// Mockup sadakati — FK:177-212 kalem tablosu → FK:246 "Mal/Hizmet Toplamı"
// --------------------------------------------------------------------------- //

describe("FK mockup rakamları", () => {
  const mockupLines = [
    line("1320", "2113", "20"), // FK:180-183 → 2.789.160
    line("300", "2398", "20"), // FK:189-192 →   719.400
    line("61.2", "21500", "20"), // FK:198-201 → 1.315.800
    line("2880", "211", "20"), // FK:207-210 →   607.680
  ];

  it("dört satırın toplamı FK:246'daki 5.432.040'tır", () => {
    const preview = ok(mockupLines);
    expect(preview.lineTotals).toEqual(["2789160.00", "719400.00", "1315800.00", "607680.00"]);
    expect(preview.subtotal).toBe("5432040.00");
  });

  it("🔴 K15 — mockup'ın KENDİ rakamları tutarsızdır; kazanan YAPIDIR, rakam değil", () => {
    // FK:247 "Kesintiler – 1.230.150" (= 984.120 + 246.030, FK:225 + FK:231)
    // ile FK:248 "Vergi Matrahı 4.920.600" AYNI faturadan çıkamaz:
    // 5.432.040 − 1.230.150 = 4.201.890. Bu yüzden tfoot rakamları DEĞİL,
    // backend formülü uygulanır (WORKFLOW §3 · K15).
    const preview = ok(mockupLines, { advance: "20", retention: "5" });
    expect(preview.advanceAmount).toBe("1086408.00"); // FK:225 "984.120" DEĞİL
    expect(preview.deductionTotal).toBe("1358010.00"); // FK:247 "1.230.150" DEĞİL
    expect(preview.taxBase).toBe("4074030.00"); // FK:248 "4.920.600" DEĞİL
    expect(preview.taxBase).toBe(
      sumStrings([preview.subtotal, `-${preview.advanceAmount}`, `-${preview.retentionAmount}`]),
    );
  });

  it("çözülemeyen satır SESSİZCE 0 sayılmaz, SAYILIR", () => {
    const result = computeAmountPreview({
      lines: [...mockupLines, line("", "", "20")],
      advanceRate: null,
      retentionRate: null,
      withholdingRate: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.subtotal).toBe("5432040.00");
    expect(result.unknownCount).toBe(1);
  });
});

// --------------------------------------------------------------------------- //
// §5 — yedi adım, sırayla (test_amounts.py:40-114)
// --------------------------------------------------------------------------- //

describe("yedi adım", () => {
  it("mockup sırasıyla koşar (test_amounts.py:40-55)", () => {
    const preview = ok([line("10", "1000.00", "20"), line("2", "2500.00", "20")], {
      advance: "20",
      retention: "5",
      withholding: "20",
    });
    expect(preview.subtotal).toBe("15000.00");
    expect(preview.advanceAmount).toBe("3000.00");
    expect(preview.retentionAmount).toBe("750.00");
    expect(preview.deductionTotal).toBe("3750.00");
    expect(preview.taxBase).toBe("11250.00");
    expect(preview.vatAmount).toBe("2250.00");
    expect(preview.withholdingAmount).toBe("450.00");
    expect(preview.total).toBe("13050.00");
  });

  it("kesinti matrahı subtotal'dir, tax_base değil (test_amounts.py:58-67)", () => {
    // Zincirleme uygulansaydı (önce avans, KALANDAN teminat) teminat 750 değil
    // 600 çıkardı.
    const preview = ok([line("1", "15000.00", "20")], { advance: "20", retention: "5" });
    expect(preview.retentionAmount).toBe("750.00");
    expect(preview.advanceAmount).toBe("3000.00");
  });

  it("KDV matrahı tax_base'dir, subtotal değil (test_amounts.py:70-78)", () => {
    // Kesinti öncesinden hesaplansaydı KDV 3.000,00 çıkardı.
    const preview = ok([line("1", "15000.00", "20")], { advance: "20", retention: "5" });
    expect(preview.vatAmount).toBe("2250.00");
  });

  it("tevkifat KDV üzerinden hesaplanır ve toplamdan DÜŞÜLÜR (test_amounts.py:81-87)", () => {
    const preview = ok([line("1", "1000.00", "20")], { withholding: "20" });
    expect(preview.vatAmount).toBe("200.00");
    expect(preview.withholdingAmount).toBe("40.00"); // matrah ya da toplam olsaydı 200 / 240
    expect(preview.total).toBe("1160.00");
  });

  it("toplam yedi adımın eşitliğini korur (test_amounts.py:90-98)", () => {
    const preview = ok([line("3", "133.33", "20"), line("7", "19.99", "10")], {
      advance: "12.50",
      retention: "3.75",
      withholding: "40",
    });
    expect(preview.total).toBe(
      sumStrings([preview.taxBase, preview.vatAmount, `-${preview.withholdingAmount}`]),
    );
    expect(preview.taxBase).toBe(
      sumStrings([preview.subtotal, `-${preview.advanceAmount}`, `-${preview.retentionAmount}`]),
    );
  });

  it("işaretlenmemiş kesinti ile %0 aynı tutarı verir (test_amounts.py:101-113)", () => {
    const lines = [line("1", "100.00", "20")];
    expect(ok(lines)).toEqual(ok(lines, { advance: "0", retention: "0", withholding: "0" }));
    expect(ok(lines).advanceAmount).toBe("0.00");
  });
});

// --------------------------------------------------------------------------- //
// K3 — çok oranlı KDV (test_amounts.py:121-178)
// --------------------------------------------------------------------------- //

describe("K3 — KDV oran grupları", () => {
  it("tek oranlı fatura başlık formülüyle birebir (test_amounts.py:121-134)", () => {
    // Satır bazlı yuvarlama 3 × round(0,015) = 0,06 verirdi; başlık formülü
    // round(0,045) = 0,05 verir. Bu testin TEK amacı o farkı yakalamaktır.
    const preview = ok([line("1", "0.10", "15"), line("1", "0.10", "15"), line("1", "0.10", "15")]);
    expect(preview.subtotal).toBe("0.30");
    expect(preview.taxBase).toBe("0.30");
    expect(preview.vatAmount).toBe("0.05");
  });

  it("kesintili tek oranlı fatura da başlık formülüyle birebir (test_amounts.py:137-142)", () => {
    const preview = ok(
      [line("1", "33.33", "20"), line("1", "33.33", "20"), line("1", "33.34", "20")],
      { advance: "10", retention: "5" },
    );
    expect(preview.subtotal).toBe("100.00");
    expect(preview.taxBase).toBe("85.00");
    expect(preview.vatAmount).toBe("17.00"); // round(85,00 × %20)
  });

  it("iki oranlı faturada satır dağıtımı kuruşuna kadar toplanır (test_amounts.py:145-160)", () => {
    const preview = ok(
      [line("1", "33.33", "20"), line("1", "33.33", "20"), line("1", "33.34", "10")],
      { advance: "10", retention: "5" },
    );
    expect(sumStrings(preview.lineTotals)).toBe(preview.subtotal);
    expect(sumStrings(preview.lineTaxBases)).toBe(preview.taxBase);
    expect(sumStrings(preview.lineVatAmounts)).toBe(preview.vatAmount);
    // Karma oranda sonuç TEK oranın formülüyle aynı OLAMAZ.
    expect(preview.vatAmount).not.toBe("17.00");
    expect(preview.vatAmount).toBe("14.16"); // %20 grubu 11,33 + %10 grubu 2,83
    expect(preview.lineVatAmounts).toEqual(["5.67", "5.66", "2.83"]);
    expect(preview.vatRates).toEqual(["20", "10"]);
  });

  it("artık En Büyük Kalan'a gider ve belirlenimcidir (test_amounts.py:163-172)", () => {
    const preview = ok(
      [line("1", "33.33", "20"), line("1", "33.33", "20"), line("1", "33.34", "20")],
      { advance: "10", retention: "5" },
    );
    // 85,00 üç satıra: 28,3305 / 28,3305 / 28,339 → tabanlar 28,33 ×3, artık
    // 0,01 en büyük kesire (ÜÇÜNCÜ satır) gider. "Son satıra at" da aynı sonucu
    // verirdi; ayırt edici olan bir sonraki testtir.
    expect(preview.lineTaxBases).toEqual(["28.33", "28.33", "28.34"]);
    expect(sumStrings(preview.lineTaxBases)).toBe("85.00");
  });

  it("eşit kesirli kalanda artık İLK satıra gider (son satıra DEĞİL)", () => {
    // 0,03'ün eşit iki paya bölünmesi: idealler 0,015 / 0,015 → tabanlar 0,01
    // ×2, artık 0,01. Kalanlar EŞİT olduğu için kural "küçük indeks kazanır"
    // devreye girer; "son satıra at" ["0.01","0.02"] verirdi.
    const preview = ok([line("1", "0.05", "30"), line("1", "0.05", "30")]);
    expect(preview.vatAmount).toBe("0.03");
    expect(preview.lineVatAmounts).toEqual(["0.02", "0.01"]);
  });

  it("satır KDV payları oranlarına göre ayrışır (test_amounts.py:175-178)", () => {
    const preview = ok([line("1", "100.00", "20"), line("1", "100.00", "1")]);
    expect(preview.vatAmount).toBe("21.00");
    expect(preview.lineVatAmounts).toEqual(["20.00", "1.00"]);
  });

  it("20 ile 20.0 AYNI orandır (Decimal eşitliği, amounts.py:222)", () => {
    const preview = ok([line("1", "0.10", "15"), line("1", "0.10", "15.00"), line("1", "0.10", "15.0")]);
    expect(preview.vatRates).toEqual(["15"]); // üç satır TEK grup
    expect(preview.vatAmount).toBe("0.05"); // ayrı gruplar olsaydı 3 × 0,02 = 0,06
  });
});

// --------------------------------------------------------------------------- //
// Sıfır / sınır (test_amounts.py:186-217)
// --------------------------------------------------------------------------- //

describe("sıfır ve sınır", () => {
  it("kalemsiz fatura sıfır üretir ve sıfıra bölmez (test_amounts.py:186-192)", () => {
    const preview = ok([]);
    expect(preview.subtotal).toBe("0.00");
    expect(preview.taxBase).toBe("0.00");
    expect(preview.vatAmount).toBe("0.00");
    expect(preview.total).toBe("0.00");
    expect(preview.lineTotals).toEqual([]);
  });

  it("bedelsiz kalemlerde subtotal 0, KDV 0 (test_amounts.py:195-206)", () => {
    const preview = ok([line("5", "0.00", "20"), line("3", "0.00", "10")], {
      advance: "20",
      withholding: "20",
    });
    expect(preview.subtotal).toBe("0.00");
    expect(preview.vatAmount).toBe("0.00");
    expect(preview.lineVatAmounts).toEqual(["0.00", "0.00"]);
    expect(preview.total).toBe("0.00");
  });

  it("tam kesinti matrahı sıfırlar, KDV de sıfırdır (test_amounts.py:209-217)", () => {
    const preview = ok([line("1", "1000.00", "20")], { advance: "60", retention: "40" });
    expect(preview.taxBase).toBe("0.00");
    expect(preview.vatAmount).toBe("0.00");
    expect(preview.total).toBe("0.00");
  });
});

// --------------------------------------------------------------------------- //
// K5 — yuvarlama (test_amounts.py:225-250)
// --------------------------------------------------------------------------- //

describe("K5 — ROUND_HALF_UP", () => {
  it("satır tutarı iki haneye HALF_UP yuvarlanır (test_amounts.py:225-230)", () => {
    // ROUND_DOWN olsaydı 0,015 → 0,01; HALF_EVEN olsaydı 0,015 → 0,02 ama
    // 0,025 → 0,02 (aşağıdaki ikinci iddia onu yakalar).
    expect(ok([line("1.5", "0.01", "20")]).subtotal).toBe("0.02");
    expect(ok([line("2.5", "0.01", "20")]).subtotal).toBe("0.03");
  });

  it("kesinti tutarı HALF_UP yuvarlanır (test_amounts.py:233-237)", () => {
    // 0,10 × %25 = 0,025 → HALF_UP 0,03. `Math.round`/HALF_EVEN 0,02 verirdi.
    expect(ok([line("1", "0.10", "20")], { advance: "25" }).advanceAmount).toBe("0.03");
  });

  it("tevkifat HALF_UP yuvarlanır (test_amounts.py:240-243)", () => {
    const preview = ok([line("1", "0.50", "10")], { withholding: "50" });
    expect(preview.vatAmount).toBe("0.05");
    expect(preview.withholdingAmount).toBe("0.03"); // 0,025 → HALF_UP
  });

  it("tüm çıktılar iki ondalık haneli metindir (test_amounts.py:254-274)", () => {
    const preview = ok([line("3.333", "7.77", "18"), line("1.001", "0.03", "8")], {
      advance: "7.5",
      retention: "2.5",
      withholding: "30",
    });
    const values = [
      preview.subtotal,
      preview.advanceAmount,
      preview.retentionAmount,
      preview.deductionTotal,
      preview.taxBase,
      preview.vatAmount,
      preview.withholdingAmount,
      preview.total,
      ...preview.lineTotals,
      ...preview.lineTaxBases,
      ...preview.lineVatAmounts,
    ];
    for (const value of values) expect(value).toMatch(/^-?\d+\.\d{2}$/);
  });

  it("büyük tutarlarda kayan nokta kalıntısı YOKTUR", () => {
    // `Number(0.1) * 3 = 0.30000000000000004`; kuruş tamsayısı bunu üretemez.
    expect(ok([line("3", "0.1", "20")]).subtotal).toBe("0.30");
    // 2^53 kuruşun ötesi: `Number` burada sessizce yuvarlardı.
    expect(ok([line("1", "99999999999999.99", "20")]).subtotal).toBe("99999999999999.99");
  });

  it("kayan noktalı bölme ile TAM bölme AYRIŞIR — ayrışma noktası kilitli", () => {
    // 🔴 Bu fixture aranarak bulundu: `Math.round(Number(n) / Number(d))`
    // burada 123.456.837.754,32 verir, tam bölme 123.456.837.754,31 verir
    // (çarpım 2^53'ü aştığı için `Number` çarpımın kendisini yuvarlıyor).
    // Değer tabanlı kanıt; yapısal kanıt `kayan nokta YOK` bekçisindedir.
    expect(ok([line("1234568.501", "99999.99", "20")]).subtotal).toBe("123456837754.31");
  });
});

// --------------------------------------------------------------------------- //
// K5 — kayan nokta yasağı (backend `test_amounts_modulunde_kayan_nokta_YOK`
// karşılığı). Değer testleri her ayrışmayı yakalayamaz: `Math.round` küçük
// tutarlarda HALF_UP ile AYNI sonucu verir. Yasak bu yüzden YAPISALDIR.
// --------------------------------------------------------------------------- //

describe("kayan nokta yasağı", () => {
  it("modülde float değişmezi, `Math.*` ve `Number()` aritmetiği YOKTUR", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    // `import.meta.url` jsdom ortamında `http://` şemasındadır; kaynak dosya
    // vitest kökünden çözülür.
    const source = readFileSync(
      join(process.cwd(), "src/components/invoices/invoice-amount-preview.ts"),
      "utf-8",
    );
    // Yorumlar soyulur (bu dosyanın yorumları `Math.round`dan SÖZ EDER).
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

    expect(code).not.toMatch(/\bMath\./);
    // Ondalık değişmez: `1.5` gibi. `10n ** 2n` ya da `2n` bigint'tir, geçer.
    expect(code).not.toMatch(/\b\d+\.\d+\b/);
    // `Number(...)` YALNIZ bigint'i dizi uzunluğuna/indeksine çevirmek için
    // geçerlidir; aritmetiğe girmesi yasak.
    const numberCalls = code.match(/Number\([^)]*\)/g) ?? [];
    expect(numberCalls).toEqual(["Number(remainder)"]);
  });
});

// --------------------------------------------------------------------------- //
// Eksik / geçersiz girdi — önizleme UYDURMAZ
// --------------------------------------------------------------------------- //

describe("eksik ve geçersiz girdi", () => {
  it("çözülemeyen satır 0 sayılmaz, SAYILIR", () => {
    const result = computeAmountPreview({
      lines: [line("1", "100.00", "20"), line("", "", "20")],
      advanceRate: null,
      retentionRate: null,
      withholdingRate: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.unknownCount).toBe(1);
    expect(result.preview.subtotal).toBe("100.00");
  });

  it("okunamayan oran önizlemeyi kapatır (uydurma sayı basılmaz)", () => {
    const result = computeAmountPreview({
      lines: [line("1", "100.00", "20")],
      advanceRate: "abc",
      retentionRate: null,
      withholdingRate: null,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("Avans");
  });

  it("kesintiler toplamı aşarsa önizleme gerekçeyle kapanır (backend 422)", () => {
    const result = computeAmountPreview({
      lines: [line("1", "1000.00", "20")],
      advanceRate: "70",
      retentionRate: "40",
      withholdingRate: null,
    });
    expect(result.ok).toBe(false);
  });
});
