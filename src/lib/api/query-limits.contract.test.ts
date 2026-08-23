import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 🔴🔴 SÖZLEŞME BEKÇİSİ — sorgu parametresi sabitleri uçların KISITLARINI AŞAMAZ.
 *
 * **Neden var (F-BORDRO T0, canlı kusur):** `PAYROLL_PERIODS_LIMIT` elle `240`
 * yazılmıştı; `GET /payroll/periods` `limit` tavanı ise **200**dür ve backend
 * aşımı *sessizce KIRPMAZ, 422 döner* (TB3 sayfalama standardı). Üç bordro
 * ekranı da tek bir hook'a (`usePayrollPeriods`) bağlı olduğu için modül
 * **canlıda %100 çalışmıyordu** — kullanıcının gördüğü hata birebir şuydu:
 * `Input should be less than or equal to 200`.
 *
 * 🔴 **DÖRT KAPININ DÖRDÜ DE BUNU YAPISAL OLARAK GÖREMEZ:**
 *   • `typecheck` — OpenAPI'deki `maximum` üretilen TS tipinde İFADE EDİLEMEZ;
 *     `limit` orada yalnız `number`dır. Tip sistemi bu sınıfa kördür.
 *   • `lint`/`build` — bir sayının başka bir sayıdan büyük olmasıyla ilgilenmez.
 *   • birim/e2e testleri — sahte backend `limit`i DOĞRULAMIYOR, KIRPIYORDU
 *     (`PAYROLL_LIMIT_MAX` sahte tarafta da 240 yazılmıştı, yani sahte backend
 *     frontend'in HATASINI taklit ediyordu). Sahte-yeşilin YEDİNCİ hâli.
 *
 * Bu yüzden bekçi **sözleşmeyi OKUR**. Sabiti tekrar yazan bir test hiçbir şey
 * bekçilemez: `expect(PAYROLL_PERIODS_LIMIT).toBe(200)` iki yerde aynı yanlışı
 * tutar ve tavan değişince ikisi birden yanlış kalırdı.
 *
 * 🔑 KENDİ KENDİNİ SÜRDÜRÜR: elle tutulan bir "sabit → uç" kaydı YOKTUR.
 * Bekçi her hook dosyasının KENDİ çağırdığı yolları kaynaktan çıkarır ve
 * sabiti O yolların kısıtlarıyla karşılaştırır. Yeni bir hook eklendiğinde
 * kayıt güncellemek gerekmez — bekçi onu kendiliğinden kapsar.
 */

const ROOT = process.cwd();
const HOOKS_DIR = path.join(ROOT, "src", "lib", "api", "hooks");

/** Sorgu parametresi adları — hepsi sayısal ve hepsi kısıt taşıyabilir. */
const NUMERIC_QUERY_PARAMS = ["limit", "offset"] as const;

interface ParamSchema {
  maximum?: number;
  minimum?: number;
}

/** `openapi.json` → `yol → parametre → şema`. TEK okuma, testler paylaşır. */
function loadQueryConstraints(): Map<string, Map<string, ParamSchema>> {
  const raw = fs.readFileSync(path.join(ROOT, "openapi", "openapi.json"), "utf8");
  const spec = JSON.parse(raw) as {
    paths: Record<
      string,
      Record<string, { parameters?: { name: string; in: string; schema?: ParamSchema }[] }>
    >;
  };
  const byPath = new Map<string, Map<string, ParamSchema>>();
  for (const [apiPath, operations] of Object.entries(spec.paths)) {
    for (const operation of Object.values(operations)) {
      for (const parameter of operation.parameters ?? []) {
        if (parameter.in !== "query") continue;
        const params = byPath.get(apiPath) ?? new Map<string, ParamSchema>();
        params.set(parameter.name, parameter.schema ?? {});
        byPath.set(apiPath, params);
      }
    }
  }
  return byPath;
}

interface HookConstant {
  file: string;
  name: string;
  value: number;
  /** Dosyanın çağırdığı uç yolları — kısıt bunlardan okunur. */
  apiPaths: string[];
}

/**
 * Hook dosyalarındaki sayısal sabitleri ve o dosyanın çağırdığı yolları
 * kaynaktan çıkarır. Yalnız `limit`/`offset` olarak KULLANILAN sabitler
 * dönülür — dosyadaki her sayı değil.
 */
function collectHookConstants(): HookConstant[] {
  const found: HookConstant[] = [];
  for (const file of fs.readdirSync(HOOKS_DIR)) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
    const source = fs.readFileSync(path.join(HOOKS_DIR, file), "utf8");

    const apiPaths = [...source.matchAll(/backendClient\.\w+\(\s*"([^"]+)"/g)].map(
      (match) => match[1],
    );
    if (apiPaths.length === 0) continue;

    const values = new Map<string, number>();
    for (const match of source.matchAll(/(?:export )?const ([A-Z_]{3,})\s*=\s*(\d+)\s*;/g)) {
      values.set(match[1], Number(match[2]));
    }

    for (const match of source.matchAll(
      /\b(limit|offset)\s*:\s*([A-Z_]{3,})\b/g,
    )) {
      const value = values.get(match[2]);
      if (value === undefined) continue;
      found.push({ file, name: match[2], value, apiPaths: [...new Set(apiPaths)] });
    }
  }
  return found;
}

const CONSTRAINTS = loadQueryConstraints();
const HOOK_CONSTANTS = collectHookConstants();

describe("🔴 sorgu sabitleri ↔ sözleşme kısıtları", () => {
  it("bekçi GERÇEKTEN ölçüyor (boş küme sessizce yeşil geçemez)", () => {
    // 🔴 Kapsam korkuluğu: tarama bozulup hiçbir şey bulamazsa aşağıdaki
    // `it.each` HİÇ koşmaz ve dosya "yeşil" görünürdü — bekçinin kendisi
    // sahte-yeşile düşerdi.
    expect(HOOK_CONSTANTS.length).toBeGreaterThan(0);
    expect(CONSTRAINTS.size).toBeGreaterThan(0);
  });

  it.each(HOOK_CONSTANTS)(
    "$file · $name = $value uçların kısıtlarını aşmaz",
    ({ name, value, apiPaths }) => {
      // Sabit, dosyanın çağırdığı HER yolun kısıtını sağlamalıdır: aynı sabiti
      // iki uçta kullanan bir hook, tavanı DÜŞÜK olana da uymak zorundadır.
      let measured = 0;
      for (const apiPath of apiPaths) {
        for (const param of NUMERIC_QUERY_PARAMS) {
          const schema = CONSTRAINTS.get(apiPath)?.get(param);
          if (schema === undefined) continue;
          measured += 1;
          if (schema.maximum !== undefined) {
            expect(
              value,
              `${name} (${value}) > ${apiPath} ?${param} tavanı (${schema.maximum}) ⇒ backend 422 döner`,
            ).toBeLessThanOrEqual(schema.maximum);
          }
          if (schema.minimum !== undefined) {
            expect(value, `${name} < ${apiPath} ?${param} tabanı`).toBeGreaterThanOrEqual(
              schema.minimum,
            );
          }
        }
      }
      // Sabit bir yola bağlanamadıysa bu bir ÖLÇÜM BOŞLUĞUDUR, başarı değil.
      expect(measured, `${name} hiçbir uç kısıtına bağlanamadı`).toBeGreaterThan(0);
    },
  );

  it("bordro dönem listesi tavanı sözleşmeden okunur (canlı kusurun kendisi)", () => {
    const schema = CONSTRAINTS.get("/payroll/periods")?.get("limit");
    expect(schema?.maximum).toBeDefined();
    const payroll = HOOK_CONSTANTS.find((entry) => entry.name === "PAYROLL_PERIODS_LIMIT");
    expect(payroll, "PAYROLL_PERIODS_LIMIT taranabilir olmalı").toBeDefined();
    expect(payroll?.value).toBeLessThanOrEqual(schema?.maximum as number);
  });
});
