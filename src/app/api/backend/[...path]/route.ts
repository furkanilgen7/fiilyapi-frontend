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
  // P7 — İşveren Hakedişi ekranlarinin durum/govde uclari (/progress-payments/{id},
  // .../submit|approve|reject|mark-paid|unapprove|refresh-prices) bu kokten gecer
  // (liste/olusturma/ozet /projects/{project_id}/progress-payments* uzerinden gelir,
  // o da "projects" kokunden gecer). Eksikse hakediş ekrani canlida tumuyle 404 alir;
  // jsdom testleri bunu gormez.
  "progress-payments",
  // P7 — Hakediş formundaki Fiyat Farkı/Endeks bandi sozlesmeden SALT-OKUNUR okunur
  // (spec karari S3); bu kok olmadan o okuma canlida 404 alir.
  "contracts",
  // P6 — Bölüm Detay ekrani + tam sayfa Bölüm formu. GET/PATCH/DELETE
  // /sections/{section_id} uclarinin ilk path segmenti "sites" DEGIL,
  // "sections"tir (olusturma /sites/{site_id}/sections uzerinden "sites"
  // kokunden gecer, ama detay/guncelleme kendi kokunu kullanir). Eksikse
  // bolum detay ekrani canlida 404 alir; jsdom testleri bunu gormez.
  "sections",
  // F-TH T1 — Taşeron Hakedişi ekranlarının liste/özet/detay/durum uçları
  // (/subcontractor-progress-payments, .../{id}, .../{id}/lines,
  // .../{id}/submit|approve|reject|mark-paid|unapprove|refresh-prices) bu
  // kökten geçer (oluşturma /subcontractor-contracts/{contract_id}/progress-payments
  // üzerinden gelir, o da "subcontractor-contracts" kökünden geçer). Eksikse
  // taşeron hakediş ekranı canlıda tümüyle 404 alır; jsdom testleri bunu görmez.
  "subcontractor-progress-payments",
  // F-TH T1 — Taşeron sözleşmesi detay ucu (/subcontractor-contracts/{id})
  // ve hakediş oluşturma ucu (/subcontractor-contracts/{id}/progress-payments)
  // bu kökten geçer. Eksikse sözleşme detay okuması ve yeni hakediş oluşturma
  // canlıda 404 alır.
  "subcontractor-contracts",
  // F-TH T1 — Taşeron kartı okuma/yazma uçları (/subcontractors,
  // /subcontractors/{id}) bu kökten geçer. Bu dilimde doğrudan UI'dan
  // çağrılmasa da (sözleşme yanıtları taşeron adını gömülü taşır) izin
  // listesi eksikse ileride eklenecek taşeron kartı ekranı sessizce 404 alır.
  "subcontractors",
  // F-SD T1 — Şantiye Günlüğü kaydının detay/güncelleme/satır/durum uçları
  // (/diary/{entry_id}, .../lines, .../submit, .../reopen) bu kökten geçer:
  // ilk path segmenti "sites" DEĞİL "diary"dir (liste/oluşturma/özet
  // /sites/{site_id}/diary* üzerinden gelir, o da "sites" kökünden geçer).
  // Eksikse bu dört uç YALNIZ CANLIDA 404 alır; jsdom testleri bunu görmez.
  "diary",
  // F-PT T1 — Puantaj ekranlarının personel uçları (`/personnel`,
  // `/personnel/{personnel_id}`) bu kökten geçer: matris satırlarını besleyen
  // liste ve "Personel Ekle" formunun POST'u. Eksikse personel uçları YALNIZ
  // CANLIDA 404 alır (matris sonsuza dek boş kalır); jsdom testleri bunu
  // GÖRMEZ. Puantaj matrisinin kendi uçları (`/sites/{site_id}/timesheet`,
  // `.../timesheet/export.xlsx`) ilk segmenti "sites" olduğu için MEVCUT
  // "sites" kökünden geçer — ayrı bir "timesheet" kökü EKLENMEZ.
  "personnel",
  // F-BC T1 — Belge Arşivi İKİ kök birden ekler:
  //   · `documents`        → `POST /documents` (multipart yükleme),
  //     `GET /documents`, `GET /documents/{id}/download`,
  //     `PATCH/DELETE /documents/{id}`.
  //   · `document-folders` → `PATCH/DELETE /document-folders/{id}` (klasör
  //     yeniden adlandırma/silme). Bu iki uç bu dilimde EKRANA BAĞLANMAZ
  //     (spec §4: mockup'ta düğme yok) — ama uçlar API'den kullanılabilir
  //     kalır ve kök sessizce düşerse ileride açılacak yüzey canlıda 404 alır.
  // Klasör LİSTELEME/OLUŞTURMA (`/projects/{id}/document-folders`) ilk segmenti
  // "projects" olduğu için MEVCUT kökten geçer; ayrı bir kök gerekmez.
  "documents",
  "document-folders",
  // F-ST T1 — Stok & Depo İKİ kök birden ekler:
  //   · `stock`      → `GET/POST /stock/items` (katalog listesi + malzeme
  //     ekleme), `PATCH /stock/items/{id}` (eşik/kullanımdan kaldırma),
  //     `POST/GET /stock/entries` (giriş/transfer/düzeltme hareketleri),
  //     `GET /stock/summary` (E3 katalog tablosu + KPI şeridi — bakiye ve
  //     durum SUNUCU TÜREVİDİR, bu uçtan gelir).
  //   · `warehouses` → `GET/POST /warehouses`, `PATCH/DELETE /warehouses/{id}`.
  //     Depo listesi olmadan stok giriş formu KULLANILAMAZ (depo alanı zorunlu).
  // ŞANTİYE stok tablosu (`GET /sites/{site_id}/stock`) ilk segmenti "sites"
  // olduğu için MEVCUT kökten geçer; "site-stock" diye AYRI bir kök EKLENMEZ.
  // Bu iki kök düşerse stok modülü YALNIZ CANLIDA tümüyle 404 alır (katalog
  // sonsuza dek boş, her giriş denemesi başarısız); jsdom testleri bunu GÖRMEZ.
  "stock",
  "warehouses",
  // F-P8 T1 — Satış ekranları İKİ kök birden ekler (P8 backend kaydından beri
  // bilinen şart; eksikse modül YALNIZ CANLIDA 404 alır, jsdom testleri görmez):
  //   · `sales`     → `GET/PUT /sales/{sale_id}/installments`,
  //     `POST /sales/{sale_id}/generate-plan`, `GET/PATCH/DELETE /sales/{id}`,
  //     `POST /sales/{id}/activate|transfer-deed|cancel` (bu üçü bu dilimde
  //     EKRANA BAĞLANMAZ — satış DETAY ekranı mockup'ı yok, spec §2/K3 — ama
  //     uçlar API'den kullanılabilir kalır) ve `POST
  //     /sales/installments/{installment_id}/pay` (ilk segmenti yine "sales").
  //   · `customers` → `GET/POST /customers`, `GET/PATCH /customers/{id}`.
  //     DELETE ucu YOKTUR (P8 kararı).
  // Satış LİSTESİ/OLUŞTURMA/ÖZET (`/projects/{project_id}/sales[/summary]`) ilk
  // segmenti "projects" olduğu için MEVCUT kökten geçer; ayrı kök EKLENMEZ.
  "sales",
  "customers",
  // F-SA T1 — Satınalma ekranları DÖRT kök birden ekler. Hiçbiri mevcut
  // köklerin altında DEĞİLDİR (grep'le doğrulandı: dördü de listede YOKTU):
  //   · `suppliers`         → `GET/POST /suppliers`,
  //     `GET/PATCH /suppliers/{id}` — TED kart ızgarası + "Tedarikçi Ekle"
  //     diyaloğu. DELETE ucu YOKTUR (SA kararı).
  //   · `purchase-requests` → `GET/POST /purchase-requests`,
  //     `GET/PATCH/DELETE /purchase-requests/{id}`,
  //     `POST .../{id}/submit|approve|reject`,
  //     `GET/POST .../{id}/quotes`, `GET .../{id}/quotes/export.xlsx`,
  //     `PATCH/DELETE .../{id}/quotes/{quote_id}`,
  //     `POST .../{id}/quotes/{quote_id}/select-and-order`.
  //     Teklif uçlarının ilk segmenti "quotes" DEĞİL, talebin kökü olan
  //     "purchase-requests"tir — ayrı bir "quotes" kökü EKLENMEZ.
  //     `approve`/`reject` bu dilimde EKRANA BAĞLANMAZ (spec K6: Onay Kutusu
  //     ayrı dilim) ama uçlar API'den kullanılabilir kalır.
  //   · `purchase-orders`   → `GET/POST /purchase-orders`,
  //     `GET/PATCH /purchase-orders/{id}` — SIP tablosu. Talebe bağlı sipariş
  //     `select-and-order` üzerinden doğar, bu kökten DEĞİL.
  //   · `purchasing`        → `GET /purchasing/summary`. KPI şeridini besleyen
  //     tek uçtur ve ilk segmenti "purchasing"tir; "purchase-requests"in
  //     ALTINDA DEĞİLDİR (`/purchasing/summary` ≠ `/purchase-requests/...`).
  //     Yalnız bu kök düşerse SAT+SIP ekranları AÇILIR ama dört KPI kartı
  //     sonsuza dek boş kalır — en sinsi düşüş biçimi.
  // Bu dört kök eksikse satınalma modülü YALNIZ CANLIDA 404 alır; jsdom
  // testleri bunu GÖRMEZ.
  "suppliers",
  "purchase-requests",
  "purchase-orders",
  "purchasing",
  // F-İK T1 — İK Belge & Sertifika sekmesinin ÖZET ucu (`GET /hr/documents/summary`)
  // bu kökten geçer; ilk path segmenti "personnel" DEĞİL "hr"dir. Personelin
  // KENDİ belge alt-kaynağı (`GET/POST /personnel/{id}/documents`,
  // `PATCH/DELETE /personnel/documents/{id}`) MEVCUT "personnel" kökünden geçer —
  // yani "hr" kökü tek başına düşerse belge sekmesi AÇILIR ama 5 KPI + tip
  // dağılımı + süresi dolan/yaklaşan listeleri sonsuza dek boş kalır; en sinsi
  // düşüş biçimi. Bu kök YALNIZ CANLIDA ısırır; jsdom testleri GÖRMEZ.
  // (`GET /hr/leaves/summary` de bu kökten geçer; İzin Yönetimi mockup'ı
  // olmadığı için bu dilimde EKRANA BAĞLANMAZ — kök hazır kalır.)
  "hr",
  // F-TB1 T1 — İK-3 bordro çekirdeğinin TÜM uçları (`/payroll/periods`,
  // `.../{period_id}`, `.../{period_id}/compute|approve|pay|export|
  // sgk-submit|sgk-summary`, `/payroll/lines/{line_id}[/approve|reject]`,
  // `/payroll/rates[/{year}/{source}]`) bu kökten geçer; ilk path segmenti
  // "personnel" DEĞİL "payroll"dur. Bu dilimde EKRANA BAĞLANMAZ (bordro
  // ekranı mockup'ı yok) ama kök hazır kalır — düşerse ileride açılacak
  // bordro yüzeyi YALNIZ CANLIDA 404 alır; jsdom testleri bunu GÖRMEZ.
  "payroll",
]);

// JSON/metin sayilan icerik tipleri: govde metne cozulup JSON olarak islenir.
const TEXTUAL_CONTENT_TYPES = [/^application\/json/i, /^application\/problem\+json/i, /^text\//i];

// YEDEK kural: Content-Type eksik/genelse uzanti hala ikili sayilir. Bu desen
// SILINMEZ — yalnizca tek olcut olmaktan cikti (spec §8.1).
const BINARY_DOWNLOAD_SUFFIXES = [".xlsx"];

/**
 * F-BC — son segmenti bunlardan biri olan uclar KOSULSUZ ikili sayilir
 * (`status < 400` iken).
 *
 * Gerekce: indirilen BELGENIN icerik tipi KULLANICININ yukledigi dosyadan
 * gelir. Bir `.txt`/`.csv`/`.json` belgesi `text/plain` ya da
 * `application/json` tasir; `Content-Type`a bakan genel kural bunlari METIN
 * sayip JSON dalina dusurur, `decodeJson` cozemedigi govde icin `null` basar
 * ve dosya HIC INMEZ. Excel/PDF disa aktarimlarinda bu gorulmez cunku onlarin
 * tipi sabittir — belge arsivinde degildir.
 */
const BINARY_DOWNLOAD_SEGMENTS = new Set(["download"]);

/**
 * Ikili/JSON karari — ASIL OLCUT backend'in dondurdugu `Content-Type`.
 *
 * Uzantiya bakan eski kural BOQ'un uzantisiz `…/boq/export` ucunu kaciriyordu:
 * yanit JSON dalina dusuyor, `res.json()` patliyor ve istemciye 200 + `null`
 * gidiyordu (dosya hic inmiyordu). jsdom testleri bunu gormez, yalniz canlida
 * ortaya cikardi.
 */
function isBinaryResponse(contentType: string | null, path: string[]): boolean {
  if (BINARY_DOWNLOAD_SEGMENTS.has(path[path.length - 1])) return true;
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
    // F-BC canlı smoke bulgusu: bu dal yanıt başlıklarını SIFIRDAN kurduğu için
    // backend'in gönderdiği `X-Content-Type-Options: nosniff` DÜŞÜYORDU.
    // Başlık, belge arşivinin depolanmış-XSS savunmasının İKİNCİ katmanıdır
    // (birincisi: künyedeki `mime_type` istemcinin `Content-Type`ından değil
    // UZANTIDAN türetilir — BC backend kararı) ve tarayıcının gövdeyi koklayıp
    // `text/html` sanmasını engeller. Excel dışa aktarımında görünmezdi çünkü
    // orada içerik KULLANICIDAN gelmiyor; belge arşivinde geliyor.
    headers.set("x-content-type-options", "nosniff");

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

  // F-BC — multipart gövde (belge yükleme) JSON'a ÇEVRİLMEZ: `request.json()`
  // bu gövdeyi çözemez, `body` `undefined`a düşer ve backend'e boundary'si
  // kaybolmuş boş bir istek gider (her yükleme 422). Gövde ham bayt olarak
  // okunup `Content-Type` başlığı BOUNDARY'SİYLE BİRLİKTE aynen iletilir.
  const requestContentType = request.headers.get("content-type");
  const isMultipart = /^multipart\/form-data/i.test(requestContentType ?? "");

  let body: unknown;
  let rawBody: { data: ArrayBuffer; contentType: string } | undefined;
  if (isMultipart) {
    rawBody = { data: await request.arrayBuffer(), contentType: requestContentType as string };
  } else if (method !== "DELETE") {
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }
  }

  let result;
  try {
    result = await proxyAuthenticated(access, refresh, backendPath, {
      method,
      body,
      rawBody,
      query,
    });
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
