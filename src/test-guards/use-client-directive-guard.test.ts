// @vitest-environment node
//
// PLN-F1.2.1 · "use client" BEKÇİSİ (ortak primitive'ler + Planlama ortak kiti).
//
// KÖK OLAY (#116, CI run 36064818238): `ui/checkbox/Checkbox.tsx`e
// `useLayoutEffect` / `useRef` / `useImperativeHandle` eklendi ama dosya
// `"use client"` taşımıyordu. `ui/index.ts` barrel'ı SUNUCU bileşeni
// `raporlar/page.tsx → ReportsCatalogView` tarafından da içe alındığı için
// `next build` webpack hatasıyla düştü. vitest (jsdom) ve tsc bunu GÖREMEZ:
// ikisi de sunucu/istemci sınırını bilmez. Kusuru yalnız build yakalar.
//
// KURAL: `src/components/ui/` ve `src/components/earned-value/` altında
// istemciye özgü bir hook çağıran her üretim `.tsx` dosyası, ilk ifadesi olarak
// `"use client"` taşır (yorumlardan sonra gelebilir — `DateInput.tsx` deseni).
//
// İSTİSNA: `useId` ve `use` React sunucu bileşeninde de çalışır (Next bunları
// işaretlemez) — `ui/field/Field.tsx` yalnız `useId` kullanır ve direktifsizdir.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));
const GUARDED_DIRS = ["components/ui", "components/earned-value"].map((dir) =>
  path.join(SRC_DIR, dir),
);
const SERVER_SAFE_HOOKS = new Set(["useId", "use"]);
const HOOK_CALL = /\b(use[A-Z]\w*)\s*(?:<[^>()]*>)?\s*\(/g;

function productionTsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return productionTsxFiles(full);
    return full.endsWith(".tsx") && !full.endsWith(".test.tsx") ? [full] : [];
  });
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Dosyanın çağırdığı istemciye özgü hook adları (yorumlar hariç). */
export function clientHooksIn(source: string): string[] {
  const code = stripComments(source);
  const hooks = new Set<string>();
  for (const match of code.matchAll(HOOK_CALL)) {
    if (!SERVER_SAFE_HOOKS.has(match[1])) hooks.add(match[1]);
  }
  return [...hooks].sort();
}

/** İlk ifade (baştaki yorumlar/boşluk atlanarak) `"use client"` mı? */
export function hasUseClientDirective(source: string): boolean {
  const head = source.replace(/^(\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");
  return /^["']use client["'];?/.test(head);
}

describe("use-client bekçisinin kendisi", () => {
  it("yorumdan sonra gelen direktifi görür, gövdede geçen metni saymaz", () => {
    expect(hasUseClientDirective('// not\n/* blok */\n"use client";\nimport x from "y";')).toBe(true);
    expect(hasUseClientDirective('import x from "y";\nconst s = "use client";')).toBe(false);
  });

  it("useId'yi sunucuda güvenli sayar, yorumdaki hook adını saymaz", () => {
    expect(clientHooksIn("const id = useId(); // useState( değil")).toEqual([]);
    expect(clientHooksIn("const [a] = useState(0); useRef(null);")).toEqual(["useRef", "useState"]);
  });

  it("jenerik tip argümanlı çağrıyı da görür: useRef<HTMLInputElement>(null)", () => {
    expect(clientHooksIn("const r = useRef<HTMLInputElement>(null);")).toEqual(["useRef"]);
  });
});

describe('ortak bileşenler istemci hook\'u kullanıyorsa "use client" taşır', () => {
  const files = GUARDED_DIRS.flatMap(productionTsxFiles);

  it("taranacak dosya bulundu (bekçi boşa koşmuyor)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((file) => [path.relative(SRC_DIR, file), file]))("%s", (_name, file) => {
    const source = readFileSync(file, "utf8");
    const hooks = clientHooksIn(source);
    if (hooks.length === 0) return;
    expect(
      hasUseClientDirective(source),
      `${hooks.join(", ")} çağrılıyor ama "use client" yok — next build sunucu grafiğinde düşer`,
    ).toBe(true);
  });
});
