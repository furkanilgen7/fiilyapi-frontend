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

  it("path-traversal segmenti (..) — 404 doner, backend cagrilmaz", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(
      req("/api/backend/users/../roles", "GET", { [ACCESS_COOKIE]: "acc" }),
      ctx(["users", "..", "roles"]),
    );
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

  it("audit-log izinli kok — filtreler query olarak iletilir", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0, limit: 50, offset: 0 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(
      req("/api/backend/audit-log?action=login&limit=50", "GET", { [ACCESS_COOKIE]: "acc" }),
      ctx(["audit-log"]),
    );
    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/audit-log?action=login&limit=50");
  });

  it(".xlsx — ikili govde ve indirme basliklari aynen gecirilir", async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(bytes, {
          status: 200,
          headers: {
            "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "content-disposition": 'attachment; filename="denetim-gunlugu.xlsx"',
          },
        }),
      ),
    );
    const res = await GET(
      req("/api/backend/audit-log/export.xlsx?action=delete", "GET", { [ACCESS_COOKIE]: "acc" }),
      ctx(["audit-log", "export.xlsx"]),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="denetim-gunlugu.xlsx"');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
  });

  it(".xlsx 403 — govde sizmadan forbidden doner", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "gizli" }), { status: 403 }),
    ));
    const res = await GET(
      req("/api/backend/audit-log/export.xlsx", "GET", { [ACCESS_COOKIE]: "acc" }),
      ctx(["audit-log", "export.xlsx"]),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("forbidden");
    expect(JSON.stringify(body)).not.toContain("gizli");
  });

  it(".xlsx 401 — cookie temizler", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const res = await GET(
      req("/api/backend/audit-log/export.xlsx", "GET", {}),
      ctx(["audit-log", "export.xlsx"]),
    );
    expect(res.status).toBe(401);
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
