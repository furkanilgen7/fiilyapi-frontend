# F2: Giriş + BFF + Oturum — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FİİL Yapı ERP frontend'ine giriş ekranı + Next.js Route Handler (BFF proxy) + JWT httpOnly cookie oturumu + middleware ile korumalı rota eklemek.

**Architecture:** Tarayıcı backend'e doğrudan gitmez; `/api/auth/*` Route Handler'ları FastAPI'ye (`BACKEND_URL`) proxy yapar ve `TokenPair`'i httpOnly cookie'ye yazar (token JS'e değmez). `me` proxy'sinde 401'de şeffaf refresh (yalnız access cookie'si güncellenir). `middleware.ts` cookie yoksa `/login`'e yönlendirir. Auth yardımcıları edge-güvenli olması için `src/lib/auth/` altında toplanır.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript strict · pnpm · Vitest + React Testing Library · Playwright (E2E + görsel). Yeni runtime bağımlılığı yok (zod dahil değil — manuel doğrulama).

## Global Constraints

- Yalnız **pnpm**. Tailwind YOK — ham CSS + `src/styles/tokens.css`. Mevcut 8 primitive kullanılır, yeni primitive yazılmaz.
- Açık tema, hedef ≥1280px. Responsive/koyu tema yok.
- Kod/isim/dosya **İngilizce**; UI metni + yorumlar **Türkçe**.
- Commit başlıkları **İngilizce** `<type>: <desc>`, Türkçe özel karakter yok.
- `.env.local` / secret **asla** commit edilmez. `BACKEND_URL` server-only (`NEXT_PUBLIC` değil).
- Auth güvenlik-hassas: token httpOnly cookie'de, `localStorage` yok; hata mesajları jenerik/sızdırmaz.
- Cookie flag'leri: `httpOnly`, `secure` (yalnız prod), `sameSite: "lax"`, `path: "/"`.
- Cookie adları: `fiil_access`, `fiil_refresh`.
- Alert error varyantı = `variant="danger"`. Button primary = `variant="primary"`.
- TDD: her task kırmızı test → yeşil → refactor. Task sonunda commit; birkaç task'ta bir `origin/main`'e push.
- Görsel snapshot: Linux baseline `visual-baselines.yml` (workflow_dispatch) ile üretilir; tam-sayı line-height.

## Dosya haritası

**Oluşturulacak:**
- `src/lib/auth/constants.ts` — cookie adı sabitleri (edge-güvenli, Buffer yok).
- `src/lib/auth/types.ts` — `TokenPair`/`MeResponse`/`LoginRequest` alias + `CookieSpec`.
- `src/lib/auth/cookies.ts` — `readTokenExp`, `buildAccessCookie`, `buildRefreshCookie`, `buildAuthCookies`, `clearedAuthCookies`, `applyAuthCookies`.
- `src/lib/auth/backend.ts` — `backendUrl`, `proxyAuthenticated`.
- `src/lib/auth/csrf.ts` — `assertSameOrigin`.
- `src/app/api/auth/login/route.ts` · `logout/route.ts` · `me/route.ts`
- `src/middleware.ts`
- `src/app/login/page.tsx` · `LoginForm.tsx` · `BrandPanel.tsx` · `DemoAccounts.tsx` · `login.css`
- `.env.example`
- `e2e/mock-backend.ts` · `e2e/global-setup.ts` · `e2e/auth.spec.ts` · `e2e/login-visual.spec.ts`
- Testler: yukarıdaki her mantık modülünün yanında `*.test.ts(x)`.

**Değiştirilecek:**
- `src/app/page.tsx` — F0 varsayılan sayfa yerine korumalı placeholder ana sayfa.
- `src/styles/tokens.css` — gradient token'ları.
- `playwright.config.ts` — `globalSetup` + `webServer.env.BACKEND_URL`.

---

### Task 1: Cookie adı sabitleri + auth tipleri

**Files:**
- Create: `src/lib/auth/constants.ts`
- Create: `src/lib/auth/types.ts`
- Test: `src/lib/auth/constants.test.ts`

**Interfaces:**
- Produces: `ACCESS_COOKIE: "fiil_access"`, `REFRESH_COOKIE: "fiil_refresh"` (const). `TokenPair`, `MeResponse`, `LoginRequest` (tip alias'ları). `CookieSpec` interface'i.

- [ ] **Step 1: Failing test**

`src/lib/auth/constants.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./constants";

describe("auth constants", () => {
  it("cookie adlari sabittir", () => {
    expect(ACCESS_COOKIE).toBe("fiil_access");
    expect(REFRESH_COOKIE).toBe("fiil_refresh");
  });
});
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör**

Run: `pnpm test src/lib/auth/constants.test.ts`
Expected: FAIL — `./constants` bulunamaz.

- [ ] **Step 3: Implementasyon**

`src/lib/auth/constants.ts`:
```ts
// Cookie adlari — hem route handler'lar hem edge middleware bunlari kullanir.
// Bu dosya edge-guvenli tutulur (Buffer/Node API yok).
export const ACCESS_COOKIE = "fiil_access";
export const REFRESH_COOKIE = "fiil_refresh";
```

`src/lib/auth/types.ts`:
```ts
import type { components } from "@/lib/api/schema";

// Backend sozlesmesinden turetilen auth tipleri (openapi.json DONMUS).
export type TokenPair = components["schemas"]["TokenPair"];
export type MeResponse = components["schemas"]["MeResponse"];
export type LoginRequest = components["schemas"]["LoginRequest"];

// Next cookie set secenekleriyle uyumlu cerez tanimi.
export interface CookieSpec {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge?: number;
}
```

Not: `components` export'u `openapi-typescript` üretimidir. `src/lib/api/schema.d.ts` içinde `components["schemas"]` mevcut olmalı; değilse `paths`'ten türetin.

- [ ] **Step 4: Testi çalıştır, yeşil gör**

Run: `pnpm test src/lib/auth/constants.test.ts`
Expected: PASS. Ayrıca `pnpm typecheck` — types.ts tip hatası vermez.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/constants.ts src/lib/auth/types.ts src/lib/auth/constants.test.ts
git commit -m "feat: add auth cookie constants and types"
```

---

### Task 2: Cookie yardımcıları

**Files:**
- Create: `src/lib/auth/cookies.ts`
- Test: `src/lib/auth/cookies.test.ts`

**Interfaces:**
- Consumes: `ACCESS_COOKIE`, `REFRESH_COOKIE` (Task 1); `TokenPair`, `CookieSpec` (Task 1).
- Produces:
  - `readTokenExp(jwt: string): number | null`
  - `buildAccessCookie(accessToken: string): CookieSpec`
  - `buildRefreshCookie(refreshToken: string, remember: boolean): CookieSpec`
  - `buildAuthCookies(pair: TokenPair, remember: boolean): CookieSpec[]`
  - `clearedAuthCookies(): CookieSpec[]`
  - `applyAuthCookies(res: NextResponse, specs: CookieSpec[]): void`

- [ ] **Step 1: Failing test**

`src/lib/auth/cookies.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  readTokenExp,
  buildAccessCookie,
  buildRefreshCookie,
  buildAuthCookies,
  clearedAuthCookies,
  applyAuthCookies,
} from "./cookies";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./constants";

function jwtWithExp(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("readTokenExp", () => {
  it("gecerli JWT'den exp okur", () => {
    expect(readTokenExp(jwtWithExp(1234567890))).toBe(1234567890);
  });
  it("bozuk token icin null doner", () => {
    expect(readTokenExp("not-a-jwt")).toBeNull();
    expect(readTokenExp("a.b")).toBeNull();
  });
});

describe("buildRefreshCookie", () => {
  it("remember=false ise maxAge atanmaz (oturum cookie'si)", () => {
    const spec = buildRefreshCookie(jwtWithExp(9999999999), false);
    expect(spec.name).toBe(REFRESH_COOKIE);
    expect(spec.httpOnly).toBe(true);
    expect(spec.sameSite).toBe("lax");
    expect(spec.maxAge).toBeUndefined();
  });
  it("remember=true ise maxAge pozitiftir", () => {
    const spec = buildRefreshCookie(jwtWithExp(9999999999), true);
    expect(spec.maxAge).toBeGreaterThan(0);
  });
});

describe("buildAccessCookie", () => {
  it("access cookie'yi ACCESS_COOKIE adiyla httpOnly uretir", () => {
    const spec = buildAccessCookie(jwtWithExp(9999999999));
    expect(spec.name).toBe(ACCESS_COOKIE);
    expect(spec.httpOnly).toBe(true);
    expect(spec.maxAge).toBeGreaterThan(0);
  });
});

describe("buildAuthCookies", () => {
  it("iki cookie uretir", () => {
    const specs = buildAuthCookies(
      { access_token: jwtWithExp(9999999999), refresh_token: jwtWithExp(9999999999) },
      true,
    );
    expect(specs.map((s) => s.name)).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);
  });
});

describe("clearedAuthCookies", () => {
  it("her iki cookie'yi maxAge 0 ile siler", () => {
    const specs = clearedAuthCookies();
    expect(specs).toHaveLength(2);
    expect(specs.every((s) => s.maxAge === 0)).toBe(true);
  });
});

describe("applyAuthCookies", () => {
  it("cookie'leri NextResponse'a yazar", () => {
    const res = NextResponse.json({ ok: true });
    applyAuthCookies(res, buildAuthCookies(
      { access_token: jwtWithExp(9999999999), refresh_token: jwtWithExp(9999999999) }, true,
    ));
    expect(res.cookies.get(ACCESS_COOKIE)?.value).toBeTruthy();
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBeTruthy();
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/lib/auth/cookies.test.ts`
Expected: FAIL — `./cookies` yok.

- [ ] **Step 3: Implementasyon**

`src/lib/auth/cookies.ts`:
```ts
import type { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "./constants";
import type { CookieSpec, TokenPair } from "./types";

// exp okunamazsa kullanilacak yedek omurler.
const ACCESS_FALLBACK_MAX_AGE = 15 * 60; // 15 dakika
const REFRESH_FALLBACK_MAX_AGE = 30 * 24 * 60 * 60; // 30 gun

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

// JWT payload'ini decode edip exp (saniye) okur. Imza dogrulamaz —
// amaci cookie omrunu token omrune esitlemek.
export function readTokenExp(jwt: string): number | null {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function maxAgeFromExp(jwt: string, fallback: number): number {
  const exp = readTokenExp(jwt);
  if (exp === null) return fallback;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, exp - now);
}

export function buildAccessCookie(accessToken: string): CookieSpec {
  return {
    name: ACCESS_COOKIE,
    value: accessToken,
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeFromExp(accessToken, ACCESS_FALLBACK_MAX_AGE),
  };
}

export function buildRefreshCookie(refreshToken: string, remember: boolean): CookieSpec {
  const spec: CookieSpec = {
    name: REFRESH_COOKIE,
    value: refreshToken,
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
  };
  // remember=false → maxAge yok → oturum cookie'si (tarayici kapaninca silinir).
  if (remember) spec.maxAge = maxAgeFromExp(refreshToken, REFRESH_FALLBACK_MAX_AGE);
  return spec;
}

export function buildAuthCookies(pair: TokenPair, remember: boolean): CookieSpec[] {
  return [buildAccessCookie(pair.access_token), buildRefreshCookie(pair.refresh_token, remember)];
}

export function clearedAuthCookies(): CookieSpec[] {
  const base = { value: "", httpOnly: true, secure: isProd(), sameSite: "lax" as const, path: "/", maxAge: 0 };
  return [
    { name: ACCESS_COOKIE, ...base },
    { name: REFRESH_COOKIE, ...base },
  ];
}

export function applyAuthCookies(res: NextResponse, specs: CookieSpec[]): void {
  for (const spec of specs) res.cookies.set(spec);
}
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/lib/auth/cookies.test.ts`
Expected: PASS (tüm testler).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/cookies.ts src/lib/auth/cookies.test.ts
git commit -m "feat: add auth cookie helpers with token-exp lifetimes"
```

---

### Task 3: Backend proxy yardımcısı + .env.example

**Files:**
- Create: `src/lib/auth/backend.ts`
- Create: `.env.example`
- Test: `src/lib/auth/backend.test.ts`

**Interfaces:**
- Consumes: `TokenPair` (Task 1).
- Produces:
  - `backendUrl(): string` — `process.env.BACKEND_URL`; yoksa `throw new Error`.
  - `proxyAuthenticated(accessToken: string | undefined, refreshToken: string | undefined, path: string): Promise<ProxyResult>`
  - `interface ProxyResult { status: number; body: unknown; refreshedAccessToken?: string }`

- [ ] **Step 1: Failing test**

`src/lib/auth/backend.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backendUrl, proxyAuthenticated } from "./backend";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("backendUrl", () => {
  afterEach(() => {
    delete process.env.BACKEND_URL;
  });
  it("env yoksa hata firlatir", () => {
    delete process.env.BACKEND_URL;
    expect(() => backendUrl()).toThrow();
  });
  it("env varsa deger doner", () => {
    process.env.BACKEND_URL = "http://backend:8000";
    expect(backendUrl()).toBe("http://backend:8000");
  });
});

describe("proxyAuthenticated", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "http://backend:8000";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_URL;
  });

  it("200'de govdeyi geciren", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { full_name: "Ali" })));
    const r = await proxyAuthenticated("acc", "ref", "/auth/me");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ full_name: "Ali" });
    expect(r.refreshedAccessToken).toBeUndefined();
  });

  it("401'de refresh basarili ise yeni access ile retry eder", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { detail: "expired" })) // ilk /auth/me
      .mockResolvedValueOnce(jsonResponse(200, { access_token: "new-acc", refresh_token: "ref2" })) // /auth/refresh
      .mockResolvedValueOnce(jsonResponse(200, { full_name: "Ali" })); // retry /auth/me
    vi.stubGlobal("fetch", fetchMock);
    const r = await proxyAuthenticated("old-acc", "ref", "/auth/me");
    expect(r.status).toBe(200);
    expect(r.refreshedAccessToken).toBe("new-acc");
    // retry cagirisi yeni access token'i kullanir
    const retryCall = fetchMock.mock.calls[2];
    expect(String(retryCall[1].headers.Authorization)).toContain("new-acc");
  });

  it("401 + refresh basarisiz ise 401 doner", async () => {
    vi.stubGlobal("fetch", vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(401, {})));
    const r = await proxyAuthenticated("acc", "ref", "/auth/me");
    expect(r.status).toBe(401);
  });

  it("refresh token yoksa 401'i dogrudan doner", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, {})));
    const r = await proxyAuthenticated("acc", undefined, "/auth/me");
    expect(r.status).toBe(401);
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/lib/auth/backend.test.ts`
Expected: FAIL — `./backend` yok.

- [ ] **Step 3: Implementasyon**

`src/lib/auth/backend.ts`:
```ts
import type { TokenPair } from "./types";

export interface ProxyResult {
  status: number;
  body: unknown;
  // Seffaf refresh olduysa yeni access token — cagiran taraf access cookie'sini gunceller.
  refreshedAccessToken?: string;
}

export function backendUrl(): string {
  const url = process.env.BACKEND_URL;
  if (!url) throw new Error("BACKEND_URL tanimli degil");
  return url;
}

async function parseBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function get(path: string, accessToken: string | undefined): Promise<Response> {
  return fetch(backendUrl() + path, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
}

// Backend'i Bearer ile cagirir; 401'de refresh token varsa /auth/refresh dener,
// basarili ise yeni access token ile bir kez retry eder. Refresh token (stateless,
// backend'de rotasyonsuz) tarayicida yenilenmez — yalniz access cookie'si guncellenir.
export async function proxyAuthenticated(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  path: string,
): Promise<ProxyResult> {
  const first = await get(path, accessToken);
  if (first.status !== 401) {
    return { status: first.status, body: await parseBody(first) };
  }
  if (!refreshToken) {
    return { status: 401, body: await parseBody(first) };
  }
  const refreshed = await fetch(backendUrl() + "/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!refreshed.ok) {
    return { status: 401, body: null };
  }
  const pair = (await parseBody(refreshed)) as TokenPair | null;
  if (!pair?.access_token) {
    return { status: 401, body: null };
  }
  const retry = await get(path, pair.access_token);
  return {
    status: retry.status,
    body: await parseBody(retry),
    refreshedAccessToken: pair.access_token,
  };
}
```

`.env.example`:
```bash
# Backend (FastAPI) taban URL'i — BFF Route Handler'lari bu adrese proxy yapar.
# Server-only (NEXT_PUBLIC degil). Yerelde: http://127.0.0.1:8000
# Canlida: Railway backend servis URL'i. .env.local'e kopyalayin, ASLA commit etmeyin.
BACKEND_URL=http://127.0.0.1:8000
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/lib/auth/backend.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/backend.ts src/lib/auth/backend.test.ts .env.example
git commit -m "feat: add backend proxy helper with transparent refresh"
```

---

### Task 4: CSRF origin kontrolü

**Files:**
- Create: `src/lib/auth/csrf.ts`
- Test: `src/lib/auth/csrf.test.ts`

**Interfaces:**
- Produces: `assertSameOrigin(request: NextRequest): boolean` — `Origin` başlığı host'u `Host`'a eşitse `true`; başlık yok/uyumsuz → `false`.

- [ ] **Step 1: Failing test**

`src/lib/auth/csrf.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { assertSameOrigin } from "./csrf";

function req(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", { method: "POST", headers });
}

describe("assertSameOrigin", () => {
  it("origin host, host ile eslesirse true", () => {
    expect(assertSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });
  it("origin farkli host ise false", () => {
    expect(assertSameOrigin(req({ origin: "http://evil.com", host: "localhost:3000" }))).toBe(false);
  });
  it("origin yoksa false", () => {
    expect(assertSameOrigin(req({ host: "localhost:3000" }))).toBe(false);
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/lib/auth/csrf.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasyon**

`src/lib/auth/csrf.ts`:
```ts
import type { NextRequest } from "next/server";

// Hafif CSRF savunmasi: durum-degistiren POST'larda Origin host'u Host'a esit mi?
// Tarayici same-origin POST'larda Origin gonderir; eksik/uyumsuz → reddet.
export function assertSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/lib/auth/csrf.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/csrf.ts src/lib/auth/csrf.test.ts
git commit -m "feat: add same-origin CSRF guard"
```

---

### Task 5: Login route handler

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Test: `src/app/api/auth/login/route.test.ts`

**Interfaces:**
- Consumes: `assertSameOrigin` (Task 4), `backendUrl` (Task 3), `buildAuthCookies`/`applyAuthCookies` (Task 2), `ACCESS_COOKIE` (Task 1).
- Produces: `POST(request: NextRequest): Promise<NextResponse>`. Başarı gövdesi `{ ok: true }` (token gövdede DÖNMEZ). Hata gövdesi `{ ok: false, code: string }`.

- [ ] **Step 1: Failing test**

`src/app/api/auth/login/route.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

function jwt(exp: number): string {
  const p = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `h.${p}.s`;
}
function loginReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { origin: "http://localhost:3000", host: "localhost:3000", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "http://backend:8000";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_URL;
  });

  it("basarili girisde cookie yazar, token'i govdede DONDURMEZ", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: jwt(9999999999), refresh_token: jwt(9999999999) }), { status: 200 }),
    ));
    const res = await POST(loginReq({ email: "a@b.com", password: "x", remember: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
    expect(JSON.stringify(json)).not.toContain("access_token");
    expect(res.cookies.get(ACCESS_COOKIE)?.value).toBeTruthy();
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBeTruthy();
  });

  it("kotu origin'de 403", async () => {
    const res = await POST(loginReq({ email: "a@b.com", password: "x" }, { origin: "http://evil.com" }));
    expect(res.status).toBe(403);
  });

  it("gecersiz govde'de 400", async () => {
    const res = await POST(loginReq({ email: "", password: "" }));
    expect(res.status).toBe(400);
  });

  it("yanlis parolada backend statusunu (401) gecirir, cookie yazmaz", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const res = await POST(loginReq({ email: "a@b.com", password: "wrong" }));
    expect(res.status).toBe(401);
    expect(res.cookies.get(ACCESS_COOKIE)?.value).toBeFalsy();
  });

  it("BACKEND_URL yoksa 500", async () => {
    delete process.env.BACKEND_URL;
    const res = await POST(loginReq({ email: "a@b.com", password: "x" }));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/app/api/auth/login/route.test.ts`
Expected: FAIL — `./route` yok.

- [ ] **Step 3: Implementasyon**

`src/app/api/auth/login/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { backendUrl } from "@/lib/auth/backend";
import { applyAuthCookies, buildAuthCookies } from "@/lib/auth/cookies";
import type { TokenPair } from "@/lib/auth/types";

interface ParsedLogin {
  email: string;
  password: string;
  remember: boolean;
}

function parseLoginBody(data: unknown): ParsedLogin | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.email !== "string" || d.email.trim() === "") return null;
  if (typeof d.password !== "string" || d.password === "") return null;
  return { email: d.email, password: d.password, remember: d.remember === true };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
  }
  let base: string;
  try {
    base = backendUrl();
  } catch {
    return NextResponse.json({ ok: false, code: "misconfigured" }, { status: 500 });
  }
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  const parsed = parseLoginBody(data);
  if (!parsed) {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  let backendRes: Response;
  try {
    backendRes = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: parsed.email, password: parsed.password }),
    });
  } catch {
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: 502 });
  }
  if (!backendRes.ok) {
    // Ham backend mesajini sizdirma; yalniz statuyu gecir.
    return NextResponse.json({ ok: false, code: "invalid_credentials" }, { status: backendRes.status });
  }
  const pair = (await backendRes.json()) as TokenPair;
  const res = NextResponse.json({ ok: true });
  applyAuthCookies(res, buildAuthCookies(pair, parsed.remember));
  return res;
}
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/app/api/auth/login/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/login/route.ts src/app/api/auth/login/route.test.ts
git commit -m "feat: add login route handler with httpOnly cookies"
```

---

### Task 6: Logout route handler

**Files:**
- Create: `src/app/api/auth/logout/route.ts`
- Test: `src/app/api/auth/logout/route.test.ts`

**Interfaces:**
- Consumes: `assertSameOrigin` (Task 4), `clearedAuthCookies`/`applyAuthCookies` (Task 2), `ACCESS_COOKIE` (Task 1).
- Produces: `POST(request: NextRequest): Promise<NextResponse>` — 204, cookie'leri siler. Backend çağrılmaz.

- [ ] **Step 1: Failing test**

`src/app/api/auth/logout/route.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { ACCESS_COOKIE } from "@/lib/auth/constants";

function logoutReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { origin: "http://localhost:3000", host: "localhost:3000", ...headers },
  });
}

describe("POST /api/auth/logout", () => {
  it("cookie'leri siler ve 204 doner", async () => {
    const res = await POST(logoutReq());
    expect(res.status).toBe(204);
    const cleared = res.cookies.get(ACCESS_COOKIE);
    expect(cleared?.value).toBe("");
    expect(cleared?.maxAge).toBe(0);
  });
  it("kotu origin'de 403", async () => {
    const res = await POST(logoutReq({ origin: "http://evil.com" }));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/app/api/auth/logout/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasyon**

`src/app/api/auth/logout/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { applyAuthCookies, clearedAuthCookies } from "@/lib/auth/cookies";

// Backend logout no-op (token'lar stateless). Oturumu bitirmek = cookie'yi silmek.
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
  }
  const res = new NextResponse(null, { status: 204 });
  applyAuthCookies(res, clearedAuthCookies());
  return res;
}
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/app/api/auth/logout/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/logout/route.ts src/app/api/auth/logout/route.test.ts
git commit -m "feat: add logout route handler clearing cookies"
```

---

### Task 7: Me route handler

**Files:**
- Create: `src/app/api/auth/me/route.ts`
- Test: `src/app/api/auth/me/route.test.ts`

**Interfaces:**
- Consumes: `proxyAuthenticated` (Task 3), `buildAccessCookie`/`clearedAuthCookies`/`applyAuthCookies` (Task 2), `ACCESS_COOKIE`/`REFRESH_COOKIE` (Task 1).
- Produces: `GET(request: NextRequest): Promise<NextResponse>`. Başarı → `MeResponse` geçir. `refreshedAccessToken` varsa access cookie güncelle. 401 → cookie temizle + 401.

- [ ] **Step 1: Failing test**

`src/app/api/auth/me/route.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

function meReq(cookies: Record<string, string>): NextRequest {
  const r = new NextRequest("http://localhost:3000/api/auth/me", { method: "GET" });
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}
function jwt(exp: number): string {
  return `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;
}

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "http://backend:8000";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_URL;
  });

  it("basarili proxy MeResponse gecirir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ full_name: "Ali", role_key: "patron" }), { status: 200 }),
    ));
    const res = await GET(meReq({ [ACCESS_COOKIE]: "acc", [REFRESH_COOKIE]: "ref" }));
    expect(res.status).toBe(200);
    expect((await res.json()).full_name).toBe("Ali");
  });

  it("seffaf refresh olursa access cookie'yi gunceller", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: jwt(9999999999), refresh_token: jwt(9999999999) }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ full_name: "Ali" }), { status: 200 })));
    const res = await GET(meReq({ [ACCESS_COOKIE]: "old", [REFRESH_COOKIE]: "ref" }));
    expect(res.status).toBe(200);
    expect(res.cookies.get(ACCESS_COOKIE)?.value).toBeTruthy();
  });

  it("cookie yoksa 401 doner ve cookie temizler", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const res = await GET(meReq({}));
    expect(res.status).toBe(401);
    expect(res.cookies.get(ACCESS_COOKIE)?.maxAge).toBe(0);
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/app/api/auth/me/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasyon**

`src/app/api/auth/me/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/auth/backend";
import { applyAuthCookies, buildAccessCookie, clearedAuthCookies } from "@/lib/auth/cookies";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  let result;
  try {
    result = await proxyAuthenticated(access, refresh, "/auth/me");
  } catch {
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: 502 });
  }

  if (result.status === 401) {
    const res = NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
    applyAuthCookies(res, clearedAuthCookies());
    return res;
  }

  const res = NextResponse.json(result.body, { status: result.status });
  if (result.refreshedAccessToken) {
    applyAuthCookies(res, [buildAccessCookie(result.refreshedAccessToken)]);
  }
  return res;
}
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/app/api/auth/me/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/me/route.ts src/app/api/auth/me/route.test.ts
git commit -m "feat: add me route handler with transparent refresh"
```

---

### Task 8: Middleware ile korumalı rota

**Files:**
- Create: `src/middleware.ts`
- Test: `src/middleware.test.ts`

**Interfaces:**
- Consumes: `ACCESS_COOKIE`, `REFRESH_COOKIE` (Task 1 — edge-güvenli constants).
- Produces: `middleware(request: NextRequest): NextResponse`, `config` (matcher). Cookie yoksa `/login?next=<path>`'e 307 redirect.

- [ ] **Step 1: Failing test**

`src/middleware.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";
import { ACCESS_COOKIE } from "@/lib/auth/constants";

function pageReq(path: string, cookies: Record<string, string> = {}): NextRequest {
  const r = new NextRequest(`http://localhost:3000${path}`);
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}

describe("middleware", () => {
  it("cookie yoksa /login'e next parametresiyle yonlendirir", () => {
    const res = middleware(pageReq("/"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("next=%2F");
  });

  it("access cookie varsa gecise izin verir", () => {
    const res = middleware(pageReq("/", { [ACCESS_COOKIE]: "acc" }));
    // NextResponse.next() → yonlendirme yok (location basligi yok)
    expect(res.headers.get("location")).toBeNull();
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/middleware.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementasyon**

`src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

// Korumali sayfa rotalari: cookie yoksa /login'e yonlendir. Edge'de yalniz
// cookie VARLIGI kontrol edilir; gercek gecerlilik API'de (backend /auth/me).
export function middleware(request: NextRequest): NextResponse {
  const hasSession =
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

// /api/*, /login, /design-system, statikler ve favicon haric her sayfa korunur.
export const config = {
  matcher: ["/((?!api|login|design-system|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/middleware.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/middleware.test.ts
git commit -m "feat: add middleware protecting authenticated routes"
```

---

### Task 9: tokens.css gradient + BrandPanel + login sayfası kabuğu

**Files:**
- Modify: `src/styles/tokens.css`
- Create: `src/app/login/BrandPanel.tsx`
- Create: `src/app/login/login.css`
- Create: `src/app/login/page.tsx`
- Test: `src/app/login/BrandPanel.test.tsx`

**Interfaces:**
- Produces: `BrandPanel` (default export, statik). `LoginPage` (`page.tsx` default export). Bu task'ta form yerine geçici placeholder; form Task 10'da eklenir.

- [ ] **Step 1: Failing test**

`src/app/login/BrandPanel.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BrandPanel from "./BrandPanel";

describe("BrandPanel", () => {
  it("marka adini ve slogani gosterir", () => {
    render(<BrandPanel />);
    expect(screen.getByText("FİİL")).toBeInTheDocument();
    expect(screen.getByText(/tek platformda yönetin/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/app/login/BrandPanel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementasyon**

`src/styles/tokens.css` — mevcut `--color-primary-hover: #1d4ed8;` satırının hemen ardına ekle:
```css
  --color-primary-900: #1e3a8a;
  --gradient-brand-panel: linear-gradient(
    160deg,
    var(--color-primary-900) 0%,
    var(--color-primary-hover) 50%,
    var(--color-primary) 100%
  );
```

`src/app/login/login.css`:
```css
.login {
  display: flex;
  min-height: 100vh;
}

.login-brand {
  width: 420px;
  flex-shrink: 0;
  background: var(--gradient-brand-panel);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px 40px;
  position: relative;
  overflow: hidden;
}

.login-brand__logo {
  display: flex;
  align-items: center;
  gap: 14px;
}

.login-brand__logo-mark {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-brand__name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.login-brand__sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 2px;
  font-weight: 500;
}

.login-brand__headline {
  font-size: 28px;
  font-weight: 700;
  line-height: 39px; /* tam-sayi: gorsel snapshot jitter'ini onler */
  letter-spacing: -0.5px;
  margin-bottom: 16px;
}

.login-brand__desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 24px;
  margin-bottom: 32px;
}

.login-brand__features {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-brand__feature {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.login-brand__feature-icon {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.login-brand__copyright {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.login-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--color-surface-secondary, #f8fafc);
}

.login-form {
  width: 100%;
  max-width: 400px;
}
```
Not: `--color-surface-secondary` token adı F1 `tokens.css`'inde farklıysa mevcut ikincil-yüzey token'ını kullanın; fallback `#f8fafc` zaten var.

`src/app/login/BrandPanel.tsx`:
```tsx
const FEATURES: ReadonlyArray<{ icon: string; text: string }> = [
  { icon: "📍", text: "Proje → Şantiye → Bölüm hiyerarşisi" },
  { icon: "📊", text: "Günlük kayıttan otomatik hakediş" },
  { icon: "💰", text: "Gerçek zamanlı mali tablolar & muhasebe" },
  { icon: "👷", text: "Puantaj, bordro ve İK yönetimi" },
];

// Giris ekraninin sol marka paneli — statik, etkilesimsiz.
export default function BrandPanel() {
  return (
    <aside className="login-brand">
      <div className="login-brand__logo">
        <div className="login-brand__logo-mark">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#2563eb" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#2563eb" opacity=".6" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#2563eb" opacity=".6" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#2563eb" opacity=".3" />
          </svg>
        </div>
        <div>
          <div className="login-brand__name">FİİL</div>
          <div className="login-brand__sub">YAPI ERP</div>
        </div>
      </div>

      <div>
        <div className="login-brand__headline">
          İnşaat projelerinizi
          <br />
          tek platformda yönetin
        </div>
        <div className="login-brand__desc">
          Şantiyeden muhasebeye, taşeron hakedişinden işveren faturasına kadar her şey entegre.
        </div>
        <div className="login-brand__features">
          {FEATURES.map((f) => (
            <div key={f.text} className="login-brand__feature">
              <span className="login-brand__feature-icon" aria-hidden="true">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="login-brand__copyright">© 2026 FİİL Yazılım A.Ş. · Tüm hakları saklıdır.</div>
    </aside>
  );
}
```

`src/app/login/page.tsx`:
```tsx
import BrandPanel from "./BrandPanel";
import "./login.css";

export default function LoginPage() {
  return (
    <main className="login">
      <BrandPanel />
      <div className="login-form-panel">
        <div className="login-form">{/* LoginForm Task 10'da eklenir */}</div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/app/login/BrandPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css src/app/login/BrandPanel.tsx src/app/login/login.css src/app/login/page.tsx src/app/login/BrandPanel.test.tsx
git commit -m "feat: add login brand panel and page shell"
```

---

### Task 10: LoginForm (doğrulama + submit + hata + parola toggle)

**Files:**
- Create: `src/app/login/LoginForm.tsx`
- Create: `src/app/login/DemoAccounts.tsx`
- Modify: `src/app/login/page.tsx` (LoginForm'u göm)
- Modify: `src/app/login/login.css` (form stilleri ekle)
- Test: `src/app/login/LoginForm.test.tsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Checkbox`, `Alert` (`@/components/ui`); `EyeIcon`, `EyeOffIcon` (`@/components/ui/icons`).
- Produces: `LoginForm` (default export, client component). `DemoAccounts` (dev-only, `onPick(email)` prop).

- [ ] **Step 1: Failing test**

`src/app/login/LoginForm.test.tsx`:
```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(""),
}));

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
});

describe("LoginForm", () => {
  it("bos alanlarda dogrulama hatasi gosterir, istek atmaz", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: /giriş yap/i }));
    expect(await screen.findByText(/e-posta gerekli/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("basarili girisde / adresine yonlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/e-posta/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/^şifre$/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /giriş yap/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });

  it("401'de kimlik hatasi mesaji gosterir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 401 }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/e-posta/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/^şifre$/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /giriş yap/i }));
    expect(await screen.findByText(/e-posta veya şifre hatalı/i)).toBeInTheDocument();
  });

  it("parola goster/gizle calisir", async () => {
    render(<LoginForm />);
    const pw = screen.getByLabelText(/^şifre$/i) as HTMLInputElement;
    expect(pw.type).toBe("password");
    await userEvent.click(screen.getByRole("button", { name: /şifreyi göster/i }));
    expect(pw.type).toBe("text");
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/app/login/LoginForm.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementasyon**

`src/app/login/DemoAccounts.tsx`:
```tsx
const DEMO_ACCOUNTS: ReadonlyArray<{ icon: string; label: string; email: string; tag: string }> = [
  { icon: "👔", label: "Patron Görünümü", email: "patron@fiil.com", tag: "Tüm Erişim" },
  { icon: "👷", label: "Şantiye Şefi", email: "sef@fiil.com", tag: "Saha Erişim" },
  { icon: "📒", label: "Muhasebe", email: "muhasebe@fiil.com", tag: "Mali Erişim" },
];

type Props = {
  onPick: (email: string) => void;
};

// Yalniz gelistirme ortaminda render edilir (LoginForm karar verir).
export default function DemoAccounts({ onPick }: Props) {
  return (
    <div className="login-demo">
      <div className="login-demo__title">Demo Hesapları</div>
      <div className="login-demo__list">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            className="login-demo__item"
            onClick={() => onPick(a.email)}
          >
            <span aria-hidden="true">{a.icon}</span>
            <span className="login-demo__label">{a.label}</span>
            <span className="login-demo__email">{a.email}</span>
            <span className="login-demo__tag">{a.tag}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

`src/app/login/LoginForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Checkbox, Input } from "@/components/ui";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import DemoAccounts from "./DemoAccounts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Backend statu kodunu kullanici-dostu jenerik mesaja esler (alan sizdirmadan).
function messageForStatus(status: number | "network"): string {
  if (status === 401) return "E-posta veya şifre hatalı.";
  if (status === 403) return "Hesabınız aktif değil. Yöneticinizle iletişime geçin.";
  if (status === 422 || status === 400) return "Girdiğiniz bilgileri kontrol edin.";
  return "Sunucuya ulaşılamıyor. Lütfen tekrar deneyin.";
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDev = process.env.NODE_ENV === "development";

  function validate(): boolean {
    let ok = true;
    if (email.trim() === "") {
      setEmailError("E-posta gerekli.");
      ok = false;
    } else if (!EMAIL_RE.test(email)) {
      setEmailError("Geçerli bir e-posta girin.");
      ok = false;
    } else {
      setEmailError(null);
    }
    if (password === "") {
      setPasswordError("Şifre gerekli.");
      ok = false;
    } else {
      setPasswordError(null);
    }
    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      if (res.ok) {
        const next = searchParams.get("next");
        router.push(next && next.startsWith("/") ? next : "/");
        return;
      }
      setFormError(messageForStatus(res.status));
    } catch {
      setFormError(messageForStatus("network"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="login-heading">
        <h1>Hesabınıza giriş yapın</h1>
        <p>FİİL Yapı ERP sistemine hoş geldiniz</p>
      </div>

      {formError && (
        <Alert variant="danger" className="login-alert">{formError}</Alert>
      )}

      <div className="login-field">
        <label htmlFor="email">E-posta Adresi</label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="ornek@sirket.com"
          value={email}
          status={emailError ? "error" : "default"}
          onChange={(e) => setEmail(e.target.value)}
        />
        {emailError && <span className="login-field__error">{emailError}</span>}
      </div>

      <div className="login-field">
        <label htmlFor="password">Şifre</label>
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Şifrenizi girin"
          value={password}
          status={passwordError ? "error" : "default"}
          onChange={(e) => setPassword(e.target.value)}
          rightIcon={
            <button
              type="button"
              className="login-password-toggle"
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />
        {passwordError && <span className="login-field__error">{passwordError}</span>}
      </div>

      <Checkbox
        label="30 gün boyunca beni hatırla"
        checked={remember}
        onChange={(e) => setRemember(e.target.checked)}
      />

      <Button type="submit" variant="primary" className="login-submit" disabled={isSubmitting}>
        {isSubmitting ? "Giriş yapılıyor…" : "Giriş Yap"}
      </Button>

      <div className="login-footer">
        Hesabınız yok mu? <strong>Yöneticinizle iletişime geçin</strong>
      </div>

      {isDev && <DemoAccounts onPick={setEmail} />}
    </form>
  );
}
```

`src/app/login/page.tsx` — placeholder yorumu form ile değiştir:
```tsx
import BrandPanel from "./BrandPanel";
import LoginForm from "./LoginForm";
import "./login.css";

export default function LoginPage() {
  return (
    <main className="login">
      <BrandPanel />
      <div className="login-form-panel">
        <div className="login-form">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
```

`src/app/login/login.css` — sonuna ekle (form/alan/demo stilleri; tam-sayı line-height):
```css
.login-heading h1 {
  font-size: 26px;
  font-weight: 700;
  line-height: 32px;
  letter-spacing: -0.5px;
  color: var(--color-text, #1e293b);
  margin-bottom: 6px;
}
.login-heading p {
  font-size: 14px;
  line-height: 20px;
  color: var(--color-text-muted, #64748b);
  margin-bottom: 32px;
}
.login-alert {
  margin-bottom: 16px;
}
.login-field {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.login-field label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}
.login-field__error {
  font-size: 12px;
  line-height: 16px;
  color: var(--color-danger, #ef4444);
}
.login-password-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-subtle, #94a3b8);
  display: inline-flex;
}
.login-submit {
  width: 100%;
  margin-top: 8px;
}
.login-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 13px;
  line-height: 18px;
  color: var(--color-text-muted, #64748b);
}
.login-demo {
  margin-top: 24px;
  background: var(--color-divider, #f1f5f9);
  border-radius: 10px;
  padding: 14px;
}
.login-demo__title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 10px;
}
.login-demo__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.login-demo__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: #fff;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-size: 12px;
}
.login-demo__email {
  color: var(--color-text-subtle, #94a3b8);
  font-size: 10px;
}
.login-demo__tag {
  margin-left: auto;
  font-size: 10px;
  background: var(--color-primary-soft, #dbeafe);
  color: var(--color-primary, #2563eb);
  padding: 2px 7px;
  border-radius: 6px;
  font-weight: 600;
}
```
Not: token adları (`--color-text-muted` vb.) F1 `tokens.css`'te farklıysa mevcut adları kullanın; fallback değerleri zaten güvenli.

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/app/login/LoginForm.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add src/app/login/LoginForm.tsx src/app/login/DemoAccounts.tsx src/app/login/page.tsx src/app/login/login.css src/app/login/LoginForm.test.tsx
git commit -m "feat: add login form with validation and error mapping"
```

---

### Task 11: Korumalı placeholder ana sayfa

**Files:**
- Modify: `src/app/page.tsx` (F0 varsayılanı değiştir)
- Modify/Replace: `src/app/page.test.tsx` (F0 testi yeni davranışa göre)
- Create: `src/app/home.css`

**Interfaces:**
- Consumes: `Button`, `Badge` (`@/components/ui`); `MeResponse` (`@/lib/auth/types`).
- Produces: `HomePage` (default export, client component). Mount'ta `/api/auth/me` çeker; "Çıkış Yap" → `/api/auth/logout` → `/login`.

- [ ] **Step 1: Failing test**

`src/app/page.test.tsx` (mevcut içeriği bununla değiştir):
```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "./page";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
});

describe("HomePage (placeholder)", () => {
  it("me verisiyle kullanici adini gosterir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ full_name: "Ahmet Yılmaz", role_key: "patron", title: "Patron" }), { status: 200 }),
    );
    render(<HomePage />);
    expect(await screen.findByText(/Ahmet Yılmaz/)).toBeInTheDocument();
  });

  it("cikis yapinca /login'e yonlendirir", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ full_name: "Ahmet", role_key: "patron", title: "Patron" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    render(<HomePage />);
    await screen.findByText(/Ahmet/);
    await userEvent.click(screen.getByRole("button", { name: /çıkış yap/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("401'de /login'e yonlendirir", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 401 }));
    render(<HomePage />);
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });
});
```

- [ ] **Step 2: Kırmızı gör**

Run: `pnpm test src/app/page.test.tsx`
Expected: FAIL (yeni davranış henüz yok).

- [ ] **Step 3: Implementasyon**

`src/app/page.tsx` (tüm içeriği değiştir):
```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import type { MeResponse } from "@/lib/auth/types";
import "./home.css";

// F2 gecici ana sayfasi — F3 kabugu (Topbar/Sidebar/dashboard) bunu degistirecek.
export default function HomePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (active && data) {
          setMe(data as MeResponse);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) router.push("/login");
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (isLoading || !me) {
    return <main className="home home--loading">Yükleniyor…</main>;
  }

  return (
    <main className="home">
      <div className="home-card">
        <h1>Hoş geldiniz, {me.full_name}</h1>
        <div className="home-role">
          <Badge variant="primary">{me.title}</Badge>
        </div>
        <p className="home-note">
          Bu geçici bir ana sayfadır. Gösterge paneli ve kabuk (Topbar/Sidebar) sonraki fazda gelir.
        </p>
        <Button variant="secondary" onClick={handleLogout}>Çıkış Yap</Button>
      </div>
    </main>
  );
}
```

`src/app/home.css`:
```css
.home {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg, #f0f4f8);
  padding: 40px;
}
.home-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 40px;
  max-width: 480px;
  text-align: center;
}
.home-card h1 {
  font-size: 26px;
  font-weight: 700;
  line-height: 32px;
  letter-spacing: -0.5px;
  margin-bottom: 16px;
}
.home-role {
  margin-bottom: 16px;
}
.home-note {
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-muted, #64748b);
  margin-bottom: 24px;
}
```

- [ ] **Step 4: Yeşil gör**

Run: `pnpm test src/app/page.test.tsx`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx src/app/home.css
git commit -m "feat: replace default page with protected placeholder home"
```

---

### Task 12: Playwright mock backend + hermetik E2E

**Files:**
- Create: `e2e/mock-backend.ts`
- Create: `e2e/global-setup.ts`
- Create: `e2e/auth.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: yok (E2E built app'e vurur).
- Produces: `startMockBackend(port: number)` → `{ server, close(): Promise<void> }`. `globalSetup` mock backend'i sabit portta başlatır ve teardown döndürür.

- [ ] **Step 1: Mock backend + global-setup yaz**

`e2e/mock-backend.ts`:
```ts
import { createServer, type Server } from "node:http";

// exp'i uzak gelecekte olan sahte JWT (base64url payload).
function fakeJwt(): string {
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: "u1" })).toString("base64url");
  return `h.${payload}.s`;
}

const TOKEN_PAIR = { access_token: fakeJwt(), refresh_token: fakeJwt(), token_type: "bearer" };
const ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "patron@fiil.com",
  full_name: "Ahmet Yılmaz",
  title: "Patron",
  role_key: "patron",
  status: "active",
};

// Gercek FastAPI yerine gecen minik mock — hermetik E2E icin.
export function startMockBackend(port: number): { server: Server; close: () => Promise<void> } {
  const server = createServer((req, res) => {
    const url = req.url ?? "";
    const send = (status: number, body?: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };
    if (req.method === "POST" && url === "/auth/login") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}");
        if (body.password === "wrong") return send(401, { detail: "invalid" });
        return send(200, TOKEN_PAIR);
      });
      return;
    }
    if (req.method === "POST" && url === "/auth/refresh") return send(200, TOKEN_PAIR);
    if (req.method === "GET" && url === "/auth/me") {
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer ")) return send(401, { detail: "unauthenticated" });
      return send(200, ME);
    }
    return send(404);
  });
  server.listen(port);
  return {
    server,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
```

`e2e/global-setup.ts`:
```ts
import { startMockBackend } from "./mock-backend";

// playwright.config webServer.env.BACKEND_URL ile ayni port.
const MOCK_PORT = 4319;

export default function globalSetup() {
  const mock = startMockBackend(MOCK_PORT);
  // Playwright globalSetup'tan donen fonksiyon teardown olarak calisir.
  return async () => {
    await mock.close();
  };
}
```

- [ ] **Step 2: playwright.config.ts'i güncelle**

`playwright.config.ts` — `globalSetup` ekle ve `webServer`'a `env` ekle:
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { BACKEND_URL: "http://127.0.0.1:4319" },
  },
});
```

- [ ] **Step 3: E2E testleri yaz**

`e2e/auth.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("giris → ana sayfa → cikis akisi", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();

  await expect(page.getByText(/Ahmet Yılmaz/)).toBeVisible();

  await page.getByRole("button", { name: /çıkış yap/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("yanlis parola hata gosterir", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("wrong");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/e-posta veya şifre hatalı/i)).toBeVisible();
});

test("oturumsuz korumali rota /login'e yonlendirir", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?next=%2F/);
});

test("token cookie httpOnly — document.cookie'de gorunmez", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/Ahmet Yılmaz/)).toBeVisible();
  const cookieStr = await page.evaluate(() => document.cookie);
  expect(cookieStr).not.toContain("fiil_access");
});
```

- [ ] **Step 4: E2E'yi yerelde çalıştır (macOS)**

Run: `pnpm test:visual e2e/auth.spec.ts`
Expected: 4 test PASS. (Bu testler görsel snapshot değil — platformdan bağımsız, yerelde geçer.)

- [ ] **Step 5: Commit**

```bash
git add e2e/mock-backend.ts e2e/global-setup.ts e2e/auth.spec.ts playwright.config.ts
git commit -m "test: add hermetic auth E2E with mock backend"
```

---

### Task 13: Giriş ekranı görsel regresyonu

**Files:**
- Create: `e2e/login-visual.spec.ts`
- Create (CI'dan): `e2e/login-visual.spec.ts-snapshots/login-page-chromium-linux.png`

**Interfaces:**
- Consumes: yok.
- Produces: `/login` sayfası görsel snapshot testi.

- [ ] **Step 1: Görsel test yaz**

`e2e/login-visual.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("giris ekrani gorsel", async ({ page }) => {
  await page.goto("/login");
  // Font/animasyon oturmasi icin marka basligini bekle.
  await expect(page.getByText(/tek platformda yönetin/i)).toBeVisible();
  await expect(page).toHaveScreenshot("login-page.png", { fullPage: true });
});
```

- [ ] **Step 2: Yerelde çalıştır — baseline eksik uyarısını gör**

Run: `pnpm test:visual e2e/login-visual.spec.ts`
Expected: İlk koşuda macOS snapshot üretilir/uyumsuzluk. **macOS snapshot'ını COMMIT ETME** (CI-Linux'ta patlar).

- [ ] **Step 3: Linux baseline üret (workflow_dispatch)**

- `.github/workflows/visual-baselines.yml` workflow'unu GitHub'da manuel tetikle (branch = çalışılan dal).
- Üretilen artefaktı indir → `login-page-chromium-linux.png` dosyasını `e2e/login-visual.spec.ts-snapshots/` altına koy.
- Yerelde üretilmiş macOS snapshot varsa sil.

- [ ] **Step 4: Linux baseline ile doğrula**

- CI'da `ci.yml` görsel job'ı yeşil olmalı (Linux baseline eşleşir).
- Yerelde snapshot testi platform farkından FAIL edebilir — bu beklenendir; kanıt CI'dır.

- [ ] **Step 5: Commit**

```bash
git add e2e/login-visual.spec.ts e2e/login-visual.spec.ts-snapshots/login-page-chromium-linux.png
git commit -m "test: add login page visual regression baseline"
git push origin main
```

---

### Task 14: Faz kapanışı — kapılar + review + ilerleme defteri

**Files:**
- Create: `.superpowers/sdd/progress-f2.md` (ilerleme defteri, gitignore'da)

- [ ] **Step 1: Tüm kapıları çalıştır**

```bash
pnpm lint
pnpm typecheck
pnpm test --coverage
pnpm build
```
Expected: hepsi yeşil; kapsam ≥%80. Kırmızı varsa düzelt + commit.

- [ ] **Step 2: Kod incelemesi (react-reviewer + security-reviewer)**

- `react-reviewer` ile tüm F2 diff'ini incele (hook doğruluğu, server/client sınırı, erişilebilirlik).
- `security-reviewer` ile auth yüzeyini incele (httpOnly/secure/sameSite, CSRF origin kontrolü, token sızıntısı, hata mesajı sızıntısı, `NEXT_PUBLIC` sızıntısı yok).
- CRITICAL/HIGH bulguları düzelt + commit.

- [ ] **Step 3: CI yeşilini doğrula**

```bash
git push origin main
```
Expected: `ci.yml` (build + visual) YEŞİL. Kırmızıysa düzelt.

- [ ] **Step 4: İlerleme defterini yaz**

`.superpowers/sdd/progress-f2.md` — tamamlanan task'lar, kararlar (BFF mock stratejisi, refresh yalnız-access, middleware presence-only), bilinen limitler (stateless refresh, backend deploy edilmedi, pasif-kullanıcı davranışı doğrulanmadı), sonraki faz (F3 kabuk).

- [ ] **Step 5: Hafıza güncelle**

- `frontend-f0-iskelet.md` (veya yeni `frontend-f2.md`) kaydını güncelle: F2 bitti + durumu; `BACKEND_URL` env gereksinimi; F3 sırada.
- `MEMORY.md` index'ine bir satır ekle.

---

## Self-Review

**1. Spec coverage:**
- §3.4 BFF akışı → Task 3,5,6,7 ✓
- §6.3 Giriş ekranı (şirket seçici yok, şifremi-unuttum yok, demo dev-only) → Task 9,10 ✓
- Cookie stratejisi (httpOnly/secure/sameSite/remember) → Task 2 ✓
- Şeffaf refresh → Task 3 (backend), Task 7 (me) ✓
- Middleware koruma + landing → Task 8, 11 ✓
- Hata durumları (401/403/422/ağ) → Task 10 ✓
- Env (BACKEND_URL, .env.example, server-only) → Task 3 ✓
- Testler (Vitest + E2E hermetik + görsel) → Task 1-13 ✓
- Güvenlik review → Task 14 ✓
- CSRF origin → Task 4 ✓

**2. Placeholder scan:** Kod bloklarında TBD/TODO yok; her adımda gerçek kod var. Token-adı notları fallback değerlerle güvenli (belirsizlik değil, uyarlama notu).

**3. Type consistency:** `TokenPair`/`MeResponse`/`CookieSpec` Task 1'de tanımlı, sonraki task'larda aynı adlarla tüketiliyor. `proxyAuthenticated` → `ProxyResult { status, body, refreshedAccessToken? }` Task 3'te tanımlı, Task 7'de aynı alanla kullanılıyor. `ACCESS_COOKIE`/`REFRESH_COOKIE` her yerde `@/lib/auth/constants`'ten. `buildAccessCookie` Task 2'de tanımlı, Task 7'de kullanılıyor. Alert `variant="danger"` (error değil) Task 10'da doğru.
