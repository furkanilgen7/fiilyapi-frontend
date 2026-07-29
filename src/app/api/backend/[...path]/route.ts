import { NextResponse, type NextRequest } from "next/server";
import { proxyAuthenticated, proxyAuthenticatedBinary } from "@/lib/auth/backend";
import { applyAuthCookies, buildAccessCookie, clearedAuthCookies } from "@/lib/auth/cookies";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

// Yalniz beklenen kokler forward edilir (SSRF/kesif yuzeyini daraltir).
const ALLOWED_ROOTS = new Set([
  "users",
  "roles",
  "modules",
  "projects",
  // Şantiye Detay (/sites/{site_id}) ve bölüm uçları (/sites/{site_id}/sections)
  // bu kökten geçer; eksikse tüm şantiye ekranı 404 alır.
  "sites",
  "company",
  "settings",
  "audit-log",
  "dashboard",
  // Task F4 — Yeni Proje formunun İşveren seçici/oluşturma uçları (spec §3.1-3.2).
  // Eksikse işveren akışı canlıda 404 alır; jsdom testleri bunu görmez.
  "employers",
]);

// Ikili (binary) olarak aynen gecirilecek indirme uclari; JSON ayristirilmaz.
const BINARY_DOWNLOAD_SUFFIXES = [".xlsx"];

function isBinaryDownload(method: string, path: string[]): boolean {
  if (method !== "GET") return false;
  const last = path[path.length - 1];
  return BINARY_DOWNLOAD_SUFFIXES.some((suffix) => last.endsWith(suffix));
}

function errorCodeFor(status: number): string {
  if (status === 403) return "forbidden";
  if (status >= 500) return "unavailable";
  return "error";
}

type RouteCtx = { params: Promise<{ path: string[] }> };

async function handleBinary(
  method: string,
  backendPath: string,
  query: Record<string, string>,
  access: string | undefined,
  refresh: string | undefined,
): Promise<NextResponse> {
  let result;
  try {
    result = await proxyAuthenticatedBinary(access, refresh, backendPath, { method, query });
  } catch {
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: 502 });
  }

  if (result.status === 401) {
    const res = NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
    applyAuthCookies(res, clearedAuthCookies());
    return res;
  }

  if (result.status >= 400 || !result.data) {
    return NextResponse.json({ ok: false, code: errorCodeFor(result.status) }, { status: result.status });
  }

  const headers = new Headers();
  headers.set("content-type", result.contentType ?? "application/octet-stream");
  if (result.contentDisposition) headers.set("content-disposition", result.contentDisposition);
  headers.set("cache-control", "no-store");

  const res = new NextResponse(result.data, { status: result.status, headers });
  if (result.refreshedAccessToken) applyAuthCookies(res, [buildAccessCookie(result.refreshedAccessToken)]);
  return res;
}

async function handle(request: NextRequest, method: string, routeCtx: RouteCtx): Promise<NextResponse> {
  const { path } = await routeCtx.params;
  if (path.length === 0 || !ALLOWED_ROOTS.has(path[0])) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }
  // Path traversal sertlestirmesi: ".." veya "." (veya bos) segment fetch tarafindan
  // normalize edilip allow-list disina cikabilir; bu yuzden burada erken reddedilir.
  if (path.some((segment) => segment === ".." || segment === "." || segment === "")) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }

  const backendPath = "/" + path.join("/");
  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (isBinaryDownload(method, path)) {
    return handleBinary(method, backendPath, query, access, refresh);
  }

  let body: unknown;
  if (method !== "GET" && method !== "DELETE") {
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }
  }

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
