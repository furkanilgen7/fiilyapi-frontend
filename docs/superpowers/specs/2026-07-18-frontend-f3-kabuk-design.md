# FİİL Yapı ERP Frontend — F3: Uygulama Kabuğu (tasarım)

**Tarih:** 2026-07-18
**Faz:** F3 (bağımlı: F1 primitive'ler, F2 oturum)
**Kanon:** `../backend/docs/superpowers/specs/2026-07-17-temel-modul-design.md` §6.2 ("Kabuk"); mockup `../projedesign/Ekran 1 - Gösterge Paneli.dc.html` (kabuk = topbar+sidebar). `Ekran 4`/`Şantiye Detay` varyantları mockup sapması, kanon değil.

---

## 1. Amaç ve kapsam

Giriş sonrası korumalı sayfaları saran uygulama kabuğu: sabit Topbar + Sidebar + içerik alanı. Kabuk gezinilebilir ve gerçek; henüz yapılmamış modüller dürüst "yakında" sayfasına düşer (spec §7 felsefesi: "kabuk gerçek, veri dürüst").

**Kapsam içi:** `(app)` route group + kabuk layout, Topbar, Sidebar (statik nav + aktif vurgu + kullanıcı bloğu), SessionProvider (`/auth/me` tek fetch), ComingSoon placeholder + catch-all, nav ikonları, kabuk CSS, testler (Vitest + E2E + görsel).

**Kapsam dışı (bilinçli):** Proje seçici (proje verisi/API yok), FİİL AI kartı (AI modülü yeni projede planlı değil), bildirim rozeti/gerçek bildirim (v1 dışı, §9.4), izin-bazlı nav gizleme (izin matrisi F4), responsive/mobil, koyu tema, gerçek modül ekranları (F4+).

---

## 2. Rota yapısı

Next.js App Router **route group** `(app)` (URL'yi değiştirmez):

| Fiziksel yol | URL | Kabuk? | İçerik |
|---|---|---|---|
| `src/app/(app)/layout.tsx` | — | — | Kabuk (Topbar+Sidebar+içerik) sarmalayıcısı |
| `src/app/(app)/page.tsx` | `/` | ✓ | Placeholder ana sayfa (çıkışsız — çıkış sidebar'da) |
| `src/app/(app)/[...slug]/page.tsx` | `/projeler`, `/puantaj` … | ✓ | ComingSoon "Bu modül yakında" (slug'dan modül adı) |
| `src/app/login/page.tsx` | `/login` | ✗ | Giriş (grup dışı, kabuksuz) |
| `src/app/design-system/page.tsx` | `/design-system` | ✗ | Showcase (grup dışı; görsel testler oturumsuz) |

- Catch-all `[...slug]` yalnız daha spesifik rota olmayan yolları yakalar; gelecekte her faz kendi rota klasörünü (`(app)/projeler/page.tsx`) ekleyince catch-all'ı geçersiz kılar. Tek dosyayla tüm eksik modüller.
- middleware (F2) `/api`, `/login`, `/design-system`, statik dışında her şeyi korur → kabuk rotaları oturumsuz erişimde `/login`'e gider (değişmez).
- Mevcut `src/app/page.tsx` (F2 placeholder home) → `(app)/page.tsx`'e taşınır; kendi `/auth/me` fetch'i ve çıkış butonu kalkar (session context + sidebar sağlar). `src/app/home.css` → kabuk içi içerik stiline uyarlanır.

---

## 3. Kabuk bileşenleri

### 3.1 `(app)/layout.tsx` (server)
`<AppShell>{children}</AppShell>` render eder. `AppShell` client olduğundan `children` (server içerik) prop olarak geçer, RSC korunur.

### 3.2 `AppShell` (client, `src/components/shell/AppShell.tsx`)
`<SessionProvider>` içinde: `<Topbar/>` + `<Sidebar/>` + `<main className="app-content">{children}</main>`. CSS fixed düzen: Topbar `position:fixed;top:0;height:52px`; Sidebar `position:fixed;top:52px;left:0;width:220px;bottom:0`; `main` `margin-top:52px;margin-left:220px;padding:...`.

### 3.3 `SessionProvider` (client, `src/components/shell/SessionProvider.tsx`)
- Mount'ta `/api/auth/me`'yi **bir kez** çeker (F2 double-fetch dersi: `[]` deps + justified eslint-disable; `active` guard + unmount temizliği).
- Context değeri `{ me: MeResponse | null, isLoading: boolean }`. `useSession()` hook'u dışa açılır.
- `/me` 401/hata → `router.push("/login")`.
- Plain fetch (React Query değil — F2 kararı). Avatar baş harfleri `me.full_name`'den türetilir (yardımcı `initials(fullName)`).

### 3.4 `Topbar` (client, `src/components/shell/Topbar.tsx`)
- 52px, `background: var(--color-surface)`, alt kenarlık + hafif gölge.
- **Logo bloğu** (220px, sağ kenarlık): 28×28 primary kare + 4-çeyrek beyaz SVG glyph + "FİİL" (15/700) + "YAPI" (11/500 subtle). Statik.
- Sağ (`margin-left:auto`): **bildirim zili** (32×32, `--color-primary-soft` zemin, primary stroke ikon, **inert** — rozet/sayı yok) · **avatar çipi** (32×32, primary zemin, `me`'den baş harfler beyaz 12/700). Proje seçici yok.

### 3.5 `Sidebar` (client, `src/components/shell/Sidebar.tsx`)
- 220px, `background: var(--color-surface)`, sağ kenarlık, `overflow-y:auto`.
- **Nav grupları** statik `NAV_GROUPS` config'inden (`src/components/shell/nav-config.ts`). 4 grup (canon):
  1. **Genel:** Gösterge Paneli `/` · Onay Kutusu `/onay-kutusu` · Raporlar `/raporlar` · Projeler `/projeler`
  2. **Saha & İK:** Puantaj `/puantaj` · Personel `/personel` · Makine & Ekipman `/makine`
  3. **Stok & Satınalma:** Stok & Depo `/stok` · Satınalma & Teklif `/satinalma`
  4. **Sözleşme & Mali:** Sözleşmeler `/sozlesmeler` · Muhasebe `/muhasebe` · Hazine `/hazine` · Hakedişler `/hakedisler` · Mali Tablolar `/mali-tablolar` · Bordro `/bordro` · Belge Arşivi `/belge-arsivi`
- Grup başlığı: 10/600 uppercase, `--color-text-subtle`, letter-spacing.
- Her öğe `next/link`. **Aktif vurgu** `usePathname()` ile: aktif öğe açık-mavi zemin + primary metin/ikon + 600 (canon; sol-kenar YOK). `/` aktifliği tam eşleşme, diğerleri prefix eşleşme.
- **Sticky kullanıcı bloğu** (alt): `me` avatar+ad+rol (`title`/`role_key`) → satır (Ayarlar rotasına link `/ayarlar`); altında iki buton: "Ayarlar" (`/ayarlar`) + "Çıkış" (danger). **Çıkış** → `POST /api/auth/logout` → `router.push("/login")`.

### 3.6 `ComingSoon` (`src/components/shell/ComingSoon.tsx`)
Ortalanmış kart: modül adı + "Bu modül yakında eklenecek." Modül adı `[...slug]`'dan `NAV_GROUPS` araması ile bulunur (bulunamazsa slug'ı başlık-case gösterir).

### 3.7 İkonlar
`src/components/ui/icons/index.tsx`'e nav ikonları eklenir (stroke SVG, 18px, `currentColor`): dashboard/grid, inbox/check, chart-bar, building, calendar-check, user, truck/machine, box, cart, document, bank, wallet/treasury, clock/hakediş, chart-line, list/payroll, folder, bell, settings/gear. Mevcut 6 ikon korunur.

---

## 4. Veri / oturum akışı

Tek `/api/auth/me` çağrısı SessionProvider'da; Topbar avatarı + Sidebar kullanıcı bloğu context'ten okur. `me` yüklenene kadar: avatar/kullanıcı bloğu iskelet/boş, nav hemen görünür (statik). 401 → `/login`. Aktif-rota vurgusu tamamen istemci (veri gerektirmez).

---

## 5. Test stratejisi

- **Vitest:** `initials()` yardımcı; `SessionProvider` (me sağlar; 401→push /login; tek fetch); `Topbar` (logo + avatar baş harf `me`'den); `Sidebar` (4 grup + tüm öğeler render; `usePathname` mock ile aktif öğe vurgusu; çıkış post+redirect); `ComingSoon` (bilinen slug→modül adı, bilinmeyen slug→fallback); `nav-config` (her öğe href+ikon+label; hrefler benzersiz).
- **Playwright E2E** (mevcut hermetik mock backend, `webServer.env.BACKEND_URL`): giriş → kabuk görünür (sidebar grup başlıkları + kullanıcı bloğunda `full_name`) → yapılmamış nav öğesine (`/projeler`) tıkla → "yakında" + modül adı → sidebar'dan "Çıkış" → `/login`. Aktif vurgu: `/`'da "Gösterge Paneli" aktif.
- **Görsel regresyon:** kabuk içi ana sayfa (`/`) snapshot @1280 → Linux baseline `visual-baselines.yml` (workflow_dispatch) ile üret; tam-sayı line-height.
- Kapsam ≥%80 hedefi (F0/F1/F2 gibi coverage provider kurulu değil; test sayısı ile kapsanır).

---

## 6. Tokens / CSS

Kabuk CSS'i (`shell.css` veya bileşen-bazlı) token-only (çıplak hex yasak). Gerekebilecek yeni token'lar: `--color-nav-active-bg` (aktif nav zemini, mockup `#eff6ff`), gerekirse `--color-nav-active-text` (= `--color-primary`). Var olan token'lar kullanılır (`--color-surface`, `--color-border`, `--color-text*`, `--color-primary*`, `--color-danger*`, `--color-on-brand` gibi). Gölge: topbar `0 1px 3px rgba(0,0,0,0.06)` (mevcut konvansiyon).

---

## 7. Kabul edilen ödünçler

1. **Proje seçici yok:** proje verisi/API'si yok; topbar'da yer tutulmaz, proje modülü gelince eklenir.
2. **FİİL AI kartı yok:** AI modülü yeni projede planlı değil; AI fazı planlanınca eklenir.
3. **Bildirim zili inert:** gerçek bildirim v1 dışı (§9.4); zil görünür ama sayı/rozet yok, tıklama işlevsiz.
4. **İzin-bazlı nav yok:** izin matrisi F4; F3 tüm nav'ı statik gösterir, rol gizleme sonraki faz.
5. **Modül ekranları yok:** nav'daki modüller ComingSoon'a düşer; her faz geldikçe gerçek rota eklenir.

---

## 8. Doğrulama kapıları

TDD (kırmızı→yeşil→refactor) · lint/typecheck/test/build yeşil · `react-reviewer` · Playwright görsel (mockup karşılaştırma) · E2E (giriş→kabuk→yakında→çıkış) · CI (build+visual) yeşil olmadan F3 kapanmaz. **UI task'larında `pnpm build` koşulur** (F2 dersi: `useSearchParams`/Suspense gibi build-zamanı hatalar diff review'da kaçar).

---

## 9. Konvansiyonlar

Yalnız pnpm. Tailwind yok — ham CSS + `tokens.css`. Mevcut 8 primitive + F2 auth altyapısı kullanılır. Açık tema, ≥1280px. Kod/isim/dosya İngilizce; UI metni + yorumlar Türkçe. Commit başlıkları İngilizce `<type>: <desc>`. `.env.local`/secret commit edilmez. Her task taze subagent + TDD + task sonu commit; birkaç task'ta bir push. Doğrudan `main`'de çalışılır (F0-F2 konvansiyonu).
