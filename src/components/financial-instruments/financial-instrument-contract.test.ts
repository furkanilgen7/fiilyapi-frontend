import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  AMOUNT_MAX_FRACTION_DIGITS,
  BANK_NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  DRAWER_NAME_MAX_LENGTH,
  EMPTY_INSTRUMENT_FORM,
  INSTRUMENT_DIRECTION_OPTIONS,
  INSTRUMENT_KIND_OPTIONS,
  SERIAL_NO_MAX_LENGTH,
  amountError,
  buildInstrumentCreateBody,
  instrumentFormBlockReason,
} from "./financial-instrument-form";

/**
 * 🔴🔴 SÖZLEŞME BEKÇİSİ — **KISIT TİPTE YAŞAMAZ.**
 *
 * `openapi-typescript` `FinancialInstrumentCreate.serial_no`yu `string` diye
 * üretir; `maxLength: 50` **tipte İFADE EDİLEMEZ**. Sonuç: `pnpm typecheck`
 * yeşil, `pnpm test` yeşil, canlı **422**. Kardeş modül (bordro) tam bu sınıf
 * yüzünden altı gün ölü kaldı (`limit=240` ↔ sözleşme `maximum: 200`).
 *
 * `expect(SERIAL_NO_MAX_LENGTH).toBe(50)` yazan bir test bu sınıfa KÖRDÜR:
 * sabiti tekrar eder, sözleşmeyi ölçmez. Burada her sabit **şemadan okunan**
 * değere çakılır — şema değişirse test kırmızı olur.
 */
interface LengthSchema {
  maxLength?: number;
  minLength?: number;
  type?: string;
  pattern?: string;
  exclusiveMinimum?: number;
  anyOf?: LengthSchema[];
  $ref?: string;
  enum?: string[];
}

const OPENAPI = JSON.parse(
  readFileSync(path.join(process.cwd(), "openapi", "openapi.json"), "utf8"),
) as {
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<
      string,
      {
        enum?: string[];
        required?: string[];
        additionalProperties?: boolean;
        properties?: Record<string, LengthSchema>;
      }
    >;
  };
};

const CREATE = OPENAPI.components.schemas.FinancialInstrumentCreate!;

/** `anyOf: [{string, maxLength}, {null}]` sarmalını açar. */
function stringBranch(schema: LengthSchema): LengthSchema {
  if (schema.anyOf === undefined) return schema;
  return schema.anyOf.find((branch) => branch.type === "string")!;
}

describe("uç · POST /financial-instruments SÖZLEŞMEDE VARDIR", () => {
  it("mockup yorumundaki `/checks` yolu YOKTUR — uç `/financial-instruments`tır", () => {
    // 🔴 FCE:38 `UÇ: POST /checks` yazar ve BAYATTIR. Yorumdan kopyalanan bir
    // yol dört kapıyı da yeşil geçer ve YALNIZ canlıda 404 verir.
    expect(Object.keys(OPENAPI.paths)).not.toContain("/checks");
    expect(OPENAPI.paths["/financial-instruments"]).toHaveProperty("post");
  });
});

describe("FinancialInstrumentCreate · gövde sözleşmesi", () => {
  it("zorunlu alanlar YEDİDİR ve formun zorunlu alanlarıyla AYNIDIR", () => {
    expect([...CREATE.required!].sort()).toEqual([
      "amount",
      "direction",
      "drawer_name",
      "due_date",
      "instrument_kind",
      "issue_date",
      "serial_no",
    ]);
  });

  it("opsiyonel alanlar DÖRTTÜR (FCE:159-190 `İsteğe Bağlı` bölümü)", () => {
    const optional = Object.keys(CREATE.properties!).filter(
      (name) => !CREATE.required!.includes(name),
    );
    expect(optional.sort()).toEqual([
      "bank_account_id",
      "bank_name",
      "description",
      "project_id",
    ]);
  });

  it("şema `extra=forbid`dir — fazladan alan 422 üretir", () => {
    expect(CREATE.additionalProperties).toBe(false);
  });

  it("🔴 `status` gövdeye GİRMEZ — yeni kayıt her zaman `portfolio` doğar", () => {
    expect(Object.keys(CREATE.properties!)).not.toContain("status");
    expect(Object.keys(buildInstrumentCreateBody(EMPTY_INSTRUMENT_FORM))).not.toContain(
      "status",
    );
  });

  it("uzunluk sınırları ekranın sabitleriyle AYNIDIR", () => {
    expect(CREATE.properties!.serial_no!.maxLength).toBe(SERIAL_NO_MAX_LENGTH);
    expect(CREATE.properties!.drawer_name!.maxLength).toBe(DRAWER_NAME_MAX_LENGTH);
    expect(stringBranch(CREATE.properties!.description!).maxLength).toBe(
      DESCRIPTION_MAX_LENGTH,
    );
    expect(stringBranch(CREATE.properties!.bank_name!).maxLength).toBe(BANK_NAME_MAX_LENGTH);
  });

  it("🔴 DENETİM SAPMASI 1 · `bank_name` SERBEST METİNDİR, kapalı liste DEĞİL", () => {
    // FCE:162-170 bankayı SABİT bir `<select>` olarak çizer. Sözleşmede
    // karşılığı `string(maxLength: 100)`tür: `$ref` YOK, `enum` YOK. Mockup'ın
    // listesi ekrana taşınsaydı, listede olmayan bir bankayla çalışan
    // kullanıcı kaydı HİÇ YAZAMAZDI.
    const branch = stringBranch(CREATE.properties!.bank_name!);
    expect(branch.type).toBe("string");
    expect(branch.enum).toBeUndefined();
    expect(CREATE.properties!.bank_name!.$ref).toBeUndefined();
  });

  it("`amount` sıfırdan BÜYÜKtür ve en fazla iki ondalık basamak taşır", () => {
    const numeric = CREATE.properties!.amount!.anyOf!.find(
      (branch) => branch.type === "number",
    )!;
    expect(numeric.exclusiveMinimum).toBe(0);
    const text = CREATE.properties!.amount!.anyOf!.find((branch) => branch.type === "string")!;
    // Desen `\d{0,2}` ile kuruşu sınırlar — sabit ondan TÜRETİLİR.
    expect(text.pattern).toContain(`\\.\\d{0,${AMOUNT_MAX_FRACTION_DIGITS}}`);
  });

  it("tür ve yön KAPALI kümedir; segment seçenekleri kümenin TAMAMIDIR", () => {
    const kinds = OPENAPI.components.schemas.FinancialInstrumentKind!.enum!;
    const directions = OPENAPI.components.schemas.FinancialInstrumentDirection!.enum!;
    expect([...INSTRUMENT_KIND_OPTIONS.map((option) => option.value)].sort()).toEqual(
      [...kinds].sort(),
    );
    expect([...INSTRUMENT_DIRECTION_OPTIONS.map((option) => option.value)].sort()).toEqual(
      [...directions].sort(),
    );
    // 🔴 DÖRT bileşimin dördü de geçerlidir (FCE:41-45) — segment sayısı
    // 2×2'dir ve birleşik tek seçim YAPILMAZ.
    expect(kinds.length * directions.length).toBe(4);
  });
});

/* ── Korkuluk SÖZLEŞMENİN SINIRINDA durur (N kabul · N+1 red) ────────────── */

const VALID: Parameters<typeof instrumentFormBlockReason>[0] = {
  ...EMPTY_INSTRUMENT_FORM,
  serialNo: "0123456789",
  drawerName: "Güneşkent Gayrimenkul A.Ş.",
  amountText: "1200000,00",
  issueDate: "2026-08-20",
  dueDate: "2026-09-20",
};

describe("instrumentFormBlockReason · sınır DEĞERİ kabul, bir fazlası RED", () => {
  it("geçerli form GÖNDERİLEBİLİR (negatif kontrol — kapı her şeye hayır demiyor)", () => {
    expect(instrumentFormBlockReason(VALID)).toBeUndefined();
  });

  it.each([
    ["serialNo", "serial_no", SERIAL_NO_MAX_LENGTH],
    ["drawerName", "drawer_name", DRAWER_NAME_MAX_LENGTH],
    ["description", "description", DESCRIPTION_MAX_LENGTH],
    ["bankName", "bank_name", BANK_NAME_MAX_LENGTH],
  ] as const)("%s: şemanın maxLength'i kabul, bir fazlası RED", (field, schemaName, max) => {
    const schema = stringBranch(CREATE.properties![schemaName]!);
    // Sınır ŞEMADAN okunur — sabit tekrar edilmez.
    expect(schema.maxLength).toBe(max);
    expect(
      instrumentFormBlockReason({ ...VALID, [field]: "x".repeat(schema.maxLength!) }),
    ).toBeUndefined();
    expect(
      instrumentFormBlockReason({ ...VALID, [field]: "x".repeat(schema.maxLength! + 1) }),
    ).toBeDefined();
  });

  it("`amount` sıfır ve negatif REDDEDİLİR, en küçük kuruş KABUL edilir", () => {
    expect(amountError("0")).toBeDefined();
    expect(amountError("-1")).toBeDefined();
    expect(amountError("0,01")).toBeUndefined();
  });

  it("🔴 ondalık ÖLÇEK sözleşmenin desenine oturur: 2 basamak kabul, 3 RED", () => {
    expect(amountError("1,23")).toBeUndefined();
    expect(amountError("0,005")).toBeDefined();
  });

  it("vade keşideden ÖNCEYSE gönderilemez; AYNI GÜN geçerlidir", () => {
    expect(
      instrumentFormBlockReason({ ...VALID, issueDate: "2026-08-20", dueDate: "2026-08-10" }),
    ).toBeDefined();
    expect(
      instrumentFormBlockReason({ ...VALID, issueDate: "2026-08-20", dueDate: "2026-08-20" }),
    ).toBeUndefined();
  });

  it.each(["serialNo", "drawerName", "issueDate", "dueDate", "amountText"] as const)(
    "%s BOŞ bırakılırsa gönderilemez (zorunlu alan)",
    (field) => {
      expect(instrumentFormBlockReason({ ...VALID, [field]: "" })).toBeDefined();
    },
  );

  it.each(["description", "bankName", "projectId", "bankAccountId"] as const)(
    "%s BOŞ bırakılabilir (opsiyonel) ve gövdeye HİÇ girmez",
    (field) => {
      expect(instrumentFormBlockReason({ ...VALID, [field]: "" })).toBeUndefined();
      expect(Object.keys(buildInstrumentCreateBody(VALID))).not.toContain(field);
    },
  );
});
