// @vitest-environment node
//
// Saf TS katmani + metin-taramali bekci: DOM gerekmez ve `import.meta.url`
// jsdom altinda dosya URL'si OLMADIGI icin `readFileSync` calismaz.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  RATE_PERIOD_LABEL,
  RENTAL_COLUMNS,
  RENTAL_COLUMN_LABEL,
  RENTAL_EMPTY_CELL,
  RENTAL_LINE_KIND_BADGE_VARIANT,
  RENTAL_LINE_KIND_LABEL,
  RENTAL_OWNED_RATE_LABEL,
  RENTAL_STATUS_BADGE,
  RENTAL_UNASSIGNED_SITE_LABEL,
  RENTAL_VARIANCE_DIFF_SUFFIX,
  RENTAL_VARIANCE_MATCH_LABEL,
  RENTAL_VARIANCE_UNKNOWN_LABEL,
  VARIANCE_BADGE_VARIANT,
} from "./rental-labels";

const selfDir = fileURLToPath(new URL(".", import.meta.url));

describe("rental-labels · durum rozeti (M5:65)", () => {
  it("dort durumun HEPSI haritada — kume KENDISI de sinanir (MT-2 dersi)", () => {
    expect(Object.keys(RENTAL_STATUS_BADGE).sort()).toEqual([
      "approved",
      "draft",
      "paid",
      "pending_verification",
    ]);
  });

  it("etiketler mockup metniyle BIREBIR", () => {
    expect(RENTAL_STATUS_BADGE.draft.label).toBe("Taslak");
    // M5:65 — mockup'ta yazan tam metin.
    expect(RENTAL_STATUS_BADGE.pending_verification.label).toBe("Doğrulama Bekliyor");
    expect(RENTAL_STATUS_BADGE.approved.label).toBe("Onaylandı");
    expect(RENTAL_STATUS_BADGE.paid.label).toBe("Ödendi");
  });

  it("renkler emsal desenle ayni (progress-payments/shared/status.ts:33-41)", () => {
    expect(RENTAL_STATUS_BADGE.draft.variant).toBe("neutral");
    expect(RENTAL_STATUS_BADGE.pending_verification.variant).toBe("warning");
    expect(RENTAL_STATUS_BADGE.approved.variant).toBe("success");
    expect(RENTAL_STATUS_BADGE.paid.variant).toBe("primary");
  });
});

describe("rental-labels · satir turu (M5:106/134/146)", () => {
  it("uc turun HEPSI haritalarda", () => {
    expect(Object.keys(RENTAL_LINE_KIND_LABEL).sort()).toEqual(["breakdown", "owned", "rented"]);
    expect(Object.keys(RENTAL_LINE_KIND_BADGE_VARIANT).sort()).toEqual([
      "breakdown",
      "owned",
      "rented",
    ]);
  });

  it("ariza satiri da KIRALIK rozeti tasir (M5:134 birebir)", () => {
    expect(RENTAL_LINE_KIND_LABEL.rented).toBe("Kiralık");
    expect(RENTAL_LINE_KIND_LABEL.breakdown).toBe("Kiralık");
    expect(RENTAL_LINE_KIND_LABEL.owned).toBe("Kendi");
  });

  it("rozet renkleri mockup zemin/metin ciftlerinden", () => {
    expect(RENTAL_LINE_KIND_BADGE_VARIANT.rented).toBe("danger");
    expect(RENTAL_LINE_KIND_BADGE_VARIANT.breakdown).toBe("danger");
    expect(RENTAL_LINE_KIND_BADGE_VARIANT.owned).toBe("success");
  });
});

describe("rental-labels · kira tipi (M5:74)", () => {
  it("uc periyodun HEPSI haritada", () => {
    expect(Object.keys(RATE_PERIOD_LABEL).sort()).toEqual(["daily", "hourly", "monthly"]);
  });

  it("mockup <option> metinleri birebir", () => {
    expect(RATE_PERIOD_LABEL.hourly).toBe("Saatlik Kira");
    expect(RATE_PERIOD_LABEL.daily).toBe("Günlük Kira");
    expect(RATE_PERIOD_LABEL.monthly).toBe("Aylık Sabit");
  });
});

describe("rental-labels · varyans rozeti", () => {
  it("dort varyans durumunun HEPSI haritada", () => {
    expect(Object.keys(VARIANCE_BADGE_VARIANT).sort()).toEqual([
      "match",
      "over",
      "under",
      "unknown",
    ]);
  });

  it("eslesme yesil, sapma amber, bilinmezlik notr", () => {
    expect(VARIANCE_BADGE_VARIANT.match).toBe("success");
    expect(VARIANCE_BADGE_VARIANT.over).toBe("warning");
    expect(VARIANCE_BADGE_VARIANT.under).toBe("warning");
    expect(VARIANCE_BADGE_VARIANT.unknown).toBe("neutral");
  });
});

describe("rental-labels · tablo kolonlari (M5:88-96 thead)", () => {
  it("thead DOKUZ kolondur — K3'un tam hucre sayisinin kaynagi", () => {
    expect(RENTAL_COLUMNS).toHaveLength(9);
  });

  it("kolon basliklari mockup thead metniyle birebir ve SIRALI", () => {
    expect(RENTAL_COLUMNS.map((column) => RENTAL_COLUMN_LABEL[column])).toEqual([
      "Ekipman",
      "Şantiye",
      "Tür",
      "Çalışma (Saat)",
      "Arıza (Saat)",
      "Kira B.F. ₺",
      "Bizim Hesap",
      "Fatura Saati",
      "Fark / Onay",
    ]);
  });

  it("her kolonun etiketi vardir (bos anahtar yok)", () => {
    expect(Object.keys(RENTAL_COLUMN_LABEL).sort()).toEqual([...RENTAL_COLUMNS].sort());
  });
});

describe("rental-labels · tekil metinler", () => {
  it("sema gerekcesi: site_id null ise kova Atanmamis (uydurma proje adi YOK)", () => {
    expect(RENTAL_UNASSIGNED_SITE_LABEL).toBe("Atanmamış");
  });

  it("bos hucre isareti mockup M5:135'in kendi isaretidir", () => {
    expect(RENTAL_EMPTY_CELL).toBe("—");
  });

  it("kendi malinin kira B.F. hucresi M5:149'da Amortisman yazar", () => {
    expect(RENTAL_OWNED_RATE_LABEL).toBe("Amortisman");
  });

  it("varyans metinleri CIPLAK SEMBOL TASIMAZ (M5:112/126'nin sozcuk hali)", () => {
    expect(RENTAL_VARIANCE_MATCH_LABEL).toBe("Eşleşiyor");
    expect(RENTAL_VARIANCE_DIFF_SUFFIX).toBe("saat fark");
    expect(RENTAL_VARIANCE_UNKNOWN_LABEL).toBe("Fatura saati girilmedi");
  });
});

/* --------------------------------------------------------------------------
 * GLIF BEKCISI — yerel ve DAR. Genel bekci (`src/test-guards/
 * symbol-subset-guard.test.ts`) tum `src/`i tarar; bu dilimin iki dosyasi
 * ayrica burada cakilir ki mockup'tan kopyalanan `⚠`/`✓` geri sizmasin.
 * `fonts.css` alt kumesi disindaki bu glifler `ubuntu-latest`te fontconfig
 * ikamesine duser ve gorsel kareyi oynatir (F-MU2 dersi).
 * ----------------------------------------------------------------------- */
const FORBIDDEN_GLYPHS: readonly (readonly [number, string])[] = [
  [0x26a0, "uyari ucgeni"],
  [0x2713, "onay tiki"],
  [0x2717, "carpi"],
];

describe("rental-labels · ciplak glif yasagi", () => {
  it.each(["rental-labels.ts", "rental-derive.ts", "rental-actions.ts"])(
    "%s ciplak sembol tasimaz",
    (fileName) => {
      const source = readFileSync(`${selfDir}${fileName}`, "utf8");
      for (const [codePoint, description] of FORBIDDEN_GLYPHS) {
        const glyph = String.fromCodePoint(codePoint);
        expect(
          source.includes(glyph),
          `${fileName} icinde U+${codePoint.toString(16).toUpperCase()} (${description}) bulundu — ui/icons SVG'sini kullan`,
        ).toBe(false);
      }
    },
  );
});
