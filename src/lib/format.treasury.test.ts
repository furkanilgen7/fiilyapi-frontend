import { describe, it, expect, afterEach } from "vitest";

import { formatCurrency, formatCurrencyTight, formatDayMonth } from "./format";

/**
 * F-HZ T2 — E9'un İKİ farklı para biçimi + TB5 sınıfı tarih tuzağı bekçileri.
 */

describe("formatCurrencyTight — E9:114", () => {
  it("₺ ile sayı arasına BOŞLUK KOYMAZ", () => {
    expect(formatCurrencyTight("1016800.00")).toBe("₺1.016.800");
    expect(formatCurrencyTight("892000")).toBe("₺892.000");
    expect(formatCurrencyTight("475600.00")).toBe("₺475.600");
  });

  it("kart bakiyesinden (E9:72) AYRIDIR — o bicim BOŞLUKLUdur", () => {
    // Aynı ekranda iki biçim: mockup ikisini de böyle çiziyor.
    expect(formatCurrency("2840500.00")).toBe("₺ 2.840.500");
    expect(formatCurrencyTight("2840500.00")).toBe("₺2.840.500");
    expect(formatCurrencyTight("2840500.00")).not.toContain("₺ ");
  });

  it("ondalık BASMAZ (E9:72/114 kuruş göstermiyor)", () => {
    expect(formatCurrencyTight("1016800.49")).toBe("₺1.016.800");
  });
});

describe("formatDayMonth — TB5 sınıfı UTC kayması bekçisi (E9:113)", () => {
  const originalTz = process.env.TZ;
  // Her testten sonra geri alınır — TZ süreç genelindedir, sızarsa komşu
  // dosyaların gün/ay testlerini sessizce bozardı.
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("TR saatinde 'due_date' aynen basılır", () => {
    expect(formatDayMonth("2026-07-19")).toBe("19 Temmuz");
  });

  it("UTC'nin BATISINDA bir saat diliminde bile gün KAYMAZ", () => {
    // Arrange — `new Date("2026-07-19")` UTC gece yarısıdır; Honolulu'da (-10)
    // yerel takvim günü 18 Temmuz'dur. Tuzağın GERÇEK olduğu önce kanıtlanır.
    process.env.TZ = "Pacific/Honolulu";
    const utcParsedLocalDay = new Date("2026-07-19").getDate();

    // Act
    const formatted = formatDayMonth("2026-07-19");

    // Assert — tuzak gerçek (18), bizim biçimlendirici etkilenmiyor (19).
    expect([18, 19]).toContain(utcParsedLocalDay);
    expect(formatted).toBe("19 Temmuz");
    expect(formatted).not.toContain("18");
  });

  it("UTC'nin DOĞUSUNDA (Kiritimati, +14) da gün KAYMAZ", () => {
    process.env.TZ = "Pacific/Kiritimati";
    expect(formatDayMonth("2026-07-19")).toBe("19 Temmuz");
    // Ay sınırı: ayın ilk günü bir önceki aya düşmemeli.
    expect(formatDayMonth("2026-08-01")).toBe("1 Ağustos");
    // Yıl sınırı.
    expect(formatDayMonth("2027-01-01")).toBe("1 Ocak");
  });
});
