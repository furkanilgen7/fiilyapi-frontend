import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";
import { routes } from "@/lib/routes";

// Korumali sayfa rotalari: cookie yoksa /login'e yonlendir. Edge'de yalniz
// cookie VARLIGI kontrol edilir; gercek gecerlilik API'de (backend /auth/me).
export function middleware(request: NextRequest): NextResponse {
  const hasSession =
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = routes.login();
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

// /api/*, /login, /design-system, statikler ve favicon haric her sayfa korunur.
//
// 🔴 `fonts` MUAFİYETİ ZORUNLUDUR (F-TB2 A/B ölçümünün bulgusu). Yazı tipleri
// repoya alınmadan önce `next/font` onları `_next/static/media/` altından
// veriyordu — yani ZATEN muaf listedeki `_next/static` kalıbına giriyorlardı.
// `public/fonts/`e taşınınca bu muafiyet sessizce KAYBOLDU: `/fonts/*.woff2`
// istekleri oturumsuz bağlamda `/login`e 307 ile yönlendi, hiçbir yazı tipi
// yüklenemedi ve tüm arayüz yedek fonta (Arial) düştü. Ölçüm bunu 80 karenin
// 60'ında yakaladı; muafiyet eklenince 80/80 bayt-aynıya döndü.
export const config = {
  matcher: [
    "/((?!api|login|design-system|fonts|_next/static|_next/image|favicon.ico).*)",
  ],
};
