import { describe, expect, it } from "vitest";

import {
  barGeometry,
  pointPct,
  timelineColumns,
  timelineWindow,
  timelineWindowLabel,
  type DateRange,
} from "./timeline-scale";

/**
 * F-TKV T2 — zaman ızgarasının SAF aritmetiği.
 *
 * 🔴 KANON (görev emri, MK-1 K15'in kardeşi): bar geometrisi TARİHTEN
 * hesaplanır, mockup'ın yüzde sabitlerinden KOPYALANMAZ. Mockup'ın yedi bar
 * konumu kendi HTML yorumuyla çelişiyor; buradaki beklenen değerler tek tek
 * takvimden türetilmiştir.
 */

function ranges(...items: DateRange[]): DateRange[] {
  return items;
}

describe("timelineWindow — pencere VERİDEN türer (K8)", () => {
  it("boş portföyde pencere yoktur", () => {
    expect(timelineWindow([])).toBeNull();
  });

  it("tarihi olmayan kayıtlar pencereyi kurmaz", () => {
    expect(timelineWindow(ranges({ start: null, end: null }))).toBeNull();
  });

  it("min başlangıç AY BAŞINA, max bitiş AY SONUNA yuvarlanır", () => {
    const win = timelineWindow(
      ranges(
        { start: "2025-03-14", end: "2026-11-02" },
        { start: "2025-06-01", end: "2026-02-28" },
      ),
    );
    expect(win).toEqual({
      startIso: "2025-03-01",
      endIso: "2026-11-30",
      startYear: 2025,
      startMonth: 3,
      monthCount: 21,
    });
  });

  it("YALNIZ bir ucu dolu olan aralık da pencereyi genişletir", () => {
    // Bar çizilmese bile (barGeometry null döner) satırın tarihi pencereyi
    // etkiler — aksi hâlde ekranda görünmeyen bir tarih ızgaranın dışında kalırdı.
    const win = timelineWindow(ranges({ start: "2024-05-10", end: null }, { start: null, end: "2025-01-20" }));
    expect(win?.startIso).toBe("2024-05-01");
    expect(win?.endIso).toBe("2025-01-31");
    expect(win?.monthCount).toBe(9);
  });

  it("takvimde OLMAYAN tarih (2026-02-30) reddedilir — pencereyi kirletmez", () => {
    const win = timelineWindow(ranges({ start: "2026-02-30", end: "2026-06-15" }, { start: "2026-04-01", end: "2026-05-01" }));
    expect(win?.startIso).toBe("2026-04-01");
    expect(win?.endIso).toBe("2026-06-30");
  });

  it("biçimi bozuk tarih reddedilir", () => {
    expect(timelineWindow(ranges({ start: "01.03.2025", end: "yok" }))).toBeNull();
  });

  it("tek günlük veri tek aylık pencere üretir", () => {
    const win = timelineWindow(ranges({ start: "2026-07-17", end: "2026-07-17" }));
    expect(win).toEqual({
      startIso: "2026-07-01",
      endIso: "2026-07-31",
      startYear: 2026,
      startMonth: 7,
      monthCount: 1,
    });
  });
});

describe("timelineWindowLabel", () => {
  it("araç çubuğu başlığı pencereden türer (mockup 44 BİÇİMİ, değeri veriden)", () => {
    const win = timelineWindow(ranges({ start: "2025-01-01", end: "2026-12-31" }));
    expect(timelineWindowLabel(win!)).toBe("Oca 2025 – Ara 2026");
  });
});

describe("timelineColumns", () => {
  const win = timelineWindow(ranges({ start: "2025-11-05", end: "2027-02-10" }))!;

  it("aylık kipte her ay bir sütundur ve genişlikler eşittir", () => {
    const cols = timelineColumns(win, "monthly");
    expect(cols).toHaveLength(16); // Kas 25 → Şub 27
    expect(cols[0]).toEqual({
      key: "2025-11",
      label: "Kas",
      year: 2025,
      month: 11,
      widthPct: 100 / 16,
      isYearEnd: false,
    });
    expect(cols[1]?.label).toBe("Ara");
    expect(cols[1]?.isYearEnd).toBe(true); // Aralık — mockup 134 kalın ayraç
    expect(cols[2]).toMatchObject({ key: "2026-01", label: "Oca", year: 2026, month: 1 });
    expect(cols.at(-1)).toMatchObject({ key: "2027-02", label: "Şub", isYearEnd: false });
    const total = cols.reduce((sum, col) => sum + col.widthPct, 0);
    expect(total).toBeCloseTo(100, 10);
  });

  it("yıllık kipte sütun YIL'dır ve genişliği o yılın PENCEREDEKİ ay sayısıyla orantılıdır", () => {
    const cols = timelineColumns(win, "yearly");
    expect(cols.map((col) => col.key)).toEqual(["2025", "2026", "2027"]);
    expect(cols.map((col) => col.label)).toEqual(["2025", "2026", "2027"]);
    expect(cols.map((col) => col.month)).toEqual([null, null, null]);
    // 2025 → Kas+Ara = 2 ay · 2026 → 12 ay · 2027 → Oca+Şub = 2 ay
    expect(cols[0]?.widthPct).toBeCloseTo((2 / 16) * 100, 10);
    expect(cols[1]?.widthPct).toBeCloseTo((12 / 16) * 100, 10);
    expect(cols[2]?.widthPct).toBeCloseTo((2 / 16) * 100, 10);
    expect(cols.reduce((sum, col) => sum + col.widthPct, 0)).toBeCloseTo(100, 10);
  });

  it("iki kip AYNI eksen üzerinde durur — sütun sayısı farklı, toplam genişlik aynı", () => {
    expect(timelineColumns(win, "monthly")).toHaveLength(16);
    expect(timelineColumns(win, "yearly")).toHaveLength(3);
  });
});

describe("barGeometry — geometri TARİHTEN hesaplanır", () => {
  // 24 aylık pencere: Oca 2025 – Ara 2026 (mockup 44 ile aynı pencere,
  // ama değerler mockup'ın yüzde sabitlerinden KOPYALANMAZ).
  const win = timelineWindow(ranges({ start: "2025-01-01", end: "2026-12-31" }))!;

  it("pencerenin tamamını kaplayan aralık %0 → %100", () => {
    expect(barGeometry(win, "2025-01-01", "2026-12-31")).toEqual({
      leftPct: 0,
      widthPct: 100,
      clippedStart: false,
      clippedEnd: false,
    });
  });

  it("ay sınırlarına oturan aralık ay endeksinden hesaplanır", () => {
    // Oca 2025 → Tem 2025 dahil = 7 ay / 24 ay
    const bar = barGeometry(win, "2025-01-01", "2025-07-31");
    expect(bar?.leftPct).toBeCloseTo(0, 10);
    expect(bar?.widthPct).toBeCloseTo((7 / 24) * 100, 10);
  });

  it("ay ORTASINDA başlayan aralık gün oranıyla kayar", () => {
    // 16 Ocak 2025 → ay endeksi 0 + 15/31
    const bar = barGeometry(win, "2025-01-16", "2025-01-31");
    expect(bar?.leftPct).toBeCloseTo(((0 + 15 / 31) / 24) * 100, 10);
    expect(bar?.widthPct).toBeCloseTo(((16 / 31) / 24) * 100, 10);
  });

  it("tek günlük aralık SIFIR genişlikte DEĞİLDİR", () => {
    const bar = barGeometry(win, "2025-01-01", "2025-01-01");
    expect(bar?.widthPct).toBeCloseTo(((1 / 31) / 24) * 100, 10);
  });

  it("tarihlerden biri yoksa BAR YOKTUR (satır yine de kalır — çağıranın işi)", () => {
    expect(barGeometry(win, null, "2025-06-01")).toBeNull();
    expect(barGeometry(win, "2025-06-01", null)).toBeNull();
    expect(barGeometry(win, null, null)).toBeNull();
  });

  it("geçersiz tarih bar üretmez", () => {
    expect(barGeometry(win, "2025-02-30", "2025-06-01")).toBeNull();
    expect(barGeometry(win, "2025-06-01", "01.07.2025")).toBeNull();
  });

  it("bitiş başlangıçtan ÖNCEYSE bar üretilmez", () => {
    expect(barGeometry(win, "2025-06-01", "2025-05-31")).toBeNull();
  });

  it("pencere dışına taşan aralık KIRPILIR ve İŞARETLENİR (K8) — sessizce yutulmaz", () => {
    const bar = barGeometry(win, "2024-06-01", "2027-06-30");
    expect(bar).toEqual({ leftPct: 0, widthPct: 100, clippedStart: true, clippedEnd: true });
  });

  it("yalnız sağdan taşan aralıkta yalnız sağ bayrak kalkar", () => {
    const bar = barGeometry(win, "2026-12-01", "2027-03-31");
    expect(bar?.clippedStart).toBe(false);
    expect(bar?.clippedEnd).toBe(true);
    expect(bar?.leftPct).toBeCloseTo((23 / 24) * 100, 10);
    expect(bar?.widthPct).toBeCloseTo((1 / 24) * 100, 10);
  });

  it("pencereyle HİÇ kesişmeyen aralık bar üretmez", () => {
    expect(barGeometry(win, "2023-01-01", "2024-12-31")).toBeNull();
    expect(barGeometry(win, "2027-01-01", "2027-12-31")).toBeNull();
  });
});

describe("pointPct — milestone elması ve bugün çizgisi", () => {
  const win = timelineWindow(ranges({ start: "2025-01-01", end: "2026-12-31" }))!;

  it("günün BAŞLANGICINDAN hesaplanır", () => {
    // 17 Temmuz 2026 → ay endeksi 18 + 16/31
    expect(pointPct(win, "2026-07-17")).toBeCloseTo(((18 + 16 / 31) / 24) * 100, 10);
  });

  it("pencerenin ilk günü %0'dır", () => {
    expect(pointPct(win, "2025-01-01")).toBe(0);
  });

  it("pencere DIŞINDAKİ gün çizilmez", () => {
    expect(pointPct(win, "2024-12-31")).toBeNull();
    expect(pointPct(win, "2027-01-01")).toBeNull();
  });

  it("geçersiz gün çizilmez", () => {
    expect(pointPct(win, "2026-13-01")).toBeNull();
    expect(pointPct(win, "")).toBeNull();
  });
});
