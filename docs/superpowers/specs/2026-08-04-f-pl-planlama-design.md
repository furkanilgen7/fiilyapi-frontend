# F-PL — Şantiye Planlama Ekranı (frontend spec)

Tarih: 2026-08-04 · Durum: **ONAYLANDI (2026-08-04)** — S1 kullanıcı kararı (verbatim): "mockupa uygun
bir şekilde sen türet ama uygın olsun" → §3'teki etkileşim tasarımı ONAYLI, ek şartla: popover/butonlar
ızgaranın KENDİ görsel dilinden türetilir (mockup'ın renkleri, hücre stili, token'lar — yabancı duran
hiçbir kontrol yok; final review'de "mockup'ın yanına konsa sırıtır mı?" testi) · S2: Ay/Sprint kipleri
devre-dışı + gerekçe (kendi mockup'ları gelince açılır).
Mockup: `Şantiye - Planlama.dc.html` (P). Backend: PL CANLIDA (6 yol: plan GET + rows/cells/goals/sprint
PUT + day-summary). Üst kural geçerli. ⚠️ Tarih artefaktı: P105 "21-27 Temmuz 2026" gerçek takvimle
uyuşmuyor — tarihler kopyalanmaz, gerçek hafta kullanılır.
**KRİTİK:** mockup ızgarası SALT-OKUNUR çizilmiş — hücre düzenleme, satır ekleme, hedef ekleme, sprint
düzenleme etkileşimlerinin HİÇBİRİ mockup'ta yok. "Form mockup'ı önce istenir" kuralı gereği §5 S1 sana geliyor.

## 1. Rota + mod anahtarı
`.../santiyeler/[siteId]/gunluk-kayit/planlama` — GK/Özet ile aynı mod anahtarı ailesi; F-SD'deki
devre-dışı "Planlama" linki AKTİFLEŞİR (GK'deki gömülü bloğun "Planlama'ya git" linki de).
BFF: yeni kök GEREKMEZ (`sites` altında — grep'le teyit). T1'de **BC+PL openapi devri** (115 yol,
frontend main'de tek commit — F-PL'ye devredilen kural).

## 2. Ekran içeriği (P birebir)
- Başlık + hafta gezinme `‹ hafta aralığı ›` (gerçek takvim; Pzt bazlı `week_start`) + **Kaydet** butonu.
- Görünüm kipi Hafta/Ay/Sprint (P93-95): yalnız **Hafta** çizilmiş → Ay ve Sprint butonları
  DEVRE-DIŞI + gerekçe (§5 S2). "Aktif Sprint: …" etiketi (P107) sprint tablosundan.
- **Izgara:** bölüm gruplu crew satırları (`Kalıpçı (14)`) + "Makine & Ekipman" grubu (equipment
  satırları) · 7 gün sütunu (Cmt/Paz vurgusu türev) · hücreler `text` + 6'lı renk etiketi (mockup
  renkleriyle birebir; boş hücre = plan yok).
- **Malzeme Planı kartı (P185-201):** PENDING — stok modülü yok; kart görünür, devre-dışı + gerekçe.
- **Haftalık Hedefler (P203-227):** checkbox (`is_done`) + başlık + serbest alt-metin (`note`) +
  4 değerli durum rozeti.
- Kaydetme: `PUT cells/rows/goals/sprint` — hepsi DEĞİŞTİRME semantiği (hafta+şantiye kapsamı);
  "Kaydet" tümünü sıralı yazar, kısmi hata → görünür hata + yeniden dene (sessiz yarım kayıt YOK).
- İzin: `site_diary` (şef+saha yazar; PM salt-okur — kontroller devre-dışı görünür).

## 3. Düzenleme etkileşimi (§5 S1 kararına bağlı — ÖNERİLEN TASARIM)
Mockup göstermediği için öneri (onaylanırsa onaylı tasarım sayılır, F-TH detay emsali):
- **Hücre:** tıkla → küçük popover: metin girişi + 6 renkli etiket seçici + Temizle. Escape/dış tık iptal.
- **Satır yönetimi:** grup başlığı yanında "+ Satır" (etiket + işçi sayısı + bölüm/ekipman türü);
  satır menüsünde sil (hücreleriyle — onay diyalogu).
- **Hedef yönetimi:** kart altında "+ Hedef" (başlık + not + durum); satır menüsünde sil.
- **Sprint:** etiket yanında kalem ikonu → tek alanlık düzenleme.
Hepsi `ui/` primitive'leriyle, token'lı; görsel spec'lere popover açık durumu da eklenir.

## 4. Teknik
Hook'lar: plan GET + 4 PUT + day-summary (F-SD'de yazıldıysa paylaşılır). e2e mock-backend'e plan
uçları. Görsel spec'ler: ızgara (dolu/boş) + hedefler + popover. 5. kapı zorunlu. F-SD ile çakışma:
bu dilim F-SD MERGE EDİLDİKTEN sonra main'den açılır (mod anahtarı dosyaları ortak).

## 5. AÇIK SORULAR (kullanıcı cevabı ŞART)
- **S1 — Düzenleme etkileşimi:** mockup'ta hiç yok. (a) §3'teki önerilen tasarıma ONAY ver (popover +
  "+ Satır"/"+ Hedef" — ayrı mockup gelmeyecek), ya da (b) etkileşim mockup'ı ver, beklerim. Önerim: (a).
- **S2 — Ay/Sprint görünüm kipleri:** çizilmemiş → devre-dışı + gerekçe (ileride kendi mockup'larıyla
  gelir). Onay? (Alternatif: Ay görünümünü icat etmek — önermem, üst kurala aykırı.)
