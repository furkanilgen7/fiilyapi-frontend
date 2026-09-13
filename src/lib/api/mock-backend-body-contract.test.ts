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
