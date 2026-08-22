// @vitest-environment node
//
// Saf TS katmani + metin-taramali bekci: DOM gerekmez ve `import.meta.url`
// jsdom altinda dosya URL'si OLMADIGI icin `readFileSync` calismaz.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  RENTAL_DISTRIBUTION_UNKNOWN_SUFFIX,
  RENTAL_PAYABLE_UNAVAILABLE,
  RENTAL_UNKNOWN_WARNING_SUFFIX,
  rentalDistributionUnknownWarning,
  rentalEquipmentSubtitle,
  rentalHoursVarianceTotal,
  rentalPayableUnavailable,
  rentalRowCells,
  rentalSiteLabel,
  rentalUnknownWarning,
  rentalVarianceLabel,
} from "./rental-derive";
import { RENTAL_COLUMNS, RENTAL_EMPTY_CELL, RENTAL_OWNED_RATE_LABEL } from "./rental-labels";
import type {
  RentalInvoiceLineResponse,
  RentalInvoiceTotals,
  RentalSiteDistributionEntry,
} from "@/lib/api/hooks/useEquipmentRentalInvoices";

const deriveSourcePath = fileURLToPath(new URL("./rental-derive.ts", import.meta.url));
const deriveSource = readFileSync(deriveSourcePath, "utf8");

function line(overrides: Partial<RentalInvoiceLineResponse> = {}): RentalInvoiceLineResponse {
  return {
    id: "l-1",
    equipment_id: "e-1",
    equipment_name: "Tower Crane TC-48",
    equipment_brand: "Liebherr",
    equipment_plate_no: "06 TC 4800",
    site_id: "s-1",
    site_name: "Güneşkent A-Blok",
    line_kind: "rented",
    worked_hours: "186.00",
    breakdown_hours: "0.00",
    rate_amount: "320.00",
    effective_rate_amount: "320.00",
    our_amount: "59520.00",
    breakdown_amount: "0.00",
    invoiced_hours: "186.00",
    hours_variance: "0.00",
    variance_status: "match",
    ...overrides,
  };
}

function totals(overrides: Partial<RentalInvoiceTotals> = {}): RentalInvoiceTotals {
  return {
    our_total: "102080.00",
    our_total_unknown_count: 0,
    owned_total: "23520.00",
    owned_total_unknown_count: 0,
    excluded_breakdown_amount: "12160.00",
    excluded_breakdown_unknown_count: 0,
    invoice_amount: "122496.00",
    vat_rate: "20.00",
    vat_amount: "24499.20",
    payable_total: "146995.20",
    ...overrides,
  };
}

/** M5 tablosunun DORT satiri — mockup'in kendi verisi. */
const MOCKUP_LINES: RentalInvoiceLineResponse[] = [
  line({ id: "l-1" }),
  line({
    id: "l-2",
    equipment_name: "Ekskavatör CAT 320",
    equipment_brand: "Caterpillar",
    equipment_plate_no: "35 EK 3200",
    site_name: "Liman Altyapı",
    worked_hours: "152.00",
    rate_amount: "280.00",
    effective_rate_amount: "280.00",
    our_amount: "42560.00",
    invoiced_hours: "158.00",
    hours_variance: "6.00",
    variance_status: "over",
  }),
  line({
    id: "l-3",
    equipment_name: "Tower Crane TC-48 — Arıza",
    line_kind: "breakdown",
    worked_hours: "0.00",
    breakdown_hours: "38.00",
    our_amount: null,
    breakdown_amount: "12160.00",
    invoiced_hours: null,
    hours_variance: null,
    variance_status: "unknown",
  }),
  line({
    id: "l-4",
    equipment_name: "Damperli Kamyon 34 AB 1234",
    equipment_brand: "Mercedes",
    equipment_plate_no: null,
    site_name: "Çelik OSB",
    line_kind: "owned",
    worked_hours: "168.00",
    our_amount: "23520.00",
    breakdown_amount: "0.00",
    invoiced_hours: null,
    hours_variance: null,
    variance_status: "unknown",
  }),
];

/* ==========================================================================
 * K6 — TFOOT VARYANS ROZETI ISTEMCIDE TURETILIR
 * ======================================================================= */
describe("rentalHoursVarianceTotal · K6", () => {
  it("mockup'in KENDI dort satiri M5:162'nin rozetini uretir (6 saat fark / over)", () => {
    // 🔴 Bu test emrin bir varsayimini CURUTUR: turetme TUM satirlardan degil
    // YALNIZ `rented` satirlardan yapilir. `owned`/`breakdown` satirlarinda
    // `invoiced_hours` hic girilmez (M5:140-151'de o hucre YOKTUR), backend
    // (`rental.py:224-235`) bu yuzden onlara KOSULSUZ `unknown` damgalar.
    // Hepsi sayilsaydi mockup'in kendi verisi `unknown` uretir ve M5:162'nin
    // amber "6 saat fark" rozetiyle CELISIRDI.
    expect(rentalHoursVarianceTotal(MOCKUP_LINES)).toEqual({
      totalHours: "6.00",
      status: "over",
    });
  });

  it("hepsi eslesiyorsa `match` ve toplam sifir", () => {
    expect(rentalHoursVarianceTotal([line(), line({ id: "l-2" })])).toEqual({
      totalHours: "0.00",
      status: "match",
    });
  });

  it("negatif toplam `under` (firma BIZDEN AZ faturaladi)", () => {
    const eksik = line({ id: "l-2", hours_variance: "-4.00", variance_status: "under" });
    expect(rentalHoursVarianceTotal([line(), eksik])).toEqual({
      totalHours: "-4.00",
      status: "under",
    });
  });

  it("SINIR: fark tam `0.00` olan satir `match` sayilir, `unknown` DEGIL", () => {
    expect(rentalHoursVarianceTotal([line({ hours_variance: "0.00" })]).status).toBe("match");
  });

  it("FAIL-CLOSED: `hours_variance` null olan kiralik satir toplama GIRMEZ ama sayilir", () => {
    const bilinmeyen = line({ id: "l-2", invoiced_hours: null, hours_variance: null, variance_status: "unknown" });
    expect(rentalHoursVarianceTotal([line({ hours_variance: "6.00", variance_status: "over" }), bilinmeyen])).toEqual({
      totalHours: "6.00",
      status: "unknown",
    });
  });

  it("FAIL-CLOSED: rozet `unknown` ama fark dolu gelen TUTARSIZ yuk de `unknown` uretir", () => {
    const tutarsiz = line({ hours_variance: "0.00", variance_status: "unknown" });
    expect(rentalHoursVarianceTotal([tutarsiz]).status).toBe("unknown");
  });

  it("FAIL-CLOSED: farklar birbirini goturuyorsa `match` DENMEZ (`unknown`)", () => {
    // +6 ve -6: net sifir ama HICBIR satir eslesmiyor. `match` demek yesil bir
    // yalan olurdu.
    const artik = line({ id: "l-a", hours_variance: "6.00", variance_status: "over" });
    const eksik = line({ id: "l-b", hours_variance: "-6.00", variance_status: "under" });
    expect(rentalHoursVarianceTotal([artik, eksik])).toEqual({
      totalHours: "0.00",
      status: "unknown",
    });
  });

  it("FAIL-CLOSED: dogrulanacak kiralik satir yoksa `unknown` (kanitsiz yesil YOK)", () => {
    expect(rentalHoursVarianceTotal([])).toEqual({ totalHours: "0", status: "unknown" });
    const yalnizKendi = [MOCKUP_LINES[2], MOCKUP_LINES[3]];
    expect(rentalHoursVarianceTotal(yalnizKendi).status).toBe("unknown");
  });

  /* --- AYRISMA NOKTASI: float toplami ile BigInt toplami BURADA ayrisir --- */
  it("float AYRISMA 1: 0.1 + 0.2 tam `0.3` verir (Number() `0.30000000000000004` verirdi)", () => {
    const a = line({ id: "a", hours_variance: "0.1", variance_status: "over" });
    const b = line({ id: "b", hours_variance: "0.2", variance_status: "over" });
    expect(rentalHoursVarianceTotal([a, b]).totalHours).toBe("0.3");
  });

  it("float AYRISMA 2: on kez `0.10` tam `1.00` verir (Number() `0.9999999999999999` verirdi)", () => {
    const lines = Array.from({ length: 10 }, (_, index) =>
      line({ id: `l-${index}`, hours_variance: "0.10", variance_status: "over" }),
    );
    expect(rentalHoursVarianceTotal(lines).totalHours).toBe("1.00");
  });

  it("float AYRISMA 3: 2^53 esiginin ustunde kurus kaybolmaz", () => {
    const buyuk = line({ id: "a", hours_variance: "9007199254740992.00", variance_status: "over" });
    const kucuk = line({ id: "b", hours_variance: "1.00", variance_status: "over" });
    expect(rentalHoursVarianceTotal([buyuk, kucuk]).totalHours).toBe("9007199254740993.00");
  });
});

/* ==========================================================================
 * YAPISAL YASAK — K6 ikinci katman + K9
 * ======================================================================= */
describe("rental-derive · YAPISAL YASAKLAR (metin taramasi)", () => {
  it("bekci canlidir: taranan kaynak gercekten okunuyor", () => {
    // Pozitif kontrol — dosya bos/okunamaz olsaydi asagidaki `not.toMatch`
    // iddialari HICBIR SEY bekcilemezdi (sahte-yesilin 3. hali).
    expect(deriveSource.length).toBeGreaterThan(500);
    expect(deriveSource).toMatch(/sumDecimalStrings/);
  });

  it("K6: float aritmetigi YOK — `Number(` / `Math.` / `parseFloat` / `parseInt` gecmez", () => {
    expect(deriveSource).not.toMatch(/\bNumber\(/);
    expect(deriveSource).not.toMatch(/\bMath\./);
    expect(deriveSource).not.toMatch(/\bparseFloat\(/);
    expect(deriveSource).not.toMatch(/\bparseInt\(/);
  });

  it("K9: `@/lib/decimal`ten YALNIZ carpma/bolme ICERMEYEN yardimcilar ithal edilir", () => {
    const importStatement = deriveSource.match(/import\s*\{([^}]*)\}\s*from\s*"@\/lib\/decimal"/);
    expect(importStatement, "`@/lib/decimal` ithalati bulunamadi").not.toBeNull();

    const imported = (importStatement as RegExpMatchArray)[1]
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    expect(imported.length).toBeGreaterThan(0);

    // KDV = `matrah × oran / 100`. Carpma/bolme yardimcisi ithal EDILEMEZ ve
    // float aritmetigi de yasak (ustteki test) → KDV'yi yeniden hesaplamak
    // YAPISAL OLARAK imkansizdir; ekran `totals.vat_amount`i oldugu gibi basar.
    const ALLOWED_DECIMAL_IMPORTS = ["sumDecimalStrings", "isZeroDecimalString"];
    for (const name of imported) {
      expect(ALLOWED_DECIMAL_IMPORTS, `yasak ondalik yardimcisi ithal edildi: ${name}`).toContain(
        name,
      );
    }
  });

  it("K9: KDV aritmetiginin hicbir izi yok (yuzde boleni / oran carpani)", () => {
    expect(deriveSource).not.toMatch(/\/\s*100\b/);
    expect(deriveSource).not.toMatch(/\*\s*0?\.?2\b/);
    expect(deriveSource).not.toMatch(/PERCENT/);
  });
});

/* ==========================================================================
 * K9 — KDV/toplam DAVRANISI
 * ======================================================================= */
describe("rentalPayableUnavailable · K9", () => {
  it("tam yukte odenecek toplam basilabilir (uyari yok)", () => {
    expect(rentalPayableUnavailable(totals())).toBeNull();
  });

  it("`invoice_amount` null iken KDV ve odenecek toplam da null → hesaplanamadi dali", () => {
    const taslak = totals({ invoice_amount: null, vat_amount: null, payable_total: null });
    expect(taslak.vat_amount).toBeNull();
    expect(taslak.payable_total).toBeNull();
    expect(rentalPayableUnavailable(taslak)).toBe(RENTAL_PAYABLE_UNAVAILABLE);
  });

  it("FAIL-CLOSED: matrah yokken toplam DOLU gelse bile basilmaz", () => {
    // Tutarsiz yuk: `invoice_amount` null ama `payable_total` dolu. Yalniz
    // `payable_total`a bakan bir kontrol bunu sessizce basardi.
    const tutarsiz = totals({ invoice_amount: null, vat_amount: null });
    expect(rentalPayableUnavailable(tutarsiz)).toBe(RENTAL_PAYABLE_UNAVAILABLE);
  });

  it("FAIL-CLOSED: matrah dolu ama toplam null ise de basilmaz", () => {
    expect(rentalPayableUnavailable(totals({ payable_total: null }))).toBe(
      RENTAL_PAYABLE_UNAVAILABLE,
    );
  });
});

/* ==========================================================================
 * K8 — *_unknown_count FAIL-CLOSED SAYACLARI SESSIZ KALMAZ
 * ======================================================================= */
describe("rentalUnknownWarning · K8", () => {
  it("uc sayac da sifirken uyari YOK", () => {
    expect(rentalUnknownWarning(totals())).toBeNull();
  });

  /* 🔴 Kume KENDISI sinanir (MT-2 dersi): her sayac TEK BASINA cakilir,
   * yoksa "eleme listesi eksik" kusuru gorunmez. */
  it("YALNIZ `our_total_unknown_count` sifirdan buyukken uyari cikar", () => {
    expect(rentalUnknownWarning(totals({ our_total_unknown_count: 1 }))).toBe(
      `1 ${RENTAL_UNKNOWN_WARNING_SUFFIX}`,
    );
  });

  it("YALNIZ `owned_total_unknown_count` sifirdan buyukken uyari cikar", () => {
    expect(rentalUnknownWarning(totals({ owned_total_unknown_count: 1 }))).toBe(
      `1 ${RENTAL_UNKNOWN_WARNING_SUFFIX}`,
    );
  });

  it("YALNIZ `excluded_breakdown_unknown_count` sifirdan buyukken uyari cikar", () => {
    expect(rentalUnknownWarning(totals({ excluded_breakdown_unknown_count: 1 }))).toBe(
      `1 ${RENTAL_UNKNOWN_WARNING_SUFFIX}`,
    );
  });

  it("uc sayac TOPLANIR (2+3+4 = 9)", () => {
    const yuk = totals({
      our_total_unknown_count: 2,
      owned_total_unknown_count: 3,
      excluded_breakdown_unknown_count: 4,
    });
    expect(rentalUnknownWarning(yuk)).toBe(`9 ${RENTAL_UNKNOWN_WARNING_SUFFIX}`);
  });
});

describe("rentalDistributionUnknownWarning · DORDUNCU fail-closed sayac", () => {
  function entry(overrides: Partial<RentalSiteDistributionEntry> = {}): RentalSiteDistributionEntry {
    return {
      site_id: "s-1",
      site_name: "Güneşkent A-Blok",
      hours: "186.00",
      amount: "59520.00",
      unknown_count: 0,
      equipments: [{ id: "e-1", name: "Tower Crane TC-48" }],
      ...overrides,
    };
  }

  it("sifirken uyari YOK", () => {
    expect(rentalDistributionUnknownWarning(entry())).toBeNull();
  });

  it("sifirdan buyukken kova basina uyari cikar", () => {
    expect(rentalDistributionUnknownWarning(entry({ unknown_count: 2 }))).toBe(
      `2 ${RENTAL_DISTRIBUTION_UNKNOWN_SUFFIX}`,
    );
  });

  it("dagilim uyarisi TOPLAM uyarisindan AYRI bir metindir (karistirilamaz)", () => {
    expect(RENTAL_DISTRIBUTION_UNKNOWN_SUFFIX).not.toBe(RENTAL_UNKNOWN_WARNING_SUFFIX);
  });
});

/* ==========================================================================
 * K3 — YIRTIK TABLO DOKUZ HUCREYE TAMAMLANIR
 * ======================================================================= */
describe("rentalRowCells · K3", () => {
  it.each(["rented", "owned", "breakdown"] as const)(
    "%s satiri HER ZAMAN tam dokuz hucre uretir",
    (kind) => {
      const cells = rentalRowCells(line({ line_kind: kind }));
      expect(cells).toHaveLength(9);
      expect(cells.map((cell) => cell.column)).toEqual([...RENTAL_COLUMNS]);
    },
  );

  it("mockup'in dort satirinin DORDU de dokuz hucre uretir (tbody 7'lik yirtik KAPANIR)", () => {
    for (const source of MOCKUP_LINES) {
      expect(rentalRowCells(source), `${source.id} eksik hucre`).toHaveLength(9);
    }
  });

  it("kiralik satir: iki duzenlenebilir hucre + varyans rozeti", () => {
    const cells = rentalRowCells(MOCKUP_LINES[1]);
    expect(cells[5].content).toEqual({
      kind: "editable",
      field: "rate_amount",
      value: "280.00",
      placeholder: "280.00",
    });
    expect(cells[7].content).toEqual({
      kind: "editable",
      field: "invoiced_hours",
      value: "158.00",
      placeholder: null,
    });
    expect(cells[8].content).toEqual({ kind: "badge", label: "6 saat fark", variant: "warning" });
  });

  it("ariza satiri: calisma hucresi BOS (M5:135), tutar HARIC TUTULMUS, iki hucre bos", () => {
    const cells = rentalRowCells(MOCKUP_LINES[2]);
    expect(cells[3].content).toEqual({ kind: "empty" });
    expect(cells[4].content).toEqual({ kind: "text", value: "38.00" });
    expect(cells[6].content).toEqual({ kind: "amount", value: "12160.00", excluded: true });
    expect(cells[7].content).toEqual({ kind: "empty" });
    expect(cells[8].content).toEqual({ kind: "empty" });
  });

  it("kendi mali satiri: kira B.F. hucresi M5:149'daki `Amortisman`", () => {
    const cells = rentalRowCells(MOCKUP_LINES[3]);
    expect(cells[5].content).toEqual({ kind: "text", value: RENTAL_OWNED_RATE_LABEL });
    expect(cells[6].content).toEqual({ kind: "amount", value: "23520.00", excluded: false });
    expect(cells[7].content).toEqual({ kind: "empty" });
    expect(cells[8].content).toEqual({ kind: "empty" });
  });

  it("tur hucresi ariza satirinda da `Kiralık` rozetidir (M5:134)", () => {
    expect(rentalRowCells(MOCKUP_LINES[2])[2].content).toEqual({
      kind: "badge",
      label: "Kiralık",
      variant: "danger",
    });
    expect(rentalRowCells(MOCKUP_LINES[3])[2].content).toEqual({
      kind: "badge",
      label: "Kendi",
      variant: "success",
    });
  });

  it("FAIL-CLOSED: `our_amount` null ise tutar hucresi BOS, uydurma `0` DEGIL", () => {
    const cells = rentalRowCells(line({ our_amount: null }));
    expect(cells[6].content).toEqual({ kind: "empty" });
  });

  it("FAIL-CLOSED: `rate_amount` null iken duzenlenebilir hucre BOS deger tasir", () => {
    const cells = rentalRowCells(line({ rate_amount: null, effective_rate_amount: null }));
    expect(cells[5].content).toEqual({
      kind: "editable",
      field: "rate_amount",
      value: null,
      placeholder: null,
    });
  });

  it("santiyesiz satir `Atanmamış` basar (uydurma proje adi YOK)", () => {
    const cells = rentalRowCells(line({ site_id: null, site_name: null }));
    expect(cells[1].content).toEqual({ kind: "text", value: "Atanmamış" });
  });

  it("ekipman hucresi ad + alt satir tasir", () => {
    const cells = rentalRowCells(MOCKUP_LINES[0]);
    expect(cells[0].content).toEqual({
      kind: "identity",
      title: "Tower Crane TC-48",
      subtitle: "Liebherr · Plaka: 06 TC 4800",
    });
  });
});

describe("rentalEquipmentSubtitle · null guvenligi", () => {
  it("marka + plaka birlikte", () => {
    expect(rentalEquipmentSubtitle(line())).toBe("Liebherr · Plaka: 06 TC 4800");
  });

  it("yalniz marka", () => {
    expect(rentalEquipmentSubtitle(line({ equipment_plate_no: null }))).toBe("Liebherr");
  });

  it("yalniz plaka", () => {
    expect(rentalEquipmentSubtitle(line({ equipment_brand: null }))).toBe("Plaka: 06 TC 4800");
  });

  it("ikisi de yoksa alt satir YOK (bos dize DEGIL)", () => {
    expect(
      rentalEquipmentSubtitle(line({ equipment_brand: null, equipment_plate_no: null })),
    ).toBeNull();
  });
});

describe("rentalSiteLabel", () => {
  it("adi olan santiye adiyla basilir", () => {
    expect(rentalSiteLabel("Güneşkent A-Blok")).toBe("Güneşkent A-Blok");
  });

  it("null santiye `Atanmamış` kovasidir", () => {
    expect(rentalSiteLabel(null)).toBe("Atanmamış");
  });
});

describe("rentalVarianceLabel · M5:112/126'nin SOZCUK hali", () => {
  it("eslesme (sembol YOK)", () => {
    expect(rentalVarianceLabel(line())).toBe("Eşleşiyor");
  });

  it("fazla faturalama: mockup'in `6 saat fark` metni (sondaki sifirlar atilir)", () => {
    expect(rentalVarianceLabel(line({ hours_variance: "6.00", variance_status: "over" }))).toBe(
      "6 saat fark",
    );
  });

  it("eksik faturalama da MUTLAK deger basar (isaret rozet renginde degil metinde degil)", () => {
    expect(rentalVarianceLabel(line({ hours_variance: "-6.00", variance_status: "under" }))).toBe(
      "6 saat fark",
    );
  });

  it("kesirli fark anlamli basamagi korur", () => {
    expect(rentalVarianceLabel(line({ hours_variance: "6.50", variance_status: "over" }))).toBe(
      "6.5 saat fark",
    );
  });

  it("tam sayi farkta nokta kalmaz", () => {
    expect(rentalVarianceLabel(line({ hours_variance: "10.00", variance_status: "over" }))).toBe(
      "10 saat fark",
    );
  });

  it("bilinmezlik: fatura saati girilmedi (backend rental.py:224 gerekcesi)", () => {
    expect(
      rentalVarianceLabel(line({ hours_variance: null, invoiced_hours: null, variance_status: "unknown" })),
    ).toBe("Fatura saati girilmedi");
  });

  it("FAIL-CLOSED: rozet `over` ama fark null gelirse bilinmezlik dali secilir", () => {
    expect(rentalVarianceLabel(line({ hours_variance: null, variance_status: "over" }))).toBe(
      "Fatura saati girilmedi",
    );
  });
});

describe("RENTAL_EMPTY_CELL kullanimi", () => {
  it("bos hucre isareti tek kaynaktan gelir", () => {
    expect(RENTAL_EMPTY_CELL).toBe("—");
  });
});
