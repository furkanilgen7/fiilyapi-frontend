// @vitest-environment node
// Kaynak METNİNİ de okuyan saf test (`land-share-allocation.css.test.ts`
// emsali): jsdom'da `import.meta.url` bir `http:` adresidir ve `fileURLToPath`
// çalışmaz. Bu dosyanın sınadığı her şey saf TS'tir — DOM gerekmez.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  LANDOWNER_UNIT_LABEL,
  OWNER_SIDE_LABELS,
  PROJECT_SUMMARY_PENDING_KEYS,
  PROJECT_TYPE_LABELS,
  REASONS,
  UNIT_KIND_LABELS,
  UNIT_SALES_STATUS_LABELS,
  unitKindBreakdownText,
  unitSalesStatusLabel,
} from "./project-summary-labels";
import { UNIT_KIND_LABELS as SALES_UNIT_KIND_LABELS } from "@/components/sales/unit-occupancy";
import { PROJECT_TABS } from "@/components/projects/tabs";
import { MODULE_LABELS, pendingModuleLabel } from "@/lib/pending-modules";
import type { UnitKindBreakdown } from "@/lib/api/hooks/useProjectUnits";

// F-PKK T1 · Proje Özeti / Paylaşım Tablosu ekranlarının SAF etiket katmanı.
// Kaynak dosyanın kendisi de sınanır (yapısal yasak + çürüme bekçileri).
const source = readFileSync(
  fileURLToPath(new URL("./project-summary-labels.ts", import.meta.url)),
  "utf8",
);

/** `UnitKindBreakdown`ın `total`ı sunucuda TÜREVDİR; testte açıkça verilir. */
function breakdown(partial: Partial<Omit<UnitKindBreakdown, "total">>): UnitKindBreakdown {
  const counts = {
    apartment: 0,
    shop: 0,
    office: 0,
    warehouse: 0,
    parking: 0,
    ...partial,
  };
  const total =
    counts.apartment + counts.shop + counts.office + counts.warehouse + counts.parking;
  return { ...counts, total };
}

describe("PROJECT_TYPE_LABELS", () => {
  it("uc proje turunu Turkce basar (KY 67 · KK 69 hero ust satiri)", () => {
    expect(PROJECT_TYPE_LABELS.taahhut).toBe("Taahhüt");
    expect(PROJECT_TYPE_LABELS.kendi_yatirim).toBe("Kendi Yatırım");
    expect(PROJECT_TYPE_LABELS.kat_karsiligi).toBe("Kat Karşılığı");
  });

  /**
   * ÇÜRÜME BEKÇİSİ: aynı üç dize `PROJECT_TABS`ta (projeler listesi sekmeleri)
   * da yaşıyor. İki sözlük AYRI TİP SÖZLEŞMESİ taşır (`ProjectTab` beş üyeli,
   * bu ise `ProjectType` üzerinde TAM) ama METİNLERİ ayrışırsa aynı proje iki
   * ekranda iki farklı adla görünür. Ayrışmayı bu iddia yakalar.
   */
  it("metinleri PROJECT_TABS ile AYRISMAZ", () => {
    for (const type of ["taahhut", "kendi_yatirim", "kat_karsiligi"] as const) {
      const tab = PROJECT_TABS.find((entry) => entry.key === type);
      expect(PROJECT_TYPE_LABELS[type], `"${type}" sekme etiketinden sapti`).toBe(tab?.label);
    }
  });
});

describe("UNIT_KIND_LABELS", () => {
  /**
   * 🔴 YENİ SÖZLÜK YAZILMADI: `unit-occupancy.ts` (F-P8) aynı beş üyeyi aynı
   * metinlerle ZATEN eşliyor. İkinci bir kopya, blok haritasıyla proje özeti
   * arasında sessiz bir ayrışma kapısıdır — bu yüzden AYNI NESNE yeniden
   * dışa açılır.
   */
  it("sales/unit-occupancy sozlugunun AYNI NESNESIDIR (kopya degil)", () => {
    expect(UNIT_KIND_LABELS).toBe(SALES_UNIT_KIND_LABELS);
  });

  it("bes unite turunu Turkce basar", () => {
    expect(UNIT_KIND_LABELS.apartment).toBe("Daire");
    expect(UNIT_KIND_LABELS.shop).toBe("Dükkan");
    expect(UNIT_KIND_LABELS.office).toBe("Ofis");
    expect(UNIT_KIND_LABELS.warehouse).toBe("Depo");
    expect(UNIT_KIND_LABELS.parking).toBe("Otopark");
  });
});

describe("UNIT_SALES_STATUS_LABELS", () => {
  it("UE 94 kapali kumesini birebir basar", () => {
    expect(UNIT_SALES_STATUS_LABELS.listed).toBe("Satışta");
    expect(UNIT_SALES_STATUS_LABELS.reserved).toBe("Rezerve");
    expect(UNIT_SALES_STATUS_LABELS.sold).toBe("Satıldı");
    expect(UNIT_SALES_STATUS_LABELS.closed).toBe("Satışa Kapalı");
  });
});

describe("OWNER_SIDE_LABELS", () => {
  it("KKP 100 BIZ · KKP 109 ARSA", () => {
    expect(OWNER_SIDE_LABELS.contractor).toBe("BİZ");
    expect(OWNER_SIDE_LABELS.landowner).toBe("ARSA");
  });
});

describe("unitSalesStatusLabel", () => {
  it("bizim unitede satis durumunu basar (KKP 102 Satildi · 120 Satista · 129 Rezerve)", () => {
    expect(unitSalesStatusLabel("sold", "contractor")).toBe("Satıldı");
    expect(unitSalesStatusLabel("listed", "contractor")).toBe("Satışta");
    expect(unitSalesStatusLabel("reserved", "contractor")).toBe("Rezerve");
  });

  /**
   * 🔴 TEK ENUM YETMEZ. `UnitSalesStatus` şema açıklaması gerekçeyi kendi
   * yazıyor: *"'Arsa Sahibinde' (KKP 92) bu kumeye GIRMEZ: o
   * `owner_side='landowner'` turevidir"*. Naif `Record<UnitSalesStatus,string>`
   * eşlemesi arsa sahibinin ünitesine "Satışta" bastırırdı.
   */
  it("arsa sahibinin unitesi HER ZAMAN 'Arsa Sahibinde' basar (KKP 111/138/156)", () => {
    expect(unitSalesStatusLabel(null, "landowner")).toBe("Arsa Sahibinde");
    expect(unitSalesStatusLabel("listed", "landowner")).toBe("Arsa Sahibinde");
    // Sunucu arsa satırına `sold` damgalasa bile mockup ARSA satırında satış
    // durumu basmaz: ünite bizim satış sistemimize dahil değildir (KK 170).
    expect(unitSalesStatusLabel("sold", "landowner")).toBe("Arsa Sahibinde");
  });

  it("atanmamis + damgasiz unite icin null doner (cagiran karar verir)", () => {
    expect(unitSalesStatusLabel(null, null)).toBeNull();
    expect(unitSalesStatusLabel(null, "contractor")).toBeNull();
  });
});

describe("unitKindBreakdownText", () => {
  it("KY 71 '48 Daire + 4 Dukkan' uretir", () => {
    expect(unitKindBreakdownText(breakdown({ apartment: 48, shop: 4 }))).toBe(
      "48 Daire + 4 Dükkan",
    );
  });

  it("KK 121 '20 Daire + 3 Dukkan' uretir", () => {
    expect(unitKindBreakdownText(breakdown({ apartment: 20, shop: 3 }))).toBe(
      "20 Daire + 3 Dükkan",
    );
  });

  /**
   * Şema açıklaması: *"uc yeni deger yalniz sayaclara eklenir ve sifirsa
   * gorunmez"*. Sıfır sayaç basılırsa mockup'ta olmayan "0 Ofis" görünürdü.
   */
  it("sifir sayaclari ATLAR", () => {
    expect(unitKindBreakdownText(breakdown({ apartment: 36, shop: 6, office: 0 }))).toBe(
      "36 Daire + 6 Dükkan",
    );
  });

  it("enum BILDIRIM SIRASINI korur (girdi sirasi degil)", () => {
    expect(unitKindBreakdownText(breakdown({ parking: 2, apartment: 1 }))).toBe(
      "1 Daire + 2 Otopark",
    );
    expect(
      unitKindBreakdownText(breakdown({ warehouse: 1, office: 2, shop: 3, apartment: 4 })),
    ).toBe("4 Daire + 3 Dükkan + 2 Ofis + 1 Depo");
  });

  it("bos kirilimda BOS DIZE doner - cagiran karar verir", () => {
    expect(unitKindBreakdownText(breakdown({}))).toBe("");
  });

  /** `total` TÜREVDİR ve metne GİRMEZ; girseydi "52 Daire + …" gibi çift sayım olurdu. */
  it("turev 'total' alanini metne KATMAZ", () => {
    expect(unitKindBreakdownText(breakdown({ apartment: 48, shop: 4 }))).not.toContain("52");
  });
});

describe("REASONS", () => {
  /**
   * Gerekçe metinleri BURADA YAZILMAZ: tek kaynak `pending-modules.ts`tir.
   * Kopyalansaydı iki dosya ayrışır ve çürüme bekçisi (bayat kalıp yasağı)
   * buradaki kopyayı GÖRMEZDİ.
   */
  it("bes modul gerekcesi de pendingModuleLabel'dan gelir", () => {
    expect(REASONS.constructionProgress).toBe(pendingModuleLabel("construction_progress"));
    expect(REASONS.cashPosition).toBe(pendingModuleLabel("project_cash_position"));
    expect(REASONS.salesBreakeven).toBe(pendingModuleLabel("sales_breakeven"));
    expect(REASONS.landownerDelivery).toBe(pendingModuleLabel("landowner_delivery_tracking"));
    expect(REASONS.subcontractorStatus).toBe(
      pendingModuleLabel("subcontractor_contract_status"),
    );
  });

  /** Anahtarın haritada OLMAMASI, gerekçenin genel yedek metne düşmesi demektir. */
  it("bes anahtar da MODULE_LABELS'ta ESLENMISTIR (yedek metne DUSMEZ)", () => {
    const missing = Object.values(PROJECT_SUMMARY_PENDING_KEYS).filter(
      (key) => !(key in MODULE_LABELS),
    );
    expect(missing).toEqual([]);
  });

  /**
   * İki gerekçenin `pending_module` KARŞILIĞI YOKTUR — backend onları hiçbir
   * zarfta yayınlamaz, kararı bu ekran verir. Bu yüzden metinleri burada
   * yaşar (`invoice-labels.ts` `REASONS` emsali).
   */
  it("iki yerel gerekce modul haritasina EKLENMEZ", () => {
    expect(REASONS.subcontractorCategoryBadge.length).toBeGreaterThan(0);
    expect(REASONS.landownerDelayRisk.length).toBeGreaterThan(0);
    expect(Object.values(PROJECT_SUMMARY_PENDING_KEYS)).not.toContain("subcontractor_category");
    expect(Object.values(PROJECT_SUMMARY_PENDING_KEYS)).not.toContain("landowner_delay_risk");
  });

  /**
   * 🔴 ÖLÇÜLDÜ VE ÇÜRÜTÜLDÜ: KK 161-163 "10 ünite" satırının kaynağı VARDIR
   * (`LandShareShareholderRow.unit_count`). `shareholder_unit_count` diye bir
   * gerekçe EKLENMEZ — eklenseydi gerçek veriyi bastırıp yalan söylerdi.
   */
  it("shareholder_unit_count gerekcesi YOKTUR - kaynak land-share/summary'de VAR", () => {
    expect(Object.values(PROJECT_SUMMARY_PENDING_KEYS)).not.toContain("shareholder_unit_count");
    expect(Object.keys(REASONS)).not.toContain("shareholderUnitCount");
  });

  it("hicbir gerekce bos degildir", () => {
    for (const [name, reason] of Object.entries(REASONS)) {
      expect(reason.length, `"${name}" boş`).toBeGreaterThan(0);
    }
  });
});

/**
 * K4 (spec §6) YAPISAL YASAĞI: bu modül PARA ya da YÜZDE TÜRETMEZ. Sayaçlar
 * tamsayıdır ve sunucudan gelir; bir gün buraya bir oran/tutar hesabı
 * sızarsa (`Number(`, `Math.`) bu iddia kırılır ve türev `src/lib/decimal.ts`e
 * taşınmak zorunda kalır.
 */
describe("project-summary-labels.ts — yapısal yasak", () => {
  it("Number( ve Math. KULLANMAZ", () => {
    expect(source).not.toMatch(/\bNumber\(|\bMath\./);
  });

  /**
   * Çıplak glif yasağı (spec §7) EKRANA BASILAN DİZELER içindir, yorumlar için
   * değil: ilk hâli kaynak METNİNİ tarıyordu ve dosyanın kendi `⚠️` uyarı
   * yorumlarına takıldı — yasak `ui/icons` yerine glif basmakla ilgilidir.
   * Bu yüzden DEĞERLER taranır (mockup'ın KK 166 `⚠`, KKP 197 `⚠`, KY 105
   * `✓` glifleri etikete SIZAMAZ).
   */
  it("hicbir GORUNUR dize ciplak glif tasimaz", () => {
    const visible = [
      LANDOWNER_UNIT_LABEL,
      ...Object.values(PROJECT_TYPE_LABELS),
      ...Object.values(UNIT_KIND_LABELS),
      ...Object.values(UNIT_SALES_STATUS_LABELS),
      ...Object.values(OWNER_SIDE_LABELS),
      ...Object.values(REASONS),
    ];
    const offenders = visible.filter((text) => /[⚠✓✗≠]/.test(text));
    expect(offenders).toEqual([]);
  });
});
