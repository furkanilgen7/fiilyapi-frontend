# F-ST — Stok ekranları (frontend spec)

Tarih: 2026-08-12 · Durum: **ONAYLANDI (2026-08-12)** — §5'in BEŞ sorusu da önerildiği gibi:
S1 "+ Malzeme Ekle" türetilmiş diyalog · S2 "Stok Hareketi" devre-dışı+gerekçe · S3 "Depo Ekle"
türetilmiş diyalog · S4 tam sayfa `.../stok/giris` + koşullu kaynak depo · S5 SA pending'leri
devre-dışı+gerekçe. (S1/S3/S4 ONAYLI SAPMA — F-PL/F-BC türetilmiş etkileşim emsali.)
Mockup: `Ekran 3 - Stok & Depo.dc.html` (**E3**, 191) · `Şantiye - Stok.dc.html` (**ŞS**, 169) ·
`Form - Stok Girisi.dc.html` (**SG**, 188). Backend: ST ✅ CANLIDA (125 yol; 7 stok ucu) —
ST hafıza kaydı + backend spec §4b ZORUNLU okuma. Devir borcu SIFIR (şema 125 senkron).

## 1. Kapsam (3 ekran + 2 türetilmiş diyalog)

- **E3 — `/stok`**: genel katalog; KPI şeridi (E3 72-89; "Bekleyen Sipariş" SA'ya pending zarftan) ·
  durum segmenti Tümü/Kritik/Normal/Fazla (94-97) · kategori select (99) + arama (100-103) · tablo
  (108-185: malzeme+kod · kategori · birim · stok · min · depo · durum rozeti; kritik/düşük satır
  vurgusu). Kabuk sidebar "Stok & Depo" ComingSoon'dan çıkar. E3'ün kendi menü/üst barı BASILMAZ
  (kabuk canon); "Stok Hareketi" butonu §5 S2.
- **ŞS — `.../santiyeler/[siteId]/stok`**: drill "Stok" sekmesi aktifleşir; KPI (86-91) + tablo
  (95-163: mevcut stok şantiye bakiyesi; **"Aylık İhtiyaç" + "Bölüm" sütunları PENDING** — backend
  kaynak yok; satır aksiyonları "Acil Sipariş/Sipariş Ver/Satınalma Talebi →" SA'ya devre-dışı+gerekçe).
- **SG — stok giriş formu** (tam sayfa, `.../stok/giris` §5 S4): SG birebir — giriş tipi radio
  kartları (53-76) · giriş bilgileri (83-88; "İlgili Sipariş" SA'ya PENDING devre-dışı) · kalem
  satırları (100-145: stok kartından seç · gelen/birim fiyat input · tutar türev · kalite select;
  "Sipariş" sütunu pending) · belgeler kartı (149-172) BC form-slot'a PENDING devre-dışı · not ·
  oto-bildirim checkbox'ı SA'ya pending. Transfer tipinde koşullu kaynak depo alanı (§5 S4).
- **Türetilmiş diyaloglar (§5 S1/S3):** "+ Malzeme Ekle" (kod/ad/kategori/birim/min stok) ·
  "+ Depo Ekle" (ad + şantiye/merkez seçimi) — F-BC yeni-klasör emsali.

## 2. Altyapı / T1

- **BFF İKİ kök:** `stock` + `warehouses` → `ALLOWED_ROOTS` + adlı kapı testleri (bilinen tuzak).
- `gen:api` GEREKMEZ (devir yapıldı, şema 125 senkron) — yalnız doğrulama.
- **Viewport düzeltmesi (onaylı borç):** 4 spec'e `setViewportSize(1440×900)` + ~12 baseline
  gerekçeli yenileme (kayıtlı karar: "sonraki dilimin T1'i" = bu dilim).
- Hook katmanı + e2e mock (şemayla senkron — F-P5 dersi); durum rozet renkleri E3 örneklerinden
  token'lı.

## 3. Veri kuralları

Durum backend'den gelir (formül sunucuda — istemci YENİDEN HESAPLAMAZ) · bakiyeler sunucu türevi ·
eksi bakiye kırmızı basılır (meşru değer) · `min_stock` yoksa durum hücresi "—" · tüm yazma
gövdeleri ST §4b kanonuna göre hata basar (404 varlık / 422 kural, Türkçe görünür mesaj).

## 4. Test/kapanış

Beş kapı + görsel spec'ler (`stok-genel` · `stok-genel-bos` · `santiye-stok` · `stok-giris-formu`;
kanonik `prepareFrame` zorunlu) + Linux baseline turu (viewport yenilemeleri dahil — değişenler
gerekçeli, cmp'li) · kapanış smoke: gerçek giriş→bakiye→transfer çift bacak telden kanıtı→temizlik
(adjustment ile sıfırlama; kayıt silme ucu yok — bilinçli).

## 5. AÇIK SORULAR (kullanıcı cevabı ŞART)

- **S1 — "+ Malzeme Ekle" formu çizilmemiş** (E3 67 buton var): öneri: türetilmiş minimal diyalog
  (kod · ad · kategori · birim · min stok — backend şeması birebir; F-BC S1 emsali). Alternatif:
  mockup bekle (katalog boş kurulumda doldurulamaz — önerilmez).
- **S2 — "Stok Hareketi" butonu (E3 66):** hedef ekran çizilmemiş. Öneri: DEVRE-DIŞI + gerekçe
  ("hareket listesi ekranı tasarımla gelecek"); `GET /stock/entries` ucu hazır, mockup çizersen
  küçük takip dilimi. Alternatif: türetilmiş basit liste (tam ekran icadı — önerilmez).
- **S3 — Depo oluşturma:** hiçbir mockup'ta yok ama depo olmadan SG formu KULLANILAMAZ (boş
  kurulum kilidi). Öneri: türetilmiş minimal "Depo Ekle" diyalogu (ad + şantiye/merkez). Alternatif:
  depo yönetimini pending bırak (modül fiilen çalışmaz — önerilmez).
- **S4 — SG rotası + transfer alanı:** öneri: tam sayfa form `.../stok/giris` (E3'ten ve ŞS'den
  girilir; ŞS'den girilince şantiye deposu öndolu) + transfer tipinde koşullu "Kaynak Depo" alanı
  (backend sözleşmesi zorunlu kılıyor — mockup çizmemiş, zorunlu türetim). Onay.
- **S5 — SA'ya pending yüzeylerin görünümü:** sipariş alanları/butonları DEVRE-DIŞI + görünür
  gerekçe ("Satınalma modülüyle gelir") — F-PT pending deseni. Onay (bilgi niteliğinde).
