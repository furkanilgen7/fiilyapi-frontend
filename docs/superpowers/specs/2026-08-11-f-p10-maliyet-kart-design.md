# F-P10 mini — Maliyet/Kâr değerleri + devir (frontend spec)

Tarih: 2026-08-11 · Durum: **ONAYLANDI (2026-08-11)** — §4'ün İKİ sorusu da önerildiği gibi:
S1 eski uyarı metni KALDIRILIR · S2 "Maliyet Kırılımı" bölümü BASILMAZ (F-P3'ün işi).
Backend: P10 (117 yol, `/projects/{id}/costs`) + TB4 CANLIDA. Mockup: `Ekran 4 - Projeler.dc.html` (E4) —
kart alanları ZATEN basılı (pending dalında); bu dilim değerleri gerçeğe bağlar. Yeni ekran YOK.

## 1. Kapsam (küçük dilim, 3 task)

### T1 — Devir + checkout
- Yerel checkout `fix/f-bc-smoke-nosniff` dalında kalmış → **main'e dön** (uzakta merge'li), dalı sil.
- **openapi devri (BC+P9+P10+TB4 birikimi):** backend main'de TAZE üret → kopyala → `pnpm gen:api` →
  TEK commit. Beklenen farklar: `/projects/{id}/costs` + `UnitResponse` P9 kırıcısı + işveren
  `quantity_source` + 10× `maxLength: 2000` + `pending_module: string | null`.
- ⚠️ **Çift MetricPlaceholder tuzağı:** openapi'de iki tam nitelikli sınıf yaşar —
  `app__modules__projects__schemas__MetricPlaceholder` (`string | null`, DEĞİŞEN) vs
  `app__modules__dashboard__schemas__MetricPlaceholder` (değişmedi). Karıştırma; typecheck kırığı
  çıkarsa önce bunu kontrol et.

### T2 — Değer bağlama
- **E4 proje kartları:** `construction_cost` (taahhütte HARCANAN — P10 kararı) · `estimated_profit` ·
  `margin` · `our_share_value` zarfları `available=true` olduğunda GERÇEK değer basar; `available=false`
  dalı (mevcut pending görünümü) aynen kalır. Tip-bazlı alan setleri E4 106-165'e birebir (Kendi
  Yatırım: Satış Hedefi/Satılan/Toplam Maliyet/Tahmini Kâr+marj · Kat Karşılığı: Kendi Pay/Arsa 0/
  İnşaat/Tahmini Kâr+marj · Taahhüt: Sözleşme Bedeli/Harcanan).
- **F-SD işveren rozeti göçü:** `quantity_source` artık işveren satır detayında GERÇEK — oturum-içi
  türetme kalkar, rozet sunucu alanından okunur (taşeronla aynı desen).
- **"0 KB" rötuşu (F-BC minörü):** 1 KB altı dosya boyutu "1 KB'den küçük" ya da bayt basar
  ("0 KB" yalanı biter).

### T3 — Görsel + kapanış
- E4 kart baseline'ları DEĞİŞECEK (pending → gerçek değer) — e2e mock'a maliyet alanları eklenir
  (şemayla senkron, F-P5 dersi), baseline'lar gerekçeli yenilenir; görsel spec kuralının ÜÇ parçası
  (yükleme iddiası · scroll sıfırlama · imleç parkı) uygulanır.
- Beş kapı + FINAL REVIEW + doküman + kapanış zinciri (kullanıcı onayıyla).

## 2. BASILMAYANLAR
`/projects/{id}/costs` ucunun KENDİ ekranı (KY/KK proje özet sayfaları) bu dilimde YAZILMAZ — F-P3'ün
işi. Dashboard "Ortalama Marj"a dokunulmaz (P10 S5).

## 3. Kapanış smoke odağı
Canlıda yalnız taahhüt projesi var → taahhüt kartlarında "Harcanan" gerçek (₺0 meşru); KY/KK kartı
canlıda GÖRÜLEMEZ (bilinen sınır, ilk KY/KK projesinde gözle bakılacak — P10 kaydı). Rozet göçü için
F-SD'de bir hakediş satırı kaydedilip rozetin sunucu değerini bastığı doğrulanır.

## 4. AÇIK SORULAR
- **S1 — Rozet göçünde eski uyarı metni** ("işveren tarafında kaydedilince manual" açıklaması):
  öneri: KALDIR — damga artık sunucuda kalıcı ve doğru; metin yalan söylerdi. Alternatif: güncelle.
- **S2 — Kapsam onayı:** üç task yeterli mi, yoksa `/costs` ucunu tüketen mini bir "Maliyet
  Kırılımı" bölümü bir yere basılsın mı? Öneri: BASILMASIN — mockup'taki yeri KY/KK proje özet
  ekranları (F-P3'ün işi); erken basmak icat olur.
