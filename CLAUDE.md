# FİİL Yapı ERP — Frontend

## KRİTİK TASARIM KURALI: Her şey mockup'a göre

Bu projedeki **her sayfa/ekran, repo dışındaki `../projedesign/` klasöründeki HTML mockup'lara BİREBİR** uyacak şekilde yapılır. **Kafana göre / spec'ten serbest yorumla sayfa tasarlamak YASAK.**

- Bir UI işine başlamadan ÖNCE ilgili `../projedesign/<Sayfa>.dc.html` mockup'ını **render edip** (headless chromium; `@playwright/test` kurulu) ekran görüntüsüne bak. Layout, sidebar, sekme stili, kartlar, tablo sütunları, renkler, çipler, butonlar, boşluklar — hepsi mockup'tan alınır.
- Tasarım sistemi referansı: `../projedesign/uploads/FİİL ERP design system/Design System.dc.html` + `src/styles/tokens.css`. Yeni renk/spacing gerekiyorsa mockup değerini token'a çevir; **çıplak hex yasak**.
- Mockup'ta olup backend'in sağlamadığı alan (or. Kullanıcılar > "Son Giriş" = last_login) → zarif düşüş uygula VE kullanıcıya bildir; sessizce atlama yok.
- Ayarlar navigasyonu: Ayarlar'a girince sol menü **Ayarlar sidebar'ına** döner (GENEL / KULLANICI & ERİŞİM / SİSTEM); en üstte **"← Gösterge Paneli"** dönüş linki asıl uygulama sidebar'ına döndürür.
- Mockup mevcut mimariyle (F3 kabuk vb.) çelişirse kullanıcıya sor; varsayılan olarak **mockup kazanır**.

## Yığın / kurallar
- Next.js 15 App Router · React 19 · TS strict · **pnpm** (yalnız). Tailwind YOK — ham CSS + `src/styles/tokens.css`.
- Kod/isim/dosya İngilizce; UI metni + yorumlar Türkçe. Commit başlıkları İngilizce `<type>: <desc>`.
- Kapılar: `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm build`. Görsel: Playwright, baseline **yalnız Linux** (macOS PNG commit edilmez).
