import { NextResponse, type NextRequest } from "next/server";
import { proxyAuthenticated } from "@/lib/auth/backend";
import { applyAuthCookies, buildAccessCookie, clearedAuthCookies } from "@/lib/auth/cookies";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

// Yalniz beklenen kokler forward edilir (SSRF/kesif yuzeyini daraltir).
const ALLOWED_ROOTS = new Set(["users", "roles", "modules", "projects"]);

type RouteCtx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, method: string, routeCtx: RouteCtx): Promise<NextResponse> {
  const { path } = await routeCtx.params;
  if (path.length === 0 || !ALLOWED_ROOTS.has(path[0])) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }

  const backendPath = "/" + path.join("/");
  const query: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let body: unknown;
  if (method !== "GET" && method !== "DELETE") {
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }
  }

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

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
