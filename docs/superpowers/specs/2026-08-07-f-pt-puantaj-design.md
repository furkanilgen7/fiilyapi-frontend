# F-PT — Puantaj Ekranları (frontend spec)

Tarih: 2026-08-07 · Durum: **ONAYLANDI (2026-08-07)** — §6'nın İKİ sorusu da önerildiği gibi onaylandı:
S1 hücre popover türetimi (5 kod + Temizle; FM'de opsiyonel saat — F-PL emsali, "sırıtma testi" şartıyla) ·
S2 **(a)**: `Form - Personel Ekle` BU dilimde tam sayfa (foto+belge alanları pending; Personel LİSTE
ekranı İK dilimine kalır, `/personel` nav'ı ComingSoon durur; puantaj ekranlarında `personnel:full`
izinliye türetilmiş "Personel Ekle" girişi).
Mockup'lar: `Ekran 5 - Puantaj.dc.html` (E5 — genel) · `Şantiye - Puantaj.dc.html` (ŞP — şantiye sekmesi)
· (§6 S2'ye göre) `Form - Personel Ekle.dc.html` (FP). Backend: PT CANLIDA (7 uç: personnel CRUD +
timesheet GET/PUT + export). Üst kural geçerli · tarih artefaktı istisnası (gerçek takvim).
Hücre etkileşimi mockup'ta yok (rozetler salt-okunur) → §6 S1.

## 1. Rotalar
| Rota | Ekran |
|---|---|
| `/puantaj` | E5 — genel puantaj (nav'da var, ComingSoon'dan gerçek rotaya; şantiye seçicili) |
| `.../santiyeler/[siteId]/puantaj` | ŞP — şantiye sekmesi (drill nav'da var; +`G` kodu, Tür rozeti, bölüm filtresi) |
| (§6 S2) `/personel/yeni` | FP — Personel Ekle tam sayfa formu |
**BFF İLK İŞ:** `personnel` kökü EKLENİR (listede yok — eksikse personel uçları yalnız canlıda 404);
timesheet uçları `/sites/...` altında (`sites` kökü var — grep teyidi). openapi devri GEREKMEZ
(115 yol main'de güncel; TB3 merge olursa devri TB3-sonrası ilk dilime kalır — bu dilimde KOPYALAMA).

## 2. Matris (iki ekranın ortak çekirdeği; tek paylaşılan bileşen ailesi)
- Ay gezinme `‹ ay ›` (gerçek takvim) · E5'te şantiye seçici · ŞP'de bölüm filtresi + bölüm özet şeridi
  (işçi sayısı · adam/gün · FM saat toplamı — hepsi GET yanıtındaki türevlerden).
- Kolonlar: Personel (ŞP'de ad + meslek—firma alt satırı + Şirket/Taşeron Tür rozeti; E5'te Meslek ayrı
  kolon) · ayın günleri · Toplam (türev).
- Hücreler: kod rozetleri `Ç/İ/T/FM/G` (ŞP legend'i 5'li — tek set; E5'in 4'lüsü alt küme) · tfoot
  Günlük Toplam + `4+` (FM'li gün) + `3G` (geçici görev) işaretleri + genel adam-gün.
- **Kaydet (PUT) KAPSAM KURALI — EN KRİTİK TUZAK:** `PUT .../timesheet` dönem+şantiye kapsamında
  DEĞİŞTİRMEDİR; **bölüm filtresi AKTİFKEN bile gövde HER ZAMAN şantiyenin TAM hücre kümesidir**
  (filtre yalnız görünümü süzer). Filtreli küme gönderilirse diğer bölümlerin kayıtları SİLİNİR —
  testle kanıtlanır (PT devir notundaki tuzak).
- Kişi-gün 409'u (başka şantiyede kaydı olan personel) Türkçe mesajla gösterilir.
- **Dışa Aktar / Excel:** `GET .../timesheet/export.xlsx` — mevcut ikili indirme deseni.
- İzin: `timesheet` — şef+İK+patron yazar; **saha mühendisi VIEW** (matris salt-okunur görünür,
  Kaydet devre-dışı + gerekçe); PM hiç göremez (`none` — AccessDenied).

## 3. Hücre etkileşimi (§6 S1 — önerilen türetim, F-PL popover emsali)
Hücre tıkla → küçük popover: 5 kod rozeti (mockup renkleriyle) + Temizle; **FM seçilince opsiyonel
saat alanı** (PT'nin onaylı sapması — ŞP119 saat toplamının kaynağı). Escape/dış tık iptal. Kontroller
matrisin kendi görsel dilinden ("sırıtma testi" final review'de — F-PL şartıyla aynı).

## 4. Personel yüzeyi (§6 S2'ye göre)
- **S2a onaylanırsa:** `Form - Personel Ekle` (FP) tam sayfa, mockup birebir — foto + 6 belge alanı
  PENDING (BC form-slot mekanizması sonraki dilim), diğer alanlar `personnel` POST'una eşlenir
  (backend'de karşılığı olmayan alanlar devre-dışı+gerekçe, gövdeye sızmaz). Giriş noktası: puantaj
  ekranlarında `personnel:full` izinliye "Personel Ekle" butonu (türetilmiş — mockup'ta yok, S2 kararına
  dahil). **Personel LİSTE ekranı (`Personel.dc.html`) bu dilimde YOK** — İK dilimine kalır; `/personel`
  nav girdisi ComingSoon kalır.
- Matris personeli `GET /personnel`'den listeler (aktifler); hiç personel yoksa boş-durum + (izinliye)
  ekleme yönlendirmesi.

## 5. Teknik
Hook'lar: personnel liste/create + timesheet GET/PUT + export indirme. e2e mock-backend'e PT uçları
(kapsam kuralı mock'ta da). Görsel spec'ler: E5 matris + ŞP matris (rozetli) + popover + (S2a) form.
5. kapı zorunlu; `getByRole("alert")` + SSR çift-kopya tuzakları yasak listede. Bu dilim main'den
açılır; TB3 backend'le paralel — `openapi/openapi.json`'a DOKUNULMAZ.

## 6. AÇIK SORULAR (kullanıcı cevabı ŞART)
- **S1 — Hücre etkileşimi:** F-PL emsali popover türetimi (§3; FM'de saat alanı dahil) onaylanıyor mu?
  Alternatif: etkileşim mockup'ı verirsin. Önerim: onay.
- **S2 — Personel ekleme:** (a) `Form - Personel Ekle` BU dilimde (yoksa canlıda matris sonsuza dek boş —
  kimse UI'dan işçi ekleyemez; liste ekranı yine İK'ya kalır) · (b) İK dilimini bekle (personel yalnız
  API'den eklenebilir — önermem). Önerim: **(a)**.
