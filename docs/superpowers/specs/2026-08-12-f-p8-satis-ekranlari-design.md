# F-P8 — Satış ekranları (frontend spec)

Tarih: 2026-08-12 · Durum: **ONAYLANDI (hızlandırılmış düzen — sorular yönetimce bağlandı, §3)**
Mockup: `Satış Yönetimi.dc.html` (**SY**, 239) · `Form - Daire Satisi.dc.html` (**DS**, ~210).
Backend: P8 CANLIDA (17 uç: customers CRUD · sales CRUD · generate-plan · PUT installments · pay ·
activate/transfer-deed/cancel · summaries) + P10 "Bu Satıştan Kâr" GERÇEK. P8 kayıtları ZORUNLU
okuma (ROADMAP-BACKEND §1.2 + hafıza `p8-unite-satisi`): vade farkı `term_interest_pct` bilgi alanı
(plan şişmez, Σ=sale_price) · gecikme faizi/rezervasyon-doldu YALNIZ gösterim türevi · `accounting`
tahsilat işleyemez (bilinçli) · **PUT installments = DEĞİŞTİRME + kuruş dengeleme son taksitte**.

## 1. Kapsam

- **SY — `/satis`** (sidebar "Satış Yönetimi" ComingSoon'dan çıkar): KPI şeridi (SY 54-60: Satılan/
  Rezerve/Boş sayı+tutarları `units`+`sales` summary'lerinden · Tahsil Edilen+% · Vadesi Geçen) ·
  satış tablosu (152-208: Satış Bedeli/Tahsil/Kalan/Ödeme Planı/Durum + tfoot toplamları) · durum
  filtresi select (146) · "Yaklaşan Tahsilatlar" kartı (223-231; gecikme faizi TÜREV gösterim — P8
  kararı) · "Fiyat Listesi" butonu (24) ROTASIZ → devre-dışı+gerekçe.
- **DS — `/satis/yeni`** (ünite bağlamıyla; `?unit=` ile de gelinebilir): ünite seçici (55) →
  bilgi kutuları liste fiyat/m²/maliyet (60-62; maliyet P10'dan GERÇEK) · müşteri seçimi + "yeni
  müşteri" (customers uçları; müşteri alanları DS mockup'ından birebir, çizilmemişse F-BC S1 emsali
  minimal türetim) · indirim/satış bedeli/KDV (84-87) · **"Bu Satıştan Kâr" TÜREV** (90-91; sunucu
  değerleriyle, istemci maliyet hesaplamaz) · peşinat/taksit/vade farkı (103-106) · `generate-plan`
  ile ödeme planı tablosu (satır "ödeme yöntemi" select'i BACKEND ŞEMASINDA YOKSA pending hücre —
  şef openapi'den hizalar) · plan toplamı = sale_price (145; Σ kuralı sunucudan) · gecikme faizi
  checkbox (163) bilgi alanı · satış belgeleri (167-197) **BC form-slot pending**.

## 2. BASILMAYANLAR / pending

**Satış DETAY ekranı mockup'u YOK** → activate/transfer-deed/cancel/pay aksiyonları EKRAN İCAT
EDİLMEDEN basılmaz (uçlar API'den; mockup gelince ayrı dilim — ROADMAP'e). Liste satırı bu yüzden
detaya GİTMEZ. "Fiyat Listesi" devre-dışı. `min_sale_price` zorlaması hiçbir katmanda yok (P8
kararı) — UI da zorlamaz, bilgi basar.

## 3. Yönetimin bağladığı kararlar

K1 rotalar `/satis` + `/satis/yeni` · K2 **BFF İKİ kök: `sales` + `customers`** (P8'den beri bilinen
şart — eklenmezse yalnız canlıda 404; adlı kapı testleri) · K3 detay ekranı yok → durum aksiyonları
YOK (mockup gelince dilim) · K4 tahsilat KPI'ları summary uçlarından; uç vermiyorsa pending zarf
(uydurma yok) · K5 taksit planı DS tablosunda düzenleniyorsa PUT DEĞİŞTİRME semantiği: gövde TAM
plan taşır (hakediş PUT emsali; kısmi gönderim satır siler — görünür uyarı) · K6 kapanış TEK PAKET (⚡).

## 4. Test/kapanış

Görsel spec'ler: `satis-listesi` · `satis-listesi-bos` · `daire-satisi-formu` (kanonik
`prepareFrame`). Beş kapı + gövde anahtar testleri (pending sızmaz; `term_interest_pct` bilgi).
Smoke: müşteri aç → satış aç (`generate-plan` → plan toplamı=bedel telden) → listede + KPI değişimi →
cancel ucuyla İPTAL/temizlik (sıfır kalıntı; ünite `sales_status` eski hâline döner — doğrulanır).
İlk gerçek satışta P10 kartlarının KY alanlarına da gözle bakılır (kayıtlı sınır).
