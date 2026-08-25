import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PERIOD_MONTHS } from "@/lib/format";

import {
  MAX_PAYROLL_YEAR,
  MIN_PAYROLL_YEAR,
  computeDisabledReason,
  periodFormBlockReason,
} from "./payroll-derive";

/**
 * 🔴🔴 SÖZLEŞME BEKÇİSİ — **KISIT TİPTE YAŞAMAZ.**
 *
 * `openapi-typescript` `PayrollPeriodCreate.year`i `number` diye üretir;
 * `minimum: 2000` / `maximum: 2100` ve `month`un `1..12`si **tipte İFADE
 * EDİLEMEZ**. Sonuç: `pnpm typecheck` yeşil, `pnpm test` yeşil, canlı **422**.
 * Bu modül tam bu sınıf yüzünden altı gün ölü kaldı (`limit=240` ↔ sözleşme
 * `maximum: 200`).
 *
 * Bu dosya iki şeyi birden çakar:
 *   1. ekranın korkuluk sabitleri (`MIN/MAX_PAYROLL_YEAR`, `PERIOD_MONTHS`)
 *      **sözleşmeden okunan** sınırlarla AYNIDIR — biri kayarsa test kırmızı;
 *   2. `Hesapla`nın etkin olduğu **durum kümesi** sözleşmenin
 *      `PayrollPeriodStatus` enum'unun TAMAMI üzerinden ölçülür — enum
 *      büyürse yeni üye sessizce "hesaplanabilir" sayılmaz.
 *
 * `expect(MIN_PAYROLL_YEAR).toBe(2000)` yazan bir test bu sınıfa KÖRDÜR:
 * sabiti tekrar eder, sözleşmeyi ölçmez.
 */
interface NumberSchema {
  minimum?: number;
  maximum?: number;
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
        properties?: Record<string, NumberSchema & { anyOf?: unknown[] }>;
      }
    >;
  };
};

const CREATE = OPENAPI.components.schemas.PayrollPeriodCreate!;

describe("PayrollPeriodCreate · gövde sözleşmesi", () => {
  it("`year` sınırları ekranın sabitleriyle AYNIDIR", () => {
    expect(CREATE.properties!.year!.minimum).toBe(MIN_PAYROLL_YEAR);
    expect(CREATE.properties!.year!.maximum).toBe(MAX_PAYROLL_YEAR);
  });

  it("`month` sınırları ay listesinin ilk/son DEĞERİDİR (1-12)", () => {
    const values = PERIOD_MONTHS.map((option) => option.value);
    expect(CREATE.properties!.month!.minimum).toBe(Math.min(...values));
    expect(CREATE.properties!.month!.maximum).toBe(Math.max(...values));
    // Liste ARALIKSIZDIR: 1..12 arasında eksik ay yoksa seçicideki her
    // seçenek sözleşmenin kabul ettiği bir değerdir.
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("zorunlu alanlar `year` + `month`tur; `payment_due_date` OPSİYONELDİR", () => {
    expect([...CREATE.required!].sort()).toEqual(["month", "year"]);
    expect(Object.keys(CREATE.properties!)).toContain("payment_due_date");
  });

  it("şema `extra=forbid`dir — fazladan alan 422 üretir", () => {
    expect(CREATE.additionalProperties).toBe(false);
  });

  it("`status` gövdeye GİRMEZ (yeni dönem her zaman `draft`)", () => {
    expect(Object.keys(CREATE.properties!)).not.toContain("status");
  });
});

describe("periodFormBlockReason · korkuluk SÖZLEŞMENİN SINIRINDA durur", () => {
  const rows = [] as const;

  it("sözleşmenin ALT sınırı kabul, bir altı RED", () => {
    const min = CREATE.properties!.year!.minimum!;
    expect(periodFormBlockReason({ year: min, month: 1, rows })).toBeUndefined();
    expect(periodFormBlockReason({ year: min - 1, month: 1, rows })).toBeDefined();
  });

  it("sözleşmenin ÜST sınırı kabul, bir üstü RED", () => {
    const max = CREATE.properties!.year!.maximum!;
    expect(periodFormBlockReason({ year: max, month: 12, rows })).toBeUndefined();
    expect(periodFormBlockReason({ year: max + 1, month: 12, rows })).toBeDefined();
  });
});

/**
 * 🔴 `Hesapla` DURUM KÜMESİ — ucun açıklaması *"Dönem `approved`/`paid` ise
 * **409**"* der. Küme enum'un TAMAMI üzerinden ölçülür: `toBe(2)` yazan bir
 * test enum büyüdüğünde de yeşil kalırdı.
 */
describe("computeDisabledReason · kapı sözleşmedeki DURUM kümesine oturur", () => {
  const statuses = OPENAPI.components.schemas.PayrollPeriodStatus!.enum!;
  const LOCKED = ["approved", "paid"] as const;

  it("enum dört üyelidir ve kilitli küme ONUN alt kümesidir", () => {
    expect([...statuses].sort()).toEqual(["approved", "draft", "paid", "pending_approval"]);
    for (const locked of LOCKED) expect(statuses).toContain(locked);
  });

  it("kilitli olmayan HER üye hesaplanabilir; kilitli her üye GEREKÇELİ kapalıdır", () => {
    for (const status of statuses) {
      const reason = computeDisabledReason(
        status as "draft" | "pending_approval" | "approved" | "paid",
        true,
      );
      if ((LOCKED as readonly string[]).includes(status)) {
        expect(reason, `${status} kapalı olmalı`).toBeDefined();
      } else {
        expect(reason, `${status} açık olmalı`).toBeUndefined();
      }
    }
  });

  it("yazma izni yoksa küme fark etmeksizin kapalıdır (fail-closed)", () => {
    for (const status of statuses) {
      expect(
        computeDisabledReason(
          status as "draft" | "pending_approval" | "approved" | "paid",
          false,
        ),
      ).toBeDefined();
    }
  });
});
