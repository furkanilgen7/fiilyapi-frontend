# F4: Ayarlar (Kullanıcılar · Roller · İzin Matrisi) — Tasarım

**Goal:** FİİL Yapı ERP frontend'ine `/ayarlar` bölümünü eklemek: backend B3'ün kullanıcı yönetimi, rol yönetimi ve rol×modül izin matrisi uçlarını tüketen üç sekmeli tam Ayarlar deneyimi. F3 kabuğu içinde çalışır; yalnızca `user_management` izni olan kullanıcılar (seed'de system_admin) erişir.

**Architecture:** Next.js App Router `(app)/ayarlar/` alt-route-group; `ayarlar/layout.tsx` üstte rota-bazlı sekme şeridi + `{children}` render eder. Üç sayfa: `kullanicilar`, `roller`, `izin-matrisi`. Sunucu-state TanStack Query ile (AppShell'e `QueryClientProvider`). Backend'e erişim tek genel BFF catch-all proxy (`/api/backend/[...path]`) üzerinden, mevcut JWT httpOnly cookie + refresh altyapısıyla.

**Tech Stack:** Next.js 15 App Router · React 19 · TS strict · pnpm · Vitest + RTL · Playwright · openapi-fetch/openapi-typescript. **Yeni bağımlılık:** `@tanstack/react-query`.

**Spec kaynağı:** Backend B3 canlı OpenAPI (`fiilyapi-backend`, `217674c`). Kurulum: F3 kabuk ([[frontend-f3-kabuk]]) + F2 auth/BFF ([[frontend-f2-giris-bff]]) üzerine.

---

## Global Constraints

- Yalnız **pnpm**. Tailwind YOK — ham CSS + `src/styles/tokens.css`. Mevcut 8 primitive + F2 auth + F3 kabuk altyapısı kullanılır.
- Açık tema, ≥1280px. Responsive/koyu tema yok.
- Kod/isim/dosya **İngilizce**; UI metni + yorumlar **Türkçe**.
- Commit başlıkları **İngilizce** `<type>: <desc>`, Türkçe özel karakter yok.
- Token-only CSS: çıplak hex yasak (fallback dahil; gerçek token adı). rgba gölge serbest. Yeni renk gerekirse `tokens.css`'e token eklenir.
- TDD: kırmızı → yeşil → refactor. Task sonu commit; birkaç task'ta bir push. Doğrudan `main`'de çalışılır.
- **UI/rota task'larında `pnpm build` koşulur** (F2/F3 dersi: route-group/Suspense build hataları diff review'da kaçar).
- Görsel snapshot: Linux baseline `visual-baselines.yml` (workflow_dispatch); macOS PNG asla commit edilmez.
- Faz sonu tüm kapılar (lint/typecheck/test/build) + CI (build+visual) YEŞİL olmadan F4 kapanmaz.

---

## 1. Rotalama & Sekme Kabuğu

- `src/app/(app)/ayarlar/layout.tsx` (client) — üstte sekme şeridi + `{children}`. Sekmeler `<Link>` + `usePathname()` aktif vurgu (F3 Sidebar `isActive` prefix kalıbı yeniden kullanılır/ortaklaştırılır).
- Sekmeler: **Kullanıcılar** (`/ayarlar/kullanicilar`), **Roller** (`/ayarlar/roller`), **İzin Matrisi** (`/ayarlar/izin-matrisi`).
- `src/app/(app)/ayarlar/page.tsx` → `redirect("/ayarlar/kullanicilar")` (server component `redirect`).
- Sekme şeridi kendi CSS'i (`ayarlar.css`); token-only.

## 2. BFF — Genel Catch-all Proxy

- `src/app/api/backend/[...path]/route.ts` — `GET/POST/PATCH/PUT/DELETE` export'ları. Her biri: access/refresh cookie'lerini okur → `proxyAuthenticated` ile backend'e `method + path + query + json body` iletir → backend status+body'yi aynen döner. `refreshedAccessToken` varsa cookie güncellenir; `401` → cookie temizle + `{ok:false,code:"unauthenticated"}`; `403` → body'yi geçir (ekran "yetkiniz yok" gösterebilsin, cookie temizlenmez). Diğer 5xx → `{ok:false,code:"unavailable"}`.
- `@/lib/auth/backend` `proxyAuthenticated` **genişletilir**: mevcut imza yalnız GET `/auth/me` içindi; artık `method`, `body`, `query` parametreleri alır (davranış-koruyucu: varsayılan GET). Refresh-retry mantığı korunur.
- `path` allow-list: yalnız beklenen kökler (`users`, `roles`, `modules`, `projects`) forward edilir; bilinmeyen kök → 404. (SSRF/keşif yüzeyini daraltır; backend zaten yetki uygular.)
- Tip-güvenli istemci: `openapi-fetch` client `baseUrl: "/api/backend"`. Mevcut `apiClient` (`baseUrl:"/api"`) kullanımı planda doğrulanır: kullanılmıyorsa `/api/backend`'e repoint, kullanılıyorsa ayrı `backendClient` eklenir.

## 3. Sunucu-state — TanStack Query

- `@tanstack/react-query` eklenir. `src/lib/query/QueryProvider.tsx` (client) `QueryClientProvider` + tek `QueryClient` (varsayılanlar: `retry: 1`, `refetchOnWindowFocus: false`, makul `staleTime`). AppShell içinde `SessionProvider`'ın hemen içine sarılır → tüm korumalı sayfalar erişir.
- Query anahtarları ve hook'lar (`src/lib/api/hooks/` altında, kaynak başına dosya):
  - `useUsers({limit, offset})` → `GET /users` (`UserListResponse`).
  - `useRoles()` → `GET /roles` (`RoleResponse[]`).
  - `useModules()` → `GET /modules` (`ModuleResponse[]`).
  - `useProjects()` → `GET /projects` (`ProjectResponse[]`).
  - `useRolePermissions(roleId)` → `GET /roles/{id}/permissions` (`PermissionCell[]`).
- Mutasyon hook'ları başarıda ilgili query'yi `invalidateQueries` eder. İzin matrisi hücresi **optimistic update + hata rollback** (`onMutate`/`onError`/`onSettled`).

## 4. Ekranlar

### 4.1 Kullanıcılar (`/ayarlar/kullanicilar`)
- **Liste:** sayfalı tablo — Ad Soyad (`full_name`), E-posta, Unvan (`title`), Rol (`role_id`→`useRoles` ile ada çevrilir), Durum rozeti (`status`: active/on_leave/passive → Türkçe etiket + renk). `UserListResponse` `limit`/`offset` ile sayfalama (URL search param'da `?sayfa=`).
- **Yeni Kullanıcı:** modal/drawer form → `POST /users` (`UserCreate`: `email`, `password`, `full_name`, `role_id` zorunlu; `title`, `status` opsiyonel). Rol seçici `useRoles`'tan.
- **Düzenle:** `PATCH /users/{id}` (`UserUpdate`: `full_name?`, `title?`, `role_id?`, `status?`).
- **Parola sıfırla:** küçük modal → `PATCH /users/{id}/password` (`PasswordReset`: `new_password`).
- **Sil:** onay diyaloğu → `DELETE /users/{id}`. Backend son aktif system_admin'i korur (409/4xx) → hata mesajı gösterilir.
- **Proje erişimi:** modal → `GET`/`PUT /users/{id}/project-access` (`ProjectAccessInput`: `all_projects` toggle + `project_ids` çoklu-seçim, `useProjects`'ten). Replace semantiği.
- Form doğrulama istemci tarafında (zorunlu alan, e-posta formatı, parola min uzunluk); backend hataları (409 e-posta çakışması, 4xx) kullanıcıya Türkçe gösterilir.

### 4.2 Roller (`/ayarlar/roller`)
- **Liste:** kart/tablo — emoji, ad (`name`), anahtar (`key`), açıklama, `is_system` rozeti.
- **Yeni Rol:** form → `POST /roles` (`RoleCreate`: `key`, `name` zorunlu; `emoji`, `description`). Backend yeni rolü 13 modül `none` ile seed eder.
- **Yeniden adlandır/düzenle:** `PATCH /roles/{id}` (`RoleRename`: `name` zorunlu; `emoji`, `description`). `key` değişmez.
- **Sil:** onay → `DELETE /roles/{id}`. Kullanımdaki/system rol → backend 4xx → mesaj.
- **is_system roller** (system_admin, patron): yeniden adlandır/sil **devre dışı** (UI kilidi + backend 403 güvenlik ağı).

### 4.3 İzin Matrisi (`/ayarlar/izin-matrisi`)
- **Tablo:** satır = 13 modül (`useModules`, `ModuleGroup`'a göre 5 gruba ayrılıp grup başlıklı: GENEL/SAHA/STOK_SATINALMA/MALI/SISTEM), sütun = roller (`useRoles`). İlk sütun modül adı sabit (sticky).
- **Veri:** her rol için `useRolePermissions(roleId)` (paralel query'ler) → istemcide `modül_key × rol_id → (access_level, scope)` haritası. Eksik hücre = `(none, all)`.
- **Hücre editörü:** tek dropdown, seçenekler **12 adlandırılmış preset**. Değişimde `PUT /roles/{id}/permissions/{module_key}` (`PermissionUpdate`: `{access_level, scope}`), **optimistic + rollback**.
- **Preset tablosu** (`src/lib/api/permission-presets.ts` sabit): `(access_level, scope)` ↔ preset key + Türkçe etiket:

  | Preset | access_level | scope | Etiket |
  |---|---|---|---|
  | super | admin | all | Süper (silme dahil) |
  | full | full | all | Tam |
  | none | none | all | — (Yok) |
  | view | view | all | Görüntüle |
  | limited | view | limited | Sınırlı |
  | finance | view | finance | Mali |
  | own | view | own | Kendi |
  | project | view | project | Proje |
  | stock | view | stock | Stok |
  | draft | draft | project | Taslak |
  | request | request | all | Talep |
  | approve | approve | all | Onay |

  Presete uymayan `(access_level, scope)` combo'su → dropdown'da "Özel" olarak salt gösterilir; kullanıcı seçince her zaman bir preset'e normalize edilir. `matchPreset(level, scope)` ve `presetToUpdate(key)` util'leri + testleri.
- **system_admin sütunu salt-okunur** (kilitlenme koruması; backend PUT'a 403).

## 5. Erişim Kontrolü
- `/ayarlar` yalnız `user_management` izni olanlara açıktır (seed: system_admin; ama custom rol de bu izne sahip olabilir → rol-anahtarı kontrolü yetersiz).
- Yaklaşım: **backend 403'e güven.** Ayarlar sayfalarındaki ilk veri fetch'i 403 dönerse, sekme kabuğu içinde dostça **"Bu alana yetkiniz yok"** durumu gösterilir (nav gizleme YOK). Sidebar "Ayarlar" girişi herkese görünür kalır (F3 canon).

## 6. Veri Akışı (özet)
```
Tarayıcı (TanStack Query hook)
  -> openapi-fetch (baseUrl /api/backend)
  -> /api/backend/[...path] (BFF, JWT cookie ekler, refresh)
  -> backend (B3 izin kapısı uygular)
  -> yanıt geri (status+body korunur)
```

## 7. Test
- **Unit (Vitest + RTL):**
  - `permission-presets` util: `matchPreset`/`presetToUpdate` tüm 12 preset + "Özel" combo.
  - Her ekran: tablo render, form gönderimi (mutasyon hook mock'lanır), boş/hata durumları.
  - İzin matrisi: hücre değişimi optimistic update, hata → rollback.
  - Query/mutasyon hook'ları fetch mock ile.
  - Mount fetch'leri TEK kez (F3 dersi: `[]` deps + active-flag; TanStack Query bunu doğal yapar).
- **E2E (Playwright, hermetik mock-backend genişletilir):** `users`/`roles`/`modules`/`projects`/`permissions` uçları mock'a eklenir. Akış: giriş → `/ayarlar` → sekme gezinme → kullanıcı-oluştur → matris hücre değişimi.
- **Görsel:** ayarlar üç ekranı Linux baseline (CI).

## 8. Dosya Haritası (yön verici; kesin liste planda)

**Oluşturulacak:**
- `src/app/(app)/ayarlar/layout.tsx` + `ayarlar.css` · `page.tsx` (redirect) · `kullanicilar/page.tsx` · `roller/page.tsx` · `izin-matrisi/page.tsx`
- `src/app/api/backend/[...path]/route.ts`
- `src/lib/query/QueryProvider.tsx`
- `src/lib/api/hooks/*.ts` (users, roles, modules, projects, permissions)
- `src/lib/api/permission-presets.ts`
- `src/components/settings/*` (tablo/form/modal/matris bileşenleri + CSS)
- `e2e/settings*.spec.ts` (+ görsel baseline)

**Değiştirilecek:**
- `@/lib/auth/backend` (`proxyAuthenticated` method/body/query desteği)
- `src/components/shell/AppShell.tsx` (`QueryProvider` sarımı)
- `src/lib/api/client.ts` (baseUrl `/api/backend` repoint veya ayrı client)
- `src/lib/api/schema.d.ts` (gen:api ile yenilenir)
- `openapi/openapi.json` (backend snapshot)
- `e2e/mock-backend.ts` (F4 uçları)
- `package.json` (`@tanstack/react-query`)

## 9. Task Dilimlemesi (yön verici — kesin plan writing-plans'te)
1. gen:api snapshot yenile (openapi.json → schema.d.ts).
2. BFF genel proxy + `proxyAuthenticated` genişletme + testler.
3. TanStack Query kurulum (QueryProvider + AppShell + backendClient).
4. Ayarlar route group + sekme layout + redirect (+ build + görsel).
5. Kullanıcılar liste + sayfalama + query hook.
6. Kullanıcı mutasyonları (oluştur/düzenle/sil/parola/proje-erişim) + form/modal.
7. Roller ekranı (liste + oluştur/adlandır/sil).
8. İzin Matrisi (gruplu tablo + preset dropdown + optimistic PUT + preset util).
9. Erişim 403 durumu.
10. E2E (mock-backend genişletme + ayarlar akışı) + görsel baseline.
11. Faz kapanışı (kapılar + review + defter + hafıza + canlı doğrulama).

## 10. Backend Kontrat Referansı (B3, `217674c`)
- **AccessLevel** (7): `none, view, draft, request, approve, full, admin`. **Scope** (6): `all, own, project, finance, stock, limited`.
- **UserResponse:** `id, email, full_name, title, role_id, status`. **UserStatus:** `active, on_leave, passive`. (Rol adı yok → `role_id`+`/roles` join.)
- **UserCreate:** `email, password, full_name, role_id` (zorunlu) + `title?, status?`. **UserUpdate:** hepsi opsiyonel.
- **RoleResponse:** `id, key, name, emoji, description, is_system`. **RoleCreate:** `key, name` + `emoji?, description?`. **RoleRename:** `name` + `emoji?, description?`.
- **ModuleResponse:** `id, key, name, group, sort_order`. **ModuleGroup** (5): `GENEL, SAHA, STOK_SATINALMA, MALI, SISTEM`. 13 modül.
- **PermissionCell:** `{module_key, access_level, scope}`. **PermissionUpdate:** `{access_level, scope}`.
- **ProjectAccessResponse/Input:** `{all_projects, project_ids}`.
- Uçlar prefix'siz (`/users`, `/roles`, `/modules`, `/projects`, `/roles/{id}/permissions/{module_key}`); `/api/v1` YOK.

---

## Sonraki Faz
F5+ : gerçek modül ekranları (Gösterge Paneli, vb.). Ayarlar tamamlanınca modül geliştirmeye geçilebilir.
