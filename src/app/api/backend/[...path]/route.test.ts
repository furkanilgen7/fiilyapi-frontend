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

/**
 * Ham gövdeli istek (multipart) — `req()` gövdeyi JSON'a çevirdiği için
 * belge yükleme akışı onunla temsil EDILEMEZ.
 */
function rawReq(
  url: string,
  method: string,
  contentType: string,
  body: string,
  cookies: Record<string, string>,
): NextRequest {
  const r = new NextRequest("http://localhost:3000" + url, {
    method,
    body,
    headers: { "content-type": contentType },
  });
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
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

    // 2b) F-BC CANLI SMOKE BULGUSU: ikili dal basliklari SIFIRDAN kurdugu icin
    // backend'in `X-Content-Type-Options: nosniff`i DUSUYORDU. Belge arsivinde
    // icerik KULLANICIDAN geldigi icin bu, depolanmis-XSS savunmasinin ikinci
    // katmanidir (birincisi: `mime_type` uzantidan turetilir).
    it("ikili indirmede nosniff basligi HER ZAMAN basilir", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          binaryBackendResponse({
            "content-type": "application/pdf",
            "content-disposition": 'attachment; filename="SMOKE_Belge.pdf"',
          }),
        ),
      );
      const res = await GET(
        req("/api/backend/documents/d1/download", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["documents", "d1", "download"]),
      );
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("content-disposition")).toBe(
        'attachment; filename="SMOKE_Belge.pdf"',
      );
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

  // ─────────────────────────────────────────────────────────────────────────
  // F-BC · T1 — Belge Arşivi: multipart yükleme + ikili indirme.
  // Iki uc de bu depoda ILK KEZ acilir: `POST /documents` GET DISI ilk ham
  // (JSON olmayan) govdedir, `GET /documents/{id}/download` ise uzantisiz VE
  // icerik tipi ONCEDEN BILINMEYEN ilk indirmedir.
  // ─────────────────────────────────────────────────────────────────────────
  describe("belge yükleme/indirme (F-BC spec §3)", () => {
    const BOUNDARY = "----fiilBelgeSinir123";
    const MULTIPART_TYPE = `multipart/form-data; boundary=${BOUNDARY}`;
    const MULTIPART_BODY = [
      `--${BOUNDARY}`,
      'Content-Disposition: form-data; name="project_id"',
      "",
      "p-1",
      `--${BOUNDARY}`,
      'Content-Disposition: form-data; name="file"; filename="sozlesme.pdf"',
      "Content-Type: application/pdf",
      "",
      "%PDF-1.4 sahte icerik",
      `--${BOUNDARY}--`,
      "",
    ].join("\r\n");

    function lastFetchInit(fetchMock: ReturnType<typeof vi.fn>): RequestInit {
      return fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1] as RequestInit;
    }

    /**
     * ASIL KAPI: multipart gövde backend'e OLDUĞU GİBİ gitmeli. Eski yol
     * `request.json()` okuyup gövdeyi `JSON.stringify` ile yeniden kodluyordu;
     * o yolda gövde `undefined`a düşer, boundary kaybolur ve backend her
     * yüklemeye 422 döner. jsdom testleri bunu GÖRMEZ, yalnız canlıda çıkar.
     */
    it("POST /documents — multipart gövde bayt bayt aynen geçer, boundary korunur", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "doc-1", filename: "sozlesme.pdf" }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      // Act
      const res = await POST(
        rawReq("/api/backend/documents", "POST", MULTIPART_TYPE, MULTIPART_BODY, {
          [ACCESS_COOKIE]: "acc",
        }),
        ctx(["documents"]),
      );

      // Assert
      expect(res.status).toBe(201);
      expect((await res.json()).id).toBe("doc-1");
      const init = lastFetchInit(fetchMock);
      const headers = init.headers as Record<string, string>;
      expect(headers["content-type"]).toBe(MULTIPART_TYPE);
      expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(MULTIPART_BODY);
    });

    it("POST /documents — 413 Türkçe gövdesi görünür kalır", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Dosya boyutu sınırı aşıldı." }), {
          status: 413,
          headers: { "content-type": "application/json" },
        }),
      ));
      const res = await POST(
        rawReq("/api/backend/documents", "POST", MULTIPART_TYPE, MULTIPART_BODY, {
          [ACCESS_COOKIE]: "acc",
        }),
        ctx(["documents"]),
      );
      expect(res.status).toBe(413);
      expect((await res.json()).detail).toBe("Dosya boyutu sınırı aşıldı.");
    });

    it("POST /projects/{id}/document-folders — JSON gövde yolu bozulmadı", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "df-9", name: "Sözleşmeler" }), { status: 201 }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const res = await POST(
        req("/api/backend/projects/p-1/document-folders", "POST", { [ACCESS_COOKIE]: "acc" }, {
          name: "Sözleşmeler",
        }),
        ctx(["projects", "p-1", "document-folders"]),
      );
      expect(res.status).toBe(201);
      const init = lastFetchInit(fetchMock);
      expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
      expect(init.body).toBe(JSON.stringify({ name: "Sözleşmeler" }));
    });

    it("indirme — PDF baytları ve Content-Disposition aynen geçer", async () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        new Response(bytes, {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "content-disposition": 'attachment; filename="sozlesme.pdf"',
          },
        }),
      ));
      const res = await GET(
        req("/api/backend/documents/doc-1/download", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["documents", "doc-1", "download"]),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("content-disposition")).toBe('attachment; filename="sozlesme.pdf"');
      expect(new Uint8Array(await res.arrayBuffer())).toEqual(bytes);
    });

    /**
     * TUZAK: indirilen belgenin içerik tipi KULLANICI dosyasından gelir; bir
     * `.txt`/`.csv`/`.json` belgesi `text/*` veya `application/json` taşır.
     * Genel `Content-Type` kuralı bunları METİN sayıp JSON dalına düşürür ve
     * `decodeJson` çözemediği gövde için `null` basar — dosya hiç inmez.
     * İndirme ucunda karar SEGMENTten verilir.
     */
    it.each([
      ["text/plain; charset=utf-8", "ölçüm notları\r\nsatır 2"],
      ["application/json", '{"a": 1}'],
    ])("indirme — metin içerik tipli belge (%s) de ikili dal ile geçer", async (type, content) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        new Response(content, {
          status: 200,
          headers: {
            "content-type": type,
            "content-disposition": 'attachment; filename="notlar.txt"',
          },
        }),
      ));
      const res = await GET(
        req("/api/backend/documents/doc-2/download", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["documents", "doc-2", "download"]),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe(type);
      expect(res.headers.get("content-disposition")).toBe('attachment; filename="notlar.txt"');
      expect(await res.text()).toBe(content);
    });

    // F-TH tuzağı: `status >= 400` HER ZAMAN JSON dalı — indirme ucu istisna değil.
    it("indirme — 403 Türkçe gövdesi ikili sayılmaz", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Bu belgeye erişim yetkiniz yok." }), {
          status: 403,
          headers: { "content-type": "application/pdf" },
        }),
      ));
      const res = await GET(
        req("/api/backend/documents/doc-3/download", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["documents", "doc-3", "download"]),
      );
      expect(res.status).toBe(403);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect((await res.json()).detail).toBe("Bu belgeye erişim yetkiniz yok.");
    });

    it("indirme — 404 gövdesi JSON dalından geçer", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Belge bulunamadı." }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ));
      const res = await GET(
        req("/api/backend/documents/yok/download", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["documents", "yok", "download"]),
      );
      expect(res.status).toBe(404);
      expect((await res.json()).detail).toBe("Belge bulunamadı.");
    });

    it("GET /documents — kapsam süzgeçleri query olarak iletilir", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ documents: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const res = await GET(
        req("/api/backend/documents?project_id=p-1&site_id=s-1&q=ruhsat", "GET", {
          [ACCESS_COOKIE]: "acc",
        }),
        ctx(["documents"]),
      );
      expect(res.status).toBe(200);
      const url = String(fetchMock.mock.calls[0][0]);
      expect(url).toContain("project_id=p-1");
      expect(url).toContain("site_id=s-1");
      expect(url).toContain("q=ruhsat");
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

    // Santiye formunun (T5–T12) uc bagimliligi: proje bilgi kutusu, gonderim
    // ucu ve kisi seciciler. Dinamik tarama bunlari zaten yakalar; bu ADLI
    // kapi, koklerden biri sessizce dusurulurse gerekcesini de birlikte kirar.
    it.each(["projects", "sites", "users"])(
      "%s koku santiye formu icin allow-list'te tanimlidir",
      (root) => {
        const source = readFileSync(
          resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
          "utf8",
        );
        const allowList = source.slice(
          source.indexOf("const ALLOWED_ROOTS"),
          source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
        );
        expect(allowList).toContain(`"${root}"`);
      },
    );

    // P7 · T1 — hakediş ekranlari icin yeni eklenen iki kok ADLI olarak da
    // kapiya baglanir: dinamik tarama zaten yakalar, ama bu test kokler
    // sessizce dusurulurse gerekcesini de birlikte kirar.
    it.each(["progress-payments", "contracts"])(
      "%s koku hakediş ekranlari icin allow-list'te tanimlidir",
      (root) => {
        const source = readFileSync(
          resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
          "utf8",
        );
        const allowList = source.slice(
          source.indexOf("const ALLOWED_ROOTS"),
          source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
        );
        expect(allowList).toContain(`"${root}"`);
      },
    );

    // P6 · T1 — Bölüm Detay ekraninin GET/PATCH ucu ("sites" DEGIL, kendi
    // koku "sections" uzerinden gecer) ADLI olarak da kapiya baglanir.
    it.each(["sections"])(
      "%s koku bolum detay ekrani icin allow-list'te tanimlidir",
      (root) => {
        const source = readFileSync(
          resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
          "utf8",
        );
        const allowList = source.slice(
          source.indexOf("const ALLOWED_ROOTS"),
          source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
        );
        expect(allowList).toContain(`"${root}"`);
      },
    );

    // F-TH · T1 — Taşeron Hakedişi ekranlarının üç yeni kökü ADLI olarak da
    // kapiya baglanir: dinamik tarama zaten yakalar, ama bu test kokler
    // sessizce dusurulurse gerekcesini de birlikte kirar.
    it.each(["subcontractor-progress-payments", "subcontractor-contracts", "subcontractors"])(
      "%s koku tasaron hakedisi ekranlari icin allow-list'te tanimlidir",
      (root) => {
        const source = readFileSync(
          resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
          "utf8",
        );
        const allowList = source.slice(
          source.indexOf("const ALLOWED_ROOTS"),
          source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
        );
        expect(allowList).toContain(`"${root}"`);
      },
    );

    // F-SD · T1 — Şantiye Günlüğü kaydinin detay/lines/submit/reopen uclari
    // ("sites" DEGIL, kendi koku "diary" uzerinden gecer) ADLI olarak da
    // kapiya baglanir. Liste/olusturma/ozet ("/sites/{site_id}/diary*") ve
    // gomulu planlama blogu ("/sites/{site_id}/plan/day-summary") "sites"
    // kokunden gectigi icin o da birlikte dogrulanir.
    it.each(["diary", "sites"])(
      "%s koku santiye gunlugu ekrani icin allow-list'te tanimlidir",
      (root) => {
        const source = readFileSync(
          resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
          "utf8",
        );
        const allowList = source.slice(
          source.indexOf("const ALLOWED_ROOTS"),
          source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
        );
        expect(allowList).toContain(`"${root}"`);
      },
    );

    // F-PL · T1 — Planlama ekraninin TUM uclari ("/sites/{id}/plan",
    // ".../plan/rows|cells|goals|sprint") ilk segmenti "sites" oldugu icin
    // MEVCUT kokten gecer; YENI kok gerekmez. Bu test o gerekceyi kapiya
    // baglar: "sites" koku sessizce dusurulurse (ya da plan uclari kendi
    // kokune tasinirsa) planlama ekrani canlida tamamen 404 olur, jsdom
    // testleri bunu GORMEZ.
    it.each([
      "/sites/{site_id}/plan",
      "/sites/{site_id}/plan/rows",
      "/sites/{site_id}/plan/cells",
      "/sites/{site_id}/plan/goals",
      "/sites/{site_id}/plan/sprint",
    ])("%s ucu allow-list'teki 'sites' kokunden gecer", (endpoint) => {
      const root = endpoint.split("/")[1];
      expect(root).toBe("sites");
      const source = readFileSync(
        resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
        "utf8",
      );
      const allowList = source.slice(
        source.indexOf("const ALLOWED_ROOTS"),
        source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
      );
      expect(allowList).toContain(`"${root}"`);
    });

    // F-PT · T1 — Puantaj dilimi TEK yeni kok ekler: `personnel`. Matrisin
    // kendi uclari ("/sites/{id}/timesheet", ".../timesheet/export.xlsx")
    // ilk segmenti "sites" oldugu icin MEVCUT kokten gecer; "timesheet" diye
    // AYRI bir kok EKLENMEZ (yanlis kok eklemek allow-list yuzeyini bosuna
    // genisletir). Eksik `personnel` koku YALNIZ CANLIDA 404 verir — jsdom
    // testleri bunu GORMEZ.
    it.each(["personnel", "sites"])(
      "%s koku puantaj ekranlari icin allow-list'te tanimlidir",
      (root) => {
        const source = readFileSync(
          resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
          "utf8",
        );
        const allowList = source.slice(
          source.indexOf("const ALLOWED_ROOTS"),
          source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
        );
        expect(allowList).toContain(`"${root}"`);
      },
    );

    it.each([
      "/sites/{site_id}/timesheet",
      "/sites/{site_id}/timesheet/export.xlsx",
    ])("%s ucu allow-list'teki 'sites' kokunden gecer", (endpoint) => {
      const root = endpoint.split("/")[1];
      expect(root).toBe("sites");
      const source = readFileSync(
        resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
        "utf8",
      );
      const allowList = source.slice(
        source.indexOf("const ALLOWED_ROOTS"),
        source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
      );
      expect(allowList).toContain(`"${root}"`);
      // "timesheet" AYRI bir kok DEGILDIR — yanlis kok eklemek ihlaldir.
      // Yorum metni degil, GERCEK girdiler okunur (satir basindaki tirnakli ad).
      const entries = [...allowList.matchAll(/^\s*"([a-z0-9-]+)",/gm)].map((m) => m[1]);
      expect(entries).toContain(root);
      expect(entries).not.toContain("timesheet");
    });

    it("personnel koku forward edilir; uydurma 'timesheet' koku 404 alir", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [], total: 0, limit: 50, offset: 0 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      // Act
      const forwarded = await GET(
        req("/api/backend/personnel?limit=200", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["personnel"]),
      );
      const rejected = await GET(
        req("/api/backend/timesheet", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["timesheet"]),
      );

      // Assert
      expect(forwarded.status).toBe(200);
      expect(String(fetchMock.mock.calls[0][0])).toContain("/personnel?limit=200");
      expect(rejected.status).toBe(404);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // F-BC · T1 — Belge Arşivi IKI yeni kok ekler ve ikisi de ADLI kapiya
    // baglanir:
    //   · `documents`        → POST/GET /documents, /documents/{id}[/download]
    //   · `document-folders` → PATCH/DELETE /document-folders/{id}
    // Klasor LISTELEME/OLUSTURMA (`/projects/{id}/document-folders`) MEVCUT
    // "projects" kokunden gecer. `document-folders` koku bu dilimde UI'dan
    // cagrilmadigi icin (rename/sil BASILMAZ, spec §4) dinamik tarama onu
    // GORMEZ — kok yalnizca bu adli test sayesinde kapiya bagli kalir.
    it.each(["documents", "document-folders", "projects"])(
      "%s koku belge arsivi ekranlari icin allow-list'te tanimlidir",
      (root) => {
        const source = readFileSync(
          resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
          "utf8",
        );
        const allowList = source.slice(
          source.indexOf("const ALLOWED_ROOTS"),
          source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
        );
        const entries = [...allowList.matchAll(/^\s*"([a-z0-9-]+)",/gm)].map((m) => m[1]);
        expect(entries).toContain(root);
      },
    );

    it.each(["documents", "document-folders"])("%s koku forward edilir", async (root) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const res = await GET(
        req(`/api/backend/${root}/x`, "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx([root, "x"]),
      );
      expect(res.status).toBe(200);
      expect(String(fetchMock.mock.calls[0][0])).toContain(`/${root}/x`);
    });

    // F-ST · T1 — Stok & Depo dilimi IKI yeni kok ekler ve ikisi de AYRI ADLI
    // kapiya baglanir (dilimin en buyuk tuzagi — grep'siz "zaten var" varsayimi
    // canlida 404 uretir):
    //   · `stock`      → GET/POST /stock/items, PATCH /stock/items/{id},
    //                    POST/GET /stock/entries, GET /stock/summary
    //   · `warehouses` → GET/POST /warehouses, PATCH/DELETE /warehouses/{id}
    // SANTIYE stok ucu (`/sites/{site_id}/stock`) ilk segmenti "sites" oldugu
    // icin MEVCUT kokten gecer; ayri bir kok EKLENMEZ (asagidaki test).
    it("stock koku stok ekranlari icin allow-list'te tanimlidir", () => {
      const source = readFileSync(
        resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
        "utf8",
      );
      const allowList = source.slice(
        source.indexOf("const ALLOWED_ROOTS"),
        source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
      );
      // Yorum metni DEGIL, gercek girdiler okunur (satir basindaki tirnakli ad).
      const entries = [...allowList.matchAll(/^\s*"([a-z0-9-]+)",/gm)].map((m) => m[1]);
      expect(entries).toContain("stock");
    });

    it("warehouses koku depo uclari icin allow-list'te tanimlidir", () => {
      const source = readFileSync(
        resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
        "utf8",
      );
      const allowList = source.slice(
        source.indexOf("const ALLOWED_ROOTS"),
        source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
      );
      const entries = [...allowList.matchAll(/^\s*"([a-z0-9-]+)",/gm)].map((m) => m[1]);
      expect(entries).toContain("warehouses");
    });

    it("/sites/{site_id}/stock ucu allow-list'teki 'sites' kokunden gecer", () => {
      const root = "/sites/{site_id}/stock".split("/")[1];
      expect(root).toBe("sites");
      const source = readFileSync(
        resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
        "utf8",
      );
      const allowList = source.slice(
        source.indexOf("const ALLOWED_ROOTS"),
        source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
      );
      const entries = [...allowList.matchAll(/^\s*"([a-z0-9-]+)",/gm)].map((m) => m[1]);
      expect(entries).toContain(root);
    });

    it.each(["stock/items", "stock/summary", "stock/entries", "warehouses"])(
      "%s ucu forward edilir",
      async (endpoint) => {
        const fetchMock = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ items: [], total: 0, limit: 50, offset: 0 }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
        vi.stubGlobal("fetch", fetchMock);
        const res = await GET(
          req(`/api/backend/${endpoint}`, "GET", { [ACCESS_COOKIE]: "acc" }),
          ctx(endpoint.split("/")),
        );
        expect(res.status).toBe(200);
        expect(String(fetchMock.mock.calls[0][0])).toContain(`/${endpoint}`);
      },
    );

    // F-P8 · T1 — Satis ekranlari IKI yeni kok ekler ve ikisi de AYRI ADLI
    // kapiya baglanir (P8 backend kaydindan beri bilinen sart):
    //   · `sales`     → /sales/{id}[/installments|/generate-plan|/activate|
    //                   /transfer-deed|/cancel] + /sales/installments/{id}/pay
    //   · `customers` → GET/POST /customers, GET/PATCH /customers/{id}
    // Satis LISTESI/OLUSTURMA/OZET (`/projects/{id}/sales[/summary]`) ilk
    // segmenti "projects" oldugu icin MEVCUT kokten gecer.
    // `activate`/`transfer-deed`/`cancel` bu dilimde UI'dan CAGRILMAZ (spec
    // §2/K3: satis detay ekrani yok) — dinamik `calledRoots` taramasi bu
    // kokleri GORMEZ, yalniz bu ADLI testler kapiya bagli tutar.
    it.each(["sales", "customers", "projects"])(
      "%s koku satis ekranlari icin allow-list'te tanimlidir",
      (root) => {
        const source = readFileSync(
          resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
          "utf8",
        );
        const allowList = source.slice(
          source.indexOf("const ALLOWED_ROOTS"),
          source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
        );
        // Yorum metni DEGIL, gercek girdiler okunur (satir basindaki tirnakli ad).
        const entries = [...allowList.matchAll(/^\s*"([a-z0-9-]+)",/gm)].map((m) => m[1]);
        expect(entries).toContain(root);
      },
    );

    it.each([
      "customers",
      "customers/c-1",
      "projects/p-1/sales",
      "projects/p-1/sales/summary",
      "sales/sale-1",
      "sales/sale-1/generate-plan",
      "sales/sale-1/installments",
      "sales/installments/inst-1/pay",
    ])("%s ucu forward edilir", async (endpoint) => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [], total: 0, limit: 50, offset: 0 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      // Act
      const res = await GET(
        req(`/api/backend/${endpoint}`, "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(endpoint.split("/")),
      );

      // Assert
      expect(res.status).toBe(200);
      expect(String(fetchMock.mock.calls[0][0])).toContain(`/${endpoint}`);
    });

    it("uydurma 'installments' koku 404 alir — tahsilat ucunun ilk segmenti 'sales'tir", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      // Act
      const rejected = await GET(
        req("/api/backend/installments/inst-1/pay", "GET", { [ACCESS_COOKIE]: "acc" }),
        ctx(["installments", "inst-1", "pay"]),
      );

      // Assert
      expect(rejected.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
      const source = readFileSync(
        resolve(process.cwd(), "src/app/api/backend/[...path]/route.ts"),
        "utf8",
      );
      const allowList = source.slice(
        source.indexOf("const ALLOWED_ROOTS"),
        source.indexOf("]);", source.indexOf("const ALLOWED_ROOTS")),
      );
      const entries = [...allowList.matchAll(/^\s*"([a-z0-9-]+)",/gm)].map((m) => m[1]);
      expect(entries).not.toContain("installments");
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
