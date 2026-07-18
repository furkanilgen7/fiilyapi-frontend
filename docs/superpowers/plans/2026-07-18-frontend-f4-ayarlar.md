# F4: Ayarlar — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FİİL Yapı ERP frontend'ine `/ayarlar` bölümünü eklemek — backend B3'ün kullanıcı yönetimi, rol yönetimi ve rol×modül izin matrisi uçlarını tüketen üç sekmeli (Kullanıcılar · Roller · İzin Matrisi) tam Ayarlar deneyimi.

**Architecture:** Next.js 15 App Router `(app)/ayarlar/` alt-route-group; `ayarlar/layout.tsx` (client) üstte rota-bazlı sekme şeridi + `{children}` render eder. Üç sayfa: `kullanicilar`, `roller`, `izin-matrisi`. Sunucu-state TanStack Query ile (AppShell'e `QueryProvider`). Backend'e erişim tek genel BFF catch-all proxy (`/api/backend/[...path]`) üzerinden, mevcut JWT httpOnly cookie + refresh altyapısıyla. Tip-güvenli erişim `openapi-fetch` `backendClient` (baseUrl `/api/backend`).

**Tech Stack:** Next.js 15 App Router · React 19 · TS strict · pnpm · Vitest + RTL · Playwright · openapi-fetch/openapi-typescript · `@tanstack/react-query` (package.json'da zaten bildirilmiş, `^5.62`).

## Global Constraints

- Yalnız **pnpm**. Tailwind YOK — ham CSS + `src/styles/tokens.css`. Mevcut 8 primitive + F2 auth + F3 kabuk altyapısı kullanılır.
- Açık tema, ≥1280px. Responsive/koyu tema yok.
- Kod/isim/dosya **İngilizce**; UI metni + yorumlar **Türkçe**.
- Commit başlıkları **İngilizce** `<type>: <desc>`, Türkçe özel karakter yok.
- Token-only CSS: çıplak hex yasak (fallback dahil; gerçek token adı). rgba gölge serbest. Yeni renk gerekirse `tokens.css`'e token eklenir.
- TDD: kırmızı → yeşil → refactor. Task sonu commit; birkaç task'ta bir push. Doğrudan `main`'de çalışılır.
- **UI/rota task'larında `pnpm build` koşulur** (F2/F3 dersi: route-group/Suspense build hataları diff review'da kaçar).
- Görsel snapshot: Linux baseline `visual-baselines.yml` (workflow_dispatch); macOS PNG asla commit edilmez.
- Faz sonu tüm kapılar (lint/typecheck/test/build) + CI (build+visual) YEŞİL olmadan F4 kapanmaz.

---

## Task 1: OpenAPI Snapshot Doğrulama (gen:api)

**Amaç:** F4'ün tükettiği B3 şemalarının (`UserResponse`, `RoleResponse`, `ModuleResponse`, `PermissionCell`, `UserListResponse` …) `src/lib/api/schema.d.ts` içinde güncel olduğunu garanti etmek. (Not: repo snapshot'ı zaten B3'ü içeriyor olabilir; bu task idempotenttir — diff yoksa no-op commit.)

**Files:**
- Modify: `openapi/openapi.json` (yalnız canlı backend erişilebiliyorsa yenilenir)
- Modify: `src/lib/api/schema.d.ts` (gen:api çıktısı)

**Interfaces:**
- Produces: `components["schemas"]["UserResponse" | "UserListResponse" | "UserCreate" | "UserUpdate" | "UserStatus" | "RoleResponse" | "RoleCreate" | "RoleRename" | "ModuleResponse" | "ModuleGroup" | "ProjectResponse" | "ProjectAccessInput" | "ProjectAccessResponse" | "PermissionCell" | "PermissionUpdate" | "PasswordReset" | "AccessLevel" | "Scope"]` ve `paths` içinde `/users`, `/users/{user_id}`, `/users/{user_id}/password`, `/users/{user_id}/project-access`, `/roles`, `/roles/{role_id}`, `/roles/{role_id}/permissions`, `/roles/{role_id}/permissions/{module_key}`, `/modules`, `/projects` yolları. Sonraki tüm task'lar bu tipleri `@/lib/api/schema` üzerinden kullanır.

- [ ] **Step 1: (Opsiyonel) canlı backend'ten snapshot tazele**

Backend erişilebiliyorsa (`BACKEND_URL` ortam değişkeni tanımlı ve ayakta), taze OpenAPI'yi çek. Erişilemiyorsa bu adımı atla — repodaki `openapi/openapi.json` kullanılır.

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
# Yalnız backend ayaktaysa; degilse atla (repo snapshot'i kullanilir).
[ -n "$BACKEND_URL" ] && curl -fsS "$BACKEND_URL/openapi.json" -o openapi/openapi.json || echo "canli backend yok — repo snapshot kullaniliyor"
```

- [ ] **Step 2: Tipleri yeniden üret**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm gen:api
```
Expected: hatasız tamamlanır; `src/lib/api/schema.d.ts` yazılır.

- [ ] **Step 3: F4 şemalarının varlığını doğrula**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
grep -E "UserResponse|UserListResponse|RoleResponse|RoleRename|ModuleResponse|PermissionCell|PermissionUpdate|ProjectAccessInput|PasswordReset" src/lib/api/schema.d.ts
grep -E '"/users"|"/roles"|"/modules"|"/projects"|"/roles/\{role_id\}/permissions/\{module_key\}"' src/lib/api/schema.d.ts
```
Expected: her iki grep de eşleşme döner (tüm şemalar ve yollar mevcut).

- [ ] **Step 4: Typecheck**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm typecheck
```
Expected: hata yok.

- [ ] **Step 5: Commit**

Diff varsa gerçek commit; yoksa snapshot'ın güncel olduğunu işaretlemek için boş commit.

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add openapi/openapi.json src/lib/api/schema.d.ts
git commit -m "chore: verify openapi snapshot for F4 users/roles/modules/permissions" || git commit --allow-empty -m "chore: verify openapi snapshot for F4 users/roles/modules/permissions"
```

---

## Task 2: BFF Genel Catch-all Proxy + proxyAuthenticated Genişletme

**Amaç:** `proxyAuthenticated`'ı method/body/query destekleyecek şekilde (davranış-koruyucu) genişletmek ve `/api/backend/[...path]` genel proxy'sini eklemek (allow-list: users/roles/modules/projects).

**Files:**
- Modify: `src/lib/auth/backend.ts`
- Test: `src/lib/auth/backend.test.ts`
- Create: `src/app/api/backend/[...path]/route.ts`
- Test: `src/app/api/backend/[...path]/route.test.ts`

**Interfaces:**
- Consumes: `backendUrl()` ve mevcut `ProxyResult { status: number; body: unknown; refreshedAccessToken?: string }` (`@/lib/auth/backend`); `ACCESS_COOKIE`, `REFRESH_COOKIE` (`@/lib/auth/constants`); `applyAuthCookies`, `buildAccessCookie`, `clearedAuthCookies` (`@/lib/auth/cookies`).
- Produces:
  - `export interface ProxyOptions { method?: string; body?: unknown; query?: Record<string, string> }`
  - `export async function proxyAuthenticated(accessToken: string | undefined, refreshToken: string | undefined, path: string, options?: ProxyOptions): Promise<ProxyResult>` (options varsayılan `{}` → GET; mevcut `/auth/me` çağrısı bozulmaz).
  - Route handler export'ları: `GET, POST, PATCH, PUT, DELETE` (`(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => Promise<NextResponse>`). Semantik: `401` → cookie temizle + `{ok:false,code:"unauthenticated"}`; `>=500` → `{ok:false,code:"unavailable"}`; diğer tüm status (2xx, 403, 409, 422 …) → backend body + status aynen geçirilir; `refreshedAccessToken` varsa access cookie güncellenir. Allow-list dışı kök → 404 `{ok:false,code:"not_found"}`.

- [ ] **Step 1: proxyAuthenticated genişletme testini yaz (RED)**

`src/lib/auth/backend.test.ts` oluştur:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyAuthenticated } from "./backend";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.BACKEND_URL;
});

describe("proxyAuthenticated (method/body/query)", () => {
  it("varsayilan GET — mevcut davranis korunur", async () => {
    process.env.BACKEND_URL = "http://backend:8000";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await proxyAuthenticated("acc", "ref", "/auth/me");
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend:8000/auth/me");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.headers.Authorization).toBe("Bearer acc");
  });

  it("POST + body + query iletir", async () => {
    process.env.BACKEND_URL = "http://backend:8000";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "u1" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await proxyAuthenticated("acc", "ref", "/users", {
      method: "POST",
      body: { email: "a@b.com" },
      query: { limit: "20", offset: "0" },
    });
    expect(res.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://backend:8000/users?limit=20&offset=0");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.com" });
  });

  it("401 + refresh — ayni method+body ile retry eder", async () => {
    process.env.BACKEND_URL = "http://backend:8000";
    const jwt = `h.${Buffer.from(JSON.stringify({ exp: 9999999999 })).toString("base64url")}.s`;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: jwt, refresh_token: jwt }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await proxyAuthenticated("old", "ref", "/roles", { method: "PATCH", body: { name: "X" } });
    expect(res.status).toBe(200);
    expect(res.refreshedAccessToken).toBe(jwt);
    // 3. cagri retry: ayni method+body, yeni token
    const [, retryInit] = fetchMock.mock.calls[2];
    expect(retryInit.method).toBe("PATCH");
    expect(JSON.parse(retryInit.body)).toEqual({ name: "X" });
    expect(retryInit.headers.Authorization).toBe(`Bearer ${jwt}`);
  });
});
```

- [ ] **Step 2: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/auth/backend.test.ts
```
Expected: FAIL (yeni `options` imzası yok / query eklenmiyor).

- [ ] **Step 3: proxyAuthenticated'ı genişlet**

`src/lib/auth/backend.ts` içeriğini şu şekilde değiştir:

```ts
import type { TokenPair } from "./types";

export interface ProxyResult {
  status: number;
  body: unknown;
  // Seffaf refresh olduysa yeni access token — cagiran taraf access cookie'sini gunceller.
  refreshedAccessToken?: string;
}

export interface ProxyOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string>;
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

function buildUrl(path: string, query: Record<string, string> | undefined): string {
  if (!query || Object.keys(query).length === 0) return backendUrl() + path;
  const qs = new URLSearchParams(query).toString();
  return backendUrl() + path + "?" + qs;
}

// Backend'e Bearer ile tek istek — method/body/query destekli.
function request(path: string, accessToken: string | undefined, options: ProxyOptions): Promise<Response> {
  const { method = "GET", body, query } = options;
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return fetch(buildUrl(path, query), init);
}

// Backend'i Bearer ile cagirir; 401'de refresh token varsa /auth/refresh dener,
// basarili ise yeni access token ile AYNI method+body+query ile bir kez retry eder.
export async function proxyAuthenticated(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  path: string,
  options: ProxyOptions = {},
): Promise<ProxyResult> {
  const first = await request(path, accessToken, options);
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
  const retry = await request(path, pair.access_token, options);
  return {
    status: retry.status,
    body: await parseBody(retry),
    refreshedAccessToken: pair.access_token,
  };
}
```

- [ ] **Step 4: Testi çalıştır (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/auth/backend.test.ts src/app/api/auth/me/route.test.ts
```
Expected: PASS (yeni testler + mevcut me route testi bozulmadı).

- [ ] **Step 5: Catch-all route testini yaz (RED)**

`src/app/api/backend/[...path]/route.test.ts` oluştur:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

function req(url: string, method: string, cookies: Record<string, string>, body?: unknown): NextRequest {
  const init: { method: string; body?: string; headers?: Record<string, string> } = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }
  const r = new NextRequest("http://localhost:3000" + url, init);
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}

function ctx(path: string[]): { params: Promise<{ path: string[] }> } {
  return { params: Promise.resolve({ path }) };
}

describe("BFF /api/backend/[...path]", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "http://backend:8000";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_URL;
  });

  it("GET izinli kok — backend body+status gecirir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }),
    ));
    const res = await GET(req("/api/backend/users?limit=20&offset=0", "GET", { [ACCESS_COOKIE]: "acc", [REFRESH_COOKIE]: "ref" }), ctx(["users"]));
    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(0);
  });

  it("izinsiz kok — 404 doner, backend cagrilmaz", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(req("/api/backend/secrets", "GET", { [ACCESS_COOKIE]: "acc" }), ctx(["secrets"]));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POST body iletir ve 409 govdesini gecirir (Turkce hata gorunsun)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "e-posta kullanimda" }), { status: 409 }),
    ));
    const res = await POST(req("/api/backend/users", "POST", { [ACCESS_COOKIE]: "acc", [REFRESH_COOKIE]: "ref" }, { email: "a@b.com" }), ctx(["users"]));
    expect(res.status).toBe(409);
    expect((await res.json()).detail).toBe("e-posta kullanimda");
  });

  it("401 — cookie temizler, generic doner", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const res = await GET(req("/api/backend/users", "GET", {}), ctx(["users"]));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("unauthenticated");
    expect(res.cookies.get(ACCESS_COOKIE)?.maxAge).toBe(0);
  });

  it("500 — generic unavailable, ham govde sizmaz", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "boom" }), { status: 500 }),
    ));
    const res = await GET(req("/api/backend/roles", "GET", { [ACCESS_COOKIE]: "acc" }), ctx(["roles"]));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("unavailable");
    expect(JSON.stringify(body)).not.toContain("boom");
  });
});
```

- [ ] **Step 6: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run "src/app/api/backend/[...path]/route.test.ts"
```
Expected: FAIL (route yok).

- [ ] **Step 7: Catch-all route'u yaz**

`src/app/api/backend/[...path]/route.ts` oluştur:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/auth/backend";
import { applyAuthCookies, buildAccessCookie, clearedAuthCookies } from "@/lib/auth/cookies";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

// Yalniz beklenen kokler forward edilir (SSRF/kesif yuzeyini daraltir).
const ALLOWED_ROOTS = new Set(["users", "roles", "modules", "projects"]);

type RouteCtx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, method: string, routeCtx: RouteCtx): Promise<NextResponse> {
  const { path } = await routeCtx.params;
  if (path.length === 0 || !ALLOWED_ROOTS.has(path[0])) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }

  const backendPath = "/" + path.join("/");
  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let body: unknown;
  if (method !== "GET" && method !== "DELETE") {
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }
  }

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  let result;
  try {
    result = await proxyAuthenticated(access, refresh, backendPath, { method, body, query });
  } catch {
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: 502 });
  }

  if (result.status === 401) {
    const res = NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
    applyAuthCookies(res, clearedAuthCookies());
    return res;
  }

  if (result.status >= 500) {
    // Ham 5xx govdesini sizdirma.
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: result.status });
  }

  if (result.status === 204) {
    const res = new NextResponse(null, { status: 204 });
    if (result.refreshedAccessToken) applyAuthCookies(res, [buildAccessCookie(result.refreshedAccessToken)]);
    return res;
  }

  // 2xx ve diger 4xx (403/409/422 …) — backend body+status aynen gecirilir.
  const res = NextResponse.json(result.body, { status: result.status });
  if (result.refreshedAccessToken) applyAuthCookies(res, [buildAccessCookie(result.refreshedAccessToken)]);
  return res;
}

export function GET(request: NextRequest, routeCtx: RouteCtx): Promise<NextResponse> {
  return handle(request, "GET", routeCtx);
}
export function POST(request: NextRequest, routeCtx: RouteCtx): Promise<NextResponse> {
  return handle(request, "POST", routeCtx);
}
export function PATCH(request: NextRequest, routeCtx: RouteCtx): Promise<NextResponse> {
  return handle(request, "PATCH", routeCtx);
}
export function PUT(request: NextRequest, routeCtx: RouteCtx): Promise<NextResponse> {
  return handle(request, "PUT", routeCtx);
}
export function DELETE(request: NextRequest, routeCtx: RouteCtx): Promise<NextResponse> {
  return handle(request, "DELETE", routeCtx);
}
```

- [ ] **Step 8: Tüm testleri çalıştır (GREEN) + typecheck**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run "src/app/api/backend/[...path]/route.test.ts" src/lib/auth/backend.test.ts
pnpm typecheck
```
Expected: PASS, typecheck hatasız.

- [ ] **Step 9: Commit**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add src/lib/auth/backend.ts src/lib/auth/backend.test.ts "src/app/api/backend/[...path]/route.ts" "src/app/api/backend/[...path]/route.test.ts"
git commit -m "feat: add generic authenticated BFF proxy for backend resources"
```

---

## Task 3: TanStack Query Kurulumu + backendClient + Ortak API Yardımcıları

**Amaç:** `QueryProvider`'ı AppShell'e sarmak, `backendClient` (baseUrl `/api/backend`) eklemek, `unwrap`/`BackendError`/`isForbidden` ile ortak model tiplerini kurmak.

**Files:**
- Modify: `package.json` (yalnız `pnpm install` ile lockfile senkronu — `@tanstack/react-query` zaten bildirilmiş)
- Create: `src/lib/query/QueryProvider.tsx`
- Test: `src/lib/query/QueryProvider.test.tsx`
- Modify: `src/lib/api/client.ts`
- Create: `src/lib/api/unwrap.ts`
- Test: `src/lib/api/unwrap.test.ts`
- Create: `src/lib/api/models.ts`
- Modify: `src/components/shell/AppShell.tsx`

**Interfaces:**
- Consumes: `paths` (`@/lib/api/schema`); `createClient` (openapi-fetch).
- Produces:
  - `export function QueryProvider({ children }: { children: React.ReactNode }): React.ReactElement`
  - `export const backendClient` (openapi-fetch client, `baseUrl: "/api/backend"`); mevcut `apiClient` korunur.
  - `export class BackendError extends Error { status: number; body: unknown }`
  - `export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T`
  - `export function isForbidden(err: unknown): boolean`
  - `src/lib/api/models.ts`: `UserResponse, UserListResponse, UserCreate, UserUpdate, UserStatus, RoleResponse, RoleCreate, RoleRename, ModuleResponse, ModuleGroup, ProjectResponse, ProjectAccessInput, ProjectAccessResponse, PermissionCell, PermissionUpdate, PasswordReset, AccessLevel, Scope` tip re-export'ları.

- [ ] **Step 1: Bağımlılık lockfile senkronu**

`@tanstack/react-query` package.json'da zaten var; kurulu olduğundan emin ol.

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm install
pnpm ls @tanstack/react-query
```
Expected: `@tanstack/react-query 5.x` listelenir.

- [ ] **Step 2: unwrap testini yaz (RED)**

`src/lib/api/unwrap.test.ts` oluştur:

```ts
import { describe, expect, it } from "vitest";
import { BackendError, isForbidden, unwrap } from "./unwrap";

describe("unwrap", () => {
  it("2xx'te data doner", () => {
    const data = unwrap({ data: { id: "1" }, response: new Response(null, { status: 200 }) });
    expect(data).toEqual({ id: "1" });
  });

  it("hata durumunda BackendError firlatir (status + body)", () => {
    try {
      unwrap({ error: { detail: "yok" }, response: new Response(null, { status: 403 }) });
      throw new Error("firlatmaliydi");
    } catch (err) {
      expect(err).toBeInstanceOf(BackendError);
      expect((err as BackendError).status).toBe(403);
      expect((err as BackendError).body).toEqual({ detail: "yok" });
    }
  });

  it("isForbidden yalniz 403 BackendError icin true", () => {
    expect(isForbidden(new BackendError(403, null))).toBe(true);
    expect(isForbidden(new BackendError(500, null))).toBe(false);
    expect(isForbidden(new Error("x"))).toBe(false);
  });
});
```

- [ ] **Step 3: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/api/unwrap.test.ts
```
Expected: FAIL (modül yok).

- [ ] **Step 4: unwrap + models + backendClient yaz**

`src/lib/api/unwrap.ts` oluştur:

```ts
// BFF/backend hatalarini tasiyan tip — status'a gore ekranlar ( or. 403) dallanir.
export class BackendError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`backend hatasi: ${status}`);
    this.name = "BackendError";
    this.status = status;
    this.body = body;
  }
}

// openapi-fetch sonucunu cozer: 2xx ise data, degilse BackendError firlatir.
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.response.ok) {
    return result.data as T;
  }
  throw new BackendError(result.response.status, result.error);
}

export function isForbidden(err: unknown): boolean {
  return err instanceof BackendError && err.status === 403;
}
```

`src/lib/api/models.ts` oluştur:

```ts
import type { components } from "./schema";

export type UserResponse = components["schemas"]["UserResponse"];
export type UserListResponse = components["schemas"]["UserListResponse"];
export type UserCreate = components["schemas"]["UserCreate"];
export type UserUpdate = components["schemas"]["UserUpdate"];
export type UserStatus = components["schemas"]["UserStatus"];
export type RoleResponse = components["schemas"]["RoleResponse"];
export type RoleCreate = components["schemas"]["RoleCreate"];
export type RoleRename = components["schemas"]["RoleRename"];
export type ModuleResponse = components["schemas"]["ModuleResponse"];
export type ModuleGroup = components["schemas"]["ModuleGroup"];
export type ProjectResponse = components["schemas"]["ProjectResponse"];
export type ProjectAccessInput = components["schemas"]["ProjectAccessInput"];
export type ProjectAccessResponse = components["schemas"]["ProjectAccessResponse"];
export type PermissionCell = components["schemas"]["PermissionCell"];
export type PermissionUpdate = components["schemas"]["PermissionUpdate"];
export type PasswordReset = components["schemas"]["PasswordReset"];
export type AccessLevel = components["schemas"]["AccessLevel"];
export type Scope = components["schemas"]["Scope"];
```

`src/lib/api/client.ts` içine `backendClient` ekle (mevcut `apiClient` korunur — `schema.test.ts` onu kullanır):

```ts
import createClient from "openapi-fetch";

import type { paths } from "./schema";

/**
 * Backend API'sine tip-güvenli istemci.
 *
 * baseUrl BFF katmanına (Next.js Route Handler'ları) işaret eder — tarayıcı
 * doğrudan backend'e gitmez, F2'de kurulan /api proxy'sinden geçer.
 */
export const apiClient = createClient<paths>({
  baseUrl: "/api",
});

/**
 * F4 kaynak istemcisi — genel BFF catch-all proxy'sine (/api/backend/[...path])
 * gider; JWT cookie + refresh BFF'te eklenir.
 */
export const backendClient = createClient<paths>({
  baseUrl: "/api/backend",
});
```

- [ ] **Step 5: unwrap testini çalıştır (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/api/unwrap.test.ts
```
Expected: PASS.

- [ ] **Step 6: QueryProvider testini yaz (RED)**

`src/lib/query/QueryProvider.test.tsx` oluştur:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryProvider } from "./QueryProvider";

describe("QueryProvider", () => {
  it("cocuklari render eder", () => {
    render(
      <QueryProvider>
        <span>icerik</span>
      </QueryProvider>,
    );
    expect(screen.getByText("icerik")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/query/QueryProvider.test.tsx
```
Expected: FAIL (modül yok).

- [ ] **Step 8: QueryProvider'ı yaz**

`src/lib/query/QueryProvider.tsx` oluştur:

```tsx
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const STALE_TIME_MS = 30_000;

// Tek QueryClient — mount'ta bir kez uretilir (useState lazy init).
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: STALE_TIME_MS,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 9: AppShell'e QueryProvider sar**

`src/components/shell/AppShell.tsx` içeriğini değiştir:

```tsx
"use client";

import { SessionProvider } from "./SessionProvider";
import { QueryProvider } from "@/lib/query/QueryProvider";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import "./shell.css";

// Uygulama kabugu: oturum saglayici + query saglayici + sabit topbar/sidebar + icerik.
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <Topbar />
        <Sidebar />
        <main className="app-content">{children}</main>
      </QueryProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 10: Test + typecheck + build (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/query/QueryProvider.test.tsx src/lib/api/unwrap.test.ts src/lib/api/schema.test.ts
pnpm typecheck
pnpm build
```
Expected: testler PASS, typecheck temiz, build başarılı.

- [ ] **Step 11: Commit**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add package.json pnpm-lock.yaml src/lib/query/QueryProvider.tsx src/lib/query/QueryProvider.test.tsx src/lib/api/client.ts src/lib/api/unwrap.ts src/lib/api/unwrap.test.ts src/lib/api/models.ts src/components/shell/AppShell.tsx
git commit -m "feat: add TanStack Query provider and backend API client"
```

---

## Task 4: Ayarlar Route Group + Sekme Layout + Redirect

**Amaç:** `(app)/ayarlar/` rota grubunu, üstte rota-bazlı sekme şeridini ve index redirect'ini kurmak. `isActive` mantığı Sidebar ile ortaklaştırılır. **`pnpm build` zorunlu** (route-group gate).

**Files:**
- Create: `src/lib/shell/isActive.ts`
- Test: `src/lib/shell/isActive.test.ts`
- Modify: `src/components/shell/Sidebar.tsx` (yerel `isActive` → ortak `isActivePath`)
- Create: `src/app/(app)/ayarlar/layout.tsx`
- Create: `src/app/(app)/ayarlar/ayarlar.css`
- Create: `src/app/(app)/ayarlar/page.tsx` (redirect)
- Create: `src/app/(app)/ayarlar/kullanicilar/page.tsx` (geçici iskele — Task 5'te doldurulur)
- Create: `src/app/(app)/ayarlar/roller/page.tsx` (geçici iskele — Task 7'de doldurulur)
- Create: `src/app/(app)/ayarlar/izin-matrisi/page.tsx` (geçici iskele — Task 8'de doldurulur)

**Interfaces:**
- Produces: `export function isActivePath(pathname: string, href: string): boolean` (`@/lib/shell/isActive`). Sonraki task'lar `ayarlar/layout.tsx` sekme şeridini kullanır; iskele sayfalar Task 5/7/8'de yeniden yazılır.

- [ ] **Step 1: isActivePath testini yaz (RED)**

`src/lib/shell/isActive.test.ts` oluştur:

```ts
import { describe, expect, it } from "vitest";
import { isActivePath } from "./isActive";

describe("isActivePath", () => {
  it('"/" yalniz tam eslesir', () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/ayarlar", "/")).toBe(false);
  });

  it("prefix eslesir (alt rotalar da aktif)", () => {
    expect(isActivePath("/ayarlar/kullanicilar", "/ayarlar/kullanicilar")).toBe(true);
    expect(isActivePath("/ayarlar/kullanicilar/5", "/ayarlar/kullanicilar")).toBe(true);
    expect(isActivePath("/ayarlar/roller", "/ayarlar/kullanicilar")).toBe(false);
  });
});
```

- [ ] **Step 2: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/shell/isActive.test.ts
```
Expected: FAIL (modül yok).

- [ ] **Step 3: isActivePath'i yaz ve Sidebar'ı ortaklaştır**

`src/lib/shell/isActive.ts` oluştur:

```ts
// Aktif eslestirme: "/" tam eslesme; digerleri prefix (alt rotalar da aktif).
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
```

`src/components/shell/Sidebar.tsx` içinde yerel `isActive` fonksiyonunu kaldır ve ortak yardımcıyı kullan. İlgili satırları değiştir:

Şu import bloğundan sonra (`import "./sidebar.css";` satırının hemen üstüne) yeni import ekle:

```tsx
import { isActivePath } from "@/lib/shell/isActive";
```

Yerel fonksiyonu (yorumu dahil) sil:

```tsx
// Aktif eslestirme: "/" tam eslesme; digerleri prefix (alt rotalar da aktif).
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
```

Ve çağrı yerini değiştir: `const active = isActive(pathname, href);` → `const active = isActivePath(pathname, href);`

- [ ] **Step 4: Test (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/shell/isActive.test.ts
```
Expected: PASS.

- [ ] **Step 5: Sekme layout + CSS + redirect + iskele sayfaları yaz**

`src/app/(app)/ayarlar/layout.tsx` oluştur:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import { isActivePath } from "@/lib/shell/isActive";
import "./ayarlar.css";

const TABS = [
  { label: "Kullanıcılar", href: "/ayarlar/kullanicilar" },
  { label: "Roller", href: "/ayarlar/roller" },
  { label: "İzin Matrisi", href: "/ayarlar/izin-matrisi" },
];

export default function AyarlarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <section className="ayarlar" aria-labelledby="ayarlar-title">
      <header className="ayarlar__head">
        <h1 id="ayarlar-title" className="ayarlar__title">
          Ayarlar
        </h1>
        <nav className="ayarlar__tabs" aria-label="Ayarlar sekmeleri">
          {TABS.map((tab) => {
            const active = isActivePath(pathname, tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cx("ayarlar-tab", active && "ayarlar-tab--active")}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="ayarlar__body">{children}</div>
    </section>
  );
}
```

`src/app/(app)/ayarlar/ayarlar.css` oluştur (token-only):

```css
.ayarlar {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.ayarlar__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.ayarlar__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--color-text-strong);
}

.ayarlar__tabs {
  display: flex;
  gap: var(--space-2);
}

.ayarlar-tab {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

.ayarlar-tab:hover {
  color: var(--color-text);
}

.ayarlar-tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.ayarlar__body {
  min-height: 240px;
}
```

`src/app/(app)/ayarlar/page.tsx` oluştur (server redirect):

```tsx
import { redirect } from "next/navigation";

// /ayarlar → ilk sekme.
export default function AyarlarIndexPage() {
  redirect("/ayarlar/kullanicilar");
}
```

`src/app/(app)/ayarlar/kullanicilar/page.tsx` oluştur (geçici iskele):

```tsx
export default function KullanicilarPage() {
  return <p>Kullanıcılar yakında.</p>;
}
```

`src/app/(app)/ayarlar/roller/page.tsx` oluştur (geçici iskele):

```tsx
export default function RollerPage() {
  return <p>Roller yakında.</p>;
}
```

`src/app/(app)/ayarlar/izin-matrisi/page.tsx` oluştur (geçici iskele):

```tsx
export default function IzinMatrisiPage() {
  return <p>İzin matrisi yakında.</p>;
}
```

- [ ] **Step 6: Typecheck + build (route-group gate)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm typecheck
pnpm build
```
Expected: build başarılı; `/ayarlar`, `/ayarlar/kullanicilar`, `/ayarlar/roller`, `/ayarlar/izin-matrisi` route'ları derlenir. (Görsel baseline commit edilmez — Linux CI baseline'ı Task 11'de üretilir.)

- [ ] **Step 7: Commit**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add src/lib/shell/isActive.ts src/lib/shell/isActive.test.ts src/components/shell/Sidebar.tsx "src/app/(app)/ayarlar"
git commit -m "feat: add settings route group with tab layout and redirect"
```

---

## Task 5: Kullanıcılar Listesi + Sayfalama + Query Hook'ları

**Amaç:** `useUsers` + `useRoles` hook'ları; sayfalı kullanıcı tablosu (rol adı `useRoles` join'i, durum rozeti); URL `?sayfa=` sayfalama. `useSearchParams` → **Suspense boundary** gerekir (build gate).

**Files:**
- Create: `src/lib/api/hooks/useUsers.ts`
- Create: `src/lib/api/hooks/useRoles.ts`
- Create: `src/lib/settings/status.ts` (durum → Türkçe etiket + rozet varyantı)
- Test: `src/lib/settings/status.test.ts`
- Create: `src/components/settings/StatusBadge.tsx`
- Create: `src/components/settings/UsersScreen.tsx`
- Test: `src/components/settings/UsersScreen.test.tsx`
- Create: `src/components/settings/settings.css`
- Modify: `src/app/(app)/ayarlar/kullanicilar/page.tsx` (Suspense wrapper)

**Interfaces:**
- Consumes: `backendClient` (`@/lib/api/client`), `unwrap` (`@/lib/api/unwrap`), `UserListResponse`, `RoleResponse`, `UserStatus` (`@/lib/api/models`); `Badge` (`@/components/ui`).
- Produces:
  - `export function useUsers(params: { limit: number; offset: number }): UseQueryResult<UserListResponse, Error>`
  - `export const USERS_QUERY_KEY = "users"` (invalidasyon için)
  - `export function useRoles(): UseQueryResult<RoleResponse[], Error>`
  - `export const ROLES_QUERY_KEY = "roles"`
  - `export function statusLabel(status: UserStatus): string`
  - `export function statusVariant(status: UserStatus): "success" | "warning" | "neutral"`
  - `export const PAGE_SIZE = 20`
  - `export function StatusBadge({ status }: { status: UserStatus }): React.ReactElement`
  - `export function UsersScreen(): React.ReactElement`

- [ ] **Step 1: status util testini yaz (RED)**

`src/lib/settings/status.test.ts` oluştur:

```ts
import { describe, expect, it } from "vitest";
import { statusLabel, statusVariant } from "./status";

describe("kullanici durumu", () => {
  it("etiketleri Turkce dondurur", () => {
    expect(statusLabel("active")).toBe("Aktif");
    expect(statusLabel("on_leave")).toBe("İzinli");
    expect(statusLabel("passive")).toBe("Pasif");
  });

  it("rozet varyantlarini eslestirir", () => {
    expect(statusVariant("active")).toBe("success");
    expect(statusVariant("on_leave")).toBe("warning");
    expect(statusVariant("passive")).toBe("neutral");
  });
});
```

- [ ] **Step 2: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/settings/status.test.ts
```
Expected: FAIL (modül yok).

- [ ] **Step 3: status util + hook'ları yaz**

`src/lib/settings/status.ts` oluştur:

```ts
import type { UserStatus } from "@/lib/api/models";

const LABELS: Record<UserStatus, string> = {
  active: "Aktif",
  on_leave: "İzinli",
  passive: "Pasif",
};

const VARIANTS: Record<UserStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  on_leave: "warning",
  passive: "neutral",
};

export function statusLabel(status: UserStatus): string {
  return LABELS[status];
}

export function statusVariant(status: UserStatus): "success" | "warning" | "neutral" {
  return VARIANTS[status];
}
```

`src/lib/api/hooks/useUsers.ts` oluştur:

```ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { UserListResponse } from "@/lib/api/models";

export const USERS_QUERY_KEY = "users";
export const PAGE_SIZE = 20;

export function useUsers(params: { limit: number; offset: number }): UseQueryResult<UserListResponse, Error> {
  return useQuery({
    queryKey: [USERS_QUERY_KEY, params.limit, params.offset],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/users", {
          params: { query: { limit: params.limit, offset: params.offset } },
        }),
      ),
  });
}
```

`src/lib/api/hooks/useRoles.ts` oluştur:

```ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { RoleResponse } from "@/lib/api/models";

export const ROLES_QUERY_KEY = "roles";

export function useRoles(): UseQueryResult<RoleResponse[], Error> {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/roles", {})),
  });
}
```

- [ ] **Step 4: status testini çalıştır (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/settings/status.test.ts
```
Expected: PASS.

- [ ] **Step 5: UsersScreen testini yaz (RED)**

`src/components/settings/UsersScreen.test.tsx` oluştur:

```tsx
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsersScreen } from "./UsersScreen";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push }),
  usePathname: () => "/ayarlar/kullanicilar",
}));

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UsersScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UsersScreen", () => {
  it("kullanicilari rol adi ve durum ile listeler", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/backend/roles")) {
          return new Response(
            JSON.stringify([{ id: "r1", key: "patron", name: "Patron", emoji: "", description: "", is_system: true }]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            items: [{ id: "u1", email: "a@b.com", full_name: "Ali Veli", title: "Muhendis", role_id: "r1", status: "active" }],
            total: 1,
            limit: 20,
            offset: 0,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    renderScreen();
    expect(await screen.findByText("Ali Veli")).toBeInTheDocument();
    expect(screen.getByText("Patron")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/UsersScreen.test.tsx
```
Expected: FAIL (modül yok).

- [ ] **Step 7: StatusBadge + UsersScreen + CSS yaz**

`src/components/settings/StatusBadge.tsx` oluştur:

```tsx
import { Badge } from "@/components/ui";
import { statusLabel, statusVariant } from "@/lib/settings/status";
import type { UserStatus } from "@/lib/api/models";

export function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}
```

> Not: `Badge` varyantları (repoda doğrulandı): `"neutral" | "primary" | "success" | "warning" | "danger"`. `statusVariant` bunlardan `success`/`warning`/`neutral` döndürür — birebir uyumlu.

`src/components/settings/UsersScreen.tsx` oluştur:

```tsx
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { useUsers, PAGE_SIZE } from "@/lib/api/hooks/useUsers";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { StatusBadge } from "./StatusBadge";
import type { RoleResponse } from "@/lib/api/models";
import "./settings.css";

function roleName(roles: RoleResponse[] | undefined, roleId: string): string {
  return roles?.find((r) => r.id === roleId)?.name ?? "—";
}

function pageFromParams(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function UsersScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = pageFromParams(searchParams.get("sayfa"));
  const offset = (page - 1) * PAGE_SIZE;

  const usersQuery = useUsers({ limit: PAGE_SIZE, offset });
  const rolesQuery = useRoles();

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sayfa", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (usersQuery.isLoading) {
    return <p className="settings-note">Yükleniyor…</p>;
  }

  if (usersQuery.isError || !usersQuery.data) {
    return <p className="settings-note settings-note--error">Kullanıcılar yüklenemedi.</p>;
  }

  const { items, total } = usersQuery.data;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="settings-panel">
      <div className="settings-panel__toolbar">
        <span className="settings-panel__count">{total} kullanıcı</span>
      </div>

      <table className="settings-table">
        <thead>
          <tr>
            <th>Ad Soyad</th>
            <th>E-posta</th>
            <th>Unvan</th>
            <th>Rol</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td>{user.full_name}</td>
              <td>{user.email}</td>
              <td>{user.title}</td>
              <td>{roleName(rolesQuery.data, user.role_id)}</td>
              <td>
                <StatusBadge status={user.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="settings-pager">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          Önceki
        </Button>
        <span className="settings-pager__label">
          Sayfa {page} / {pageCount}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
          Sonraki
        </Button>
      </div>
    </div>
  );
}
```

`src/components/settings/settings.css` oluştur (token-only; sonraki task'lar aynı dosyaya ekler):

```css
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.settings-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.settings-panel__count {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.settings-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.settings-table th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-table-head);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
}

.settings-table td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text);
  border-bottom: 1px solid var(--color-divider);
}

.settings-table tbody tr:last-child td {
  border-bottom: none;
}

.settings-table tbody tr:hover {
  background: var(--color-surface-2);
}

.settings-pager {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.settings-pager__label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.settings-note {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.settings-note--error {
  color: var(--color-danger);
}
```

- [ ] **Step 8: kullanicilar/page.tsx'i Suspense wrapper yap**

`src/app/(app)/ayarlar/kullanicilar/page.tsx` içeriğini değiştir (server component + Suspense — `useSearchParams` build hatasını önler):

```tsx
import { Suspense } from "react";
import { UsersScreen } from "@/components/settings/UsersScreen";

export default function KullanicilarPage() {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <UsersScreen />
    </Suspense>
  );
}
```

- [ ] **Step 9: Test + typecheck + build (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/UsersScreen.test.tsx src/lib/settings/status.test.ts
pnpm typecheck
pnpm build
```
Expected: testler PASS, typecheck temiz, build başarılı (Suspense boundary sayesinde `/ayarlar/kullanicilar` prerender hatası yok).

- [ ] **Step 10: Commit**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add src/lib/api/hooks/useUsers.ts src/lib/api/hooks/useRoles.ts src/lib/settings/status.ts src/lib/settings/status.test.ts src/components/settings "src/app/(app)/ayarlar/kullanicilar/page.tsx"
git commit -m "feat: add paginated users list with role join and status badges"
```

---

## Task 6: Kullanıcı Mutasyonları + Modal + Formlar

**Amaç:** Modal altyapısı; kullanıcı oluştur/düzenle/parola-sıfırla/proje-erişim/sil formları ve mutasyon hook'ları; istemci doğrulama + backend hata yüzeye çıkarma.

**Files:**
- Create: `src/components/settings/Modal.tsx` + `src/components/settings/modal.css`
- Test: `src/components/settings/Modal.test.tsx`
- Create: `src/components/settings/ConfirmDialog.tsx`
- Create: `src/lib/settings/error-message.ts`
- Test: `src/lib/settings/error-message.test.ts`
- Create: `src/lib/api/hooks/useProjects.ts`
- Create: `src/lib/api/hooks/useUserMutations.ts`
- Create: `src/components/settings/UserFormModal.tsx`
- Test: `src/components/settings/UserFormModal.test.tsx`
- Create: `src/components/settings/PasswordResetModal.tsx`
- Create: `src/components/settings/ProjectAccessModal.tsx`
- Modify: `src/components/settings/UsersScreen.tsx` (araç çubuğu + satır işlemleri + modallar)
- Modify: `src/components/settings/settings.css` (form/checklist/işlem stilleri ekle)

**Interfaces:**
- Consumes: `Modal`, `ConfirmDialog`; `backendClient`, `unwrap` (`@/lib/api/client`, `@/lib/api/unwrap`); `USERS_QUERY_KEY` (`@/lib/api/hooks/useUsers`); `useRoles`; `Button`, `Input`, `Select`, `Toggle`, `Checkbox` (`@/components/ui`); `UserResponse`, `UserCreate`, `UserUpdate`, `UserStatus`, `PasswordReset`, `ProjectAccessInput`, `ProjectAccessResponse`, `ProjectResponse` (`@/lib/api/models`).
- Produces:
  - `export function Modal(props: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }): React.ReactElement | null`
  - `export function ConfirmDialog(props: { title: string; message: string; confirmLabel?: string; danger?: boolean; isPending?: boolean; errorText?: string | null; onConfirm: () => void; onClose: () => void }): React.ReactElement`
  - `export function backendErrorMessage(err: unknown, fallback?: string): string`
  - `export function useProjects(): UseQueryResult<ProjectResponse[], Error>`; `export function useProjectAccess(userId: string): UseQueryResult<ProjectAccessResponse, Error>`; `export const PROJECTS_QUERY_KEY = "projects"`
  - `export function useCreateUser()`, `useUpdateUser()`, `useDeleteUser()`, `useResetPassword()`, `useSetProjectAccess()` (react-query mutation hook'ları — imzalar aşağıda)
  - `export function UserFormModal(props: { mode: "create" | "edit"; user?: UserResponse; onClose: () => void }): React.ReactElement`
  - `export function PasswordResetModal(props: { user: UserResponse; onClose: () => void }): React.ReactElement`
  - `export function ProjectAccessModal(props: { user: UserResponse; onClose: () => void }): React.ReactElement`

- [ ] **Step 1: error-message testini yaz (RED)**

`src/lib/settings/error-message.test.ts` oluştur:

```ts
import { describe, expect, it } from "vitest";
import { backendErrorMessage } from "./error-message";
import { BackendError } from "@/lib/api/unwrap";

describe("backendErrorMessage", () => {
  it("string detail dondurur", () => {
    expect(backendErrorMessage(new BackendError(409, { detail: "e-posta kullanimda" }))).toBe("e-posta kullanimda");
  });

  it("validation dizisinden ilk msg'yi dondurur", () => {
    expect(backendErrorMessage(new BackendError(422, { detail: [{ msg: "gecersiz e-posta", loc: ["body", "email"] }] }))).toBe("gecersiz e-posta");
  });

  it("bilinmeyen hatada fallback dondurur", () => {
    expect(backendErrorMessage(new Error("x"))).toBe("Beklenmeyen bir hata oluştu.");
  });
});
```

- [ ] **Step 2: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/settings/error-message.test.ts
```
Expected: FAIL (modül yok).

- [ ] **Step 3: error-message + hook'ları yaz**

`src/lib/settings/error-message.ts` oluştur:

```ts
import { BackendError } from "@/lib/api/unwrap";

// Backend (FastAPI) hata govdesinden Turkce mesaj cikarir; yoksa fallback.
export function backendErrorMessage(err: unknown, fallback = "Beklenmeyen bir hata oluştu."): string {
  if (err instanceof BackendError && err.body && typeof err.body === "object") {
    const detail = (err.body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (first && typeof first.msg === "string") return first.msg;
    }
  }
  return fallback;
}
```

`src/lib/api/hooks/useProjects.ts` oluştur:

```ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { ProjectResponse, ProjectAccessResponse } from "@/lib/api/models";

export const PROJECTS_QUERY_KEY = "projects";

export function useProjects(): UseQueryResult<ProjectResponse[], Error> {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/projects", {})),
  });
}

export function useProjectAccess(userId: string): UseQueryResult<ProjectAccessResponse, Error> {
  return useQuery({
    queryKey: ["project-access", userId],
    queryFn: async () =>
      unwrap(
        await backendClient.GET("/users/{user_id}/project-access", {
          params: { path: { user_id: userId } },
        }),
      ),
  });
}
```

`src/lib/api/hooks/useUserMutations.ts` oluştur:

```ts
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import { USERS_QUERY_KEY } from "./useUsers";
import type {
  UserCreate,
  UserUpdate,
  UserResponse,
  PasswordReset,
  ProjectAccessInput,
  ProjectAccessResponse,
} from "@/lib/api/models";

export function useCreateUser(): UseMutationResult<UserResponse, Error, UserCreate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UserCreate) => unwrap(await backendClient.POST("/users", { body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useUpdateUser(): UseMutationResult<UserResponse, Error, { id: string; body: UserUpdate }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }) =>
      unwrap(await backendClient.PATCH("/users/{user_id}", { params: { path: { user_id: id } }, body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useDeleteUser(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await backendClient.DELETE("/users/{user_id}", { params: { path: { user_id: id } } }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
    },
  });
}

export function useResetPassword(): UseMutationResult<void, Error, { id: string; body: PasswordReset }> {
  return useMutation({
    mutationFn: async ({ id, body }) => {
      unwrap(await backendClient.PATCH("/users/{user_id}/password", { params: { path: { user_id: id } }, body }));
    },
  });
}

export function useSetProjectAccess(): UseMutationResult<ProjectAccessResponse, Error, { id: string; body: ProjectAccessInput }> {
  return useMutation({
    mutationFn: async ({ id, body }) =>
      unwrap(await backendClient.PUT("/users/{user_id}/project-access", { params: { path: { user_id: id } }, body })),
  });
}
```

- [ ] **Step 4: error-message testini çalıştır (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/settings/error-message.test.ts
```
Expected: PASS.

- [ ] **Step 5: Modal testini yaz (RED)**

`src/components/settings/Modal.test.tsx` oluştur:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("baslik + icerik render eder", () => {
    render(<Modal title="Test" onClose={() => {}}><span>govde</span></Modal>);
    expect(screen.getByRole("dialog", { name: "Test" })).toBeInTheDocument();
    expect(screen.getByText("govde")).toBeInTheDocument();
  });

  it("Kapat butonu onClose cagirir", async () => {
    const onClose = vi.fn();
    render(<Modal title="Test" onClose={onClose}><span>govde</span></Modal>);
    await userEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape tusu onClose cagirir", async () => {
    const onClose = vi.fn();
    render(<Modal title="Test" onClose={onClose}><span>govde</span></Modal>);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 6: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/Modal.test.tsx
```
Expected: FAIL (modül yok).

- [ ] **Step 7: Modal + ConfirmDialog + CSS yaz**

`src/components/settings/Modal.tsx` oluştur:

```tsx
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./modal.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="modal__close" aria-label="Kapat" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
```

`src/components/settings/ConfirmDialog.tsx` oluştur:

```tsx
"use client";

import { Button } from "@/components/ui";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  isPending?: boolean;
  errorText?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Onayla",
  danger,
  isPending,
  errorText,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={isPending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="settings-note">{message}</p>
      {errorText && <p className="settings-note settings-note--error">{errorText}</p>}
    </Modal>
  );
}
```

`src/components/settings/modal.css` oluştur (token-only; rgba gölge/overlay serbest):

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background: rgba(15, 23, 42, 0.45);
}

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.modal__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-strong);
}

.modal__close {
  border: none;
  background: transparent;
  font-size: var(--text-xl);
  line-height: 1;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0 var(--space-2);
}

.modal__close:hover {
  color: var(--color-text);
}

.modal__body {
  padding: var(--space-6);
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
}
```

- [ ] **Step 8: Modal testini çalıştır (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/Modal.test.tsx
```
Expected: PASS.

- [ ] **Step 9: settings.css'e form/işlem stilleri ekle**

`src/components/settings/settings.css` sonuna ekle:

```css
.settings-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-field--row {
  flex-direction: row;
  align-items: center;
  gap: var(--space-3);
}

.settings-field__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-label);
}

.settings-checklist {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 240px;
  overflow-y: auto;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.settings-checklist__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.settings-row-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}
```

- [ ] **Step 10: UserFormModal testini yaz (RED)**

`src/components/settings/UserFormModal.test.tsx` oluştur:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserFormModal } from "./UserFormModal";

function renderModal(onClose: () => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <UserFormModal mode="create" onClose={onClose} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("UserFormModal (create)", () => {
  it("bos ad soyad ile dogrulama hatasi gosterir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify([{ id: "r1", key: "patron", name: "Patron", emoji: "", description: "", is_system: true }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    renderModal(() => {});
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByText("Ad soyad zorunludur.")).toBeInTheDocument();
  });

  it("gecerli form POST /users cagirir ve kapanir", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/backend/roles")) {
        return new Response(JSON.stringify([{ id: "r1", key: "patron", name: "Patron", emoji: "", description: "", is_system: true }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/api/backend/users") && init?.method === "POST") {
        return new Response(JSON.stringify({ id: "u9", email: "a@b.com", full_name: "Ali", title: "", role_id: "r1", status: "active" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const onClose = vi.fn();
    renderModal(onClose);
    await screen.findByRole("option", { name: "Patron" });

    await userEvent.type(screen.getByLabelText("Ad Soyad"), "Ali");
    await userEvent.type(screen.getByLabelText("E-posta"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Parola"), "parola12");
    await userEvent.selectOptions(screen.getByLabelText("Rol"), "r1");
    await userEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const postCall = fetchMock.mock.calls.find(([u, i]) => String(u).includes("/users") && (i as RequestInit | undefined)?.method === "POST");
    expect(postCall).toBeTruthy();
  });
});
```

- [ ] **Step 11: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/UserFormModal.test.tsx
```
Expected: FAIL (modül yok).

- [ ] **Step 12: UserFormModal + PasswordResetModal + ProjectAccessModal yaz**

> Not (repoda doğrulandı): `Toggle` ve `Checkbox` ikisi de `React.InputHTMLAttributes<HTMLInputElement>`'i extend eder (native checkbox → `checked`/`onChange` kontrollü) ve opsiyonel `label?: React.ReactNode` prop'u alır. **Önemli:** `Toggle` her zaman kendi `<label>`'ını render eder; onu başka bir `<label>` içine sarma (iç içe label geçersiz HTML) — `label` prop'unu kullan. `Checkbox` ise `label` verilmezse çıplak `<input>` döner, dolayısıyla tek bir dış `<label>` ile sarılması geçerlidir.

`src/components/settings/UserFormModal.tsx` oluştur:

```tsx
"use client";

import { useState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { Modal } from "./Modal";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useCreateUser, useUpdateUser } from "@/lib/api/hooks/useUserMutations";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { UserResponse, UserStatus } from "@/lib/api/models";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

interface UserFormModalProps {
  mode: "create" | "edit";
  user?: UserResponse;
  onClose: () => void;
}

export function UserFormModal({ mode, user, onClose }: UserFormModalProps) {
  const rolesQuery = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [title, setTitle] = useState(user?.title ?? "");
  const [roleId, setRoleId] = useState(user?.role_id ?? "");
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "active");
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createUser.isPending || updateUser.isPending;

  function validate(): string | null {
    if (!fullName.trim()) return "Ad soyad zorunludur.";
    if (mode === "create") {
      if (!EMAIL_RE.test(email)) return "Geçerli bir e-posta girin.";
      if (password.length < MIN_PASSWORD) return `Parola en az ${MIN_PASSWORD} karakter olmalıdır.`;
    }
    if (!roleId) return "Rol seçin.";
    return null;
  }

  function handleSubmit() {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    if (mode === "create") {
      createUser.mutate(
        { email, password, full_name: fullName, title, role_id: roleId, status },
        { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
      );
    } else if (user) {
      updateUser.mutate(
        { id: user.id, body: { full_name: fullName, title, role_id: roleId, status } },
        { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
      );
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Yeni Kullanıcı" : "Kullanıcıyı Düzenle"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="settings-form">
        <label className="settings-field">
          <span className="settings-field__label">Ad Soyad</span>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        {mode === "create" && (
          <>
            <label className="settings-field">
              <span className="settings-field__label">E-posta</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="settings-field">
              <span className="settings-field__label">Parola</span>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          </>
        )}
        <label className="settings-field">
          <span className="settings-field__label">Unvan</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Rol</span>
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Seçin…</option>
            {rolesQuery.data?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Durum</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
            <option value="active">Aktif</option>
            <option value="on_leave">İzinli</option>
            <option value="passive">Pasif</option>
          </Select>
        </label>
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
```

`src/components/settings/PasswordResetModal.tsx` oluştur:

```tsx
"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Modal } from "./Modal";
import { useResetPassword } from "@/lib/api/hooks/useUserMutations";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { UserResponse } from "@/lib/api/models";

const MIN_PASSWORD = 8;

export function PasswordResetModal({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit() {
    if (password.length < MIN_PASSWORD) {
      setFormError(`Parola en az ${MIN_PASSWORD} karakter olmalıdır.`);
      return;
    }
    setFormError(null);
    reset.mutate(
      { id: user.id, body: { new_password: password } },
      { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
    );
  }

  return (
    <Modal
      title={`Parola Sıfırla — ${user.full_name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={reset.isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={reset.isPending}>
            Sıfırla
          </Button>
        </>
      }
    >
      <div className="settings-form">
        <label className="settings-field">
          <span className="settings-field__label">Yeni Parola</span>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
```

`src/components/settings/ProjectAccessModal.tsx` oluştur:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button, Toggle, Checkbox } from "@/components/ui";
import { Modal } from "./Modal";
import { useProjects, useProjectAccess } from "@/lib/api/hooks/useProjects";
import { useSetProjectAccess } from "@/lib/api/hooks/useUserMutations";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { UserResponse } from "@/lib/api/models";

export function ProjectAccessModal({ user, onClose }: { user: UserResponse; onClose: () => void }) {
  const projectsQuery = useProjects();
  const accessQuery = useProjectAccess(user.id);
  const setAccess = useSetProjectAccess();

  const [allProjects, setAllProjects] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (accessQuery.data) {
      setAllProjects(accessQuery.data.all_projects);
      setSelectedIds(accessQuery.data.project_ids);
    }
  }, [accessQuery.data]);

  function toggleProject(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function handleSubmit() {
    setFormError(null);
    setAccess.mutate(
      { id: user.id, body: { all_projects: allProjects, project_ids: allProjects ? [] : selectedIds } },
      { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
    );
  }

  return (
    <Modal
      title={`Proje Erişimi — ${user.full_name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={setAccess.isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={setAccess.isPending}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="settings-form">
        <div className="settings-field settings-field--row">
          <Toggle
            label="Tüm projeler"
            checked={allProjects}
            onChange={(e) => setAllProjects(e.target.checked)}
          />
        </div>
        {!allProjects && (
          <div className="settings-checklist">
            {projectsQuery.data?.map((project) => (
              <label key={project.id} className="settings-checklist__item">
                <Checkbox checked={selectedIds.includes(project.id)} onChange={() => toggleProject(project.id)} />
                <span>
                  {project.code} — {project.name}
                </span>
              </label>
            ))}
          </div>
        )}
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 13: UsersScreen'e araç çubuğu + satır işlemleri + modallar ekle**

`src/components/settings/UsersScreen.tsx` içeriğini şu tam sürümle değiştir:

```tsx
"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { useUsers, PAGE_SIZE } from "@/lib/api/hooks/useUsers";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useDeleteUser } from "@/lib/api/hooks/useUserMutations";
import { StatusBadge } from "./StatusBadge";
import { UserFormModal } from "./UserFormModal";
import { PasswordResetModal } from "./PasswordResetModal";
import { ProjectAccessModal } from "./ProjectAccessModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { RoleResponse, UserResponse } from "@/lib/api/models";
import "./settings.css";

type ModalState =
  | { type: "create" }
  | { type: "edit"; user: UserResponse }
  | { type: "password"; user: UserResponse }
  | { type: "project"; user: UserResponse }
  | { type: "delete"; user: UserResponse }
  | null;

function roleName(roles: RoleResponse[] | undefined, roleId: string): string {
  return roles?.find((r) => r.id === roleId)?.name ?? "—";
}

function pageFromParams(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function UsersScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = pageFromParams(searchParams.get("sayfa"));
  const offset = (page - 1) * PAGE_SIZE;

  const usersQuery = useUsers({ limit: PAGE_SIZE, offset });
  const rolesQuery = useRoles();
  const deleteUser = useDeleteUser();

  const [modal, setModal] = useState<ModalState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sayfa", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  function closeModal() {
    setModal(null);
    setDeleteError(null);
  }

  function confirmDelete(user: UserResponse) {
    setDeleteError(null);
    deleteUser.mutate(user.id, {
      onSuccess: closeModal,
      onError: (err) => setDeleteError(backendErrorMessage(err)),
    });
  }

  if (usersQuery.isLoading) {
    return <p className="settings-note">Yükleniyor…</p>;
  }

  if (usersQuery.isError || !usersQuery.data) {
    return <p className="settings-note settings-note--error">Kullanıcılar yüklenemedi.</p>;
  }

  const { items, total } = usersQuery.data;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="settings-panel">
      <div className="settings-panel__toolbar">
        <span className="settings-panel__count">{total} kullanıcı</span>
        <Button variant="primary" size="sm" onClick={() => setModal({ type: "create" })}>
          Yeni Kullanıcı
        </Button>
      </div>

      <table className="settings-table">
        <thead>
          <tr>
            <th>Ad Soyad</th>
            <th>E-posta</th>
            <th>Unvan</th>
            <th>Rol</th>
            <th>Durum</th>
            <th aria-label="İşlemler" />
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td>{user.full_name}</td>
              <td>{user.email}</td>
              <td>{user.title}</td>
              <td>{roleName(rolesQuery.data, user.role_id)}</td>
              <td>
                <StatusBadge status={user.status} />
              </td>
              <td>
                <div className="settings-row-actions">
                  <Button variant="ghost" size="sm" onClick={() => setModal({ type: "edit", user })}>
                    Düzenle
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setModal({ type: "password", user })}>
                    Parola
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setModal({ type: "project", user })}>
                    Projeler
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setModal({ type: "delete", user })}>
                    Sil
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="settings-pager">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          Önceki
        </Button>
        <span className="settings-pager__label">
          Sayfa {page} / {pageCount}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
          Sonraki
        </Button>
      </div>

      {modal?.type === "create" && <UserFormModal mode="create" onClose={closeModal} />}
      {modal?.type === "edit" && <UserFormModal mode="edit" user={modal.user} onClose={closeModal} />}
      {modal?.type === "password" && <PasswordResetModal user={modal.user} onClose={closeModal} />}
      {modal?.type === "project" && <ProjectAccessModal user={modal.user} onClose={closeModal} />}
      {modal?.type === "delete" && (
        <ConfirmDialog
          title="Kullanıcıyı Sil"
          message={`"${modal.user.full_name}" kullanıcısını silmek istediğinize emin misiniz?`}
          confirmLabel="Sil"
          danger
          isPending={deleteUser.isPending}
          errorText={deleteError}
          onConfirm={() => confirmDelete(modal.user)}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 14: Testler + typecheck + build (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/UserFormModal.test.tsx src/components/settings/Modal.test.tsx src/components/settings/UsersScreen.test.tsx src/lib/settings/error-message.test.ts
pnpm typecheck
pnpm build
```
Expected: testler PASS, typecheck temiz, build başarılı.

- [ ] **Step 15: Commit**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add src/components/settings src/lib/settings/error-message.ts src/lib/settings/error-message.test.ts src/lib/api/hooks/useProjects.ts src/lib/api/hooks/useUserMutations.ts
git commit -m "feat: add user create/edit/delete/password/project-access flows"
```

---

## Task 7: Roller Ekranı

**Amaç:** Rol listesi (emoji, ad, key, açıklama, `is_system` rozeti) + oluştur/yeniden-adlandır/sil. `is_system` roller kilitli (düzenle/sil devre dışı).

**Files:**
- Create: `src/lib/api/hooks/useRoleMutations.ts`
- Create: `src/components/settings/RoleFormModal.tsx`
- Create: `src/components/settings/RolesScreen.tsx`
- Test: `src/components/settings/RolesScreen.test.tsx`
- Modify: `src/components/settings/settings.css` (rol listesi stilleri)
- Modify: `src/app/(app)/ayarlar/roller/page.tsx`

**Interfaces:**
- Consumes: `useRoles`, `ROLES_QUERY_KEY` (`@/lib/api/hooks/useRoles`); `backendClient`, `unwrap`; `Modal`, `ConfirmDialog`; `Button`, `Input`, `Badge`; `RoleResponse`, `RoleCreate`, `RoleRename` (`@/lib/api/models`); `backendErrorMessage`.
- Produces:
  - `export function useCreateRole(): UseMutationResult<RoleResponse, Error, RoleCreate>`
  - `export function useRenameRole(): UseMutationResult<RoleResponse, Error, { id: string; body: RoleRename }>`
  - `export function useDeleteRole(): UseMutationResult<void, Error, string>`
  - `export function RoleFormModal(props: { mode: "create" | "edit"; role?: RoleResponse; onClose: () => void }): React.ReactElement`
  - `export function RolesScreen(): React.ReactElement`

- [ ] **Step 1: Rol mutasyon hook'larını yaz**

`src/lib/api/hooks/useRoleMutations.ts` oluştur:

```ts
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import { ROLES_QUERY_KEY } from "./useRoles";
import type { RoleResponse, RoleCreate, RoleRename } from "@/lib/api/models";

export function useCreateRole(): UseMutationResult<RoleResponse, Error, RoleCreate> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: RoleCreate) => unwrap(await backendClient.POST("/roles", { body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
    },
  });
}

export function useRenameRole(): UseMutationResult<RoleResponse, Error, { id: string; body: RoleRename }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }) =>
      unwrap(await backendClient.PATCH("/roles/{role_id}", { params: { path: { role_id: id } }, body })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
    },
  });
}

export function useDeleteRole(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await backendClient.DELETE("/roles/{role_id}", { params: { path: { role_id: id } } }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
    },
  });
}
```

- [ ] **Step 2: RoleFormModal'ı yaz**

`src/components/settings/RoleFormModal.tsx` oluştur:

```tsx
"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Modal } from "./Modal";
import { useCreateRole, useRenameRole } from "@/lib/api/hooks/useRoleMutations";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { RoleResponse } from "@/lib/api/models";

const KEY_RE = /^[a-z][a-z0-9_]*$/;

interface RoleFormModalProps {
  mode: "create" | "edit";
  role?: RoleResponse;
  onClose: () => void;
}

export function RoleFormModal({ mode, role, onClose }: RoleFormModalProps) {
  const createRole = useCreateRole();
  const renameRole = useRenameRole();

  const [key, setKey] = useState(role?.key ?? "");
  const [name, setName] = useState(role?.name ?? "");
  const [emoji, setEmoji] = useState(role?.emoji ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const isPending = createRole.isPending || renameRole.isPending;

  function validate(): string | null {
    if (!name.trim()) return "Ad zorunludur.";
    if (mode === "create" && !KEY_RE.test(key)) return "Anahtar küçük harf/rakam/alt-çizgi olmalı ve harfle başlamalı.";
    return null;
  }

  function handleSubmit() {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    if (mode === "create") {
      createRole.mutate(
        { key, name, emoji, description },
        { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
      );
    } else if (role) {
      renameRole.mutate(
        { id: role.id, body: { name, emoji, description } },
        { onSuccess: onClose, onError: (err) => setFormError(backendErrorMessage(err)) },
      );
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Yeni Rol" : "Rolü Düzenle"}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Vazgeç
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="settings-form">
        {mode === "create" && (
          <label className="settings-field">
            <span className="settings-field__label">Anahtar (key)</span>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="or. saha_muduru" />
          </label>
        )}
        <label className="settings-field">
          <span className="settings-field__label">Ad</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Emoji</span>
          <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </label>
        <label className="settings-field">
          <span className="settings-field__label">Açıklama</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {formError && <p className="settings-note settings-note--error">{formError}</p>}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: RolesScreen testini yaz (RED)**

`src/components/settings/RolesScreen.test.tsx` oluştur:

```tsx
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RolesScreen } from "./RolesScreen";

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RolesScreen />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RolesScreen", () => {
  it("rolleri listeler ve is_system rolun sil butonu devre disidir", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            { id: "r1", key: "system_admin", name: "Sistem Yöneticisi", emoji: "🛡️", description: "Tam yetki", is_system: true },
            { id: "r2", key: "saha", name: "Saha", emoji: "👷", description: "Saha ekibi", is_system: false },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    renderScreen();
    expect(await screen.findByText("Sistem Yöneticisi")).toBeInTheDocument();
    expect(screen.getByText("Saha")).toBeInTheDocument();

    // system rol satirindaki Sil butonu disabled
    const sistemRow = screen.getByText("Sistem Yöneticisi").closest("tr");
    expect(sistemRow).not.toBeNull();
    const sistemDelete = sistemRow!.querySelector("button[data-action='delete']") as HTMLButtonElement;
    expect(sistemDelete).toBeDisabled();
  });
});
```

- [ ] **Step 4: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/RolesScreen.test.tsx
```
Expected: FAIL (modül yok).

- [ ] **Step 5: RolesScreen + CSS + page yaz**

`src/components/settings/RolesScreen.tsx` oluştur:

```tsx
"use client";

import { useState } from "react";
import { Button, Badge } from "@/components/ui";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useDeleteRole } from "@/lib/api/hooks/useRoleMutations";
import { RoleFormModal } from "./RoleFormModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { backendErrorMessage } from "@/lib/settings/error-message";
import type { RoleResponse } from "@/lib/api/models";
import "./settings.css";

type ModalState = { type: "create" } | { type: "edit"; role: RoleResponse } | { type: "delete"; role: RoleResponse } | null;

export function RolesScreen() {
  const rolesQuery = useRoles();
  const deleteRole = useDeleteRole();
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function closeModal() {
    setModal(null);
    setDeleteError(null);
  }

  function confirmDelete(role: RoleResponse) {
    setDeleteError(null);
    deleteRole.mutate(role.id, {
      onSuccess: closeModal,
      onError: (err) => setDeleteError(backendErrorMessage(err)),
    });
  }

  if (rolesQuery.isLoading) {
    return <p className="settings-note">Yükleniyor…</p>;
  }
  if (rolesQuery.isError || !rolesQuery.data) {
    return <p className="settings-note settings-note--error">Roller yüklenemedi.</p>;
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel__toolbar">
        <span className="settings-panel__count">{rolesQuery.data.length} rol</span>
        <Button variant="primary" size="sm" onClick={() => setModal({ type: "create" })}>
          Yeni Rol
        </Button>
      </div>

      <table className="settings-table">
        <thead>
          <tr>
            <th>Rol</th>
            <th>Anahtar</th>
            <th>Açıklama</th>
            <th>Tür</th>
            <th aria-label="İşlemler" />
          </tr>
        </thead>
        <tbody>
          {rolesQuery.data.map((role) => (
            <tr key={role.id}>
              <td>
                <span className="settings-role__name">
                  <span aria-hidden="true">{role.emoji}</span> {role.name}
                </span>
              </td>
              <td>
                <code className="settings-role__key">{role.key}</code>
              </td>
              <td>{role.description}</td>
              <td>{role.is_system ? <Badge variant="neutral">Sistem</Badge> : <Badge variant="success">Özel</Badge>}</td>
              <td>
                <div className="settings-row-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    data-action="edit"
                    disabled={role.is_system}
                    onClick={() => setModal({ type: "edit", role })}
                  >
                    Düzenle
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    data-action="delete"
                    disabled={role.is_system}
                    onClick={() => setModal({ type: "delete", role })}
                  >
                    Sil
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal?.type === "create" && <RoleFormModal mode="create" onClose={closeModal} />}
      {modal?.type === "edit" && <RoleFormModal mode="edit" role={modal.role} onClose={closeModal} />}
      {modal?.type === "delete" && (
        <ConfirmDialog
          title="Rolü Sil"
          message={`"${modal.role.name}" rolünü silmek istediğinize emin misiniz?`}
          confirmLabel="Sil"
          danger
          isPending={deleteRole.isPending}
          errorText={deleteError}
          onConfirm={() => confirmDelete(modal.role)}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
```

`src/components/settings/settings.css` sonuna ekle:

```css
.settings-role__name {
  font-weight: 600;
  color: var(--color-text);
}

.settings-role__key {
  font-family: ui-monospace, monospace;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  padding: 2px var(--space-2);
  border-radius: var(--radius-sm);
}
```

`src/app/(app)/ayarlar/roller/page.tsx` içeriğini değiştir:

```tsx
import { RolesScreen } from "@/components/settings/RolesScreen";

export default function RollerPage() {
  return <RolesScreen />;
}
```

- [ ] **Step 6: Test + typecheck + build (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/RolesScreen.test.tsx
pnpm typecheck
pnpm build
```
Expected: PASS, typecheck temiz, build başarılı.

- [ ] **Step 7: Commit**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add src/lib/api/hooks/useRoleMutations.ts src/components/settings/RoleFormModal.tsx src/components/settings/RolesScreen.tsx src/components/settings/RolesScreen.test.tsx src/components/settings/settings.css "src/app/(app)/ayarlar/roller/page.tsx"
git commit -m "feat: add roles screen with create/rename/delete and system lock"
```

---

## Task 8: İzin Matrisi (Preset Util + Gruplu Tablo + Optimistic PUT)

**Amaç:** `permission-presets` util'i (TDD, önce) + modül×rol izin matrisi (gruplu, sticky ilk sütun) + preset dropdown + optimistic PUT + rollback + system_admin sütunu salt-okunur.

**Files:**
- Create: `src/lib/api/permission-presets.ts`
- Test: `src/lib/api/permission-presets.test.ts`
- Create: `src/lib/api/hooks/useModules.ts`
- Create: `src/lib/api/hooks/useRolePermissions.ts`
- Create: `src/lib/api/hooks/usePermissionMutation.ts`
- Test: `src/lib/api/hooks/usePermissionMutation.test.tsx`
- Create: `src/components/settings/PermissionMatrix.tsx`
- Test: `src/components/settings/PermissionMatrix.test.tsx`
- Modify: `src/components/settings/settings.css` (matris stilleri)
- Modify: `src/app/(app)/ayarlar/izin-matrisi/page.tsx`

**Interfaces:**
- Consumes: `backendClient`, `unwrap`; `useRoles`; `AccessLevel`, `Scope`, `PermissionCell`, `PermissionUpdate`, `ModuleResponse`, `ModuleGroup`, `RoleResponse` (`@/lib/api/models`); `Select`.
- Produces:
  - `export type PresetKey = "super" | "full" | "none" | "view" | "limited" | "finance" | "own" | "project" | "stock" | "draft" | "request" | "approve"`
  - `export interface Preset { key: PresetKey; access_level: AccessLevel; scope: Scope; label: string }`
  - `export const PRESETS: Preset[]`
  - `export function matchPreset(level: AccessLevel, scope: Scope): Preset | null`
  - `export function presetToUpdate(key: PresetKey): PermissionUpdate`
  - `export function useModules(): UseQueryResult<ModuleResponse[], Error>`; `export const MODULES_QUERY_KEY = "modules"`
  - `export function rolePermissionsQueryOptions(roleId: string): { queryKey: (string)[]; queryFn: () => Promise<PermissionCell[]> }`; `export function useRolePermissions(roleId: string)`; `export function useAllRolePermissions(roleIds: string[])`; `export const ROLE_PERMISSIONS_QUERY_KEY = "role-permissions"`
  - `export function usePermissionMutation(): UseMutationResult<PermissionCell, Error, { roleId: string; moduleKey: string; update: PermissionUpdate }, { previous?: PermissionCell[]; key: (string)[] }>`
  - `export function PermissionMatrix(): React.ReactElement`

- [ ] **Step 1: permission-presets testini yaz (RED)**

`src/lib/api/permission-presets.test.ts` oluştur:

```ts
import { describe, expect, it } from "vitest";
import { PRESETS, matchPreset, presetToUpdate } from "./permission-presets";

describe("permission-presets", () => {
  it("12 preset tanimlar", () => {
    expect(PRESETS).toHaveLength(12);
  });

  it("her preset kendi (level, scope) ile eslesir", () => {
    for (const preset of PRESETS) {
      expect(matchPreset(preset.access_level, preset.scope)?.key).toBe(preset.key);
    }
  });

  it("bilinen kombinasyonlari dogru eslestirir", () => {
    expect(matchPreset("admin", "all")?.key).toBe("super");
    expect(matchPreset("view", "all")?.key).toBe("view");
    expect(matchPreset("view", "limited")?.key).toBe("limited");
    expect(matchPreset("draft", "project")?.key).toBe("draft");
    expect(matchPreset("none", "all")?.key).toBe("none");
  });

  it("presete uymayan kombinasyon null doner (Ozel)", () => {
    expect(matchPreset("full", "project")).toBeNull();
    expect(matchPreset("admin", "own")).toBeNull();
  });

  it("presetToUpdate dogru (level, scope) uretir", () => {
    expect(presetToUpdate("draft")).toEqual({ access_level: "draft", scope: "project" });
    expect(presetToUpdate("finance")).toEqual({ access_level: "view", scope: "finance" });
    expect(presetToUpdate("super")).toEqual({ access_level: "admin", scope: "all" });
  });
});
```

- [ ] **Step 2: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/api/permission-presets.test.ts
```
Expected: FAIL (modül yok).

- [ ] **Step 3: permission-presets'i yaz**

`src/lib/api/permission-presets.ts` oluştur:

```ts
import type { AccessLevel, Scope, PermissionUpdate } from "@/lib/api/models";

export type PresetKey =
  | "super"
  | "full"
  | "none"
  | "view"
  | "limited"
  | "finance"
  | "own"
  | "project"
  | "stock"
  | "draft"
  | "request"
  | "approve";

export interface Preset {
  key: PresetKey;
  access_level: AccessLevel;
  scope: Scope;
  label: string;
}

// 12 adlandirilmis preset — spec §4.3 tablosu. Her (level, scope) kombinasyonu tekildir.
export const PRESETS: Preset[] = [
  { key: "super", access_level: "admin", scope: "all", label: "Süper (silme dahil)" },
  { key: "full", access_level: "full", scope: "all", label: "Tam" },
  { key: "none", access_level: "none", scope: "all", label: "— (Yok)" },
  { key: "view", access_level: "view", scope: "all", label: "Görüntüle" },
  { key: "limited", access_level: "view", scope: "limited", label: "Sınırlı" },
  { key: "finance", access_level: "view", scope: "finance", label: "Mali" },
  { key: "own", access_level: "view", scope: "own", label: "Kendi" },
  { key: "project", access_level: "view", scope: "project", label: "Proje" },
  { key: "stock", access_level: "view", scope: "stock", label: "Stok" },
  { key: "draft", access_level: "draft", scope: "project", label: "Taslak" },
  { key: "request", access_level: "request", scope: "all", label: "Talep" },
  { key: "approve", access_level: "approve", scope: "all", label: "Onay" },
];

export function matchPreset(level: AccessLevel, scope: Scope): Preset | null {
  return PRESETS.find((preset) => preset.access_level === level && preset.scope === scope) ?? null;
}

export function presetToUpdate(key: PresetKey): PermissionUpdate {
  const preset = PRESETS.find((p) => p.key === key);
  if (!preset) throw new Error(`Bilinmeyen preset: ${key}`);
  return { access_level: preset.access_level, scope: preset.scope };
}
```

- [ ] **Step 4: Preset testini çalıştır (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/api/permission-presets.test.ts
```
Expected: PASS.

- [ ] **Step 5: modules + rolePermissions + permissionMutation hook'larını yaz**

`src/lib/api/hooks/useModules.ts` oluştur:

```ts
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { ModuleResponse } from "@/lib/api/models";

export const MODULES_QUERY_KEY = "modules";

export function useModules(): UseQueryResult<ModuleResponse[], Error> {
  return useQuery({
    queryKey: [MODULES_QUERY_KEY],
    queryFn: async () => unwrap(await backendClient.GET("/modules", {})),
  });
}
```

`src/lib/api/hooks/useRolePermissions.ts` oluştur:

```ts
import { useQuery, useQueries } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import type { PermissionCell } from "@/lib/api/models";

export const ROLE_PERMISSIONS_QUERY_KEY = "role-permissions";

export function rolePermissionsQueryOptions(roleId: string) {
  return {
    queryKey: [ROLE_PERMISSIONS_QUERY_KEY, roleId],
    queryFn: async (): Promise<PermissionCell[]> =>
      unwrap(
        await backendClient.GET("/roles/{role_id}/permissions", {
          params: { path: { role_id: roleId } },
        }),
      ),
  };
}

export function useRolePermissions(roleId: string) {
  return useQuery(rolePermissionsQueryOptions(roleId));
}

// Roller icin paralel query'ler — useQueries degisken uzunluklu diziyi destekler.
export function useAllRolePermissions(roleIds: string[]) {
  return useQueries({ queries: roleIds.map(rolePermissionsQueryOptions) });
}
```

`src/lib/api/hooks/usePermissionMutation.ts` oluştur:

```ts
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { backendClient } from "@/lib/api/client";
import { unwrap } from "@/lib/api/unwrap";
import { ROLE_PERMISSIONS_QUERY_KEY } from "./useRolePermissions";
import type { PermissionCell, PermissionUpdate } from "@/lib/api/models";

interface Vars {
  roleId: string;
  moduleKey: string;
  update: PermissionUpdate;
}

interface Ctx {
  previous?: PermissionCell[];
  key: (string)[];
}

export function usePermissionMutation(): UseMutationResult<PermissionCell, Error, Vars, Ctx> {
  const qc = useQueryClient();
  return useMutation<PermissionCell, Error, Vars, Ctx>({
    mutationFn: async ({ roleId, moduleKey, update }) =>
      unwrap(
        await backendClient.PUT("/roles/{role_id}/permissions/{module_key}", {
          params: { path: { role_id: roleId, module_key: moduleKey } },
          body: update,
        }),
      ),
    onMutate: async ({ roleId, moduleKey, update }) => {
      const key = [ROLE_PERMISSIONS_QUERY_KEY, roleId];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PermissionCell[]>(key);
      qc.setQueryData<PermissionCell[]>(key, (old) => {
        const list = old ? [...old] : [];
        const next: PermissionCell = {
          module_key: moduleKey,
          access_level: update.access_level,
          scope: update.scope,
        };
        const idx = list.findIndex((cell) => cell.module_key === moduleKey);
        if (idx >= 0) list[idx] = next;
        else list.push(next);
        return list;
      });
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
    },
    onSettled: (_data, _err, { roleId }) => {
      qc.invalidateQueries({ queryKey: [ROLE_PERMISSIONS_QUERY_KEY, roleId] });
    },
  });
}
```

- [ ] **Step 6: usePermissionMutation optimistic/rollback testini yaz (RED)**

`src/lib/api/hooks/usePermissionMutation.test.tsx` oluştur:

```tsx
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePermissionMutation } from "./usePermissionMutation";
import { ROLE_PERMISSIONS_QUERY_KEY } from "./useRolePermissions";
import type { PermissionCell } from "@/lib/api/models";

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePermissionMutation", () => {
  it("optimistic gunceller, backend hatasinda rollback yapar", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const key = [ROLE_PERMISSIONS_QUERY_KEY, "r1"];
    client.setQueryData<PermissionCell[]>(key, [{ module_key: "stok", access_level: "none", scope: "all" }]);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "yetki yok" }), { status: 403 })));

    const { result } = renderHook(() => usePermissionMutation(), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate({ roleId: "r1", moduleKey: "stok", update: { access_level: "full", scope: "all" } });
    });

    // onMutate hemen optimistic yazar
    await waitFor(() => {
      const data = client.getQueryData<PermissionCell[]>(key);
      expect(data?.[0].access_level).toBe("full");
    });

    // hata → rollback
    await waitFor(() => expect(result.current.isError).toBe(true));
    const rolledBack = client.getQueryData<PermissionCell[]>(key);
    expect(rolledBack?.[0].access_level).toBe("none");
  });
});
```

- [ ] **Step 7: Testi çalıştır (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/api/hooks/usePermissionMutation.test.tsx
```
Expected: PASS (optimistic yazım + rollback doğrulanır). Not: `onSettled` invalidate 403 üzerine yeniden fetch tetikler ama mock 403 döndüğü için query verisi rollback değerinde kalır; test rollback'i doğrular.

- [ ] **Step 8: PermissionMatrix testini yaz (RED)**

`src/components/settings/PermissionMatrix.test.tsx` oluştur:

```tsx
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PermissionMatrix } from "./PermissionMatrix";

function renderMatrix() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PermissionMatrix />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PermissionMatrix", () => {
  it("grup basligi + modul satiri + rol sutunu render eder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/backend/modules")) {
          return new Response(
            JSON.stringify([{ id: "m1", key: "raporlar", name: "Raporlar", group: "GENEL", sort_order: 1 }]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url.includes("/api/backend/roles")) {
          return new Response(
            JSON.stringify([{ id: "r1", key: "saha", name: "Saha", emoji: "", description: "", is_system: false }]),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        // /roles/r1/permissions
        return new Response(JSON.stringify([{ module_key: "raporlar", access_level: "view", scope: "all" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    renderMatrix();
    expect(await screen.findByText("Genel")).toBeInTheDocument();
    expect(screen.getByText("Raporlar")).toBeInTheDocument();
    expect(screen.getByText("Saha")).toBeInTheDocument();
    // hucre secimi mevcut preset'i ("Görüntüle") gosterir
    expect(await screen.findByDisplayValue("Görüntüle")).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/PermissionMatrix.test.tsx
```
Expected: FAIL (modül yok).

- [ ] **Step 10: PermissionMatrix + CSS + page yaz**

`src/components/settings/PermissionMatrix.tsx` oluştur:

```tsx
"use client";

import { Fragment } from "react";
import { Select } from "@/components/ui";
import { useModules } from "@/lib/api/hooks/useModules";
import { useRoles } from "@/lib/api/hooks/useRoles";
import { useAllRolePermissions } from "@/lib/api/hooks/useRolePermissions";
import { usePermissionMutation } from "@/lib/api/hooks/usePermissionMutation";
import { PRESETS, matchPreset, presetToUpdate, type PresetKey } from "@/lib/api/permission-presets";
import type { ModuleGroup, ModuleResponse, PermissionCell } from "@/lib/api/models";
import "./settings.css";

const SYSTEM_ADMIN_KEY = "system_admin";

const GROUP_ORDER: ModuleGroup[] = ["GENEL", "SAHA", "STOK_SATINALMA", "MALI", "SISTEM"];
const GROUP_LABELS: Record<ModuleGroup, string> = {
  GENEL: "Genel",
  SAHA: "Saha",
  STOK_SATINALMA: "Stok & Satınalma",
  MALI: "Mali",
  SISTEM: "Sistem",
};

function groupModules(modules: ModuleResponse[]): { group: ModuleGroup; items: ModuleResponse[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    items: modules.filter((m) => m.group === group).sort((a, b) => a.sort_order - b.sort_order),
  })).filter((section) => section.items.length > 0);
}

export function PermissionMatrix() {
  const modulesQuery = useModules();
  const rolesQuery = useRoles();

  const roles = rolesQuery.data ?? [];
  const roleIds = roles.map((role) => role.id);
  const permQueries = useAllRolePermissions(roleIds);
  const mutation = usePermissionMutation();

  if (modulesQuery.isLoading || rolesQuery.isLoading) {
    return <p className="settings-note">Yükleniyor…</p>;
  }
  if (modulesQuery.isError || rolesQuery.isError || !modulesQuery.data || !rolesQuery.data) {
    return <p className="settings-note settings-note--error">İzin matrisi yüklenemedi.</p>;
  }

  // rol_id -> (module_key -> hucre) haritasi
  const permByRole: Record<string, Record<string, PermissionCell>> = {};
  roleIds.forEach((roleId, index) => {
    const cells = permQueries[index]?.data ?? [];
    const map: Record<string, PermissionCell> = {};
    for (const cell of cells) map[cell.module_key] = cell;
    permByRole[roleId] = map;
  });

  const sections = groupModules(modulesQuery.data);

  function currentPresetKey(roleId: string, moduleKey: string): PresetKey | "" {
    const cell = permByRole[roleId]?.[moduleKey];
    const level = cell?.access_level ?? "none";
    const scope = cell?.scope ?? "all";
    return matchPreset(level, scope)?.key ?? "";
  }

  function handleChange(roleId: string, moduleKey: string, value: string) {
    if (value === "") return;
    mutation.mutate({ roleId, moduleKey, update: presetToUpdate(value as PresetKey) });
  }

  return (
    <div className="matrix-scroll">
      <table className="matrix-table">
        <thead>
          <tr>
            <th className="matrix-col-sticky matrix-col-head">Modül</th>
            {roles.map((role) => (
              <th key={role.id} className="matrix-role-head">
                <span aria-hidden="true">{role.emoji}</span> {role.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.group}>
              <tr className="matrix-group-row">
                <th className="matrix-col-sticky matrix-group-head" colSpan={roles.length + 1}>
                  {GROUP_LABELS[section.group]}
                </th>
              </tr>
              {section.items.map((module) => (
                <tr key={module.id}>
                  <th className="matrix-col-sticky matrix-module-name">{module.name}</th>
                  {roles.map((role) => {
                    const presetKey = currentPresetKey(role.id, module.key);
                    const readOnly = role.key === SYSTEM_ADMIN_KEY;
                    if (readOnly) {
                      const label = PRESETS.find((p) => p.key === presetKey)?.label ?? "Özel";
                      return (
                        <td key={role.id} className="matrix-cell matrix-cell--readonly">
                          {label}
                        </td>
                      );
                    }
                    return (
                      <td key={role.id} className="matrix-cell">
                        <Select
                          aria-label={`${module.name} — ${role.name}`}
                          value={presetKey}
                          onChange={(e) => handleChange(role.id, module.key, e.target.value)}
                        >
                          {presetKey === "" && (
                            <option value="" disabled>
                              Özel
                            </option>
                          )}
                          {PRESETS.map((preset) => (
                            <option key={preset.key} value={preset.key}>
                              {preset.label}
                            </option>
                          ))}
                        </Select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`src/components/settings/settings.css` sonuna ekle:

```css
.matrix-scroll {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.matrix-table {
  border-collapse: collapse;
  min-width: 100%;
  background: var(--color-surface);
}

.matrix-table th,
.matrix-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  border-right: 1px solid var(--color-divider);
  font-size: var(--text-sm);
  text-align: left;
  white-space: nowrap;
}

.matrix-role-head {
  background: var(--color-surface-muted);
  font-weight: 600;
  color: var(--color-text);
}

.matrix-col-sticky {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--color-surface);
}

.matrix-col-head {
  background: var(--color-surface-muted);
  z-index: 2;
}

.matrix-group-head {
  background: var(--color-surface-2);
  font-size: var(--text-table-head);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-muted);
}

.matrix-module-name {
  font-weight: 600;
  color: var(--color-text);
}

.matrix-cell--readonly {
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
}
```

`src/app/(app)/ayarlar/izin-matrisi/page.tsx` içeriğini değiştir:

```tsx
import { PermissionMatrix } from "@/components/settings/PermissionMatrix";

export default function IzinMatrisiPage() {
  return <PermissionMatrix />;
}
```

- [ ] **Step 11: Testler + typecheck + build (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/lib/api/permission-presets.test.ts src/lib/api/hooks/usePermissionMutation.test.tsx src/components/settings/PermissionMatrix.test.tsx
pnpm typecheck
pnpm build
```
Expected: testler PASS, typecheck temiz, build başarılı. (Grup + modül satırları `<Fragment key={section.group}>` ile sarıldığı için React anahtar uyarısı yok.)

- [ ] **Step 12: Commit**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add src/lib/api/permission-presets.ts src/lib/api/permission-presets.test.ts src/lib/api/hooks/useModules.ts src/lib/api/hooks/useRolePermissions.ts src/lib/api/hooks/usePermissionMutation.ts src/lib/api/hooks/usePermissionMutation.test.tsx src/components/settings/PermissionMatrix.tsx src/components/settings/PermissionMatrix.test.tsx src/components/settings/settings.css "src/app/(app)/ayarlar/izin-matrisi/page.tsx"
git commit -m "feat: add permission matrix with presets and optimistic updates"
```

---

## Task 9: Erişim Kontrolü — 403 Durumu

**Amaç:** Ayarlar sayfalarındaki ilk veri fetch'i 403 dönerse sekme kabuğu içinde dostça "Bu alana yetkiniz yok" göstermek (nav gizleme yok; backend 403'e güven).

**Files:**
- Create: `src/components/settings/AccessDenied.tsx`
- Test: `src/components/settings/AccessDenied.test.tsx`
- Modify: `src/components/settings/UsersScreen.tsx`
- Modify: `src/components/settings/RolesScreen.tsx`
- Modify: `src/components/settings/PermissionMatrix.tsx`
- Modify: `src/components/settings/settings.css` (access-denied stili)

**Interfaces:**
- Consumes: `isForbidden` (`@/lib/api/unwrap`).
- Produces: `export function AccessDenied(): React.ReactElement`

- [ ] **Step 1: AccessDenied testini yaz (RED)**

`src/components/settings/AccessDenied.test.tsx` oluştur:

```tsx
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessDenied } from "./AccessDenied";
import { UsersScreen } from "./UsersScreen";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/ayarlar/kullanicilar",
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AccessDenied", () => {
  it("dostca yetki mesaji gosterir", () => {
    render(<AccessDenied />);
    expect(screen.getByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });

  it("UsersScreen ilk fetch 403 donerse AccessDenied gosterir", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "yasak" }), { status: 403 })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <UsersScreen />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Bu alana yetkiniz yok")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Testi çalıştır (RED)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/AccessDenied.test.tsx
```
Expected: FAIL (modül yok / UsersScreen 403 dallanması yok).

- [ ] **Step 3: AccessDenied bileşenini + CSS yaz**

`src/components/settings/AccessDenied.tsx` oluştur:

```tsx
export function AccessDenied() {
  return (
    <div className="settings-denied" role="status">
      <p className="settings-denied__title">Bu alana yetkiniz yok</p>
      <p className="settings-denied__note">
        Bu bölümü görüntülemek için gerekli izne sahip değilsiniz. Yetki için sistem yöneticinizle görüşün.
      </p>
    </div>
  );
}
```

`src/components/settings/settings.css` sonuna ekle:

```css
.settings-denied {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-8);
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.settings-denied__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-strong);
}

.settings-denied__note {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
```

- [ ] **Step 4: UsersScreen'e 403 dallanması ekle**

`src/components/settings/UsersScreen.tsx` içinde import satırlarına ekle (mevcut `backendErrorMessage` importunun altına):

```tsx
import { isForbidden } from "@/lib/api/unwrap";
import { AccessDenied } from "./AccessDenied";
```

Ve yükleme kontrolünden hemen sonra, jenerik hata kontrolünden önce ekle:

```tsx
  if (isForbidden(usersQuery.error)) {
    return <AccessDenied />;
  }
```

(Yani sıra: `if (usersQuery.isLoading) …` → `if (isForbidden(usersQuery.error)) return <AccessDenied />;` → `if (usersQuery.isError || !usersQuery.data) …`.)

- [ ] **Step 5: RolesScreen'e 403 dallanması ekle**

`src/components/settings/RolesScreen.tsx` import satırlarına ekle:

```tsx
import { isForbidden } from "@/lib/api/unwrap";
import { AccessDenied } from "./AccessDenied";
```

Yükleme kontrolünden sonra ekle:

```tsx
  if (isForbidden(rolesQuery.error)) {
    return <AccessDenied />;
  }
```

- [ ] **Step 6: PermissionMatrix'e 403 dallanması ekle**

`src/components/settings/PermissionMatrix.tsx` import satırlarına ekle:

```tsx
import { isForbidden } from "@/lib/api/unwrap";
import { AccessDenied } from "./AccessDenied";
```

Yükleme kontrolünden sonra, jenerik hata kontrolünden önce ekle (modül/rol/izin query'lerinden herhangi biri 403 ise):

```tsx
  const permForbidden = permQueries.some((q) => isForbidden(q.error));
  if (isForbidden(modulesQuery.error) || isForbidden(rolesQuery.error) || permForbidden) {
    return <AccessDenied />;
  }
```

- [ ] **Step 7: Test + typecheck + build (GREEN)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm vitest run src/components/settings/AccessDenied.test.tsx
pnpm typecheck
pnpm build
```
Expected: PASS, typecheck temiz, build başarılı.

- [ ] **Step 8: Commit**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add src/components/settings/AccessDenied.tsx src/components/settings/AccessDenied.test.tsx src/components/settings/UsersScreen.tsx src/components/settings/RolesScreen.tsx src/components/settings/PermissionMatrix.tsx src/components/settings/settings.css
git commit -m "feat: show access-denied state on settings 403"
```

---

## Task 10: E2E — mock-backend Genişletme + Ayarlar Akışı + Görsel

**Amaç:** Hermetik mock-backend'e F4 uçlarını eklemek; giriş → /ayarlar → sekme gezinme → kullanıcı-oluştur → matris hücre değişimi akış spec'i + görsel spec'ler. **`pnpm build`** E2E öncesi çalışır (Playwright webServer zaten `pnpm build && pnpm start`). macOS baseline commit edilmez.

**Files:**
- Modify: `e2e/mock-backend.ts`
- Create: `e2e/settings.spec.ts`
- Create: `e2e/settings-visual.spec.ts`

**Interfaces:**
- Consumes: `startMockBackend(port)` (global-setup zaten çağırır).
- Produces: mock GET/POST/PATCH/PUT/DELETE `/users`, `/roles`, `/modules`, `/projects`, `/roles/{id}/permissions`, `/roles/{id}/permissions/{module_key}`, `/users/{id}/project-access` (bellek-içi, mutasyonlar yansır).

- [ ] **Step 1: mock-backend'i F4 uçlarıyla genişlet**

`e2e/mock-backend.ts` içeriğini şu tam sürümle değiştir:

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

interface MockState {
  users: Array<{ id: string; email: string; full_name: string; title: string; role_id: string; status: string }>;
  roles: Array<{ id: string; key: string; name: string; emoji: string; description: string; is_system: boolean }>;
  modules: Array<{ id: string; key: string; name: string; group: string; sort_order: number }>;
  projects: Array<{ id: string; code: string; name: string; status: string; budget: string; progress_pct: string }>;
  permissions: Record<string, Record<string, { access_level: string; scope: string }>>;
  projectAccess: Record<string, { all_projects: boolean; project_ids: string[] }>;
}

function seedState(): MockState {
  const roles = [
    { id: "role-admin", key: "system_admin", name: "Sistem Yöneticisi", emoji: "🛡️", description: "Tam yetki", is_system: true },
    { id: "role-patron", key: "patron", name: "Patron", emoji: "👑", description: "Üst yönetim", is_system: true },
    { id: "role-saha", key: "saha", name: "Saha", emoji: "👷", description: "Saha ekibi", is_system: false },
  ];
  const modules = [
    { id: "m-gosterge", key: "gosterge", name: "Gösterge Paneli", group: "GENEL", sort_order: 1 },
    { id: "m-raporlar", key: "raporlar", name: "Raporlar", group: "GENEL", sort_order: 2 },
    { id: "m-projeler", key: "projeler", name: "Projeler", group: "GENEL", sort_order: 3 },
    { id: "m-puantaj", key: "puantaj", name: "Puantaj", group: "SAHA", sort_order: 1 },
    { id: "m-personel", key: "personel", name: "Personel", group: "SAHA", sort_order: 2 },
    { id: "m-makine", key: "makine", name: "Makine", group: "SAHA", sort_order: 3 },
    { id: "m-stok", key: "stok", name: "Stok", group: "STOK_SATINALMA", sort_order: 1 },
    { id: "m-satinalma", key: "satinalma", name: "Satınalma", group: "STOK_SATINALMA", sort_order: 2 },
    { id: "m-sozlesmeler", key: "sozlesmeler", name: "Sözleşmeler", group: "MALI", sort_order: 1 },
    { id: "m-muhasebe", key: "muhasebe", name: "Muhasebe", group: "MALI", sort_order: 2 },
    { id: "m-hazine", key: "hazine", name: "Hazine", group: "MALI", sort_order: 3 },
    { id: "m-hakedisler", key: "hakedisler", name: "Hakedişler", group: "MALI", sort_order: 4 },
    { id: "m-ayarlar", key: "ayarlar", name: "Ayarlar", group: "SISTEM", sort_order: 1 },
  ];
  const permissions: MockState["permissions"] = {
    "role-admin": Object.fromEntries(modules.map((m) => [m.key, { access_level: "admin", scope: "all" }])),
    "role-patron": Object.fromEntries(modules.map((m) => [m.key, { access_level: "full", scope: "all" }])),
    "role-saha": Object.fromEntries(modules.map((m) => [m.key, { access_level: "none", scope: "all" }])),
  };
  return {
    users: [
      { id: "u-1", email: "patron@fiil.com", full_name: "Ahmet Yılmaz", title: "Patron", role_id: "role-patron", status: "active" },
      { id: "u-2", email: "saha@fiil.com", full_name: "Mehmet Demir", title: "Şantiye Şefi", role_id: "role-saha", status: "active" },
    ],
    roles,
    modules,
    projects: [
      { id: "p-1", code: "PRJ-1", name: "Kule A", status: "active", budget: "1000000", progress_pct: "20" },
      { id: "p-2", code: "PRJ-2", name: "Villa B", status: "active", budget: "500000", progress_pct: "40" },
    ],
    permissions,
    projectAccess: {},
  };
}

// Gercek FastAPI yerine gecen minik mock — hermetik E2E icin.
export function startMockBackend(port: number): { server: Server; close: () => Promise<void> } {
  const state = seedState();

  const server = createServer((req, res) => {
    const rawUrl = req.url ?? "";
    const parsed = new URL(rawUrl, "http://mock");
    const path = parsed.pathname;
    const method = req.method ?? "GET";

    const send = (status: number, body?: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };

    // Auth uclari (Bearer gerektirmez)
    if (method === "POST" && path === "/auth/login") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}");
        if (body.password === "wrong") return send(401, { detail: "invalid" });
        return send(200, TOKEN_PAIR);
      });
      return;
    }
    if (method === "POST" && path === "/auth/refresh") return send(200, TOKEN_PAIR);

    // Bundan sonrasi Bearer gerektirir
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) return send(401, { detail: "unauthenticated" });

    if (method === "GET" && path === "/auth/me") return send(200, ME);

    // Govde okuma yardimcisi
    const withBody = (handler: (body: Record<string, unknown>) => void) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => handler(JSON.parse(raw || "{}")));
    };

    // /modules, /projects, /roles listeleri
    if (method === "GET" && path === "/modules") return send(200, state.modules);
    if (method === "GET" && path === "/projects") return send(200, state.projects);
    if (method === "GET" && path === "/roles") return send(200, state.roles);

    if (method === "POST" && path === "/roles") {
      return withBody((body) => {
        const role = {
          id: `role-${state.roles.length + 1}`,
          key: String(body.key ?? ""),
          name: String(body.name ?? ""),
          emoji: String(body.emoji ?? ""),
          description: String(body.description ?? ""),
          is_system: false,
        };
        state.roles.push(role);
        state.permissions[role.id] = Object.fromEntries(state.modules.map((m) => [m.key, { access_level: "none", scope: "all" }]));
        return send(201, role);
      });
    }

    // /roles/{id}/permissions
    const permListMatch = path.match(/^\/roles\/([^/]+)\/permissions$/);
    if (method === "GET" && permListMatch) {
      const roleId = permListMatch[1];
      const map = state.permissions[roleId] ?? {};
      const cells = Object.entries(map).map(([module_key, v]) => ({ module_key, access_level: v.access_level, scope: v.scope }));
      return send(200, cells);
    }

    // /roles/{id}/permissions/{module_key}
    const permCellMatch = path.match(/^\/roles\/([^/]+)\/permissions\/([^/]+)$/);
    if (method === "PUT" && permCellMatch) {
      const [, roleId, moduleKey] = permCellMatch;
      return withBody((body) => {
        state.permissions[roleId] = state.permissions[roleId] ?? {};
        const cell = { access_level: String(body.access_level), scope: String(body.scope) };
        state.permissions[roleId][moduleKey] = cell;
        return send(200, { module_key: moduleKey, access_level: cell.access_level, scope: cell.scope });
      });
    }

    // /roles/{id} PATCH/DELETE
    const roleIdMatch = path.match(/^\/roles\/([^/]+)$/);
    if (roleIdMatch && method === "PATCH") {
      const roleId = roleIdMatch[1];
      return withBody((body) => {
        const role = state.roles.find((r) => r.id === roleId);
        if (!role) return send(404, { detail: "rol yok" });
        role.name = String(body.name ?? role.name);
        role.emoji = String(body.emoji ?? role.emoji);
        role.description = String(body.description ?? role.description);
        return send(200, role);
      });
    }
    if (roleIdMatch && method === "DELETE") {
      const roleId = roleIdMatch[1];
      state.roles = state.roles.filter((r) => r.id !== roleId);
      return send(204);
    }

    // /users list + create
    if (method === "GET" && path === "/users") {
      const limit = Number(parsed.searchParams.get("limit") ?? "20");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const items = state.users.slice(offset, offset + limit);
      return send(200, { items, total: state.users.length, limit, offset });
    }
    if (method === "POST" && path === "/users") {
      return withBody((body) => {
        const user = {
          id: `u-${state.users.length + 1}`,
          email: String(body.email ?? ""),
          full_name: String(body.full_name ?? ""),
          title: String(body.title ?? ""),
          role_id: String(body.role_id ?? ""),
          status: String(body.status ?? "active"),
        };
        state.users.push(user);
        return send(201, user);
      });
    }

    // /users/{id}/password
    const pwMatch = path.match(/^\/users\/([^/]+)\/password$/);
    if (method === "PATCH" && pwMatch) return withBody(() => send(204));

    // /users/{id}/project-access
    const paMatch = path.match(/^\/users\/([^/]+)\/project-access$/);
    if (paMatch && method === "GET") {
      const userId = paMatch[1];
      return send(200, state.projectAccess[userId] ?? { all_projects: false, project_ids: [] });
    }
    if (paMatch && method === "PUT") {
      const userId = paMatch[1];
      return withBody((body) => {
        const access = {
          all_projects: Boolean(body.all_projects),
          project_ids: Array.isArray(body.project_ids) ? (body.project_ids as string[]) : [],
        };
        state.projectAccess[userId] = access;
        return send(200, access);
      });
    }

    // /users/{id} PATCH/DELETE
    const userIdMatch = path.match(/^\/users\/([^/]+)$/);
    if (userIdMatch && method === "PATCH") {
      const userId = userIdMatch[1];
      return withBody((body) => {
        const user = state.users.find((u) => u.id === userId);
        if (!user) return send(404, { detail: "kullanici yok" });
        if (body.full_name !== undefined) user.full_name = String(body.full_name);
        if (body.title !== undefined) user.title = String(body.title);
        if (body.role_id !== undefined) user.role_id = String(body.role_id);
        if (body.status !== undefined) user.status = String(body.status);
        return send(200, user);
      });
    }
    if (userIdMatch && method === "DELETE") {
      const userId = userIdMatch[1];
      state.users = state.users.filter((u) => u.id !== userId);
      return send(204);
    }

    return send(404, { detail: "not found" });
  });

  server.listen(port);
  return {
    server,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
```

- [ ] **Step 2: Ayarlar akış spec'ini yaz**

`e2e/settings.spec.ts` oluştur:

```ts
import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/Hoş geldiniz/)).toBeVisible();
}

test("ayarlar: sekme gezinme + kullanici olustur + matris hucre degisimi", async ({ page }) => {
  await login(page);

  // /ayarlar → kullanicilar'a yonlenir
  await page.goto("/ayarlar");
  await expect(page).toHaveURL(/\/ayarlar\/kullanicilar/);
  await expect(page.getByRole("link", { name: "Kullanıcılar" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Ahmet Yılmaz")).toBeVisible();

  // Roller sekmesi
  await page.getByRole("link", { name: "Roller" }).click();
  await expect(page).toHaveURL(/\/ayarlar\/roller/);
  await expect(page.getByText("Sistem Yöneticisi")).toBeVisible();

  // Kullanicilar'a don + yeni kullanici olustur
  await page.getByRole("link", { name: "Kullanıcılar" }).click();
  await page.getByRole("button", { name: "Yeni Kullanıcı" }).click();
  await page.getByLabel("Ad Soyad").fill("Yeni Kişi");
  await page.getByLabel("E-posta").fill("yeni@fiil.com");
  await page.getByLabel("Parola").fill("parola123");
  await page.getByLabel("Rol").selectOption({ label: "Saha" });
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText("Yeni Kişi")).toBeVisible();

  // Izin matrisi: bir hucreyi degistir (system_admin disi rol)
  await page.getByRole("link", { name: "İzin Matrisi" }).click();
  await expect(page.getByText("Genel")).toBeVisible();
  const cell = page.getByLabel("Raporlar — Saha");
  await cell.selectOption({ label: "Tam" });
  await expect(cell).toHaveValue("full");
});
```

- [ ] **Step 3: Görsel spec'i yaz**

`e2e/settings-visual.spec.ts` oluştur:

```ts
import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/e-posta/i).fill("patron@fiil.com");
  await page.getByLabel(/^şifre$/i).fill("dogruparola");
  await page.getByRole("button", { name: /giriş yap/i }).click();
  await expect(page.getByText(/Hoş geldiniz/)).toBeVisible();
}

test("gorsel: ayarlar kullanicilar", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/kullanicilar");
  await expect(page.getByText("Ahmet Yılmaz")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-kullanicilar.png", { fullPage: true });
});

test("gorsel: ayarlar roller", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/roller");
  await expect(page.getByText("Sistem Yöneticisi")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-roller.png", { fullPage: true });
});

test("gorsel: ayarlar izin matrisi", async ({ page }) => {
  await login(page);
  await page.goto("/ayarlar/izin-matrisi");
  await expect(page.getByText("Genel")).toBeVisible();
  await expect(page).toHaveScreenshot("ayarlar-izin-matrisi.png", { fullPage: true });
});
```

- [ ] **Step 4: Build + akış E2E'yi çalıştır (görsel baseline hariç)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm build
pnpm test:visual e2e/settings.spec.ts
```
Expected: akış spec'i PASS. (Görsel spec'i lokalde macOS baseline üretir — **commit edilmez**; Linux baseline Task 11'de CI ile üretilir.)

- [ ] **Step 5: Commit (görsel PNG'ler hariç)**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
# macOS gorsel snapshot klasorlerini commit'e ALMA
git add e2e/mock-backend.ts e2e/settings.spec.ts e2e/settings-visual.spec.ts
git status --short   # e2e/settings-visual.spec.ts-snapshots/ VARSA eklenmedigini dogrula
git commit -m "test: add settings e2e flow and visual specs with mock backend"
```

> Not: `e2e/settings-visual.spec.ts-snapshots/` dizini lokalde oluşursa `git add` ile EKLENMEZ (yukarıdaki add yalnız spec dosyalarını kapsar). İstenirse `.gitignore`'a eklenebilir; Linux baseline Task 11'de CI `visual-baselines.yml` (workflow_dispatch) ile üretilip commit edilir.

---

## Task 11: Faz Kapanışı — Kapılar + Review + Defter + Canlı Doğrulama

**Amaç:** F4'ü kapatmadan önce tüm kapıların yeşil olduğunu doğrulamak; bütünsel dal review'u; CI görsel baseline üretimi; hafıza/defter güncellemesi; canlı doğrulama. Bu, controller'ın kapanış kontrol listesidir.

**Files:** (yalnız hafıza/defter dosyaları — kod değişikliği bu task'ta yok)
- Modify: `/Users/furkanilgen/.claude/projects/-Users-furkanilgen-Documents-Projeler-insaat/memory/MEMORY.md` (+ yeni not dosyası)

- [ ] **Step 1: Tüm yerel kapıları çalıştır**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
Expected: dördü de hatasız (lint temiz, tip yok, tüm Vitest yeşil, build başarılı).

- [ ] **Step 2: Ayarlar akış E2E'sini son kez çalıştır**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
pnpm test:visual e2e/settings.spec.ts e2e/auth.spec.ts
```
Expected: akış + mevcut auth E2E yeşil (regresyon yok).

- [ ] **Step 3: Bütünsel dal review'u**

F4 boyunca değişen tüm dosyaların diff'ini gözden geçir; `code-reviewer`/`typescript-reviewer`/`react-reviewer` ajanlarını kullan. CRITICAL/HIGH bulguları düzelt, sonra kapıları (Step 1) yeniden koştur.

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git log --oneline -12
git diff --stat main~11..HEAD   # F4 kapsamini gozden gecir
```
Expected: yalnız F4 dosyaları; sızıntı yok, çıplak hex yok (`grep -rnE "#[0-9a-fA-F]{3,6}" src/components/settings src/app/\(app\)/ayarlar` yalnız yorum/token adı içerir — inline hex OLMAMALI).

- [ ] **Step 4: Push + CI (build + visual) yeşilini bekle**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git push origin main
```
Ardından: GitHub Actions'ta `visual-baselines.yml` workflow_dispatch'i tetikleyerek **Linux** görsel baseline'larını üret (`ayarlar-kullanicilar.png`, `ayarlar-roller.png`, `ayarlar-izin-matrisi.png`) ve baseline commit'ini oluştur. Build + visual CI job'larının YEŞİL olduğunu doğrula.

- [ ] **Step 5: Canlı doğrulama**

Railway auto-deploy sonrası canlı frontend'te giriş yap → `/ayarlar` → üç sekmede de veri gelir (backend B3 canlı). `BACKEND_URL` env'inin ayarlı olduğunu doğrula (F2 dersi). system_admin dışı hesapla 403 → "Bu alana yetkiniz yok" görünür.

- [ ] **Step 6: Hafıza/defter güncelle**

`/Users/furkanilgen/.claude/projects/-Users-furkanilgen-Documents-Projeler-insaat/memory/MEMORY.md` içine yeni bir satır ekle (mevcut liste biçimini izle):

```markdown
- [Frontend F4 Ayarlar](frontend-f4-ayarlar.md) — /ayarlar (Kullanicilar/Roller/Izin-Matrisi) BITTI+CANLI: genel BFF catch-all proxy + TanStack Query + 12 preset izin matrisi (optimistic PUT) + 403 access-denied; mock-backend genisletildi, CI build+visual yesil.
```

Ve `memory/frontend-f4-ayarlar.md` not dosyasını oluştur: kapsam (11 task), anahtar kararlar (backendClient `/api/backend`, proxyAuthenticated method/body/query, `matchPreset`/`presetToUpdate`, system_admin salt-okunur), bilinen limitler ve sıradaki faz (F5 modül ekranları).

- [ ] **Step 7: Kapanış commit'i**

```bash
cd /Users/furkanilgen/Documents/Projeler/insaat/frontend
git add -A
git commit -m "docs: close F4 settings phase with ledger and memory notes" || echo "kod diff'i yoksa memory dosyalari repo disinda — commit atlanabilir"
```

---

## Self-Review (writing-plans)

**1. Spec coverage** — spec bölümü → task eşlemesi:
- §1 Rotalama & sekme kabuğu → Task 4 (layout + redirect + isActive ortaklaştırma).
- §2 BFF genel proxy + proxyAuthenticated genişletme + allow-list → Task 2.
- §3 TanStack Query + hook'lar → Task 3 (provider) + hook'lar Task 5/6/7/8'e dağıtıldı (kaynak başına dosya).
- §4.1 Kullanıcılar (liste/sayfalama/oluştur/düzenle/parola/sil/proje-erişim/doğrulama) → Task 5 + Task 6.
- §4.2 Roller (liste/oluştur/adlandır/sil/is_system kilidi) → Task 7.
- §4.3 İzin Matrisi (gruplu tablo/preset dropdown/optimistic PUT/preset util/system_admin salt-okunur) → Task 8.
- §5 Erişim kontrolü (403 → "Bu alana yetkiniz yok") → Task 9.
- §7 Test (unit + E2E + görsel) → her task'ta unit + Task 10 E2E/görsel.
- §8 Dosya haritası → task Files bloklarıyla birebir.
- §9 Task dilimlemesi (11) → Task 1–11.
- §10 Backend kontrat → Task 1 tip doğrulama + `models.ts` (Task 3) + presetler (Task 8). gen:api snapshot → Task 1.

**2. Placeholder scan** — "TODO"/"benzer"/"error handling ekle" kalıbı yok; her adımda tam kod var. Önceden belirsiz olan iki primitive repoda doğrulandı ve plana işlendi: `Badge` varyantları `neutral|primary|success|warning|danger` (Task 5, `statusVariant` uyumlu); `Toggle`/`Checkbox` native checkbox (`checked`/`onChange`) + `label` prop'u (Task 6) — `Toggle`'ın iç içe label sorunu ProjectAccessModal'da `label` prop'una geçilerek giderildi.

**3. Type consistency** — hook/tip adları task'lar arası tutarlı: `backendClient`/`unwrap`/`BackendError`/`isForbidden` (Task 3) → tüm hook'lar; `USERS_QUERY_KEY`/`ROLES_QUERY_KEY`/`MODULES_QUERY_KEY`/`PROJECTS_QUERY_KEY`/`ROLE_PERMISSIONS_QUERY_KEY` sabitleri tanımlandıkları yerde export edilip mutasyonlarda invalidate için tüketiliyor. `matchPreset`/`presetToUpdate`/`PRESETS`/`PresetKey` (Task 8) matris ve testlerinde aynı imzayla kullanılıyor. `proxyAuthenticated(access, refresh, path, options?)` genişletilmiş imzası hem me/route (options'sız) hem catch-all (options'lı) tarafından uyumlu çağrılıyor. `models.ts` tüm şema tiplerinin tek kaynağı.

**Düzeltmeler (inline yapıldı):** (a) PermissionMatrix'te grup+modül satırları başta anahtarsız `<>` fragment'iyle map'leniyordu → `<Fragment key={section.group}>`'a çevrildi (React key uyarısı giderildi). (b) ProjectAccessModal'da `Toggle` başka bir `<label>` içine sarılıyordu (iç içe label — geçersiz HTML) → `<div>` + `Toggle label="Tüm projeler"` ile düzeltildi. Diğer bulgu yok.
