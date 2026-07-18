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
