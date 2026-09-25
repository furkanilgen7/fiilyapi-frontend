// @vitest-environment node
//
// 🔴🔴 TEST İKİZİNİN **GÖVDE** SÖZLEŞMESİ BEKÇİSİ — `e2e/mock-backend.ts`.
//
// GEREKÇE ÖLÇÜLDÜ (2026-09-13). İkizde `POST`/`PUT`/`PATCH` dalı sayısı 121,
// `bodySchemaViolation(...)` kapısından geçen dal sayısı 8'di; `openapi.json`da
// JSON gövdesi olan 132 yazma operasyonunun 114'ü ifade edilebilir bir kısıt
// (`maxLength` · `enum` · `minLength` · `additionalProperties:false`) taşıyor.
// Yani ikiz, gerçek backend'in **REDDEDECEĞİ** gövdeleri kabul ediyordu:
// *onaylayıcıdır, bekçi değil.*
//
// Somut kayıp: `POST /purchase-requests` gövdesinde `justification`
// `maxLength: 2000`, `priority` üç üyeli bir enum'dur. İstemci korkuluğunu
// (`MAX_LENGTH.justification`, `purchase-request-validate.ts`) kaldıran bir
// mutasyon HİÇBİR kapıyı kırmıyordu — 676 e2e ve görsel kapı yeşil geçiyor,
// canlıda şantiye şefi Kaydet'e basınca FastAPI 422 dönüyordu.
//
// Bu dosya ikizi GERÇEKTEN AYAĞA KALDIRIR ve HTTP üzerinden konuşur: kaynak
// metnine bakan bir bekçi, kapının çağrıldığını görür ama ÇALIŞTIĞINI görmez.
//
// ⚠️ Sınırlar UYDURULMAZ, `openapi.json`dan OKUNUR (form-limits.contract).
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startMockBackend } from "../../../e2e/mock-backend";

import { fieldSchema } from "./form-limits.contract";

interface Violation {
  readonly type: string;
  readonly loc: readonly string[];
  readonly msg: string;
}

/** FastAPI 422 gövdesi — ikiz bunu BİREBİR taklit eder. */
interface ValidationBody {
  readonly detail: readonly Violation[] | string;
}

const JUSTIFICATION_MAX = fieldSchema("PurchaseRequestCreate", "justification")?.maxLength;

/** `PurchasePriority` üyeleri — enum listesi üretilen TS tipinde YAŞAMAZ. */
function priorityMembers(): readonly string[] {
  const spec = JSON.parse(
    readFileSync(path.join(process.cwd(), "openapi", "openapi.json"), "utf8"),
  ) as { components: { schemas: Record<string, { enum?: string[] }> } };
  return spec.components.schemas["PurchasePriority"]?.enum ?? [];
}

const PRIORITIES = priorityMembers();

let base = "";
let close: () => Promise<void>;

beforeAll(async () => {
  const started = startMockBackend(0);
  close = started.close;
  await new Promise<void>((resolve) => {
    started.server.once("listening", () => resolve());
  });
  const address = started.server.address();
  if (address === null || typeof address === "string") throw new Error("ikiz port alamadı");
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await close();
});

async function send(
  method: string,
  route: string,
  body: unknown,
): Promise<{ status: number; json: ValidationBody & Record<string, unknown> }> {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    json: (text === "" ? {} : JSON.parse(text)) as ValidationBody & Record<string, unknown>,
  };
}

async function anyProjectId(): Promise<string> {
  const response = await fetch(`${base}/projects`, { headers: { authorization: "Bearer t" } });
  const body = (await response.json()) as { items: { id: string }[] };
  return body.items[0].id;
}

function firstViolation(json: ValidationBody): Violation {
  expect(Array.isArray(json.detail), `422 gövdesi FastAPI biçiminde değil: ${JSON.stringify(json)}`)
    .toBe(true);
  return (json.detail as readonly Violation[])[0];
}

describe("🔴 test ikizi (`e2e/mock-backend.ts`) ↔ yazma gövdesi sözleşmesi", () => {
  it("bekçi GERÇEKTEN ölçüyor (kısıtlar sözleşmeden okundu)", () => {
    // Sahte-bekçi önlemi: kısıtlar `openapi.json`dan gelmezse aşağıdaki
    // iddialar hiçbir şey bekçilemez.
    expect(JUSTIFICATION_MAX, "PurchaseRequestCreate.justification.maxLength").toBeGreaterThan(0);
    expect(PRIORITIES.length, "PurchasePriority üye sayısı").toBeGreaterThan(1);
  });

  it("POST /purchase-requests — sözleşmeye UYAN gövde kabul edilir (fazla reddetmez)", async () => {
    const projectId = await anyProjectId();
    const { status } = await send("POST", "/purchase-requests", {
      project_id: projectId,
      priority: PRIORITIES[0],
      justification: "Kat 9 kolon demiri",
      lines: [{ free_text_name: "Nervürlü demir", free_text_unit: "ton", quantity: "12" }],
    });
    expect(status, "geçerli talep gövdesi 201 dönmeli").toBe(201);
  });

  it("POST /purchase-requests — `justification` maxLength aşımı 422 döner", async () => {
    const projectId = await anyProjectId();
    const { status, json } = await send("POST", "/purchase-requests", {
      project_id: projectId,
      justification: "x".repeat((JUSTIFICATION_MAX ?? 0) + 1),
    });
    expect(
      status,
      "ikiz, gerçek backend'in 422 vereceği gövdeyi KABUL ediyor — istemci " +
        "korkuluğunu kaldıran mutasyon hiçbir kapıyı kırmaz",
    ).toBe(422);
    const violation = firstViolation(json);
    expect(violation.type).toBe("string_too_long");
    expect(violation.loc).toEqual(["body", "justification"]);
  });

  it("POST /purchase-requests — sözleşme DIŞI `priority` 422 döner", async () => {
    const projectId = await anyProjectId();
    const bogus = "acil_degil";
    expect(PRIORITIES).not.toContain(bogus);
    const { status, json } = await send("POST", "/purchase-requests", {
      project_id: projectId,
      priority: bogus,
    });
    expect(status, "enum üyesi olmayan öncelik 422 olmalı").toBe(422);
    const violation = firstViolation(json);
    expect(violation.type).toBe("enum");
    expect(violation.loc).toEqual(["body", "priority"]);
  });

  it("PATCH /purchase-requests/{id} — `justification` maxLength aşımı 422 döner", async () => {
    const projectId = await anyProjectId();
    const created = await send("POST", "/purchase-requests", { project_id: projectId });
    expect(created.status).toBe(201);
    const requestId = String(created.json.id);

    const { status, json } = await send("PATCH", `/purchase-requests/${requestId}`, {
      justification: "x".repeat((JUSTIFICATION_MAX ?? 0) + 1),
    });
    expect(status, "PATCH gövdesi de sözleşmeye tabidir").toBe(422);
    const violation = firstViolation(json);
    expect(violation.type).toBe("string_too_long");
    expect(violation.loc).toEqual(["body", "justification"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PLN-F1.7b · PLANLAMA (EARNED VALUE) YAZMA UÇLARI
// ═══════════════════════════════════════════════════════════════════════════
//
// GEREKÇE ÖLÇÜLDÜ (PLN-F1.7a M3 mutasyonu): `POST /earned-value/catalog`
// gövde kapısı ikizden SİLİNDİĞİNDE tsc + bütün vitest bekçileri YEŞİL kaldı —
// bu dosya yalnız `/purchase-requests`i sınıyordu. EV ikizi 422 üretir ama
// ürettiğini söyleyen tek kapı yoktu. Kısıtlar burada da `openapi.json`dan
// OKUNUR; iş kuralı metni ikizin `guards.py` aynasından değil, yanıttan
// ölçülür (yalnız sınıfı sabitlenir).

/** `openapi.json`daki şemanın ham gövdesi (`required` / `pattern` için). */
function rawSchema(name: string): {
  required?: string[];
  properties?: Record<string, { pattern?: string; anyOf?: { pattern?: string }[] }>;
  additionalProperties?: boolean;
} {
  const doc = JSON.parse(
    readFileSync(path.join(process.cwd(), "openapi", "openapi.json"), "utf8"),
  ) as { components: { schemas: Record<string, ReturnType<typeof rawSchema>> } };
  return doc.components.schemas[name] ?? {};
}

const CATALOG_REQUIRED = rawSchema("CatalogItemCreate").required ?? [];
const COLOR_PATTERN = rawSchema("DisciplineCreate").properties?.["color"]?.pattern;
const LEAF_RATE_MIN = fieldSchema("LeafPatch", "unit_mhr")?.minimum;
const LEAF_FORBIDS_EXTRA = rawSchema("LeafPatch").additionalProperties === false;

async function getJson<T>(route: string): Promise<T> {
  const response = await fetch(`${base}${route}`, { headers: { authorization: "Bearer t" } });
  return (await response.json()) as T;
}

async function anyDisciplineId(): Promise<string> {
  const list = await getJson<{ id: string }[]>("/earned-value/disciplines");
  return list[0].id;
}

/** s-1 taslağındaki ilk yaprak (kalem + bölüm) — PATCH gövdesinin gerçek hedefi. */
async function anyLeaf(): Promise<{ item_id: string; section_id: string | null }> {
  const view = await getJson<{
    disciplines: { groups: { items: { leaves: { item_id: string; section_id: string | null }[] }[] }[] }[];
  }>("/sites/s-1/earned-value/budget");
  return view.disciplines[0].groups[0].items[0].leaves[0];
}

function validSettings(): Record<string, unknown> {
  return {
    week_start_dow: 0,
    weekly_off_days: [6],
    standard_daily_hours: "9",
    tolerance_points: "2",
    pf_bands: {
      daily: { red_below: "0.95", green_from: "0.95", high_above: "1.05" },
      weekly: { red_below: "0.95", green_from: "1" },
    },
    holidays: [],
    composite_metrics: [],
  };
}

describe("🔴 test ikizi ↔ Planlama (EV) yazma gövdesi sözleşmesi", () => {
  it("bekçi GERÇEKTEN ölçüyor (kısıtlar sözleşmeden okundu)", () => {
    expect(CATALOG_REQUIRED, "CatalogItemCreate.required").toContain("name");
    expect(COLOR_PATTERN, "DisciplineCreate.color.pattern").toBeTruthy();
    expect(LEAF_RATE_MIN, "LeafPatch.unit_mhr.minimum").toBe(0);
    expect(LEAF_FORBIDS_EXTRA, "LeafPatch additionalProperties:false").toBe(true);
  });

  it("POST /earned-value/catalog — sözleşmeye UYAN gövde kabul edilir (fazla reddetmez)", async () => {
    const { status, json } = await send("POST", "/earned-value/catalog", {
      discipline_id: await anyDisciplineId(),
      name: "Sözleşme bekçisi iş tipi",
      uom: "m²",
      standard_unit_mhr: "0.5",
      default_contractor_type: "own",
    });
    expect(status, "geçerli katalog gövdesi 201 dönmeli").toBe(201);
    expect(json.name).toBe("Sözleşme bekçisi iş tipi");
  });

  it("POST /earned-value/catalog — zorunlu `name` eksik 422 döner", async () => {
    const { status, json } = await send("POST", "/earned-value/catalog", {
      discipline_id: await anyDisciplineId(),
      uom: "m²",
      standard_unit_mhr: "0.5",
      default_contractor_type: "own",
    });
    expect(status, "ikiz zorunlu alanı eksik katalog gövdesini KABUL ediyor").toBe(422);
    const violation = firstViolation(json);
    expect(violation.type).toBe("missing");
    expect(violation.loc).toEqual(["body", "name"]);
  });

  it("POST /earned-value/disciplines — renk deseni ihlali 422 döner", async () => {
    const bogus = "kırmızı";
    expect(new RegExp(COLOR_PATTERN ?? "").test(bogus)).toBe(false);
    const { status, json } = await send("POST", "/earned-value/disciplines", {
      code: "BKC",
      name: "Bekçi disiplini",
      color: bogus,
      default_contractor_type: "subcon",
    });
    expect(status, "desen dışı renk 422 olmalı").toBe(422);
    const violation = firstViolation(json);
    expect(violation.type).toBe("string_pattern_mismatch");
    expect(violation.loc).toEqual(["body", "color"]);
  });

  it("PUT …/earned-value/settings — geçerli gövde kaydedilir ve sonraki GET onu döner", async () => {
    const body = { ...validSettings(), standard_daily_hours: "8.5" };
    const saved = await send("PUT", "/sites/s-1/earned-value/settings", body);
    expect(saved.status).toBe(200);
    const read = await getJson<{ standard_daily_hours: string }>("/sites/s-1/earned-value/settings");
    expect(read.standard_daily_hours).toBe("8.50");
  });

  it("PUT …/earned-value/settings — günlük bant sırası bozuk (iş kuralı) 422 döner", async () => {
    const body = {
      ...validSettings(),
      pf_bands: {
        daily: { red_below: "0.99", green_from: "0.95", high_above: "1.05" },
        weekly: { red_below: "0.95", green_from: "1" },
      },
    };
    const { status, json } = await send("PUT", "/sites/s-1/earned-value/settings", body);
    expect(status, "kırmızı > yeşil bandı gerçek backend 422 ile reddeder").toBe(422);
    // İş kuralı hatası (`EarnedValueValidationError`) FastAPI dizisi DEĞİL, düz metindir.
    expect(typeof json.detail).toBe("string");
    expect(String(json.detail)).toContain("Günlük PF bantları");
  });

  it("PATCH …/budget/leaves — iç içe ihlalin `loc`u tam yoldur (negatif oran)", async () => {
    const leaf = await anyLeaf();
    const { status, json } = await send("PATCH", "/sites/s-1/earned-value/budget/leaves", {
      leaves: [{ boq_item_id: leaf.item_id, section_id: leaf.section_id, unit_mhr: -1 }],
    });
    expect(status, "negatif birim oran 422 olmalı").toBe(422);
    const violation = firstViolation(json);
    expect(violation.type).toBe("greater_than_equal");
    expect(violation.loc).toEqual(["body", "leaves", 0, "unit_mhr"]);
  });

  it("PATCH …/budget/leaves — yaprakta tanınmayan alan `extra_forbidden` döner", async () => {
    const leaf = await anyLeaf();
    const { status, json } = await send("PATCH", "/sites/s-1/earned-value/budget/leaves", {
      leaves: [{ boq_item_id: leaf.item_id, section_id: leaf.section_id, oran: "1" }],
    });
    expect(status).toBe(422);
    const violation = firstViolation(json);
    expect(violation.type).toBe("extra_forbidden");
    expect(violation.loc).toEqual(["body", "leaves", 0, "oran"]);
  });
});
