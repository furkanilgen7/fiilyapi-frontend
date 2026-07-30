import { NextResponse, type NextRequest } from "next/server";
import { proxyAuthenticated, proxyAuthenticatedRaw } from "@/lib/auth/backend";
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
  // P4 — İş Kalemleri (BOQ) grup/kalem güncelleme uçları /boq/groups/{id} ve
  // /boq/items/{id} bu kokten gecer (liste/olusturma /sites/{site_id}/boq* uzerinden
  // gelir, o da "sites" kokunden gecer). Eksikse PATCH akislari canlida 404 alir;
  // jsdom testleri bunu gormez.
  "boq",
]);

// JSON/metin sayilan icerik tipleri: govde metne cozulup JSON olarak islenir.
const TEXTUAL_CONTENT_TYPES = [/^application\/json/i, /^application\/problem\+json/i, /^text\//i];

// YEDEK kural: Content-Type eksik/genelse uzanti hala ikili sayilir. Bu desen
// SILINMEZ — yalnizca tek olcut olmaktan cikti (spec §8.1).
const BINARY_DOWNLOAD_SUFFIXES = [".xlsx"];

/**
 * Ikili/JSON karari — ASIL OLCUT backend'in dondurdugu `Content-Type`.
 *
 * Uzantiya bakan eski kural BOQ'un uzantisiz `…/boq/export` ucunu kaciriyordu:
 * yanit JSON dalina dusuyor, `res.json()` patliyor ve istemciye 200 + `null`
 * gidiyordu (dosya hic inmiyordu). jsdom testleri bunu gormez, yalniz canlida
 * ortaya cikardi.
 */
function isBinaryResponse(contentType: string | null, path: string[]): boolean {
  if (contentType && TEXTUAL_CONTENT_TYPES.some((re) => re.test(contentType))) return false;
  if (contentType) return true;
  return BINARY_DOWNLOAD_SUFFIXES.some((suffix) => path[path.length - 1].endsWith(suffix));
}

function decodeJson(data: ArrayBuffer): unknown {
  if (data.byteLength === 0) return null;
  try {
    return JSON.parse(new TextDecoder().decode(data));
  } catch {
    return null;
  }
}

type RouteCtx = { params: Promise<{ path: string[] }> };

/**
 * GET dali (spec §8.1): govde her zaman ham okunur, ikili/JSON karari YANIT
 * GELDIKTEN SONRA verilir. GET disi metodlar `proxyAuthenticated` yolunda
 * kalir — blast radius kucuk tutulur.
 */
async function handleGet(
  path: string[],
  backendPath: string,
  query: Record<string, string>,
  access: string | undefined,
  refresh: string | undefined,
): Promise<NextResponse> {
  let result;
  try {
    result = await proxyAuthenticatedRaw(access, refresh, backendPath, { method: "GET", query });
  } catch {
    return NextResponse.json({ ok: false, code: "unavailable" }, { status: 502 });
  }

  if (result.status === 401) {
    const res = NextResponse.json({ ok: false, code: "unauthenticated" }, { status: 401 });
    applyAuthCookies(res, clearedAuthCookies());
    return res;
  }

  // PAZARLIGA KAPALI (spec §8.1): `status >= 400` HER ZAMAN JSON dalina gider,
  // `Content-Type` ne olursa olsun. Aksi halde backend'in 403/409/422 Turkce
  // hata govdeleri ikili sayilip kaybolur.
  if (result.status < 400 && isBinaryResponse(result.contentType, path)) {
    const headers = new Headers();
    headers.set("content-type", result.contentType ?? "application/octet-stream");
    if (result.contentDisposition) headers.set("content-disposition", result.contentDisposition);
    headers.set("cache-control", "no-store");

    const res = new NextResponse(result.data, { status: result.status, headers });
    if (result.refreshedAccessToken) applyAuthCookies(res, [buildAccessCookie(result.refreshedAccessToken)]);
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
  const res = NextResponse.json(decodeJson(result.data), { status: result.status });
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

  if (method === "GET") {
    return handleGet(path, backendPath, query, access, refresh);
  }

  let body: unknown;
  if (method !== "DELETE") {
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
