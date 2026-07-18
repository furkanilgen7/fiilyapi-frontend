import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

// Korumali sayfa rotalari: cookie yoksa /login'e yonlendir. Edge'de yalniz
// cookie VARLIGI kontrol edilir; gercek gecerlilik API'de (backend /auth/me).
export function middleware(request: NextRequest): NextResponse {
  const hasSession =
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

// /api/*, /login, /design-system, statikler ve favicon haric her sayfa korunur.
export const config = {
  matcher: ["/((?!api|login|design-system|_next/static|_next/image|favicon.ico).*)"],
};
