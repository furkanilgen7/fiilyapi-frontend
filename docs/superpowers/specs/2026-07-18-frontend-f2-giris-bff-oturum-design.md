# FİİL Yapı ERP Frontend — F2: Giriş + BFF + Oturum (tasarım)

**Tarih:** 2026-07-18
**Faz:** F2 (bağımlı: B1 auth, F1 primitive'ler)
**Kanon:** `../backend/docs/superpowers/specs/2026-07-17-temel-modul-design.md` §3.4, §6.3, §8; giriş mockup'ı `../projedesign/Giriş.dc.html`; auth sözleşmesi `openapi/openapi.json` (DONMUŞ).

---

## 1. Amaç ve kapsam

F1 üstüne oturan giriş akışı: giriş ekranı + Next.js Route Handler (BFF proxy) + JWT httpOnly cookie + middleware ile korumalı rota. F2 bitince DUR; F3 (kabuk) ayrı oturum.

**Kapsam içi:** `/login` ekranı, `/api/auth/*` BFF proxy'leri, cookie oturum yönetimi, şeffaf refresh, `middleware.ts`, giriş sonrası korumalı placeholder ana sayfa, testler (Vitest + Playwright E2E + görsel), `.env.example`.

**Kapsam dışı (bilinçli):** F3 kabuk (Topbar/Sidebar/dashboard), çoklu şirket, self-signup, self-servis parola sıfırlama, React Query provider (F3'e ertelendi), responsive/mobil, koyu tema. Backend'e dokunulmaz; backend deploy edilmez.

---

## 2. Donmuş auth sözleşmesi (openapi.json)

| Uç | Metot | Gövde | Başarı | Not |
|---|---|---|---|---|
| `/auth/login` | POST | `LoginRequest {email, password}` | 200 `TokenPair` | openapi'de yalnız 200/422; yanlış parola/pasif kullanıcı statü kodları sözleşmede yok → BFF **geçirgen** ele alır |
| `/auth/refresh` | POST | `RefreshRequest {refresh_token}` | 200 `TokenPair` | |
| `/auth/me` | GET | — (Bearer) | 200 `MeResponse` | `{id, email, full_name, title, role_key, status}` |
| `/auth/logout` | POST | — | 204 | Sunucuda no-op; açıklama: *"oturumu sonlandırmak cookie'yi silen BFF katmanının işidir"* |

`TokenPair = {access_token, refresh_token, token_type}`. `UserStatus = active | on_leave | passive`.

**Kritik çıkarımlar:**
- Backend token'ları **JSON gövdesinde** döndürür (Set-Cookie **değil**) → cookie'yi BFF kendisi yazar.
- Token'lar **stateless**; sunucu-tarafı iptal yok → logout yalnız cookie siler, token exp'e kadar geçerli kalır (§9 ödünç).
- Login hata statüleri sözleşmede tam değil → BFF statü kodunu geçirir, UI eşler (§6).

---

## 3. Mimari

### 3.1 Oturum akışı
```
Tarayıcı → Next.js Route Handler (/api/auth/*) → FastAPI (BACKEND_URL)
```
Tarayıcı backend'e **doğrudan gitmez**. Token JS'e hiç değmez (httpOnly cookie). `apiClient` baseUrl'i zaten `/api`.

### 3.2 Rota yapısı
| Rota | Erişim | Tür | İçerik |
|---|---|---|---|
| `/login` | Açık | Server sayfa + client `LoginForm` | İki panel giriş ekranı |
| `/` | **Korumalı** | Client | Placeholder ana sayfa: `/auth/me` ad+rol + "Çıkış Yap". F3 değiştirir. Mevcut F0 `page.tsx` yerine geçer |
| `/design-system` | Açık | — | Değişmez (görsel testler oturumsuz koşar) |
| `POST /api/auth/login` | Açık | Route Handler | Backend login'e proxy; 200'de cookie yazar, gövdeden token çıkarır |
| `POST /api/auth/logout` | — | Route Handler | Cookie siler, 204 |
| `GET /api/auth/me` | Cookie | Route Handler | Backend `/auth/me`'ye Bearer proxy; 401'de şeffaf refresh |

Refresh **tarayıcıya açılmaz** — yalnız `me` proxy'sinin içinde otomatik çalışır (küçük saldırı yüzeyi).

### 3.3 BFF iç katmanı (`src/app/api/auth/_lib/`)
Route handler'lardan bağımsız, birim-test edilebilir yardımcılar:

- **`cookies.ts`**
  - Sabitler: `ACCESS_COOKIE = "fiil_access"`, `REFRESH_COOKIE = "fiil_refresh"`.
  - `readTokenExp(jwt: string): number | null` — JWT payload'ını base64url decode edip `exp` (saniye) okur. İmza **doğrulamaz** (amaç: cookie maxAge'ini token ömrüne eşitlemek). Bozuk token → `null`.
  - `buildAuthCookies(pair: TokenPair, remember: boolean): CookieSpec[]` — saf fonksiyon, cookie tanımlarını üretir:
    - `fiil_access`: `httpOnly`, `secure` (prod), `sameSite: "lax"`, `path: "/"`, `maxAge` = `max(0, accessExp - now)`.
    - `fiil_refresh`: aynı flag'ler; `remember` ise `maxAge` = `max(0, refreshExp - now)`, değilse `maxAge` **atanmaz** (oturum cookie'si, tarayıcı kapanınca silinir).
    - `secure = process.env.NODE_ENV === "production"`.
  - `clearedAuthCookies(): CookieSpec[]` — her iki cookie'yi `maxAge: 0` ile siler.
- **`backend.ts`**
  - `backendUrl(): string` — `process.env.BACKEND_URL` okur; yoksa `throw`. Handler bunu 500'e çevirir, değeri sızdırmaz.
  - `proxyAuthenticated(accessToken, refreshToken, path): Promise<ProxyResult>` — backend'i Bearer ile çağırır; 401 dönerse ve `refreshToken` varsa `/auth/refresh` dener, başarılıysa yeni `TokenPair` + orijinal isteği bir kez retry eder; sonuç: `{ status, body, newCookies? }`.
- **`csrf.ts`**
  - `assertSameOrigin(request): boolean` — POST handler'larında `Origin`/`Host` başlığı host'unu karşılaştırır (hafif CSRF savunması). Uyumsuz → 403.

### 3.4 Route handler'ları (`src/app/api/auth/*/route.ts`)
- **`login/route.ts`** (POST): gövdeyi doğrula (zod: email+password) → `assertSameOrigin` → backend `/auth/login`. Backend 200 ise `TokenPair`'i al, `buildAuthCookies(pair, remember)` ile cookie yaz, gövde olarak yalnız `{ ok: true }` döndür (**token gövdede dönmez**). Backend hata statüsünü (401/403/422/5xx) `{ ok: false, code }` ile geçir; ham backend mesajını sızdırma.
- **`logout/route.ts`** (POST): `assertSameOrigin` → `clearedAuthCookies` uygula → 204. Backend `/auth/logout` **çağrılmaz** (no-op; kuplajı önle).
- **`me/route.ts`** (GET): cookie'lerden access+refresh oku → `proxyAuthenticated(..., "/auth/me")`. `newCookies` varsa yanıta yaz. 401 ise cookie temizle + 401. Başarı → `MeResponse` geçir.

### 3.5 Middleware (`src/middleware.ts`)
- `config.matcher`: korumalı olmayanları hariç tut — `/login`, `/design-system`, `/_next/*`, statik dosyalar, `/api/auth/login`, `/favicon*`.
- Korumalı istekte `fiil_access` **veya** `fiil_refresh` cookie'si yoksa → `NextResponse.redirect(/login?next=<pathname>)`.
- Edge'de yalnız **cookie varlığı** kontrol edilir; imza/geçerlilik **API'de** (backend `/auth/me`) enforce edilir. Middleware backend secret'ı tutmaz. **Bilinçli ödünç, dokümante.**
- (Nice-to-have) Cookie'li kullanıcı `/login`'e gelirse `/`'a yönlendir — F2'de opsiyonel, plana ayrı task.

---

## 4. Giriş ekranı UI

Kanon: `Giriş.dc.html` — **şu iki değişiklikle** (spec §6.3): şirket seçici **kaldırılır**, şifremi-unuttum linki **kaldırılır**.

### 4.1 Layout
- Sol **420px** sabit gradient marka paneli (statik server component): logo bloğu (SVG + "FİİL / YAPI ERP"), başlık "İnşaat projelerinizi tek platformda yönetin", açıklama, 4 özellik satırı (emoji + metin), alt telif. Arka plan daire SVG'leri.
- Sağ esnek form paneli (`#f8fafc` zemin), `max-width:400px`, `fadeUp` animasyonu.

### 4.2 tokens.css eklemeleri
Gradient stopları çıplak hex olamaz (kural: yalnız-token). Eklenecek:
- `--color-primary-900: #1e3a8a` (gradient koyu ucu).
- `--gradient-brand-panel: linear-gradient(160deg, var(--color-primary-900) 0%, var(--color-primary-hover) 50%, var(--color-primary) 100%)`.

(`--color-primary` = `#2563eb`, `--color-primary-hover` = `#1d4ed8` `tokens.css`'de mevcut — doğrulandı.)

### 4.3 Form (`LoginForm.tsx`, client component)
Mevcut primitive'ler kullanılır (**yeni primitive yazılmaz**):
- E-posta: `Input type="email"`, zorunlu + format doğrulaması.
- Şifre: `Input type={showPassword ? "text" : "password"}`, `rightIcon` = tıklanabilir `EyeIcon`/`EyeOffIcon` toggle.
- "30 gün beni hatırla": `Checkbox`, varsayılan **işaretli**.
- Gönder: `Button variant="primary"` tam-genişlik; `isSubmitting` iken disabled + yükleme.
- Alt bilgi: "Hesabınız yok mu? **Yöneticinizle iletişime geçin**" (statik metin).
- **Demo hesap bloğu:** yalnız `process.env.NODE_ENV === "development"` iken render edilir; tıklayınca e-posta alanını doldurur. Canlıda hiç DOM'a girmez.

### 4.4 Doğrulama ve hata
- İstemci doğrulaması (submit'ten önce): email boş/format, parola boş → ilgili `Input status="error"` + alan altı mesaj.
- Submit → `POST /api/auth/login` (`{email, password, remember}`). Başarı → `router.push(next || "/")`.
- Hata → form üstünde `Alert variant="error"`, statüye göre eşlenmiş **jenerik** mesaj:

| Durum | Mesaj |
|---|---|
| 401 | "E-posta veya şifre hatalı." |
| 403 | "Hesabınız aktif değil. Yöneticinizle iletişime geçin." |
| 422 | "Girdiğiniz bilgileri kontrol edin." |
| ağ hatası / 5xx | "Sunucuya ulaşılamıyor. Lütfen tekrar deneyin." |

Hangi alanın hatalı olduğu **sızdırılmaz** (kimlik doğrulama gizliliği).

### 4.5 Container / presentational
- `login/page.tsx` (server): marka panelini render eder + `<LoginForm />` (client) gömer.
- `LoginForm.tsx` (client): form state, doğrulama, submit, hata gösterimi.

---

## 5. Giriş sonrası placeholder ana sayfa (`src/app/page.tsx`)

F0 varsayılan sayfası yerine geçer. **Client component**, plain `fetch` (React Query **değil** — F2 yalın; provider F3'te):
- Mount'ta `GET /api/auth/me` → yükleniyor / başarı / hata durumları.
- Başarı: "Hoş geldiniz, {full_name}" + rol `Badge` (`role_key`/`title`) + "Çıkış Yap" `Button`.
- "Çıkış Yap" → `POST /api/auth/logout` → `router.push("/login")`.
- 401 (edge durumları): `/login`'e yönlendir.
- Bu sayfa **geçici** — F3 kabuğu (Topbar/Sidebar/dashboard) yerine koyacak. Doğal ekleme noktası.

---

## 6. Env & yapılandırma

- **`BACKEND_URL`** (server-only; `NEXT_PUBLIC` **değil** → istemci paketine sızmaz) — backend taban URL'i. `.env.local`'de (commit **YOK**), `.env.example`'da dokümante, Railway'de env var. BFF handler girişinde varlığı doğrulanır.
- `secure` cookie flag = `NODE_ENV === "production"`.
- Demo hesap görünürlüğü = `NODE_ENV === "development"`.
- **CI hermetik:** testler gerçek backend gerektirmez (§7). Çalışma zamanında `BACKEND_URL` gerçek backend'e (yerel `.venv` uvicorn veya Railway) bakar. Backend bu oturumda **deploy edilmez**; `BACKEND_URL`'i canlıya çevirmek yeterli olacak şekilde kurulur.

---

## 7. Test stratejisi

### 7.1 Vitest (birim/entegrasyon)
- `cookies.ts`: `readTokenExp` (geçerli/bozuk JWT), `buildAuthCookies` (remember açık/kapalı → maxAge var/oturum), `clearedAuthCookies`.
- `backend.ts`: `backendUrl` (env yok → throw), `proxyAuthenticated` (200 geçir; 401→refresh başarılı→retry+yeni cookie; 401→refresh başarısız→temizle+401). Backend `fetch` mock'lu.
- Route handler'lar: `login` (200→cookie yazar + token gövdede yok; 401/403/422 geçir; kötü Origin→403; geçersiz gövde→400), `logout` (cookie siler+204), `me` (proxy sonucu + newCookies yazımı).
- `LoginForm`: alan doğrulaması, başarı→push, hata eşleme (401/403/422/ağ), parola toggle, demo bloğu dev-only (NODE_ENV mock).
- `middleware`: cookie yok→`/login?next=` yönlendirme; cookie var→geçiş; muaf rotalar dokunulmaz.
- Kapsam **≥%80** (faz sonunda ölçülür).

### 7.2 Playwright E2E (hermetik)
- **globalSetup**: minik Node HTTP mock backend ayağa kaldırır (canned `TokenPair` + `MeResponse`, yanlış parola için 401). `playwright.config` `webServer.env.BACKEND_URL` = mock adresi. Böylece **gerçek BFF + middleware + cookie akışı** test edilir, backend sahte.
- Senaryolar:
  1. Giriş başarılı → `/` ana sayfada `full_name` görünür → "Çıkış Yap" → `/login`.
  2. Yanlış parola → hata `Alert` görünür, `/login`'de kalır.
  3. Oturumsuz `/`'a git → `/login?next=/`'e yönlendir.
  4. (opsiyonel) Cookie httpOnly: `document.cookie` token içermez.

### 7.3 Playwright görsel regresyon
- `/login` snapshot. **TUZAK:** baseline'lar CI-Linux'ta üretilir → `visual-baselines.yml` (workflow_dispatch) ile Linux baseline üret, artefaktı indir, `e2e/*.spec.ts-snapshots/*-chromium-linux.png` commit'le. Element/sayfa snapshot'larında **tam-sayı line-height** (kesirli → 1px jitter → sert hata).
- `/login` açık rota olduğundan snapshot oturumsuz alınır.

---

## 8. Güvenlik

- Token'lar **httpOnly** cookie'de; JS erişemez (XSS token çalamaz). `localStorage` **kullanılmaz**.
- `SameSite=Lax` + same-origin BFF + POST handler'larda `Origin`/`Host` kontrolü = CSRF savunması.
- Hata mesajları jenerik; ham backend hatası veya hangi alanın yanlış olduğu sızdırılmaz.
- `BACKEND_URL` server-only; istemci paketine hiçbir secret girmez.
- Login/logout/me = güvenlik-hassas → faz sonu `security-reviewer` (spec §10.3).

---

## 9. Kabul edilen ödünçler

1. **Stateless refresh iptali yok:** logout cookie siler ama backend refresh token'ı exp'e kadar geçerli kalır. Backend donmuş; sunucu-tarafı revocation B3+ konusu.
2. **Middleware imza doğrulamaz:** edge'de yalnız cookie varlığı; gerçek yetki API'de. Standart Next.js kalıbı.
3. **React Query provider yok:** ana sayfa plain-fetch; provider F3'e ertelendi.
4. **Pasif/on_leave davranışı backend'e bağlı:** login'in pasif kullanıcıyı reddedip reddetmediği sözleşmede yok; BFF statü kodunu geçirir, UI 403'ü "hesap aktif değil"e eşler. Backend gerçek davranışı doğrulanınca teyit edilir.

---

## 10. Doğrulama kapıları (§10)

TDD (kırmızı→yeşil→refactor) · ≥%80 kapsam · `react-reviewer` + `security-reviewer` · Playwright görsel (mockup karşılaştırma) · E2E kritik akış (giriş→ana sayfa→çıkış). Tüm kapılar (lint/typecheck/test/build) + CI (build+visual) YEŞİL olmadan F2 kapanmaz.

---

## 11. Konvansiyonlar (F0/F1'den devam)

Yalnız `pnpm`. Tailwind yok — ham CSS + `tokens.css`. Mevcut 8 primitive kullanılır. Açık tema, ≥1280px. Kod/isim/dosya İngilizce; UI metni + yorumlar Türkçe. Commit başlıkları İngilizce `<type>: <desc>`, Türkçe özel karakter yok. `.env.local`/secret asla commit edilmez. Her task taze subagent + TDD + task sonu commit; birkaç task'ta bir push.
