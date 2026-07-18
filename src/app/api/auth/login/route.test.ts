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
