# Frontend F0 — İskelet Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FİİL Yapı ERP frontend'inin çalışan iskeletini kurmak: Next.js App Router + TypeScript, açık-tema token katmanı, Inter/JetBrains Mono fontları, backend OpenAPI şemasından üretilen tipler, ve yeşil CI.

**Architecture:** Next.js (App Router) + React + TypeScript. Stil Tailwind DEĞİL — ham CSS + `src/styles/tokens.css` token katmanı (README kararı). API tipleri elle yazılmaz: backend'in OpenAPI şemasından `openapi-typescript` ile üretilir, istekler `openapi-fetch` tip-güvenli istemcisiyle yapılır. Oturum/BFF F2'de gelir; F0 yalnızca iskelet + araç zinciri kurar.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript · pnpm · openapi-typescript + openapi-fetch · Vitest (birim/tip testi) · GitHub Actions CI. TanStack Query bağımlılık olarak eklenir ama sağlayıcı kurulumu F2'ye kalır.

## Global Constraints

- **Repo:** Tüm yollar `/Users/furkanilgen/Documents/Projeler/insaat/frontend` köküne görelidir. Backend AYRI repodur (`../backend` → fiilyapi-backend); bu planda ona DOKUNULMAZ.
- **Dil:** Kod, değişken, fonksiyon ve bileşen adları İngilizce. Kullanıcıya dönen metinler ve yorumlar Türkçe.
- **Paket yöneticisi:** yalnızca `pnpm`. `npm`/`yarn` komutu kullanılmaz; `package-lock.json`/`yarn.lock` commit edilmez, yalnızca `pnpm-lock.yaml`.
- **Tipler elle yazılmaz:** API tipleri backend'in `openapi.json`'ından üretilir. Üretilen dosyalar elle düzenlenmez.
- **Tasarım:** Açık tema. `../projedesign/*.dc.html` (68 mockup) kanon referanstır — Inter + JetBrains Mono fontları, Tailwind Slate + Blue paleti. Token katmanı `src/styles/tokens.css`.
- **Hedef:** Masaüstü (≥1280px). Mobil sonra.
- **Stil:** Tailwind KULLANILMAZ; ham CSS + CSS custom property token'ları. Animasyon yalnızca compositor-dostu özelliklerde (transform/opacity).
- **Dosya boyutu:** Tek dosya 400 satırı geçmemeli.
- **Test:** Her task TDD ile. F0'ın test kapıları: `pnpm typecheck` (tsc), `pnpm lint`, `pnpm test` (Vitest), `pnpm build`. Görsel regresyon (Playwright) gerçek UI geldiğinde (F2+) eklenir — F0'ın görselleştirilecek ekranı yoktur.
- **Commit:** Her task sonunda commit. Format: `<type>: <açıklama>` (feat, fix, test, chore, docs, ci), İngilizce, Türkçe özel karakter yok.
- **Gizli bilgi:** Hiçbir secret commit edilmez. F0'da secret yoktur; `.env.local` gitignore'da olur.

---

## File Structure

| Dosya | Sorumluluk |
|---|---|
| `package.json` | Bağımlılıklar, scriptler (dev/build/lint/typecheck/test/gen:api) |
| `pnpm-lock.yaml` | Kilitli bağımlılıklar (commit edilir) |
| `next.config.ts` | Next.js yapılandırması |
| `tsconfig.json` | TypeScript yapılandırması (strict) |
| `.gitignore` | node_modules, .next, .env.local, üretilmiş coverage |
| `src/app/layout.tsx` | Kök layout: fontlar (next/font), global stil importu, `<html lang="tr">` |
| `src/app/page.tsx` | Geçici kök sayfa (F3 kabuğuna kadar placeholder) |
| `src/app/globals.css` | Global reset + `tokens.css` importu |
| `src/styles/tokens.css` | Açık-tema token katmanı: renk/tipografi/boşluk/yarıçap custom property'leri |
| `openapi/openapi.json` | Backend'den alınan OpenAPI şema anlık görüntüsü (codegen kaynağı) |
| `src/lib/api/schema.d.ts` | `openapi-typescript` çıktısı (elle düzenlenmez) |
| `src/lib/api/client.ts` | `openapi-fetch` ile tip-güvenli istemci (baseUrl BFF'e; F2'de kullanılır) |
| `scripts/gen-api.md` | `openapi.json`'ı backend'den yenileme yöntemi (doküman) |
| `vitest.config.ts` | Vitest yapılandırması |
| `.github/workflows/ci.yml` | CI: install → lint → typecheck → test → build |

---

## Task 1: Next.js iskeleti + pnpm + ilk test

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `vitest.config.ts`, `vitest.setup.ts`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: —
- Produces: Çalışan Next.js App Router uygulaması · `pnpm dev/build/lint/typecheck/test` scriptleri · Vitest + React Testing Library test koşumu

- [ ] **Step 1: Bağımlılıkları ve scriptleri tanımla**

`create-next-app` yerine bağımlılıkları elle tanımla (tam kontrol için). Kökte `package.json` oluştur:

```json
{
  "name": "fiilyapi-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "gen:api": "openapi-typescript openapi/openapi.json -o src/lib/api/schema.d.ts"
  },
  "dependencies": {
    "next": "^15.1",
    "react": "^19.0",
    "react-dom": "^19.0",
    "@tanstack/react-query": "^5.62",
    "openapi-fetch": "^0.13"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "^15.1",
    "@eslint/eslintrc": "^3.2",
    "openapi-typescript": "^7.4",
    "vitest": "^2.1",
    "@vitejs/plugin-react": "^4.3",
    "@testing-library/react": "^16.1",
    "@testing-library/jest-dom": "^6.6",
    "jsdom": "^25"
  },
  "packageManager": "pnpm@9.15.0"
}
```

Run: `corepack enable && pnpm install`
Expected: `pnpm-lock.yaml` üretilir, bağımlılıklar kurulur.

- [ ] **Step 2: TypeScript + Next + gitignore yapılandırması**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

`.gitignore`:

```
node_modules/
.next/
out/
coverage/
.env.local
.env*.local
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 3: Kök layout, sayfa ve global stil**

`src/app/globals.css`:

```css
/* Global reset — token katmani Task 2'de eklenecek */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  min-height: 100vh;
}
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FİİL Yapı ERP",
  description: "İnşaat ERP yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main>
      <h1>FİİL Yapı ERP</h1>
    </main>
  );
}
```

- [ ] **Step 4: Vitest yapılandırması ve başarısız test**

`vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

`vitest.setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

`src/app/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("uygulama adını bir başlık olarak gösterir", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "FİİL Yapı ERP" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Testin geçtiğini ve derlemenin çalıştığını doğrula**

Run: `pnpm test`
Expected: `1 passed`

Run: `pnpm typecheck`
Expected: hata yok.

Run: `pnpm build`
Expected: `✓ Compiled successfully` — kök route derlenir.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Next.js App Router iskeleti + Vitest test kosumu"
```

---

## Task 2: Fontlar ve token katmanı (`tokens.css`)

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/app/layout.tsx` (next/font ile Inter + JetBrains Mono), `src/app/globals.css` (tokens importu), `src/app/page.tsx` (token kullanımı)
- Test: `src/styles/tokens.test.ts`

**Interfaces:**
- Consumes: Task 1 layout/globals
- Produces: Global CSS token'ları (`--color-*`, `--text-*`, `--space-*`, `--radius-*`) · Inter (gövde) + JetBrains Mono (sayısal/mono) fontları `--font-sans`/`--font-mono` değişkenlerinde

- [ ] **Step 1: Başarısız testi yaz**

`tokens.css` içindeki zorunlu token'ların varlığını doğrulayan bir metin testi. `src/styles/tokens.test.ts`:

```typescript
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const tokensCss = readFileSync(
  fileURLToPath(new URL("./tokens.css", import.meta.url)),
  "utf8",
);

describe("tokens.css", () => {
  it("çekirdek renk token'larını tanımlar (açık tema Slate + Blue)", () => {
    for (const token of [
      "--color-bg",
      "--color-surface",
      "--color-text",
      "--color-text-muted",
      "--color-border",
      "--color-primary",
      "--color-success",
      "--color-warning",
      "--color-danger",
    ]) {
      expect(tokensCss).toContain(token);
    }
  });

  it("tipografi, boşluk ve yarıçap token'larını tanımlar", () => {
    for (const token of [
      "--font-sans",
      "--font-mono",
      "--text-base",
      "--text-lg",
      "--space-4",
      "--radius-md",
    ]) {
      expect(tokensCss).toContain(token);
    }
  });

  it("koyu tema varsayılanı yoktur — açık tema kanon", () => {
    // Açık tema kanon (README); koyu tema bu fazda YOK.
    expect(tokensCss).not.toContain("prefers-color-scheme: dark");
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/styles/tokens.test.ts`
Expected: FAIL — `tokens.css` yok.

- [ ] **Step 3: Token katmanını yaz**

`src/styles/tokens.css` — palet mockup'lardan çıkarılmıştır (Tailwind Slate + Blue). Font aileleri Task 2 Step 4'te `next/font` tarafından `--font-inter`/`--font-jetbrains-mono` değişkenlerine bağlanır; burada `--font-sans`/`--font-mono` onları fallback zinciriyle sarar.

```css
:root {
  /* Renkler — açık tema (Tailwind Slate + Blue), projedesign mockup'larından */
  --color-bg: #f0f4f8;
  --color-surface: #ffffff;
  --color-surface-muted: #f1f5f9;
  --color-text: #1e293b;
  --color-text-muted: #64748b;
  --color-text-subtle: #94a3b8;
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-soft: #dbeafe;
  --color-success: #16a34a;
  --color-success-soft: #dcfce7;
  --color-warning: #d97706;
  --color-warning-soft: #fef3c7;
  --color-danger: #ef4444;
  --color-danger-soft: #fee2e2;

  /* Tipografi — Inter (gövde), JetBrains Mono (sayısal/tablo) */
  --font-sans: var(--font-inter), "Inter", system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), "JetBrains Mono", monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.5rem;
  --text-2xl: 2rem;
  --leading-normal: 1.5;
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Boşluk — 4px tabanlı ölçek */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

  /* Yarıçap ve yükseltme */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);

  /* Hareket */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

- [ ] **Step 4: Fontları bağla ve token'ları global'e import et**

`src/app/layout.tsx` — `next/font/google` ile fontları yükle:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FİİL Yapı ERP",
  description: "İnşaat ERP yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

> Not: `latin-ext` alt kümesi Türkçe karakterler (ş, ğ, ı, İ, ç, ö, ü) için zorunludur.

`src/app/globals.css` — sonuna ekle:

```css
@import "../styles/tokens.css";

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  background: var(--color-bg);
  color: var(--color-text);
}
```

`src/app/page.tsx` — token kullanan basit bir placeholder:

```tsx
export default function HomePage() {
  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-8)",
      }}
    >
      <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--weight-bold)" }}>
        FİİL Yapı ERP
      </h1>
    </main>
  );
}
```

- [ ] **Step 5: Testin geçtiğini ve derlemenin çalıştığını doğrula**

Run: `pnpm test`
Expected: tüm testler geçer (Task 1 + Task 2 testleri).

Run: `pnpm build`
Expected: `✓ Compiled successfully` — font optimizasyonu hatasız.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Inter/JetBrains Mono fontlari ve acik tema token katmani"
```

---

## Task 3: OpenAPI → TypeScript tip üretimi ve tip-güvenli istemci

**Files:**
- Create: `openapi/openapi.json` (backend anlık görüntüsü), `src/lib/api/client.ts`, `scripts/gen-api.md`
- Generate: `src/lib/api/schema.d.ts` (`pnpm gen:api` çıktısı — elle düzenlenmez)
- Test: `src/lib/api/schema.test.ts`

**Interfaces:**
- Consumes: Task 1 (openapi-typescript/openapi-fetch bağımlılıkları, `gen:api` scripti)
- Produces:
  - `src/lib/api/schema.d.ts` — backend uçlarının tipleri (`paths`, `components["schemas"]["MeResponse"]`, `["TokenPair"]`, `["LoginRequest"]`, `["UserStatus"]` vb.)
  - `src/lib/api/client.ts:apiClient` — `openapi-fetch` ile oluşturulmuş, `paths` ile tiplenmiş istemci (F2 BFF route handler'ları kullanır)

- [ ] **Step 1: Backend OpenAPI anlık görüntüsünü ekle**

`openapi/openapi.json` dosyasını backend'in ürettiği şemayla oluştur. Bu içerik backend reposunda `.venv/bin/python -c "import json; from app.main import app; print(json.dumps(app.openapi(), ensure_ascii=False, indent=2))"` çıktısıdır — **backend deploy edilmediği için statik anlık görüntü commit edilir.** Şema OpenAPI 3.1.0, 5 uç (`/health`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`), 7 bileşen şeması (`LoginRequest`, `RefreshRequest`, `TokenPair`, `MeResponse`, `UserStatus`, `HTTPValidationError`, `ValidationError`) içerir.

> **Uygulayıcıya:** Bu dosyayı elle yazma. Controller sana `openapi/openapi.json` içeriğini birlikte verecek (backend `.venv`'inden üretilmiş, ~4KB). Onu birebir dosyaya yaz. Alternatif: backend reposu erişilebilirse `scripts/gen-api.md`'deki komutla yeniden üret.

`scripts/gen-api.md`:

```markdown
# API tiplerini yenileme

Backend'in OpenAPI şeması değiştiğinde tipleri yenile:

1. Backend reposunda şemayı üret:
   cd ../backend
   .venv/bin/python -c "import json; from app.main import app; \
     print(json.dumps(app.openapi(), ensure_ascii=False, indent=2))" \
     > ../frontend/openapi/openapi.json
2. Frontend'de tipleri yeniden üret:
   pnpm gen:api
3. src/lib/api/schema.d.ts değişikliğini gözden geçir ve commit et.

Backend canlıya alındığında bu adım, çalışan bir instance'ın /openapi.json
ucundan da beslenebilir. Şimdilik statik anlık görüntü kanondur.
```

- [ ] **Step 2: Başarısız testi yaz**

`src/lib/api/schema.test.ts` — üretilen tiplerin ve istemcinin var olduğunu, temel şemaların tiplendiğini doğrular (tip-düzeyi + çalışma-zamanı):

```typescript
import { describe, it, expect, expectTypeOf } from "vitest";
import { apiClient } from "./client";
import type { components } from "./schema";

describe("API tip üretimi", () => {
  it("apiClient tanımlıdır ve GET/POST metodları vardır", () => {
    expect(apiClient).toBeDefined();
    expect(typeof apiClient.GET).toBe("function");
    expect(typeof apiClient.POST).toBe("function");
  });

  it("MeResponse şeması beklenen alanları taşır", () => {
    type Me = components["schemas"]["MeResponse"];
    expectTypeOf<Me>().toHaveProperty("email");
    expectTypeOf<Me>().toHaveProperty("role_key");
    expectTypeOf<Me>().toHaveProperty("status");
  });

  it("TokenPair şeması access/refresh token taşır", () => {
    type Tokens = components["schemas"]["TokenPair"];
    expectTypeOf<Tokens>().toHaveProperty("access_token");
    expectTypeOf<Tokens>().toHaveProperty("refresh_token");
  });
});
```

- [ ] **Step 3: Testin başarısız olduğunu doğrula**

Run: `pnpm test src/lib/api/schema.test.ts`
Expected: FAIL — `./client` ve `./schema` yok.

- [ ] **Step 4: Tipleri üret ve istemciyi yaz**

Run: `pnpm gen:api`
Expected: `src/lib/api/schema.d.ts` üretilir; `components["schemas"]["MeResponse"]` vb. içerir.

`src/lib/api/client.ts`:

```typescript
import createClient from "openapi-fetch";

import type { paths } from "./schema";

/**
 * Backend API'sine tip-güvenli istemci.
 *
 * baseUrl BFF katmanına (Next.js Route Handler'ları) işaret eder — tarayıcı
 * doğrudan backend'e gitmez, F2'de kurulacak /api proxy'sinden geçer.
 * F0'da yalnızca istemci örneği ve tipleri hazırlanır; kullanımı F2'de başlar.
 */
export const apiClient = createClient<paths>({
  baseUrl: "/api",
});
```

- [ ] **Step 5: Testin geçtiğini ve tip kontrolünün temiz olduğunu doğrula**

Run: `pnpm test`
Expected: tüm testler geçer.

Run: `pnpm typecheck`
Expected: hata yok — üretilen tipler ve istemci tip-tutarlı.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: OpenAPI semadan tip uretimi ve tip-guvenli API istemcisi"
```

---

## Task 4: CI iş akışı

**Files:**
- Create: `.github/workflows/ci.yml`, `eslint.config.mjs` (yoksa)

**Interfaces:**
- Consumes: Task 1–3 scriptleri (`lint`, `typecheck`, `test`, `build`)
- Produces: —

- [ ] **Step 1: ESLint yapılandırmasının varlığını doğrula**

`create-next-app` kullanılmadığı için `eslint.config.mjs` elle gerekebilir. Yoksa oluştur:

```javascript
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [...compat.extends("next/core-web-vitals", "next/typescript")];
```

Run: `pnpm lint`
Expected: `✔ No ESLint warnings or errors` (veya temiz çıktı).

- [ ] **Step 2: CI iş akışını yaz**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 3: Tüm kapıların lokalde geçtiğini doğrula**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: dördü de hatasız — CI'ın yeşil olacağının kanıtı.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: lint, typecheck, test ve build is akisi"
```

---

## Faz sonu kabul kriterleri

Aşağıdakilerin **hepsi** doğru olmadan F0 bitmiş sayılmaz:

- [ ] `pnpm install --frozen-lockfile` temiz çalışır; yalnızca `pnpm-lock.yaml` var (npm/yarn kilidi yok).
- [ ] `pnpm dev` çalışır, kök sayfa açık temada Inter fontuyla "FİİL Yapı ERP" gösterir.
- [ ] `pnpm build` hatasız derler.
- [ ] `pnpm typecheck` temiz.
- [ ] `pnpm lint` temiz.
- [ ] `pnpm test` — tüm testler geçer (sayfa render, token varlığı, API tip üretimi).
- [ ] `src/lib/api/schema.d.ts` `pnpm gen:api` ile üretilir ve `MeResponse`/`TokenPair`/`LoginRequest`/`UserStatus` tiplerini içerir; elle düzenlenmemiştir.
- [ ] `src/styles/tokens.css` açık-tema Slate+Blue paletini, Inter/JetBrains Mono font değişkenlerini ve tipografi/boşluk/yarıçap ölçeklerini tanımlar.
- [ ] CI (`.github/workflows/ci.yml`) lint+typecheck+test+build koşar.
- [ ] Hiçbir secret veya `.env.local` commit edilmemiştir.
- [ ] F1 (primitive'ler) bu iskeletin üstüne oturabilir: token katmanı, font değişkenleri ve API tipleri hazır.
