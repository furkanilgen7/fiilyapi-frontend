# F-PL — Şantiye Planlama Ekranı (uygulama planı)

Spec: `../specs/2026-08-04-f-pl-planlama-design.md` · Ön şart: spec §5 sorularının kullanıcı cevabı +
**F-SD merge+deploy edilmiş olmalı** (mod anahtarı dosyaları ortak; main'den açılır).
Dal: `feat/f-pl-planlama` · YENİ oturum önerilir · Her task = tek subagent + commit · Kapılar +
DOM değişiminde 5. kapı · **ARA REVIEW YOK** (WORKFLOW §2).

## T1 — Devir + altyapı
- **BC+PL openapi devri:** backend main'den taze şema (115 yol / 169 operasyon) → `openapi/openapi.json`
  + `pnpm gen:api` + kapılar → frontend main'de TEK commit (kural). `-Input/-Output` ayrışması çıkarsa taşı.
- BFF: yeni kök GEREKMEZ (`sites` altında — grep teyidi; `documents` kökleri F-BC'nin işi, EKLEME).
- Hook'lar: plan GET + 4 PUT + (day-summary F-SD'den paylaşılır). e2e mock-backend'e plan uçları.

## T2 — Izgara (okuma + görünüm)
- Hafta gezinme (gerçek takvim, Pzt bazlı) + bölüm gruplu crew satırları + ekipman grubu + 7 gün
  sütunu (Cmt/Paz vurgusu) + hücre renk etiketleri (mockup 6'lısı birebir) + "Aktif Sprint" etiketi.
- Ay/Sprint kipleri S2 kararına göre devre-dışı+gerekçe. Malzeme Planı kartı PENDING (devre-dışı+gerekçe).
- Mockup satır-numaralı sadakat; tarih artefaktı istisnası.

## T3 — Düzenleme etkileşimi (S1 kararına göre)
- Hücre popover (metin + renk seçici + Temizle) · "+ Satır" / satır sil (onay diyaloglu) · "+ Hedef" /
  hedef düzenleme (checkbox + durum) · sprint düzenleme.
- "Kaydet" → 4 PUT sıralı; kısmi hata görünür + yeniden dene (sessiz yarım kayıt YOK — test).
- PM salt-okur: tüm giriş yüzeyleri devre-dışı görünümde (test).

## T4 — Test + görsel
- Vitest (hook'lar, DEĞİŞTİRME gövde kurulumu, hata dalları, izin) + fonksiyonel e2e + görsel spec'ler
  (ızgara dolu/boş + popover açık + hedefler). Mock kayıtları kadrajdan uzak; `getByRole("alert")` yasak.

## T5 — FINAL REVIEW (Opus)
- Sadakat taraması (eksik öğe = bulgu) · F-SD mod anahtarındaki devre-dışı "Planlama" linklerinin
  AKTİFLEŞTİĞİ kanıtı (GK gömülü blok linki dahil) · PUT kapsam disiplini (yalnız görünen haftanın
  gövdesi gönderilir) · kapılar + build.
- `ARCHITECTURE-FRONTEND.md` + `ROADMAP-FRONTEND.md` güncellenir, commit. Push/PR/baseline/merge kullanıcıda.
