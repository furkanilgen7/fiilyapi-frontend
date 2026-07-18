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
