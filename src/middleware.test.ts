import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "./middleware";
import { ACCESS_COOKIE } from "@/lib/auth/constants";

/**
 * `config.matcher` bir Next.js yol kalıbıdır; içindeki muafiyet listesi düz bir
 * regex lookahead'idir. Kalıbı gerçek bir `RegExp`e çevirip yollara karşı
 * deneyebiliriz — böylece "muaf mı" sorusu VARSAYIM değil ÖLÇÜM olur.
 */
const matcherRe = new RegExp(`^${config.matcher[0]}$`);

function pageReq(path: string, cookies: Record<string, string> = {}): NextRequest {
  const r = new NextRequest(`http://localhost:3000${path}`);
  for (const [k, v] of Object.entries(cookies)) r.cookies.set(k, v);
  return r;
}

describe("middleware", () => {
  it("cookie yoksa /login'e next parametresiyle yonlendirir", () => {
    const res = middleware(pageReq("/"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("next=%2F");
  });

  it("access cookie varsa gecise izin verir", () => {
    const res = middleware(pageReq("/", { [ACCESS_COOKIE]: "acc" }));
    // NextResponse.next() → yonlendirme yok (location basligi yok)
    expect(res.headers.get("location")).toBeNull();
  });
});

/**
 * 🔴 NÜKS BEKÇİSİ (F-TB2 A/B ölçümünün bulgusu).
 *
 * Yazı tipleri repoya alınmadan önce `next/font` onları `_next/static/media/`
 * altından veriyordu; yani muafiyet listesindeki `_next/static` kalıbı sayesinde
 * ZATEN korumasızdılar. `public/fonts/`e taşınınca o muafiyet SESSİZCE kayboldu:
 * `/fonts/*.woff2` istekleri oturumsuz bağlamda `/login`e 307 ile yönlendi,
 * hiçbir yazı tipi yüklenemedi ve arayüz tümüyle yedek fonta (Arial) düştü.
 *
 * Hiçbir kapı bunu görmedi — birim testleri, tip denetimi ve build yeşildi;
 * yalnızca kare karşılaştırması yakaladı (80 karenin 60'ı oynadı). Bu yüzden
 * muafiyet burada AÇIKÇA kilitlenir: kalıptan `fonts` düşerse bu test kırılır.
 */
describe("middleware matcher — statik varlık muafiyetleri", () => {
  it("/fonts/* korumaya TAKILMAZ (yoksa tüm arayüz yedek fonta düşer)", () => {
    expect(matcherRe.test("/fonts/e4af272ccee01ff0-s.p.woff2")).toBe(false);
    expect(matcherRe.test("/fonts/OFL-Inter.txt")).toBe(false);
  });

  it("uygulama sayfaları korumaya TAKILIR (muafiyet fazla geniş değil)", () => {
    expect(matcherRe.test("/")).toBe(true);
    expect(matcherRe.test("/projeler")).toBe(true);
    expect(matcherRe.test("/ayarlar/kullanicilar")).toBe(true);
  });
});
