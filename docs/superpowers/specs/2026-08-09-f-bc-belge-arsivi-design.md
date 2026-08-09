# F-BC — Belge Arşivi ekranları (frontend spec)

Tarih: 2026-08-09 · Durum: **ONAYLANDI (2026-08-09)** — §6'nın DÖRT sorusu da önerildiği gibi onaylandı:
S1 türetilmiş minimal diyaloglar (yükle: dosya+klasör+açıklama · yeni klasör: ad; kart tıklaması=indirme —
ONAYLI SAPMA, F-PL S1 emsali) · S2 klasör yeniden adlandırma/silme BASILMAZ · S3 form belge kartları
kapsam DIŞI (BC-2 "form-slot bağı" backend borç adayı ROADMAP'e) · S4 E12 kökleri = görünür projeler.
Mockup: `Ekran 12 - Belge Arşivi.dc.html` (**E12**, 190 satır) · `Şantiye - Belgeler.dc.html` (**ŞB**, 169 satır)
Backend: BC ✅ CANLIDA (PR #20; 9 uç, 20. izin modülü `documents`). ROADMAP-BACKEND §1.11 "Frontend (F-BC) için notlar" ZORUNLU okuma.

## 1. Kapsam

İki ekran: **E12** genel arşiv (`/belgeler` — kabuk sidebar "Belge Arşivi" öğesi ComingSoon'dan çıkar) ·
**ŞB** şantiye sekmesi (`.../santiyeler/[siteId]/belgeler` — drill sekme şeridinde "Belgeler" zaten canon).
Form belge kartlarına DOKUNULMAZ (§6 S3). T1: openapi devri (taze üretim! P10 merge olduysa birlikte,
değilse 116 yol) + BFF'e **İKİ kök birden**: `documents` + `document-folders` (grep + adlı kapı testi) +
`planlama-izgara` locator'ına `.first()` flake sertleştirmesi (onaylı ek kapsam).

## 2. Ekran yapısı (satır gerekçeli)

### E12 — `/belgeler`
- İki panel: sol klasör paneli 240px (E12 68-112) + içerik. E12'nin kendi sol menüsü/üst barı BASILMAZ —
  kabuk canon kazanır (F-PL kabuk sapması emsali); bağlam çipi (E12 26-31) kabukta yok, basılmaz.
- Klasör paneli: kökler = görünür PROJELER (E12 77/102/106/110 proje adları kök) → seçilen projenin
  klasörleri girintili (79-98). "KLASÖRLER" başlığı + "+" butonu (72-73). Sayı rozeti YOK (mockup'ta yok).
- İçerik: breadcrumb metni (118) + klasör adı başlık (119) + "↑ Yükle" ve "+ Yeni Klasör" (121-124) ·
  belge kart grid'i (128-158: emoji tip ikonu + ad + "boyut · tarih") + "Dosya Yükle" dashed kartı
  (159-162) · "Son Eklenenler" listesi (166-184).
- Kart aksiyonu YOK (mockup'ta çizilmemiş) — kart tıklaması = İNDİRME (tek anlamlı eylem; §6 S1).

### ŞB — `.../santiyeler/[siteId]/belgeler`
- Breadcrumb + 6'lı sekme şeridi (ŞB 73-80) kabuk deseninden; "Belgeler" aktif.
- Sol klasör paneli (37-69): "TÜM BELGELER" kökü + şantiye klasörleri; başlıkta "+" (40).
- Kart grid (94-134) + "SON EKLENENLER" listesi (137-164): ikon / ad / meta alt satırı (klasör ·
  açıklama — ŞB 144/151/158) / boyut / tarih / **"İndir" butonu** (147/154/161).
- Kapsam: BC kuralı — `site_id` SÜZGEÇTİR; ŞB her istekte `site_id` geçer. E12'de `site_id`
  GEÇİLMEZ → yalnız proje düzeyi kayıtlar (backend `IS NULL` semantiği; "hepsi" değil — bilinçli).

## 3. Veri/etkileşim kuralları

- **İndirme ikili akış**: BFF `Content-Type` tabanlı geçirme + `Content-Disposition` korunur;
  `status>=400` JSON dalı (F-TH tuzağı). `export-filename.ts` deseni.
- **Yükleme** `POST /documents` **multipart** — BFF gövdeyi olduğu gibi geçirmeli (JSON'a çevirme!).
  Sınır aşımı 413 + uzantı reddi 422 Türkçe mesajla görünür basılır.
- Arama: üst "Belge ara" (E12 35 / ŞB 29) → `GET /documents?q=` (istek kapsam parametreleriyle).
- "Son Eklenenler" sıralaması İSTEMCİDE (backend sıralama parametresi YOK — bilinçli sınır).
- Tip ikonu uzantıdan türev (emoji eşlemesi: pdf 📄 · xlsx/xls 📊 · jpg/png 🖼 · dwg 📐 · zip 🗂 —
  E12/ŞB örneklerinden; bilinmeyen uzantı 📄).
- Versiyon/onay/etiket/thumbnail YÜZEYİ YOK (mockup'ta da yok; backend bilinçli sınırlarıyla uyumlu —
  "Rev3"/"v4" yalnız dosya ADI metnidir).
- Boş durumlar: klasörsüz proje · belgesiz klasör — sade Türkçe boş-durum metni (uydurma örnek satır
  BASILMAZ; mockup'taki örnek dosyalar VERİ örneğidir, sabit içerik değil).

## 4. BASILMAYANLAR (kalıcı kararlar; sızıntı = review bulgusu)

- **Belge SİLME düğmesi** — uç var ama mockup'ta aksiyon yok (BC kalıcı kararı; ekrana bağlanmaz).
- **Klasör yeniden adlandırma/silme düğmeleri** — mockup'ta yok (§6 S2). PATCH/DELETE uçları durur.
- Form belge kartları (§6 S3) — pending kalmaya devam eder.
- Klasör silme/`documents:admin` yetkisi UI'da ima edilmez (fiilen yalnız system_admin — bilinçli sınır).

## 5. Test/kapanış

Beş kapı + görsel spec'ler (E12 grid · E12 boş durum · ŞB grid · ŞB liste; tıklama+fullPage varsa
scroll-sıfırlama kuralı) + Linux baseline turu · BFF kök adlı kapı testleri (`documents`,
`document-folders`) · multipart geçirme testi · ikili indirme testi · kapanışta canlı smoke
(yükle→listele→ara→indir→temizle; temizlik için DELETE ucu API'den kullanılabilir — düğme basılmadan).

## 6. AÇIK SORULAR (kullanıcı cevabı ŞART)

- **S1 — Yükleme + yeni klasör etkileşimi ÇİZİLMEMİŞ** (butonlar var, form yok — E12 121-124/159-162).
  Öneri (F-PL S1 "ekranın kendi dilinden türetilmiş etkileşim" emsali): minimal türetilmiş diyalog —
  yükle: dosya seç + hedef klasör (aktif klasör varsayılan) + isteğe bağlı açıklama; yeni klasör:
  tek "ad" alanı. Kart tıklaması = indirme. Alternatif: form mockup'ı bekle (dilim bloklanır).
- **S2 — Klasör yeniden adlandırma/silme:** öneri: BASILMAZ (mockup'ta yok; belge silme kararının
  emsali). Uçlar API'den kullanılabilir kalır.
- **S3 — Form belge kartları (şantiye 6 · bölüm 3 · satış 6 · proje 6 · personel):** öneri: bu dilimde
  KAPSAM DIŞI — belge↔varlık bağı backend'de YOK (documents yalnız proje/şantiye/klasör taşır; bölüm/
  ünite/personel FK'sı yok). Bağ, ayrı bir backend dilimi (BC-2 "form-slot bağı") ister; ROADMAP'e borç
  adayı yazılır. Alternatif: kartları genel arşive kapsam etiketiyle yüklet (bağ kaybı — önerilmez).
- **S4 — E12 klasör panel kökleri:** öneri: görünür projeler listesi (mockup kökleri proje adları);
  proje seçimi klasörleri + o projenin proje-düzeyi belgelerini getirir. Şantiye kırılımı E12'de YOK
  (ŞB'nin işi). Alternatif: proje+şantiye iki seviye ağaç (mockup çizmiyor — icat).
