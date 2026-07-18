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
      { access_token: jwtWithExp(9999999999), refresh_token: jwtWithExp(9999999999), token_type: "bearer" },
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
      { access_token: jwtWithExp(9999999999), refresh_token: jwtWithExp(9999999999), token_type: "bearer" }, true,
    ));
    expect(res.cookies.get(ACCESS_COOKIE)?.value).toBeTruthy();
    expect(res.cookies.get(REFRESH_COOKIE)?.value).toBeTruthy();
  });
});
