import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

const BACKEND = "http://backend:8000";
const ORIGIN = "http://localhost:3000";

function chatReq(
  body: unknown,
  cookies: Record<string, string> = { [ACCESS_COOKIE]: "acc", [REFRESH_COOKIE]: "ref" },
  origin: string = ORIGIN,
): NextRequest {
  const r = new NextRequest(`${ORIGIN}/api/ai/chat`, {
    method: "POST",
    headers: { origin, host: "localhost:3000", "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}

/** Sunucunun döktüğü SSE karelerini taşıyan sahte üst-kaynak akışı. */
function sseStream(frames: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
}

/** Akış taşıyan sahte `Response`; tamponlama metotları CASUSLANIR. */
function streamingResponse(stream: ReadableStream<Uint8Array>, status = 200) {
  const res = new Response(stream, {
    status,
    headers: { "content-type": "text/event-stream" },
  });
  const jsonSpy = vi.fn(async () => ({}));
  const bufferSpy = vi.fn(async () => new ArrayBuffer(0));
  Object.defineProperty(res, "json", { value: jsonSpy });
  Object.defineProperty(res, "arrayBuffer", { value: bufferSpy });
  return { res, jsonSpy, bufferSpy };
}

function jwt(exp: number): string {
  return `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;
}

describe("POST /api/ai/chat", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = BACKEND;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.BACKEND_URL;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SSRF — istemci hedef seçemez
  // ─────────────────────────────────────────────────────────────────────────
  it("🔴 SSRF — istemcinin yolladigi path/root/url YOK SAYILIR, hedef sabittir", async () => {
    const stream = sseStream(["event: metin\ndata: {\"metin\":\"ok\"}\n\n"]);
    const { res: upstream } = streamingResponse(stream);
    const fetchSpy = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal("fetch", fetchSpy);

    const res = await POST(
      chatReq({
        mesaj: "x",
        path: "/users",
        root: "user_management",
        url: "http://evil.example/steal",
      }),
    );

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    // Hedef TAM OLARAK budur — istemcinin hiçbir alanı yola karışmaz.
    expect(url).toBe(`${BACKEND}/ai/chat`);
    // Gövde YENİDEN kuruldu: yalnız `mesaj`.
    expect(init.body).toBe(JSON.stringify({ mesaj: "x" }));
    expect(init.body).not.toContain("evil.example");
    expect(init.body).not.toContain("user_management");
  });

  it("gecersiz `mesaj` 400 dondurur ve UST KAYNAGA HIC gitmez", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    for (const govde of [{}, { mesaj: "" }, { mesaj: "   " }, { mesaj: 42 }, { mesaj: "a".repeat(4001) }]) {
      const res = await POST(chatReq(govde));
      expect(res.status).toBe(400);
    }
    // Bozuk JSON da aynı kapıdan döner.
    expect((await POST(chatReq("{bozuk"))).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tamponlama YOK
  // ─────────────────────────────────────────────────────────────────────────
  it("🔴 AKIS TAMPONLANMAZ — govde okunmadan dogrudan boru baglanir", async () => {
    const stream = sseStream([
      "event: metin\ndata: {\"metin\":\"mer\"}\n\n",
      "event: tur_bitti\ndata: {\"sebep\":\"bitti\"}\n\n",
    ]);
    const { res: upstream, jsonSpy, bufferSpy } = streamingResponse(stream);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(upstream));

    const res = await POST(chatReq({ mesaj: "merhaba" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(res.headers.get("x-accel-buffering")).toBe("no");
    // 🔴 Tamponlayan iki metot da HİÇ çağrılmadı. `proxyAuthenticated` /
    // `proxyAuthenticatedRaw` yolları tam olarak burada ölürdü.
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(bufferSpy).not.toHaveBeenCalled();
    // Kareler bozulmadan çıkışa ulaşır.
    expect(await new Response(res.body).text()).toBe(
      "event: metin\ndata: {\"metin\":\"mer\"}\n\nevent: tur_bitti\ndata: {\"sebep\":\"bitti\"}\n\n",
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 401 → refresh → tek retry, AKIŞ BAŞLAMADAN
  // ─────────────────────────────────────────────────────────────────────────
  it("🔴 401 → refresh → tek retry AKIS BASLAMADAN cozulur, yeni bearer tasinir", async () => {
    const stream = sseStream(["event: metin\ndata: {\"metin\":\"ok\"}\n\n"]);
    const { res: upstream } = streamingResponse(stream);
    const yeniToken = jwt(9999999999);
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: yeniToken, refresh_token: yeniToken }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(upstream);
    vi.stubGlobal("fetch", fetchSpy);

    const res = await POST(chatReq({ mesaj: "x" }));

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy.mock.calls[1][0]).toBe(`${BACKEND}/auth/refresh`);
    // Retry YENİ bearer'ı taşır (eskisini değil).
    expect(fetchSpy.mock.calls[2][1].headers.authorization).toBe(`Bearer ${yeniToken}`);
    expect(fetchSpy.mock.calls[0][1].headers.authorization).toBe("Bearer acc");
    // Yenilenen access cookie'si AKIŞ yanıtına da yazılır.
    expect(res.cookies.get(ACCESS_COOKIE)?.value).toBe(yeniToken);
  });

  it("refresh basarisizsa 401 doner ve cookie temizlenir (akis ACILMAZ)", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("{}", { status: 401 }))
        .mockResolvedValueOnce(new Response("{}", { status: 401 })),
    );
    const res = await POST(chatReq({ mesaj: "x" }));
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).not.toContain("text/event-stream");
    expect(res.cookies.get(ACCESS_COOKIE)?.maxAge).toBe(0);
    expect(res.cookies.get(REFRESH_COOKIE)?.maxAge).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 503 — sağlayıcı yapılandırılmadı: DÜRÜST metin kullanıcıya ULAŞIR
  // ─────────────────────────────────────────────────────────────────────────
  it("🔴 503 govdesiyle GECER — 'saglayici yapilandirilmadi' metni yutulmaz", async () => {
    const detay = "AI sağlayıcısı yapılandırılmadı: `AI_PROVIDER` boş.";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: detay }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const res = await POST(chatReq({ mesaj: "x" }));

    expect(res.status).toBe(503);
    expect(res.headers.get("content-type")).not.toContain("text/event-stream");
    // 🔴 Genel bir "unavailable" DEĞİL: operatörün okuyacağı metin korunur.
    expect((await res.json()).detail).toBe(detay);
  });

  it("ust kaynak ulasilamazsa 502 doner", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const res = await POST(chatReq({ mesaj: "x" }));
    expect(res.status).toBe(502);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CSRF
  // ─────────────────────────────────────────────────────────────────────────
  it("yabanci Origin 403 alir ve UST KAYNAGA HIC gidilmez", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await POST(chatReq({ mesaj: "x" }, {}, "http://evil.example"));
    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Yapısal — çalışma zamanı beyanları BİLİNÇLİDİR, kazara düşmez
  // ─────────────────────────────────────────────────────────────────────────
  it("🔴 rota `runtime` ve `maxDuration` beyanlarini TASIR", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/api/ai/chat/route.ts"), "utf8");
    expect(source).toContain('export const runtime = "nodejs"');
    expect(source).toMatch(/export const maxDuration = \d+/);
  });
});

// ---------------------------------------------------------------------------
// AI-CHAT-2 / K2 — `conversation_id` geçişi
// ---------------------------------------------------------------------------

describe("POST /api/ai/chat · conversation_id (AI-CHAT-2)", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = BACKEND;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.BACKEND_URL;
  });

  function casusla() {
    const { res: upstream } = streamingResponse(
      sseStream(['event: metin\ndata: {"metin":"ok"}\n\n']),
    );
    const fetchSpy = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal("fetch", fetchSpy);
    return fetchSpy;
  }

  const GECERLI = "aa000000-0000-4000-8000-000000000001";

  it("gecerli `conversation_id` UST KAYNAGA gecer", async () => {
    const fetchSpy = casusla();
    const res = await POST(chatReq({ mesaj: "x", conversation_id: GECERLI }));
    expect(res.status).toBe(200);
    expect(JSON.parse(String(fetchSpy.mock.calls[0]![1].body))).toEqual({
      mesaj: "x",
      conversation_id: GECERLI,
    });
  });

  it("`conversation_id` YOKSA alan HIC GONDERILMEZ (null DEGIL)", async () => {
    const fetchSpy = casusla();
    await POST(chatReq({ mesaj: "x" }));
    // 🔴 `conversation_id: null` göndermek backend'de "yeni sohbet" ile aynı
    // sonucu verirdi ama gövdeyi sözleşmenin taşımadığı bir alanla kirletirdi.
    expect(JSON.parse(String(fetchSpy.mock.calls[0]![1].body))).toEqual({ mesaj: "x" });
  });

  it("🔴 UUID OLMAYAN `conversation_id` 400 — ust kaynaga HIC gitmez", async () => {
    const fetchSpy = casusla();
    for (const kotu of ["../../users", "1 OR 1=1", "", "not-a-uuid", 42, {}]) {
      const res = await POST(chatReq({ mesaj: "x", conversation_id: kotu }));
      expect(res.status, String(kotu)).toBe(400);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("🔴 BFF SAHIPLIGI DOGRULAMAZ — kapi TEK YERDE (backend)", () => {
    // Biçimsel olarak geçerli ama BAŞKASINA ait bir kimlik üst kaynağa GEÇER;
    // 404'ü backend verir. İkinci bir kapı, bir gün ikisinin ayrışması demektir.
    // 🔴 Yorumlar SÖKÜLÜR: bu dosyanın kendi açıklaması `WHERE user_id`den
    // söz ediyor ve yorum tarayan bir bekçi kendi gerekçesine takılırdı
    // (ölçüldü — ilk hâli tam olarak buna düştü). Ölçülen şey KODDUR.
    const ham = readFileSync(resolve(__dirname, "route.ts"), "utf8");
    const kod = ham
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((satir) => !satir.trimStart().startsWith("//"))
      .join("\n");
    for (const yasak of ["user_id", "owner", "sahip", "getCurrentUser"]) {
      expect(kod, `BFF sahiplik kapısı kurmaya çalışıyor: ${yasak}`).not.toContain(yasak);
    }
    // POZİTİF KONTROL: sökme işlemi her şeyi silmedi.
    expect(kod).toContain("conversation_id");
  });
});
