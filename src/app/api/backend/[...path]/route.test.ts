import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

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

  it("dashboard izinli kok — ozet ucu backend'e iletilir", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ role_name: "Patron" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await GET(
      req("/api/backend/dashboard/summary", "GET", { [ACCESS_COOKIE]: "acc" }),
      ctx(["dashboard", "summary"]),
    );
    expect(res.status).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/dashboard/summary");
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

  // F9 · spec §8.1 (T4): `status >= 400` ARTIK her zaman JSON dalina gider —
  // eski davranis 403/409/422 Turkce govdelerini `{code:"forbidden"}` ile
  // degistirip kaybediyordu. 5xx sizdirmama kurali degismedi (asagida).
  it(".xlsx 403 — Turkce hata govdesi aynen gecer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Bu işlem için yetkiniz yok" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    ));
    const res = await GET(
      req("/api/backend/audit-log/export.xlsx", "GET", { [ACCESS_COOKIE]: "acc" }),
      ctx(["audit-log", "export.xlsx"]),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).detail).toBe("Bu işlem için yetkiniz yok");
  });

  it(".xlsx 500 — ham govde hala sizmaz", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "boom" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    ));
    const res = await GET(
      req("/api/backend/audit-log/export.xlsx", "GET", { [ACCESS_COOKIE]: "acc" }),
      ctx(["audit-log", "export.xlsx"]),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("unavailable");
    expect(JSON.stringify(body)).not.toContain("boom");
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

  // ─────────────────────────────────────────────────────────────────────────
  // F9 · spec §8.1 regresyon tablosu (ALTI SATIRIN TAMAMI kabul kriteridir).
  // Ikili/JSON karari `Content-Type`'tan verilir; `.xlsx` uzantisi YEDEK kural
  // olarak kalir; `status >= 400` HER ZAMAN JSON dalina gider.
  // ─────────────────────────────────────────────────────────────────────────
  describe("ikili indirme — Content-Type tabanli karar (spec §8.1)", () => {
    const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00]);

    function binaryBackendResponse(headers: Record<string, string>): Response {
      return new Response(BYTES, { status: 200, headers });
    }

    // 1) ASIL REGRESYON KAPISI: uzantisiz export ucu (son segment "export").
    it("uzantisiz export ikili gecer: sites/{id}/boq/export bayt bayt ayni doner", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          binaryBackendResponse({
            "content-type": XLSX_TYPE,
            "content-disposition": 'attachment; filename="is-kalemleri-STE-01.xlsx"',
          }),
        ),
      );
      const res = await GET(
        req("/api/backend/sites/s1/boq/export", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["sites", "s1", "boq", "export"]),
      );
      expect(res.status).toBe(200);
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
    });

    // 2) Indirme basliklari korunur (aksi halde tarayici dosyayi adlandiramaz).
    it("content-type ve content-disposition basliklari korunur", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          binaryBackendResponse({
            "content-type": XLSX_TYPE,
            "content-disposition": 'attachment; filename="is-kalemleri-STE-01.xlsx"',
          }),
        ),
      );
      const res = await GET(
        req("/api/backend/sites/s1/boq/export", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["sites", "s1", "boq", "export"]),
      );
      expect(res.headers.get("content-type")).toBe(XLSX_TYPE);
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="is-kalemleri-STE-01.xlsx"',
      );
      expect(res.headers.get("cache-control")).toBe("no-store");
    });

    // 3) Mevcut davranis korunur — denetim gunlugu indirmesi kirilmaz.
    it("uzantili export hala ikili: audit-log/export.xlsx", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(binaryBackendResponse({ "content-type": XLSX_TYPE })),
      );
      const res = await GET(
        req("/api/backend/audit-log/export.xlsx", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["audit-log", "export.xlsx"]),
      );
      expect(res.status).toBe(200);
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
    });

    // 4) `.xlsx` deseni SILINMEZ: Content-Type yoksa yedek kural devreye girer.
    it("Content-Type yokken uzanti yedegi devreye girer", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(BYTES, { status: 200 })));
      const res = await GET(
        req("/api/backend/audit-log/export.xlsx", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["audit-log", "export.xlsx"]),
      );
      expect(res.status).toBe(200);
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
    });

    // 5) JSON regresyonu: TUM okuma trafigi bu daldan geciyor.
    it("JSON regresyonu: sites/{id}/boq application/json ile JSON dalina gider", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ groups: [], totals: { grand_total: "0.00" } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        ),
      );
      const res = await GET(
        req("/api/backend/sites/s1/boq", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["sites", "s1", "boq"]),
      );
      expect(res.status).toBe(200);
      expect((await res.json()).totals.grand_total).toBe("0.00");
    });

    // 6) Hata govdesi korunur: `status >= 400` ikili SAYILMAZ (T4).
    it("hata govdesi korunur: 403 + application/json Turkce govde aynen gecer", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ detail: "Bu şantiyeye erişim yetkiniz yok." }), {
            status: 403,
            headers: { "content-type": "application/json" },
          }),
        ),
      );
      const res = await GET(
        req("/api/backend/sites/s1/boq/export", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["sites", "s1", "boq", "export"]),
      );
      expect(res.status).toBe(403);
      expect((await res.json()).detail).toBe("Bu şantiyeye erişim yetkiniz yok.");
    });

    // 6b) Ikili Content-Type tasiyan hata yaniti bile JSON dalindan gecer —
    // kural `Content-Type` degil STATUS tabanlidir.
    it("403 ikili content-type ile gelse bile ikili sayilmaz", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ detail: "yasak" }), {
            status: 403,
            headers: { "content-type": XLSX_TYPE },
          }),
        ),
      );
      const res = await GET(
        req("/api/backend/sites/s1/boq/export", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["sites", "s1", "boq", "export"]),
      );
      expect(res.status).toBe(403);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect((await res.json()).detail).toBe("yasak");
    });

    // 7) 401 + refresh davranisi DEGISMEDI.
    it("401 + refresh davranisi degismedi: yeni access ile retry ve cerez tazelenir", async () => {
      const jwt = `h.${Buffer.from(JSON.stringify({ exp: 9999999999 })).toString("base64url")}.s`;
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("{}", { status: 401 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: jwt, refresh_token: jwt }), { status: 200 }),
        )
        .mockResolvedValueOnce(binaryBackendResponse({ "content-type": XLSX_TYPE }));
      vi.stubGlobal("fetch", fetchMock);
      const res = await GET(
        req("/api/backend/sites/s1/boq/export", "GET", {
          [ACCESS_COOKIE]: "old",
          [REFRESH_COOKIE]: "ref",
        }),
        ctx(["sites", "s1", "boq", "export"]),
      );
      expect(res.status).toBe(200);
      expect(res.cookies.get(ACCESS_COOKIE)?.value).toBe(jwt);
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(BYTES);
    });

    it("401 + refresh yoksa cerez temizlenir (mevcut davranis)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
      const res = await GET(
        req("/api/backend/sites/s1/boq/export", "GET", {}),
        ctx(["sites", "s1", "boq", "export"]),
      );
      expect(res.status).toBe(401);
      expect(res.cookies.get(ACCESS_COOKIE)?.maxAge).toBe(0);
    });

    it("204 yaniti bos govdeyle gecer (JSON dali)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
      const res = await GET(
        req("/api/backend/sites/s1/boq", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["sites", "s1", "boq"]),
      );
      expect(res.status).toBe(204);
    });

    it("backend erisilemezse 502 doner", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
      const res = await GET(
        req("/api/backend/sites/s1/boq/export", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["sites", "s1", "boq", "export"]),
      );
      expect(res.status).toBe(502);
    });
  });

  // Regresyon korkulugu: uygulama katmani yeni bir backend koku cagirdiginda
  // (or. Santiye Detay'in "/sites/{site_id}" ucu) BFF allow-list'i guncellenmezse
  // ekran sessizce 404 alir ve yalniz gorsel/e2e testte patlar. Bu test istemci
  // kaynagindan cagrilan tum kokleri cikarip her birinin forward edildigini dogrular.
  describe("allow-list, istemcinin cagirdigi tum kokleri kapsar", () => {
    const apiSourceDir = resolve(process.cwd(), "src/lib/api");

    function collectSourceFiles(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return collectSourceFiles(full);
        if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) return [];
        return [full];
      });
    }

    const calledRoots = [
      ...new Set(
        collectSourceFiles(apiSourceDir)
          .flatMap((file) => [
            ...readFileSync(file, "utf8").matchAll(/backendClient\.[A-Z]+\(\s*"\/([a-z0-9-]+)/g),
          ])
          .map((match) => match[1]),
      ),
    ].sort();

    it("istemci kaynagindan en az bir kok cikarilabilir", () => {
      expect(calledRoots.length).toBeGreaterThan(0);
    });

    it.each(calledRoots)("%s koku forward edilir", async (root) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      const res = await GET(
        req(`/api/backend/${root}`, "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx([root]),
      );
      expect(res.status).toBe(200);
      expect(String(fetchMock.mock.calls[0][0])).toContain(`/${root}`);
    });
  });
});
