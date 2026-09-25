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

import {
  DIARY_LINE_ARM_FIXTURE,
  EV_DAY_SCENARIO_DAYS,
  TIMESHEET_LOCK_SCENARIOS,
  startMockBackend,
} from "../../../e2e/mock-backend";

import { fieldSchema } from "./form-limits.contract";
import type { components } from "./schema";

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

// ═══════════════════════════════════════════════════════════════════════════
// PLN-F2.5a · SAHA (EV GÜN) YAZMA UÇLARI + GÜNLÜK GÖNDER 422
// ═══════════════════════════════════════════════════════════════════════════
//
// GEREKÇE: gün dağıtımı `PUT …/allocation` gövdesi TAM DEĞİŞTİRMEDİR ve tam
// küme kuralları (kod ağaçta · oranlı · hücrenin kodu gövdede · satır canlı
// kaynakta) backend'de 422'dir. İkiz bunları kabul etseydi istemcinin
// korkuluğunu kaldıran mutasyon hiçbir e2e'yi kırmazdı. Kısıtlar
// `openapi.json`dan, senaryo günleri ikizin kendi tablosundan okunur.


const ALLOCATION_FORBIDS_EXTRA = rawSchema("AllocationSave").additionalProperties === false;
const ALLOCATION_REQUIRED = rawSchema("AllocationSave").required ?? [];
const UNLOCK_REASON_MIN = fieldSchema("UnlockBody", "reason")?.minLength;
const DAY = (key: keyof typeof EV_DAY_SCENARIO_DAYS) => `/sites/s-1/earned-value/days/${EV_DAY_SCENARIO_DAYS[key]}`;

interface DayViewLike {
  has_baseline: boolean;
  lock: { locked: boolean; report_date: string | null; unlock: { reason: string } | null };
  rows: { kind: string; ref_id: string; hours: string; saved_hours: string | null; changed: boolean }[];
  codes: { node_id: string; rule: string }[];
  cells: { kind: string; ref_id: string; node_id: string; hours: string }[];
  totals: { source_hours: string; allocated_hours: string; unallocated_hours: string };
  progress: { items?: { node_id: string }[]; leaves: { node_id: string }[] } | null;
  submit: { can_submit: boolean; reason_items?: { code: string }[] } | null;
}

/** Günün mevcut kodları + ilk canlı satır — geçerli bir gövdenin iskeleti. */
async function dayBody(key: keyof typeof EV_DAY_SCENARIO_DAYS): Promise<{ view: DayViewLike; row: { kind: string; ref_id: string } }> {
  const view = await getJson<DayViewLike>(DAY(key));
  return { view, row: { kind: view.rows[0].kind, ref_id: view.rows[0].ref_id } };
}

describe("🔴 test ikizi ↔ Saha (EV gün) yazma gövdesi sözleşmesi", () => {
  it("bekçi GERÇEKTEN ölçüyor (kısıtlar sözleşmeden okundu)", () => {
    expect(ALLOCATION_FORBIDS_EXTRA, "AllocationSave additionalProperties:false").toBe(true);
    expect(ALLOCATION_REQUIRED, "AllocationSave.required").toEqual(expect.arrayContaining(["codes", "cells"]));
    expect(UNLOCK_REASON_MIN, "UnlockBody.reason.minLength").toBeGreaterThan(1);
  });

  it("GET dolu gün — dağıtım + dağıtılmamış saat + 'puantaj değişti' + kalem düğümü", async () => {
    const view = await getJson<DayViewLike>(DAY("full"));
    expect(view.has_baseline).toBe(true);
    expect(Number(view.totals.unallocated_hours)).toBeGreaterThan(0);
    expect(view.rows.some((row) => row.changed && row.saved_hours !== null)).toBe(true);
    expect(view.progress?.items?.some((item) => item.node_id.startsWith("i:"))).toBe(true);
    expect(view.submit?.reason_items?.map((r) => r.code)).toEqual(["undistributed_hours"]);
  });

  it("GET kilitli · engelli · EV'siz gün senaryoları", async () => {
    const locked = await getJson<DayViewLike>(DAY("locked"));
    expect(locked.lock).toMatchObject({ locked: true, report_date: EV_DAY_SCENARIO_DAYS.locked });
    const blocked = await getJson<DayViewLike>(DAY("blocked"));
    expect(blocked.submit?.can_submit).toBe(false);
    expect(blocked.submit?.reason_items?.map((r) => r.code)).toEqual(["weather_incomplete", "no_quantity"]);
    const noEv = await getJson<DayViewLike>(DAY("noEv"));
    expect(noEv.has_baseline).toBe(false);
    expect(noEv.progress).toBeNull();
    // 🔒 Yazma hedefleri (F2.5b yazma akışları görsel senaryoları bozmasın diye ayrı günler).
    expect((await getJson<DayViewLike>(DAY("writeTarget"))).lock.locked).toBe(false);
    expect((await getJson<DayViewLike>(DAY("unlockTarget"))).lock.locked).toBe(true);
  });

  // 🔒 SIRA: günlük testleri PUT'lardan ÖNCE koşar. PUT testleri reddedilen
  // gövdelerle engelli günü hedefler; bir mutant gövdeyi KABUL ederse günün
  // dağıtımı değişir ve Gönder iddiası o mutant yüzünden de kırılırdı (bağlı
  // kırmızı). Böylece her mutant YALNIZ kendi testini kırar.
  it("POST /diary/{id}/submit — EV engeli `{detail, reasons, reason_items}` ile 422 döner", async () => {
    const list = await getJson<{ items: { id: string; entry_date: string }[] }>("/sites/s-1/diary?year=2026&month=10");
    const entry = list.items.find((item) => item.entry_date === EV_DAY_SCENARIO_DAYS.blocked);
    expect(entry, "engelli günün günlük kaydı").toBeDefined();
    const { status, json } = await send("POST", `/diary/${entry?.id}/submit`, {});
    expect(status).toBe(422);
    expect(json.reasons).toHaveLength(2);
    expect((json.reason_items as { code: string }[]).map((r) => r.code)).toEqual(["weather_incomplete", "no_quantity"]);
    expect(String(json.detail)).toContain("Miktar girilmedi");
  });

  it("PATCH /diary/{id} — firma satırında tanınmayan alan iç içe `extra_forbidden` döner", async () => {
    const list = await getJson<{ items: { id: string; entry_date: string }[] }>("/sites/s-1/diary?year=2026&month=10");
    // Dolu günün kaydı: reddedilen gövde durumu DEĞİŞTİRMEZ; engelli gün (Gönder testi) ile bağ yok.
    const entry = list.items.find((item) => item.entry_date === EV_DAY_SCENARIO_DAYS.full);
    const { status, json } = await send("PATCH", `/diary/${entry?.id}`, {
      worker_counts: [{ trade: "Duvarcı", source: "subcontractor", count: 3, subcontractor_id: "sub-2", hours: 8, kisi: 3 }],
    });
    expect(status).toBe(422);
    expect(firstViolation(json)).toMatchObject({ type: "extra_forbidden", loc: ["body", "worker_counts", 0, "kisi"] });
  });

  it("PUT allocation — tanınmayan üst alan `extra_forbidden` döner", async () => {
    const { status, json } = await send("PUT", `${DAY("blocked")}/allocation`, { codes: [], cells: [], oran: 1 });
    expect(status).toBe(422);
    expect(firstViolation(json)).toMatchObject({ type: "extra_forbidden", loc: ["body", "oran"] });
  });

  it("PUT allocation — zorunlu `cells` eksik 422 döner", async () => {
    const { status, json } = await send("PUT", `${DAY("blocked")}/allocation`, { codes: [] });
    expect(status).toBe(422);
    expect(firstViolation(json)).toMatchObject({ type: "missing", loc: ["body", "cells"] });
  });

  it("PUT allocation — hücre saati 0 (`exclusiveMinimum`) iç içe tam yolla 422 döner", async () => {
    const { view, row } = await dayBody("blocked");
    const { status, json } = await send("PUT", `${DAY("blocked")}/allocation`, {
      codes: view.codes,
      cells: [{ row, node_id: view.codes[0].node_id, hours: 0 }],
    });
    expect(status).toBe(422);
    expect(firstViolation(json)).toMatchObject({ type: "greater_than", loc: ["body", "cells", 0, "hours"] });
  });

  it("PUT allocation — hücre satırında `kind` enum dışı 422 döner", async () => {
    const { view, row } = await dayBody("blocked");
    const { status, json } = await send("PUT", `${DAY("blocked")}/allocation`, {
      codes: view.codes,
      cells: [{ row: { ...row, kind: "ekip" }, node_id: view.codes[0].node_id, hours: 1 }],
    });
    expect(status).toBe(422);
    expect(firstViolation(json)).toMatchObject({ type: "enum", loc: ["body", "cells", 0, "row", "kind"] });
  });

  it("PUT allocation — tam küme: hücrenin kodu gövdede yok · oransız yaprak kod 422", async () => {
    const { view, row } = await dayBody("blocked");
    const missing = await send("PUT", `${DAY("blocked")}/allocation`, {
      codes: [],
      cells: [{ row, node_id: view.codes[0].node_id, hours: 1 }],
    });
    expect(missing.status).toBe(422);
    expect(String(missing.json.detail)).toContain("Hücrenin iş kodu gün kodlarında yok");
    const unrated = await send("PUT", `${DAY("blocked")}/allocation`, {
      codes: [{ node_id: "l:bi-6:none", rule: "direct" }],
      cells: [],
    });
    expect(unrated.status).toBe(422);
    expect(String(unrated.json.detail)).toContain("Oransız yaprak iş kodu olamaz");
  });

  it("PUT allocation — TAM DEĞİŞTİRME: gövdede olmayan kod/hücre SİLİNİR", async () => {
    const before = await getJson<DayViewLike>(DAY("full"));
    expect(before.codes.length).toBeGreaterThan(1);
    const kept = before.codes[0];
    const row = before.rows[0];
    const saved = await send("PUT", `${DAY("full")}/allocation`, {
      codes: [kept],
      cells: [{ row: { kind: row.kind, ref_id: row.ref_id }, node_id: kept.node_id, hours: "4.5" }],
    });
    expect(saved.status).toBe(200);
    const after = await getJson<DayViewLike>(DAY("full"));
    expect(after.codes.map((c) => c.node_id)).toEqual([kept.node_id]);
    expect(after.cells).toEqual([{ kind: row.kind, ref_id: row.ref_id, node_id: kept.node_id, hours: "4.50" }]);
    expect(after.totals.allocated_hours).toBe("4.50");
    // Kayıt anlık görüntüyü tazeler: "puantaj değişti" kalkar.
    expect(after.rows.some((r) => r.changed)).toBe(false);
  });

  it("kilitli gün: PUT allocation 409 · kısa gerekçe 422 · kilit açılınca yazma serbest", async () => {
    const { view, row } = await dayBody("locked");
    const blocked = await send("PUT", `${DAY("locked")}/allocation`, { codes: view.codes, cells: [] });
    expect(blocked.status).toBe(409);
    expect(String(blocked.json.detail)).toContain("ilerleme raporuyla kilitli");
    // Backend `assert_days_unlocked(site, [day])` gövdesi — kapsam yalnız bu gün.
    expect(blocked.json.locked_days).toEqual([EV_DAY_SCENARIO_DAYS.locked]);
    expect(blocked.json.day_locks).toEqual([
      { day: EV_DAY_SCENARIO_DAYS.locked, report_date: EV_DAY_SCENARIO_DAYS.locked },
    ]);
    const short = await send("POST", `${DAY("locked")}/unlock`, { reason: "x".repeat((UNLOCK_REASON_MIN ?? 1) - 1) });
    expect(short.status).toBe(422);
    expect(firstViolation(short.json)).toMatchObject({ type: "string_too_short", loc: ["body", "reason"] });
    const opened = await send("POST", `${DAY("locked")}/unlock`, { reason: "Miktar düzeltmesi" });
    expect(opened.status).toBe(200);
    expect(opened.json).toMatchObject({ locked: false, unlock: { reason: "Miktar düzeltmesi" } });
    const again = await send("POST", `${DAY("locked")}/unlock`, { reason: "İkinci kez" });
    expect(again.status, "kilitli olmayan gün 409").toBe(409);
    const written = await send("PUT", `${DAY("locked")}/allocation`, {
      codes: view.codes,
      cells: [{ row, node_id: view.codes[0].node_id, hours: 9 }],
    });
    expect(written.status).toBe(200);
  });

  it("EV'siz gün: PUT allocation 409 (baseline yok) · code-tree s-2 boş", async () => {
    const { status, json } = await send("PUT", `${DAY("noEv")}/allocation`, { codes: [], cells: [] });
    expect(status).toBe(409);
    expect(String(json.detail)).toContain("baseline yok");
    expect(await getJson<unknown[]>("/sites/s-2/earned-value/code-tree")).toEqual([]);
    const tree = await getJson<{ id: string; has_rate: boolean | null }[]>("/sites/s-1/earned-value/code-tree");
    expect(tree.some((node) => node.has_rate === false), "en az bir ORANSIZ yaprak (K12)").toBe(true);
  });

  // PLN-F2.5e · Günlük adaptörü Kendi/Taşeron etiketini ve G9 dolaylı hâlini
  // AKTİF bütçenin `item_id`'sinden okur ve günlük satırının `boq_item_id`'siyle
  // eşler (`earned-value/diary/item-meta.ts`). Kesişim boşsa hiçbir karede
  // etiket/dolaylı hâl basılmaz ve bu hiçbir kapıyı kırmaz — bekçi burada.
  it("günlük senaryosu: aktif bütçe kalemleri ↔ günlük BOQ kalemleri kesişir (Kendi · Taşeron · dolaylı)", async () => {
    const revisions = await getJson<{ id: string; status: string }[]>("/sites/s-1/earned-value/budget/revisions");
    const active = revisions.find((revision) => revision.status === "active");
    expect(active, "s-1 aktif revizyonu").toBeDefined();
    const budget = await getJson<{
      disciplines: { groups: { items: { item_id: string; contractor_type: string; is_direct: boolean }[] }[] }[];
    }>(`/sites/s-1/earned-value/budget?revision_id=${active?.id}`);
    const budgetItems = new Map(
      budget.disciplines.flatMap((d) => d.groups.flatMap((g) => g.items)).map((item) => [item.item_id, item] as const),
    );

    const list = await getJson<{ items: { id: string; entry_date: string }[] }>("/sites/s-1/diary?year=2026&month=10");
    const evDays: ReadonlySet<string> = new Set([EV_DAY_SCENARIO_DAYS.full, EV_DAY_SCENARIO_DAYS.locked]);
    const entries = list.items.filter((item) => evDays.has(item.entry_date));
    expect(entries, "EV'li senaryo günlerinin günlük kayıtları").toHaveLength(2);
    const lineItemIds = new Set<string>();
    for (const entry of entries) {
      const detail = await getJson<{ lines: { boq_item_id: string }[] }>(`/diary/${entry.id}`);
      for (const line of detail.lines) lineItemIds.add(line.boq_item_id);
    }
    const shared = [...lineItemIds].flatMap((id) => budgetItems.get(id) ?? []);
    expect(shared.length, "günlük satırı ↔ bütçe kalemi kesişimi").toBeGreaterThan(0);
    expect(shared.some((item) => item.is_direct && item.contractor_type === "own"), "en az bir Kendi kalem").toBe(true);
    expect(shared.some((item) => item.is_direct && item.contractor_type === "subcon"), "en az bir Taşeron kalem").toBe(true);
    expect(shared.some((item) => !item.is_direct), "en az bir dolaylı kalem (G9)").toBe(true);

    // CEO kararı (c): ORANSIZ yaprağın kalemi (K12 · İç Sıva) dolaylı DEĞİLDİR —
    // karede "Bölümsüz" + oransız uyarısıyla basılır, "Tüm şantiye" olmaz.
    const tree = await getJson<{ id: string; has_rate: boolean | null }[]>("/sites/s-1/earned-value/code-tree");
    const unratedItemIds = new Set(
      tree.filter((node) => node.has_rate === false).map((node) => node.id.split(":")[1]),
    );
    const unratedInDays = [...lineItemIds].filter((id) => unratedItemIds.has(id));
    expect(unratedInDays.length, "senaryo günlerinde oransız yaprak kalemi").toBeGreaterThan(0);
    for (const id of unratedInDays) {
      expect(budgetItems.get(id)?.is_direct === false, `oransız kalem ${id} dolaylı OLMAMALI`).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PLN-F2.5b · PUANTAJ KİLİDİ (§3.14 P1–P5 · EV-BORC-4)
// ═══════════════════════════════════════════════════════════════════════════
//
// GEREKÇE: puantaj haftasının `locked_days`/`day_locks`i ve `PUT` 409'u EV gün
// kilidinden (TEK kaynak, `evLockState`) türer. İkiz kilitli günü yazmaya izin
// verseydi istemcinin salt okunur korkuluğunu (`LockedWeekCell`) kaldıran bir
// mutasyon hiçbir e2e'yi kırmazdı; 409 gövdesi `locked_days` taşımasaydı
// istemcinin kilit dalı (`timesheetLockConflictLocks`) kişi-gün çakışmasına
// düşerdi. 409 metni backend `diary_adapter.LOCKED_MESSAGE` ile BİREBİRdir.
//
// 🔒 SIRA: bu blok dosyanın SONUNDADIR ve ikiz dosya içinde paylaşılır; yazan
// testler (P5 200 · kilit açma) okuyan testlerden SONRA koşar.

interface WeekCellLike {
  work_date: string;
  hours: string | null;
  code: string | null;
  section_id: string | null;
}

interface WeekLike {
  locked_days?: string[];
  day_locks?: { day: string; report_date: string | null }[];
  rows: { personnel_id: string; cells: WeekCellLike[] }[];
}

interface PutCell extends WeekCellLike {
  personnel_id: string;
}

const LOCK = TIMESHEET_LOCK_SCENARIOS;
const WEEK = (isoWeek: number) => `/sites/s-1/timesheet/week?iso_year=2026&iso_week=${isoWeek}`;

/** Haftanın TAM hücre kümesi (PUT gövdesi) — GET yanıtından. */
function weekCells(week: WeekLike): PutCell[] {
  return week.rows.flatMap((row) =>
    row.cells.map((cell) => ({ personnel_id: row.personnel_id, ...cell })),
  );
}

function withHours(cells: readonly PutCell[], personnelId: string, day: string, hours: string): PutCell[] {
  return cells.map((cell) =>
    cell.personnel_id === personnelId && cell.work_date === day ? { ...cell, hours, code: null } : cell,
  );
}

describe("🔴 test ikizi ↔ puantaj KİLİDİ (EV gün kilidi TEK kaynak)", () => {
  it("Ağustos/Eylül puantaj haftaları KİLİTSİZ — mevcut görsel kareler etkilenmez", async () => {
    for (const isoWeek of [32, 35, 36, 37, 38, 39]) {
      const week = await getJson<WeekLike>(WEEK(isoWeek));
      expect(week.locked_days, `W${isoWeek}`).toEqual([]);
      expect(week.day_locks, `W${isoWeek}`).toEqual([]);
    }
  });

  it("(a) kısmen kilitli hafta · TEK rapor: Pzt–Per ← 15.10", async () => {
    const week = await getJson<WeekLike>(WEEK(LOCK.partial.isoWeek));
    const days = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"];
    expect(week.locked_days).toEqual(days);
    expect(week.day_locks).toEqual(days.map((day) => ({ day, report_date: LOCK.partial.reportDate })));
    expect(week.rows.length, "kilitli haftada puantaj satırı var").toBeGreaterThan(0);
  });

  it("(b) ardışık OLMAYAN · İKİ rapor: gün1→rapor gün1 · gün2 açık · gün3/gün4→rapor gün4", async () => {
    const week = await getJson<WeekLike>(WEEK(LOCK.twoReports.isoWeek));
    expect(week.locked_days).toEqual(["2026-10-19", "2026-10-21", "2026-10-22"]);
    expect(week.day_locks).toEqual([
      { day: "2026-10-19", report_date: "2026-10-19" },
      { day: "2026-10-21", report_date: "2026-10-22" },
      { day: "2026-10-22", report_date: "2026-10-22" },
    ]);
  });

  it("(c) tamamen kilitli hafta: yedi gün ← 01.11", async () => {
    const week = await getJson<WeekLike>(WEEK(LOCK.full.isoWeek));
    expect(week.locked_days).toHaveLength(7);
    expect(week.locked_days?.[0]).toBe("2026-10-26");
    expect(week.locked_days?.[6]).toBe("2026-11-01");
    expect(new Set(week.day_locks?.map((lock) => lock.report_date))).toEqual(new Set([LOCK.full.reportDate]));
  });

  it("puantaj kilidi = EV gün kilidi (aynı kaynak): kilitli gün + istisnayla açılmış gün", async () => {
    const locked = await getJson<DayViewLike>("/sites/s-1/earned-value/days/2026-10-14");
    expect(locked.lock).toMatchObject({ locked: true, report_date: LOCK.partial.reportDate, unlock: null });
    // Sal 20: 22.10 onayı kapsar ama ona bağlı istisna açmıştır.
    const opened = await getJson<DayViewLike>("/sites/s-1/earned-value/days/2026-10-20");
    expect(opened.lock).toMatchObject({ locked: false, report_date: "2026-10-22", unlock: { reason: "Puantaj düzeltmesi" } });
  });

  it("PUT — kilitli günü DEĞİŞTİREN gövde 409 `{detail, locked_days, day_locks}` · atomik (hiçbir şey yazılmaz)", async () => {
    const before = await getJson<WeekLike>(WEEK(LOCK.conflict.isoWeek));
    // Sal 3 Kas KİLİTLİ (9 → 10) + Per 5 Kas kilitsiz (9 → 11).
    const cells = withHours(withHours(weekCells(before), "per-1", "2026-11-03", "10.0"), "per-1", "2026-11-05", "11.0");
    const { status, json } = await send("PUT", WEEK(LOCK.conflict.isoWeek), { cells });
    expect(status).toBe(409);
    expect(json).toEqual({
      detail: "Bu gün 03.11.2026 tarihli ilerleme raporuyla kilitli",
      locked_days: ["2026-11-02", "2026-11-03"],
      day_locks: [
        { day: "2026-11-02", report_date: LOCK.conflict.reportDate },
        { day: "2026-11-03", report_date: LOCK.conflict.reportDate },
      ],
    });
    // Atomik: kilitsiz günün değişikliği de YAZILMADI.
    expect(await getJson<WeekLike>(WEEK(LOCK.conflict.isoWeek))).toEqual(before);
  });

  it("PUT — kilitli günün hücresini SİLEN gövde de 409 (silinen hücre = değişen gün)", async () => {
    const before = await getJson<WeekLike>(WEEK(LOCK.conflict.isoWeek));
    const cells = weekCells(before).filter(
      (cell) => !(cell.personnel_id === "per-2" && cell.work_date === "2026-11-02"),
    );
    const { status, json } = await send("PUT", WEEK(LOCK.conflict.isoWeek), { cells });
    expect(status).toBe(409);
    expect(json.locked_days).toEqual(["2026-11-02", "2026-11-03"]);
  });

  it("P5 — kilitli günleri DEĞİŞMEDEN taşıyan gövde 200 (yalnız kilitsiz gün yazılır)", async () => {
    const before = await getJson<WeekLike>(WEEK(LOCK.conflict.isoWeek));
    const cells = withHours(weekCells(before), "per-1", "2026-11-05", "11.0");
    const { status, json } = await send("PUT", WEEK(LOCK.conflict.isoWeek), { cells });
    expect(status).toBe(200);
    expect(json.locked_days).toEqual(["2026-11-02", "2026-11-03"]);
    const after = await getJson<WeekLike>(WEEK(LOCK.conflict.isoWeek));
    expect(weekCells(after)).toEqual(expect.arrayContaining([expect.objectContaining({ personnel_id: "per-1", work_date: "2026-11-05", hours: "11.0" })]));
  });

  it("kilit açılınca (`POST …/unlock`) puantajda da açılır ve o gün yazılabilir", async () => {
    const unlockDay = EV_DAY_SCENARIO_DAYS.unlockTarget;
    const lockedWeek = await getJson<WeekLike>(WEEK(40));
    expect(lockedWeek.locked_days).toEqual([unlockDay]);
    const newCell: PutCell = { personnel_id: "per-1", work_date: unlockDay, hours: "9.0", code: null, section_id: "sec-1" };
    const refused = await send("PUT", WEEK(40), { cells: [...weekCells(lockedWeek), newCell] });
    expect(refused.status, "kilitliyken yazma 409").toBe(409);

    const opened = await send("POST", `/sites/s-1/earned-value/days/${unlockDay}/unlock`, { reason: "Puantaj düzeltmesi" });
    expect(opened.status).toBe(200);
    const openWeek = await getJson<WeekLike>(WEEK(40));
    expect(openWeek.locked_days).toEqual([]);
    expect(openWeek.day_locks).toEqual([]);
    const written = await send("PUT", WEEK(40), { cells: [...weekCells(openWeek), newCell] });
    expect(written.status, "kilit açıldıktan sonra yazma serbest").toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DET-1.1m · günlük DETAY BAĞLAMI + bölüm günlüğü (backend DET-1.B)
// ═══════════════════════════════════════════════════════════════════════════
//
// GEREKÇE: salt okunur günlük detayı (DET-1) TEK istekte kurulur — adlar, gün
// kilidi, bölüm bağlamında önceki/sonraki. İkiz bunları uydursaydı ya da Kural
// A'nın SATIR kolunu (başlığı başka bölüm ama bu bölüme miktar yazılmış gün)
// atlasaydı, istemcinin komşu gezintisi ve bölüm listesi hiçbir kapıyı
// kırmadan canlıdan ayrışırdı. Kaynak: backend `site_diary/{repository,
// detail_context,read}.py` (`origin/det-1`).
//
// 🔒 AYRI İKİZ: bu blok kayıt YAZAR (başlık bölümü değişir, gönder/geri al,
// kilit açma) — dosyanın paylaşılan ikizini kirletmemek için kendi örneğini
// kaldırır.

type DiaryDetail = components["schemas"]["SiteDiaryEntryDetail"];
type DiaryList = components["schemas"]["SiteDiaryEntryListResponse"];

/** DET-1.4 · Kural A SATIR KOLU fikstürü (12.11.2026 · başlık sec-2 · satırlar sec-1 ×2 + sec-2 ×1). */
const LINE_ARM = DIARY_LINE_ARM_FIXTURE;

describe("🔴 test ikizi ↔ günlük detay bağlamı + Kural A (DET-1.B)", () => {
  let detBase = "";
  let detClose: () => Promise<void>;

  beforeAll(async () => {
    const started = startMockBackend(0);
    detClose = started.close;
    await new Promise<void>((resolve) => {
      started.server.once("listening", () => resolve());
    });
    const address = started.server.address();
    if (address === null || typeof address === "string") throw new Error("ikiz port alamadı");
    detBase = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await detClose();
  });

  async function call<T>(method: string, route: string, body?: unknown): Promise<{ status: number; json: T }> {
    const response = await fetch(`${detBase}${route}`, {
      method,
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, json: (text === "" ? {} : JSON.parse(text)) as T };
  }

  async function detail(entryId: string, sectionId?: string): Promise<DiaryDetail> {
    const query = sectionId === undefined ? "" : `?section_id=${sectionId}`;
    const { status, json } = await call<DiaryDetail>("GET", `/diary/${entryId}${query}`);
    expect(status, `GET /diary/${entryId}${query}`).toBe(200);
    return json;
  }

  async function list(query: string): Promise<DiaryList> {
    const { status, json } = await call<DiaryList>("GET", `/sites/s-1/diary?${query}`);
    expect(status, `GET /sites/s-1/diary?${query}`).toBe(200);
    return json;
  }

  const OCT = "year=2026&month=10";

  it("adlar: şantiye/proje/başlık bölümü/oluşturan/gönderen — gönderilmiş kayıtta dolu, taslakta null", async () => {
    const submitted = await detail("d-1");
    expect(submitted).toMatchObject({
      site_name: "A-Blok Şantiyesi",
      project_name: "Kule A",
      section_name: "Kat 6–10 Kaba İnşaat",
      created_by_name: "Sercan Öztürk",
      submitted_by: "u-2",
      submitted_by_name: "Sercan Öztürk",
    });
    const draft = await detail("d-2");
    expect(draft).toMatchObject({ section_name: "Zemin Kat Kaba İnşaat", submitted_by: null, submitted_by_name: null });
    // Başlıksız (şantiye geneli) kayıt: bölüm adı null.
    expect((await detail("d-3")).section_name).toBeNull();
  });

  it("satır `section_name` (Bölümsüz → null) · firma satırı `subcontractor_name` (firmasız → null)", async () => {
    const locked = await detail("d-4");
    const byKey = new Map(locked.lines.map((line) => [`${line.boq_item_id}:${line.section_id ?? "none"}`, line.section_name]));
    expect(byKey.get("bi-3:sec-1")).toBe("Kat 6–10 Kaba İnşaat");
    expect(byKey.get("bi-5:none")).toBeNull();
    expect(locked.worker_counts.map((row) => [row.subcontractor_id, row.subcontractor_name])).toEqual([
      ["sub-2", "Çelik İnşaat Taah."],
    ]);
    // Bölüm taşımayan iskelet satırı + firmasız işçi satırı.
    const skeleton = await detail("d-1");
    expect(skeleton.lines.every((line) => line.section_name === null)).toBe(true);
    expect(skeleton.worker_counts.every((row) => row.subcontractor_name === null)).toBe(true);
  });

  it("Kural A · BAŞLIK kolu: sec-1 (Ekim) = başlığı sec-1 olan altı gün, en yeni önce", async () => {
    const page = await list(`${OCT}&section_id=sec-1`);
    expect(page.total).toBe(6);
    expect(page.items.map((item) => item.id)).toEqual(["d-8", "d-7", "d-6", "d-5", "d-4", "d-9"]);
    // Başka bölüm SÜZÜLÜR (d-2 sec-2 · Temmuz).
    const july = await list("year=2026&month=7&section_id=sec-1");
    expect(july.items.map((item) => item.id)).toEqual(["d-1"]);
  });

  it("Kural A · sayfalama: `total` süzülmüş küme, `offset/limit` aynı sıralamayla dilimler", async () => {
    const page = await list(`${OCT}&section_id=sec-1&limit=2&offset=2`);
    expect(page).toMatchObject({ total: 6, limit: 2, offset: 2 });
    expect(page.items.map((item) => item.id)).toEqual(["d-6", "d-5"]);
  });

  it("başka şantiyenin / olmayan bölüm → 422 (sessizce boş liste DEĞİL) · liste ve detay", async () => {
    const foreign = await call<{ detail: string }>("GET", "/sites/s-2/diary?section_id=sec-1");
    expect(foreign).toEqual({ status: 422, json: { detail: "Seçilen bölüm bu şantiyeye ait değil" } });
    const missing = await call<{ detail: string }>("GET", "/diary/d-1?section_id=sec-yok");
    expect(missing.status).toBe(422);
  });

  it("önceki/sonraki: bağlamsız = şantiye · `?section_id=` = bölümün Kural A kümesi · uçlarda null", async () => {
    const site = await detail("d-1");
    expect(site).toMatchObject({ prev_id: null, prev_entry_date: null, next_id: "d-2", next_entry_date: "2026-07-16" });
    // sec-1 bağlamında d-2 (sec-2) ATLANIR.
    const section = await detail("d-1", "sec-1");
    expect(section).toMatchObject({ prev_id: null, prev_entry_date: null, next_id: "d-9", next_entry_date: "2026-10-02" });
    // DET-1.4 · d-8'in sonrakisi SATIR KOLU fikstürü (12.11, başlığı sec-2):
    // komşu sorgusu `hiddenFromUnfilteredList`i UYGULAMAZ (bilinçli).
    expect(await detail("d-8", "sec-1")).toMatchObject({ prev_id: "d-7", next_id: LINE_ARM.entryId, next_entry_date: LINE_ARM.day });
    // Son gün: sonraki yok.
    expect(await detail(LINE_ARM.entryId, "sec-1")).toMatchObject({ prev_id: "d-8", next_id: null, next_entry_date: null });
  });

  it("gün kilidi = EV gün kilidi (TEK kaynak): kilitli, kilitsiz, kilit açılınca", async () => {
    expect(await detail("d-4")).toMatchObject({ locked: true, lock_report_date: "2026-10-05" });
    expect(await detail("d-1")).toMatchObject({ locked: false, lock_report_date: null });
    for (const entryId of ["d-4", "d-5", "d-6", "d-7", "d-8", "d-9"]) {
      const entry = await detail(entryId);
      const { json: day } = await call<DayViewLike>("GET", `/sites/s-1/earned-value/days/${entry.entry_date}`);
      expect(entry.locked, `${entryId} kilidi EV gününden ayrıştı`).toBe(day.lock.locked);
      expect(entry.lock_report_date, entryId).toBe(day.lock.locked ? day.lock.report_date : null);
    }
    const unlockDay = EV_DAY_SCENARIO_DAYS.unlockTarget;
    expect(await detail("d-9")).toMatchObject({ entry_date: unlockDay, locked: true, lock_report_date: "2026-10-02" });
    const opened = await call("POST", `/sites/s-1/earned-value/days/${unlockDay}/unlock`, { reason: "Günlük düzeltmesi" });
    expect(opened.status).toBe(200);
    expect(await detail("d-9")).toMatchObject({ locked: false, lock_report_date: null });
  });

  it("gönder/geri al: gönderen damgası `submitted_at` ile birlikte yazılır ve temizlenir", async () => {
    const reopened = await call<DiaryDetail>("POST", "/diary/d-1/reopen");
    expect(reopened.json).toMatchObject({ status: "draft", submitted_by: null, submitted_by_name: null });
    const resubmitted = await call<DiaryDetail>("POST", "/diary/d-1/submit");
    expect(resubmitted.json).toMatchObject({ status: "submitted", submitted_by: "u-1", submitted_by_name: "Ahmet Yılmaz" });
  });

  it("liste öğesi (DET-1.B ek, backend#130): `section_name` başlık bölümü · `section_line_count` bölüm bağlamında o bölümün satırı, süzgeçsiz null", async () => {
    const sec1 = await list(`${OCT}&section_id=sec-1`);
    expect(sec1.items.length).toBeGreaterThan(0);
    for (const item of sec1.items) {
      const full = await detail(item.id);
      // Başlık adı detaydakiyle aynı; sayı detayın o bölüme düşen satırlarıyla aynı (liste ↔ detay tutarlılığı).
      expect(item.section_name, item.id).toBe(full.section_name);
      expect(item.section_line_count, item.id).toBe(full.lines.filter((line) => line.section_id === "sec-1").length);
    }
    expect(sec1.items.some((item) => (item.section_line_count ?? 0) > 0)).toBe(true);
    // Süzgeçsiz listede sayı YOK (null); ad yine basılır.
    const unfiltered = await list(OCT);
    expect(unfiltered.items.every((item) => item.section_line_count === null)).toBe(true);
    expect(unfiltered.items.find((item) => item.id === "d-4")?.section_name).toBe("Kat 6–10 Kaba İnşaat");
  });

  it("DET-1.4 · SATIR KOLU fikstürü: sec-1'de YALNIZ satır koluyla (2 satır), sec-2'de başlık koluyla", async () => {
    const NOV = "year=2026&month=11";
    // sec-1: başlık sec-2 → kayıt sec-1 kümesine YALNIZ miktar satırlarıyla girer.
    const sec1 = await list(`${NOV}&section_id=${LINE_ARM.lineSectionId}`);
    expect(sec1.total).toBe(1);
    expect(sec1.items.map((item) => item.id)).toEqual([LINE_ARM.entryId]);
    expect(sec1.items[0]).toMatchObject({
      entry_date: LINE_ARM.day,
      status: "submitted",
      section_id: LINE_ARM.headerSectionId,
      section_name: "Zemin Kat Kaba İnşaat",
      section_line_count: 2,
    });
    // sec-2: başlık kolu (aynı kayıt, bu bölüme tek satır).
    const sec2 = await list(`${NOV}&section_id=${LINE_ARM.headerSectionId}`);
    expect(sec2.items.map((item) => item.id)).toEqual([LINE_ARM.entryId]);
    expect(sec2.items[0]).toMatchObject({ section_id: LINE_ARM.headerSectionId, section_line_count: 1 });
    // sec-3: ne başlık ne satır.
    expect((await list(`${NOV}&section_id=sec-3`)).total).toBe(0);

    // Detay: iki sec-1 satırı + bir sec-2 satırı, bölümsüz satır YOK; kilitsiz, EV günü YOK.
    const entry = await detail(LINE_ARM.entryId, LINE_ARM.lineSectionId);
    expect(entry.lines.map((line) => line.section_id)).toEqual([
      LINE_ARM.lineSectionId,
      LINE_ARM.lineSectionId,
      LINE_ARM.headerSectionId,
    ]);
    expect(entry).toMatchObject({ locked: false, lock_report_date: null, section_name: "Zemin Kat Kaba İnşaat" });
    const { json: day } = await call<{ has_baseline: boolean }>("GET", `/sites/s-1/earned-value/days/${LINE_ARM.day}`);
    expect(day.has_baseline, "Kasım günü çekirdek detaydır (planlamasız)").toBe(false);
  });

  it("DET-1.4 · SATIR KOLU fikstürü İZOLE: ay süzgeçsiz ve Temmuz/Eylül/Ekim listelerine SIZMAZ, Kasım'ın TEK kaydıdır", async () => {
    const ids = async (query: string) => (await list(query)).items.map((item) => item.id);
    for (const query of [
      "limit=200",
      "limit=200&section_id=sec-1",
      "limit=200&section_id=sec-2",
      "year=2026&month=7",
      "year=2026&month=9",
      `${OCT}&section_id=sec-1`,
      `${OCT}&section_id=sec-2`,
    ]) {
      expect(await ids(query), query).not.toContain(LINE_ARM.entryId);
    }
    // Bölüm Detay karelerinin kümesi: sec-1 süzgeçsiz = yalnız d-1.
    expect(await ids("limit=200&section_id=sec-1")).toEqual(["d-1"]);
    expect(await ids("year=2026&month=11")).toEqual([LINE_ARM.entryId]);
  });

  it("Kural A · SATIR kolu: başlığı başka bölüm ama bu bölüme miktar satırı olan gün listeye ve komşulara girer (bir kez)", async () => {
    // d-8: satırı bi-3 × sec-1. Başlığı sec-2'ye taşınınca YALNIZ satır koluyla sec-1'dedir.
    const moved = await call<DiaryDetail>("PATCH", "/diary/d-8", { section_id: "sec-2" });
    expect(moved.status).toBe(200);
    expect(moved.json.section_name).toBe("Zemin Kat Kaba İnşaat");

    const sec1 = await list(`${OCT}&section_id=sec-1`);
    expect(sec1.total).toBe(6);
    expect(sec1.items.map((item) => item.id)).toContain("d-8");
    // Başlık kolu da işler: sec-2 artık d-8'i başlıktan görür.
    const sec2 = await list(`${OCT}&section_id=sec-2`);
    expect(sec2.items.map((item) => item.id)).toEqual(["d-8"]);
    // İki kol birden tutan gün (d-4: başlık sec-1 + satır sec-1) TEK kez.
    expect(sec1.items.filter((item) => item.id === "d-4")).toHaveLength(1);

    // Komşu da aynı kümeden: d-7'nin sec-1 bağlamında sonrakisi satır kolundaki d-8.
    expect(await detail("d-7", "sec-1")).toMatchObject({ next_id: "d-8", next_entry_date: "2026-10-09" });
    // sec-3'te ne başlık ne satır → komşu yok.
    expect(await detail("d-8", "sec-3")).toMatchObject({ prev_id: null, next_id: null });
  });
});
