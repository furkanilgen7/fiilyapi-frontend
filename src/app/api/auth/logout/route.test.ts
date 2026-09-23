import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";
import { POST } from "./route";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

function logoutReq(
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {},
): NextRequest {
  const r = new NextRequest("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { origin: "http://localhost:3000", host: "localhost:3000", ...headers },
  });
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}

function expectCookiesCleared(res: NextResponse): void {
  const clearedAccess = res.cookies.get(ACCESS_COOKIE);
  expect(clearedAccess?.value).toBe("");
  expect(clearedAccess?.maxAge).toBe(0);
  const clearedRefresh = res.cookies.get(REFRESH_COOKIE);
  expect(clearedRefresh?.value).toBe("");
  expect(clearedRefresh?.maxAge).toBe(0);
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    process.env.BACKEND_URL = "http://backend:8000";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BACKEND_URL;
  });

  it("cookie'leri siler ve 204 doner", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const res = await POST(logoutReq({}, { [ACCESS_COOKIE]: "acc", [REFRESH_COOKIE]: "ref" }));
    expect(res.status).toBe(204);
    expectCookiesCleared(res);
  });

  it("kotu origin'de 403", async () => {
    const res = await POST(logoutReq({ origin: "http://evil.com" }));
    expect(res.status).toBe(403);
  });

  // KUSUR: cikis sunucu tarafinda gerceklesmiyordu — BFF backend'i hic cagirmadigi
  // icin token_version (backend/app/modules/auth/router.py:92) artmiyordu ve calinmis
  // bir refresh token cikistan sonra 30 gun boyunca yeni access uretmeye devam ediyordu.
  it("backend POST /auth/logout'u Bearer access ile TAM BIR KEZ cagirir", async () => {
    const spy = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", spy);

    const res = await POST(logoutReq({}, { [ACCESS_COOKIE]: "acc", [REFRESH_COOKIE]: "ref" }));

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://backend:8000/auth/logout");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer acc");
    expect(res.status).toBe(204);
  });

  it("access suresi gecmisse refresh ile tazeleyip logout'u YINE cagirir", async () => {
    const spy = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "yeni-acc", refresh_token: "yeni-ref" }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", spy);

    const res = await POST(logoutReq({}, { [ACCESS_COOKIE]: "eski", [REFRESH_COOKIE]: "ref" }));

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls[1][0]).toBe("http://backend:8000/auth/refresh");
    const [retryUrl, retryInit] = spy.mock.calls[2] as [string, RequestInit];
    expect(retryUrl).toBe("http://backend:8000/auth/logout");
    expect((retryInit.headers as Record<string, string>).Authorization).toBe("Bearer yeni-acc");
    expect(res.status).toBe(204);
    expectCookiesCleared(res);
  });

  // POZITIF KONTROL: yerel cikis aga REHIN OLMAMALI.
  it("upstream 401 dondurse bile 204 doner ve cookie'ler silinir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const res = await POST(logoutReq({}, { [ACCESS_COOKIE]: "acc" }));
    expect(res.status).toBe(204);
    expectCookiesCleared(res);
  });

  it("backend erisilemezse (fetch reject) yine 204 doner ve cookie'ler silinir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const res = await POST(logoutReq({}, { [ACCESS_COOKIE]: "acc", [REFRESH_COOKIE]: "ref" }));
    expect(res.status).toBe(204);
    expectCookiesCleared(res);
  });

  it("BACKEND_URL tanimsizsa bile cikis yapilir (204 + cookie silme)", async () => {
    delete process.env.BACKEND_URL;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const res = await POST(logoutReq({}, { [ACCESS_COOKIE]: "acc", [REFRESH_COOKIE]: "ref" }));
    expect(res.status).toBe(204);
    expectCookiesCleared(res);
  });
});
