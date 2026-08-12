# F-ST — Stok ekranları (frontend plan)

Tarih: 2026-08-12 · Spec: `../specs/2026-08-12-f-st-stok-ekranlari-design.md` (ONAYLI) ·
Dal: `feat/f-st-stok-ekranlari` (güncel main'den — `6a7b2b1` devir commit'i dahil olmalı) ·
Task başına TEK subagent, her task sonunda commit.

## T1 — Altyapı + viewport borcu
- BFF `ALLOWED_ROOTS`a **`stock` + `warehouses`** + iki adlı kapı testi (grep'le "zaten var"
  varsayma). `gen:api` GEREKMEZ (şema 125 senkron — doğrula).
- **Viewport düzeltmesi (onaylı borç):** 4 spec'e (login/shell/settings/visual) `setViewportSize
  (1440×900)` + etkilenen ~12 baseline Linux turunda gerekçeli yenilenir (kapanış zincirinde).
- Hook katmanı (`useStockItems` · `useSiteStock` · `useStockSummary` · `useWarehouses` · giriş
  mutasyonu) + e2e mock üreticileri (şemayla senkron — F-P5 dersi).

## T2 — E3 `/stok` genel ekran
- KPI şeridi (pending "Bekleyen Sipariş" zarftan — `available` dallanması) · durum segmenti ·
  kategori select + arama (`?q=`) · katalog tablosu (durum rozetleri sunucudan; kritik/düşük satır
  vurgusu E3 121/139/166) · sidebar "Stok & Depo" aktif rota + nav href guard testi.
- "+ Malzeme Ekle" türetilmiş diyalog (S1) · "Stok Hareketi" devre-dışı+gerekçe (S2) ·
  "+ Depo Ekle" türetilmiş diyalog (S3 — depo listesi yönetimi minimal).

## T3 — ŞS şantiye sekmesi
- Drill "Stok" sekmesi ComingSoon'dan çıkar; KPI + şantiye bakiye tablosu; "Aylık İhtiyaç"/"Bölüm"
  sütunları pending (görünür gerekçeli) · satır aksiyonları SA'ya devre-dışı+gerekçe (S5) ·
  "+ Stok Girişi" → giriş formuna (şantiye deposu öndolu).

## T4 — SG giriş formu (`.../stok/giris`)
- SG birebir: 3'lü tip radio kartı · giriş bilgileri (sipariş alanı pending devre-dışı) · kalem
  satırları (stok kartından seç; gelen/birim fiyat; tutar türev; kalite select; "Sipariş" sütunu
  pending) · transfer tipinde koşullu "Kaynak Depo" (S4) · belgeler kartı BC form-slot pending ·
  not + oto-bildirim pending. 404/422 Türkçe görünür hatalar (§4b kanonu) · başarıda ilgili
  listeler tazelenir. ui/ primitive'leri.

## T5 — Görsel + kapanış + FINAL REVIEW (Opus)
- 4 görsel spec (`stok-genel` · `stok-genel-bos` · `santiye-stok` · `stok-giris-formu`) — kanonik
  `prepareFrame`; beş kapı.
- Review odağı: pending sızıntısı (sipariş alanı gövdeye SIZMAZ — gövde anahtar testi, F-PT emsali) ·
  durum formülünün istemcide YENİDEN hesaplanmadığı · mock-şema senkronu · BASILMAYANLAR
  (hareket listesi ekranı icadı = bulgu).
- ARCHITECTURE-FRONTEND + ROADMAP-FRONTEND güncelle, commit. Push/PR/baseline (viewport
  yenilemeleri dahil)/merge/deploy kullanıcı onayıyla; smoke: gerçek giriş→bakiye→transfer çift
  bacak telden→adjustment ile sıfırlama temizliği.
