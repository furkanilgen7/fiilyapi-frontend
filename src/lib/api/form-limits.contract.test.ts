// @vitest-environment node
//
// 🔴🔴 GENİŞLETİLMİŞ SÖZLEŞME BEKÇİSİ — form korkulukları ↔ gövde kısıtları.
//
// `query-limits.contract.test.ts` SORGU sabitlerini bekçiliyordu; bu dosya aynı
// deseni **gövde alanlarına** taşır. Sınıfın canlı bedeli ölçülmüştür: bordro
// modülü `PAYROLL_PERIODS_LIMIT = 240` yüzünden altı gün ölüydü ve DÖRT KAPI
// da yeşildi. Sebep tek cümledir: **sözleşme kısıtı üretilen TS tipinde
// YAŞAMAZ.**
//
// Bu bekçi İKİ YÖNLÜDÜR (F-İK `field-limits.test.ts` deseninin genelleştirilmişi):
//   ileri  — istemcideki her korkuluk sözleşmedeki değerin AYNISI mıdır?
//   geri   — sözleşmede sınırı olan her alanın istemcide korkuluğu VAR MI?
// Tek yön yetmez: yalnız ileri yön koşsaydı, korkuluğu HİÇ olmayan bir alan
// (ör. `free_label`) sessizce geçerdi — nitekim bu dilimde öyle bir alan
// ölçülerek bulundu.
import { describe, expect, it } from "vitest";

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  fieldSchema,
  readNumericConst,
  readNumericMap,
  spec,
  toSnakeCase,
} from "./form-limits.contract";

/**
 * İstemci korkuluk haritası → sözleşme şeması.
 *
 * 🔑 KAYIT **HARİTA** DÜZEYİNDEDİR, alan düzeyinde değil: bir forma yeni alan
 * eklendiğinde kaydı güncellemek GEREKMEZ, bekçi onu kendiliğinden kapsar ve
 * sözleşmede sınırı varsa korkuluğunu ARAR. "24.'sü" tam burada yakalanır.
 */
interface Registration {
  readonly label: string;
  readonly file: string;
  readonly constName: string;
  readonly schema: string;
  /** İstemci anahtarı → sözleşme alanı (yalnız snake_case'e çevrilemeyenler). */
  readonly rename?: Readonly<Record<string, string>>;
  /**
   * Sözleşmede sınırı olan ama formda KARŞILIĞI OLMAYAN alanlar.
   * 🔴 Her biri GEREKÇELİDİR — buraya bir ad eklemek bilinçli bir karardır,
   * susturma değil. Alan forma sonradan eklenirse kaydın burada kalması
   * korkuluğu olmayan bir input demektir; gerekçe onu görünür kılar.
   */
  readonly notRendered?: Readonly<Record<string, string>>;
  /** Sözleşmede sınırı OLMAYAN ama istemcinin kendi koyduğu (daha sıkı) sınır. */
  readonly clientOnly?: Readonly<Record<string, string>>;
}

const REGISTRY: readonly Registration[] = [
  {
    label: "şantiye formu",
    file: "src/components/site-form/constants.ts",
    constName: "SITE_FIELD_MAX_LENGTH",
    schema: "SiteCreate",
    notRendered: {
      site_manager_name: "sunucu FK'den yazar (`build-body.ts` §42) — formda serbest metin YOK",
    },
  },
  {
    label: "personel formu",
    file: "src/components/personnel-form/constants.ts",
    constName: "PERSONNEL_FIELD_MAX_LENGTH",
    schema: "PersonnelCreate",
  },
  {
    label: "bölüm formu",
    file: "src/components/section-form/constants.ts",
    constName: "SECTION_FIELD_MAX_LENGTH",
    schema: "SectionCreate",
    notRendered: {
      manager_name: "formda serbest metin karşılığı YOK, yönetici FK ile seçilir (`TeamCard.tsx`)",
      deputy_manager_name: "aynı gerekçe — vekil de FK ile seçilir",
    },
  },
  {
    label: "depo formu",
    file: "src/components/warehouse-form/constants.ts",
    constName: "MAX_LENGTH",
    schema: "WarehouseCreate",
  },
  {
    label: "stok girişi formu",
    file: "src/components/stock-entry-form/constants.ts",
    constName: "MAX_LENGTH",
    schema: "StockEntryCreate",
  },
  {
    label: "taşeron sözleşmesi formu",
    file: "src/components/subcontractor-contract-form/constants.ts",
    constName: "MAX_LENGTH",
    schema: "SubcontractorContractCreate",
  },
  {
    label: "tedarikçi modalı",
    file: "src/components/purchasing/SupplierModal.tsx",
    constName: "MAX_LENGTH",
    schema: "SupplierCreate",
  },
  {
    label: "teklif modalı",
    file: "src/components/purchasing/QuoteCreateModal.tsx",
    constName: "MAX_LENGTH",
    schema: "PurchaseQuoteCreate",
  },
  {
    label: "taşeron modalı",
    file: "src/components/subcontractors/SubcontractorFormModal.tsx",
    constName: "MAX_LENGTH",
    schema: "SubcontractorCreate",
  },
  {
    label: "stok kalemi modalı",
    file: "src/components/stock/StockItemModal.tsx",
    constName: "MAX_LENGTH",
    schema: "StockItemCreate",
  },
  {
    label: "personel belgesi formu",
    file: "src/components/personnel-document-form/constants.ts",
    constName: "MAX_LENGTH",
    schema: "PersonnelDocumentCreate",
    clientOnly: {
      note: "sözleşme `note` için sınır İLAN ETMEZ (Text sütunu); 2000 istemcinin kendi tavanı",
    },
  },
  {
    label: "arşiv belgesi formu",
    file: "src/components/document-form/constants.ts",
    constName: "MAX_LENGTH",
    schema: "DocumentUpdate",
    notRendered: {
      filename: "`filename` YALNIZ `PATCH /documents/{id}` ile değişir, bu formda alan YOK",
    },
  },
];

describe("🔴 form korkulukları ↔ sözleşme gövde kısıtları", () => {
  it("bekçi GERÇEKTEN ölçüyor (boş küme sessizce yeşil geçemez)", () => {
    // 🔴 Kapsam korkuluğu: `readNumericMap` deseni bozulsa TÜM `it.each`ler
    // boş küme üzerinde koşar ve dosya "yeşil" görünürdü — bekçinin KENDİSİ
    // sahte-yeşile düşerdi. Sayılar ölçülmüştür, aşağı inerlerse tarama
    // bozulmuş demektir.
    expect(REGISTRY.length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(spec().components.schemas).length).toBeGreaterThan(100);
    const totalGuards = REGISTRY.reduce(
      (sum, entry) => sum + readNumericMap(entry.file, entry.constName).size,
      0,
    );
    expect(totalGuards, "taranan korkuluk alanı sayısı").toBeGreaterThanOrEqual(35);
  });

  describe.each(REGISTRY)("$label ($schema)", (entry) => {
    const guards = readNumericMap(entry.file, entry.constName);
    const property = (key: string): string => entry.rename?.[key] ?? toSnakeCase(key);

    it("istemcideki her korkuluk sözleşmedeki değerin AYNISIDIR", () => {
      let measured = 0;
      for (const [key, limit] of guards) {
        if (entry.clientOnly?.[key] !== undefined) continue;
        const contract = fieldSchema(entry.schema, property(key))?.maxLength;
        expect(
          contract,
          `${entry.schema}.${property(key)} sözleşmede maxLength taşımıyor — ` +
            `korkuluk bir yere bağlanamıyorsa ÖLÇÜM BOŞLUĞUDUR (gerekçesi varsa \`clientOnly\`ye yaz)`,
        ).toBeDefined();
        expect(
          limit,
          `${entry.constName}.${key} = ${limit} ≠ ${entry.schema}.${property(key)} = ${contract} ` +
            `⇒ kullanıcı sınırı aşınca UYARISIZ 422 alır`,
        ).toBe(contract);
        measured += 1;
      }
      // Hiçbir alan ölçülemediyse bu bir BOŞLUKTUR, başarı değil.
      expect(measured, `${entry.label}: hiçbir korkuluk sözleşmeye bağlanamadı`).toBeGreaterThan(0);
    });

    it("sözleşmede sınırı olan her alanın istemcide korkuluğu VARDIR", () => {
      const properties = spec().components.schemas[entry.schema]?.properties ?? {};
      const guarded = new Set([...guards.keys()].map(property));
      const unguarded = Object.keys(properties).filter(
        (name) =>
          fieldSchema(entry.schema, name)?.maxLength !== undefined &&
          !guarded.has(name) &&
          entry.notRendered?.[name] === undefined,
      );
      expect(
        unguarded,
        `${entry.schema}: sözleşmede sınırı olup istemcide korkuluğu OLMAYAN alan(lar) — ` +
          `korkuluk ekle ya da formda karşılığı yoksa \`notRendered\`e GEREKÇESİYLE yaz`,
      ).toEqual([]);
    });
  });
});

/* ═══════════════ TEKİL SABİTLER — "İLAN EDİLDİ AMA BAĞLANMADI" ═════════════
 * 🔴 Bu kapı bu dilimde ÖLÇÜLEREK doğdu: `JOURNAL_DESCRIPTION_MAX = 2000`
 * doğru değeri taşıyordu, sözleşmeyle de uyuşuyordu — ama HİÇBİR input'a
 * bağlanmamıştı (yalnız ipucu metninde geçiyordu). Değeri karşılaştıran bir
 * bekçi bunu YEŞİL geçerdi: sabit doğruydu, korkuluk yoktu. Bu yüzden kapı
 * İKİ ŞEY sorar — değer sözleşmeye eşit mi, VE sabit gerçekten bir
 * `maxLength` niteliğine bağlanmış mı.
 * ========================================================================= */

interface StandaloneGuard {
  readonly constName: string;
  readonly file: string;
  readonly schema: string;
  readonly property: string;
}

const STANDALONE: readonly StandaloneGuard[] = [
  {
    constName: "JOURNAL_DESCRIPTION_MAX",
    file: "src/components/accounting/journal-entry-form.ts",
    schema: "JournalEntryCreate",
    property: "description",
  },
  {
    constName: "JOURNAL_DETAIL_NOTE_MAX",
    file: "src/components/accounting/journal-entry-form.ts",
    schema: "JournalEntryCreate",
    property: "detail_note",
  },
  {
    constName: "BLOCK_NAME_MAX_LENGTH",
    file: "src/components/block-form/constants.ts",
    schema: "BlockCreate",
    property: "name",
  },
  {
    constName: "BLOCK_CODE_MAX_LENGTH",
    file: "src/components/block-form/constants.ts",
    schema: "BlockCreate",
    property: "code",
  },
  {
    constName: "BLOCK_NOTES_MAX_LENGTH",
    file: "src/components/block-form/constants.ts",
    schema: "BlockCreate",
    property: "notes",
  },
  {
    constName: "UNIT_NO_MAX_LENGTH",
    file: "src/components/unit-form/constants.ts",
    schema: "UnitCreate",
    property: "unit_no",
  },
  {
    constName: "MAX_SPRINT_NAME",
    file: "src/components/site-planning/PlanSprintEditor.tsx",
    schema: "SitePlanSprintSave",
    property: "name",
  },
];

/** `src/` altındaki tüm kaynak dosyalar (testler hariç) — TEK okuma. */
function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(name) || /\.test\./.test(name)) continue;
      found.push(full);
    }
  };
  walk(path.join(process.cwd(), "src"));
  return found;
}

const SOURCES = sourceFiles().map((file) => readFileSync(file, "utf8"));

describe("🔴 tekil korkuluk sabitleri ↔ sözleşme", () => {
  it("bekçi GERÇEKTEN ölçüyor (boş küme sessizce yeşil geçemez)", () => {
    expect(STANDALONE.length).toBeGreaterThanOrEqual(7);
    expect(SOURCES.length, "taranan kaynak dosya sayısı").toBeGreaterThan(200);
  });

  it.each(STANDALONE)("$constName = $schema.$property", ({ constName, file, schema, property }) => {
    const contract = fieldSchema(schema, property)?.maxLength;
    expect(contract, `${schema}.${property} sözleşmede maxLength taşımıyor`).toBeDefined();
    expect(
      readNumericConst(file, constName),
      `${constName} ≠ ${schema}.${property} (${contract}) ⇒ sessiz 422`,
    ).toBe(contract);
  });

  it.each(STANDALONE)("$constName bir maxLength niteliğine GERÇEKTEN bağlıdır", ({ constName }) => {
    // İlan edilmiş ama bağlanmamış sabit = korkuluk YOK. Değer karşılaştıran
    // bekçi bunu göremez; bağlanmayı ayrıca ölçmek gerekir.
    const wired = SOURCES.some((source) => source.includes(`maxLength={${constName}}`));
    expect(
      wired,
      `${constName} hiçbir yerde \`maxLength={${constName}}\` olarak kullanılmıyor — ` +
        `sabit doğru olsa bile kullanıcının önünde KORKULUK YOK`,
    ).toBe(true);
  });
});
