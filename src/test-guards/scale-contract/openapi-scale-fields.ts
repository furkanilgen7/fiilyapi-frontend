// TEST-F2 Ajan B — openapi/openapi.json içindeki `components.schemas` altında
// adı ölçek-şüpheli regex'e uyan TÜM şema·alan çiftlerini çıkarır. Hem
// scale-table.test.ts'teki EŞİTLİK iddiası hem de mock-scale-contract.test.ts'teki
// bağımsız kapsam ölçümü AYNI bu fonksiyondan beslenir — iki yerde ayrı regex
// yazılırsa sessizce ayrışabilirler (bkz. sahte-yeşilin dördüncü hâli emsalleri).
import { readFileSync } from "node:fs";
import nodePath from "node:path";

// Emir metnindeki regex birebir: /(pct|ratio|share|rate|percent|band)/i
export const SCALE_FIELD_NAME_PATTERN = /(pct|ratio|share|rate|percent|band)/i;

export interface OpenApiSchemaFieldRef {
  schema: string;
  field: string;
}

interface JsonSchemaLike {
  type?: string;
  properties?: Record<string, unknown>;
  items?: unknown;
  allOf?: unknown[];
  anyOf?: unknown[];
  oneOf?: unknown[];
  additionalProperties?: unknown;
  enum?: unknown[];
  $ref?: string;
}

interface OpenApiDocLike {
  components?: { schemas?: Record<string, JsonSchemaLike> };
}

let cachedDoc: OpenApiDocLike | null = null;

/** `openapi/openapi.json`ı OKUR (mutasyon yok) — repo kökünden. */
export function loadOpenApiDoc(): OpenApiDocLike {
  if (cachedDoc) return cachedDoc;
  const file = nodePath.join(process.cwd(), "openapi", "openapi.json");
  cachedDoc = JSON.parse(readFileSync(file, "utf-8")) as OpenApiDocLike;
  return cachedDoc;
}

function schemaKey(name: string, field: string): string {
  return `${name}.${field}`;
}

/**
 * `components.schemas` altındaki HER şemanın doğrudan `properties`'inde
 * (kalıtım/allOf zincirini de dahil ederek) adı regex'e uyan alanları toplar.
 * Not: burada amaç TABLO ile birebir aynı kümeyi üretmek — yani "bir şemanın
 * kendi bildirdiği alan" (iç içe $ref'in ait olduğu şema DEĞİL). allOf ile
 * birleşen mixin alanları da o şemanın "kendi" alanı sayılır (openapi mixin
 * deseni: temel + ek alanlar tek response şemasında görünür).
 */
export function collectScaleSuspectFields(doc: OpenApiDocLike = loadOpenApiDoc()): OpenApiSchemaFieldRef[] {
  const schemas = doc.components?.schemas ?? {};
  const out: OpenApiSchemaFieldRef[] = [];
  const seen = new Set<string>();

  function addFromProperties(schemaName: string, node: JsonSchemaLike): void {
    if (node.properties) {
      for (const field of Object.keys(node.properties)) {
        if (SCALE_FIELD_NAME_PATTERN.test(field)) {
          const key = schemaKey(schemaName, field);
          if (!seen.has(key)) {
            seen.add(key);
            out.push({ schema: schemaName, field });
          }
        }
      }
    }
    if (Array.isArray(node.allOf)) {
      for (const sub of node.allOf) {
        addFromProperties(schemaName, resolveMaybeRef(sub, schemas));
      }
    }
  }

  for (const [name, raw] of Object.entries(schemas)) {
    addFromProperties(name, raw);
  }
  return out;
}

function resolveMaybeRef(
  node: unknown,
  schemas: Record<string, JsonSchemaLike>,
): JsonSchemaLike {
  if (node && typeof node === "object" && "$ref" in node) {
    const ref = (node as { $ref: string }).$ref;
    const name = ref.replace("#/components/schemas/", "");
    return schemas[name] ?? {};
  }
  return (node ?? {}) as JsonSchemaLike;
}

export function scaleSuspectKeySet(doc?: OpenApiDocLike): Set<string> {
  return new Set(collectScaleSuspectFields(doc).map((r) => schemaKey(r.schema, r.field)));
}

/**
 * `schemaName.field`in openapi property düğümünü bulur (allOf zincirini de
 * arar — `collectScaleSuspectFields`teki addFromProperties ile AYNI mantık).
 */
function findFieldNode(schemaName: string, field: string, doc: OpenApiDocLike): unknown | null {
  const schemas = doc.components?.schemas ?? {};
  const root = schemas[schemaName];
  if (!root) return null;

  function search(node: JsonSchemaLike): unknown | null {
    if (node.properties && field in node.properties) {
      return (node.properties as Record<string, unknown>)[field];
    }
    if (Array.isArray(node.allOf)) {
      for (const sub of node.allOf) {
        const found = search(resolveMaybeRef(sub, schemas));
        if (found !== null) return found;
      }
    }
    return null;
  }

  return search(root);
}

/**
 * ENUM iddiası için: `schemaName.field`in openapi `enum` üye listesini
 * çözer — `$ref`, `anyOf`/`oneOf` (enum dalını bulana kadar dener) dahil.
 * Enum'a çözülemezse `null` döner (LKapsamı dışı — çağıran taraf enum
 * iddiasını atlamalı).
 */
export function resolveEnumValues(schemaName: string, field: string, doc: OpenApiDocLike = loadOpenApiDoc()): unknown[] | null {
  const schemas = doc.components?.schemas ?? {};
  const node = findFieldNode(schemaName, field, doc);
  if (node === null) return null;

  function resolve(candidate: unknown): unknown[] | null {
    const resolved = resolveMaybeRef(candidate, schemas);
    if (Array.isArray(resolved.enum)) return resolved.enum;
    const branches = [...(resolved.anyOf ?? []), ...(resolved.oneOf ?? [])];
    for (const branch of branches) {
      const found = resolve(branch);
      if (found) return found;
    }
    return null;
  }

  return resolve(node);
}

export { schemaKey };
