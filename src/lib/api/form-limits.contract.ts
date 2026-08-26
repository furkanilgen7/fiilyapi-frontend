import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * SÖZLEŞME OKUYUCU — form korkuluğu bekçilerinin PAYLAŞILAN tabanı.
 *
 * 🔴 Var oluş sebebi: `maxLength` / `maximum` / `minimum` / `exclusiveMinimum`
 * / `exclusiveMaximum` üretilen TS tipinde **İFADE EDİLEMEZ**. `typecheck`,
 * `lint`, `build` ve birim testleri bu sınıfa YAPISAL OLARAK KÖRDÜR —
 * bordro modülü tam bu yüzden altı gün canlıda ölü kaldı.
 *
 * Bu yüzden sınırlar UYDURULMAZ, `openapi.json`dan OKUNUR. Sabiti tekrar yazan
 * bir test hiçbir şey bekçilemez: iki yerde aynı yanlışı tutar.
 */

const ROOT = process.cwd();

export interface RawSchema {
  type?: string;
  maxLength?: number;
  minLength?: number;
  maximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  anyOf?: RawSchema[];
  $ref?: string;
  properties?: Record<string, RawSchema>;
}

interface Spec {
  components: { schemas: Record<string, RawSchema> };
  paths: Record<
    string,
    Record<string, { parameters?: { name: string; in: string; schema?: RawSchema }[] }>
  >;
}

let cached: Spec | undefined;

export function spec(): Spec {
  cached ??= JSON.parse(readFileSync(path.join(ROOT, "openapi", "openapi.json"), "utf8")) as Spec;
  return cached;
}

/**
 * `$ref` ve `anyOf: [{…}, {"type":"null"}]` sarmalını açar.
 *
 * 🔴 `anyOf` dallarından KISIT TAŞIYAN ilki seçilir, körlemesine ilki değil:
 * para alanları `[{number, minimum}, {string, pattern}, {null}]` biçimindedir
 * ve `null` dalı "opsiyonel" demektir — kısıt DEĞİL.
 */
export function resolveSchema(raw: RawSchema | undefined): RawSchema | undefined {
  if (raw === undefined) return undefined;
  if (raw.$ref !== undefined) {
    return resolveSchema(spec().components.schemas[raw.$ref.replace("#/components/schemas/", "")]);
  }
  if (raw.anyOf !== undefined) {
    const carriesConstraint = (item: RawSchema): boolean =>
      item.type !== "null" &&
      (item.maxLength !== undefined ||
        item.maximum !== undefined ||
        item.minimum !== undefined ||
        item.exclusiveMinimum !== undefined ||
        item.exclusiveMaximum !== undefined);
    const branch = raw.anyOf.find(carriesConstraint) ?? raw.anyOf.find((i) => i.type !== "null");
    if (branch !== undefined) return resolveSchema(branch);
  }
  return raw;
}

/** `Schema.property` → çözülmüş kısıtlar. Bilinmeyen ad `undefined` döner. */
export function fieldSchema(schemaName: string, property: string): RawSchema | undefined {
  return resolveSchema(spec().components.schemas[schemaName]?.properties?.[property]);
}

/** Bir uç yolunun sorgu parametresinin kısıtı (`q` gibi). */
export function queryParamSchema(
  apiPath: string,
  method: string,
  name: string,
): RawSchema | undefined {
  const parameters = spec().paths[apiPath]?.[method]?.parameters ?? [];
  return resolveSchema(parameters.find((p) => p.in === "query" && p.name === name)?.schema);
}

/**
 * Kaynak dosyadaki `const NAME = { key: 123, … }` haritasını OKUR.
 *
 * 🔴 Değerler dosyadan çıkarılır, teste TEKRAR YAZILMAZ: bekçinin bildiği tek
 * sayı sözleşmeninkidir, diğerini istemci kaynağı söyler.
 */
export function readNumericMap(file: string, constName: string): Map<string, number> {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const match = source.match(
    new RegExp(`(?:export )?const ${constName}\\s*(?::[^=]+)?=\\s*\\{([\\s\\S]*?)\\}\\s*as const`),
  );
  if (match === null) {
    throw new Error(`${file} içinde \`const ${constName} = { … } as const\` bulunamadı`);
  }
  const values = new Map<string, number>();
  for (const entry of match[1].matchAll(/(\w+)\s*:\s*(\d+)/g)) {
    values.set(entry[1], Number(entry[2]));
  }
  return values;
}

/**
 * Kaynak dosyadaki tekil `const NAME = 123;` sabitini okur.
 *
 * `const NAME = OTHER.key;` biçimindeki TÜRETİLMİŞ sabitler de çözülür —
 * korkuluğu bir haritadan türetmek onu ölçülemez yapmamalıdır.
 */
export function readNumericConst(file: string, constName: string): number {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const literal = source.match(
    new RegExp(`(?:export )?const ${constName}\\s*(?::[^=]+)?=\\s*(-?\\d+)\\s*;`),
  );
  if (literal !== null) return Number(literal[1]);

  const derived = source.match(
    new RegExp(`(?:export )?const ${constName}\\s*(?::[^=]+)?=\\s*(\\w+)\\.(\\w+)\\s*;`),
  );
  if (derived !== null) {
    const value = readNumericMap(file, derived[1]).get(derived[2]);
    if (value !== undefined) return value;
  }
  throw new Error(`${file} içinde \`const ${constName}\` sayısal olarak çözülemedi`);
}

/** camelCase → snake_case (istemci anahtarı → sözleşme alanı). */
export function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
