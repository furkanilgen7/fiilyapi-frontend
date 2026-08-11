# F-P10 mini — Maliyet/Kâr değerleri + devir (frontend plan)

Tarih: 2026-08-11 · Spec: `../specs/2026-08-11-f-p10-maliyet-kart-design.md` (ONAYLI) ·
Dal: `feat/f-p10-maliyet-kart` (main'e döndükten SONRA güncel main'den) · Task başına TEK subagent.

## T1 — Checkout + devir
- Yerel checkout'u `main`e döndür (`fix/f-bc-smoke-nosniff` uzakta merge'li — dalı sil), `git pull`.
- openapi devri: backend main'de TAZE üret → kopyala → `pnpm gen:api` → TEK commit.
  Beklenen farklar spec §1/T1'de; **çift MetricPlaceholder tuzağına dikkat** (projects `string|null`
  oldu, dashboard değişmedi). P9 `UnitResponse` kırıcısı typecheck'te temiz geçmeli (tüketen UI yok);
  kırık çıkarsa DUR, rapor.
- e2e mock'a yeni şema alanları (maliyet zarf değerleri + işveren `quantity_source`) — şemayla
  senkron testi (F-P5 dersi).

## T2 — Değer bağlama (TDD)
- E4 kartları: 4 zarf alanı `available=true` dalında gerçek değer basar (tip-bazlı alan setleri
  E4 106-165 birebir; taahhütte "Harcanan"); `available=false` pending görünümü aynen.
- F-SD işveren rozeti: sunucu `quantity_source` alanından okur; oturum-içi türetme + eski uyarı
  metni KALKAR (S1). Taşeron rozet deseniyle ortaklaştır (kopya bırakma).
- "0 KB" rötuşu: 1 KB altı boyut "1 KB'den küçük" basar (formatDocumentSize + testi).

## T3 — Görsel + kapanış + FINAL REVIEW (Opus)
- E4 kart baseline'ları gerekçeli yenilenir (pending→değer); görsel kural ÜÇ parça (yükleme iddiası ·
  scroll sıfırlama · imleç parkı). Beş kapı.
- Review odağı: zarf dallanması (`available` bayrağına bakılıyor, alan tipine değil — PT kuralı) ·
  "Maliyet Kırılımı" erken basım sızıntısı = bulgu · mock-şema senkronu.
- ARCHITECTURE-FRONTEND + ROADMAP-FRONTEND güncelle (devir borcunun KAPANDIĞI notu), commit.
  Push/PR/baseline/merge/deploy kullanıcı onayıyla; smoke odağı spec §3.
