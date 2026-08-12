# F-SA — Satınalma ekranları (frontend spec)

Tarih: 2026-08-12 · Durum: **ONAYLANDI (hızlandırılmış düzen — kararlar §3'te yönetimce bağlı)**
ÖN ŞART: SA backend CANLIDA olmalı (şef raporundan doğrulanır; uç kökleri rapora göre).
Mockup: `Satınalma & Teklif` (**SAT**, 163) · `Satınalma - Siparişler` (**SIP**, 131) ·
`Satınalma - Teklifler` (**TEK**, 132 — talep-bağlı karşılaştırma) · `Satınalma - Tedarikçiler`
(**TED**, 135) · `Form - Satinalma Talebi` (**FST**, 179). SA backend spec §7 kararları + ST/F-ST
hafıza kayıtları ZORUNLU okuma.

## 1. Kapsam (5 yüzey)

- **`/satinalma` (SAT):** sidebar "Satınalma & Teklif" ComingSoon'dan çıkar. 4 KPI (69-86; "Onay
  Bekleyen" dahil — summary ucundan) · 4'lü sekme şeridi (89-94) · talep tablosu (99-156:
  no/malzeme+not/proje/miktar/tahmini tutar/teklif sayısı/durum rozetleri — renkler mockup birebir).
  "+ Satın Alma Talebi" → `/satinalma/talep/yeni`.
- **`/satinalma/siparisler` (SIP):** filtre select (34) + 4 KPI (38-43) + sipariş tablosu (45-125;
  teslimat tarihi renk TÜREVİ istemcide) · "Detay" devre-dışı+gerekçe (detay ekranı çizilmemiş —
  §3 K4) · "+ Sipariş Oluştur" devre-dışı+gerekçe (form çizilmemiş; uç API'den).
- **`/satinalma/talepler/[id]/teklifler` (TEK):** talep özeti şeridi (44-50) + teklif kartları
  (53-116; "EN İYİ FİYAT"/"EN HIZLI" rozetleri İSTEMCİ TÜREVİ) + karşılaştırma özeti (119-127) ·
  **"Sipariş Ver"/"Seç" GERÇEK** (select-and-order; onay diyalogu + görünür sonuç uyarısı) ·
  "Excel" GERÇEK (ikili indirme deseni) · **teklif GİRİŞİ** türetilmiş minimal diyalog (kart
  alanları birebir — §3 K5).
- **`/satinalma/tedarikciler` (TED):** kart ızgarası (41-122; "Bu Yıl Toplam Sipariş" sunucu
  türevi; PUAN pending — backend kolonu bilinçli yok) · "+ Tedarikçi Ekle" türetilmiş minimal
  diyalog (§3 K5).
- **`/satinalma/talep/yeni` (FST):** tam sayfa form birebir — talep no SUNUCU üretir (salt-okunur) ·
  kalem satırları (stok kartından seç + serbest kalem; "Mevcut Stok" sunucudan renk kodlu) ·
  tedarikçi tercihi (e-posta checkbox'ı pending) · ekler BC form-slot pending · onay akışı kutusu
  İSTEMCİ TÜREVİ (₺500K metni TEK kaynaktan — hardcode iki yerde olmaz; §3 K6) · "Taslak Kaydet" +
  "Onaya Gönder" GERÇEK.

## 2. BASILMAYANLAR / pending

Doğrudan sipariş formu + sipariş detay ekranı (çizilmemiş — uçlar API'den; mockup gelince dilim) ·
onay/red EKRANI ("Onay Kutusu" ayrı dilim — bu dilimde YALNIZ submit) · tedarikçi puanı pending ·
e-posta bildirimleri pending · FST ekleri BC pending.

## 3. Yönetimin bağladığı kararlar

K1 rotalar: `/satinalma` · `/satinalma/siparisler` · `/satinalma/tedarikciler` ·
`/satinalma/talep/yeni` · `/satinalma/talepler/[id]/teklifler` (SIP 25-30 gerçek `<a>` sekme deseni) ·
K2 **BFF kökleri SA raporundaki uçlardan grep'le çıkarılır, HEPSİ adlı kapı testiyle açılır**
(muhtemel: `suppliers` · `purchase-requests` · `purchase-orders`; "zaten var" varsayma) ·
K3 "Teklifler" sekmesi = SAT tablosunun `quote_wait` süzgülü hâli (talep-bağımsız teklif listesi
İCAT EDİLMEZ — mockup yalnız talep-bağlı karşılaştırma çizmiş) · K4 sipariş "Detay" +
"+ Sipariş Oluştur" devre-dışı+gerekçe · K5 teklif girişi + tedarikçi ekle türetilmiş minimal
diyaloglar (ONAYLI SAPMA, F-BC emsali) · K6 approve/reject BU dilimde BASILMAZ (Onay Kutusu
dilimi); eşik metni tek kaynaktan · K7 TEK PAKET kapanış (⚡).

## 4. Test/kapanış

Görsel spec'ler: `satinalma-talepler` · `satinalma-siparisler` · `teklif-karsilastirma` ·
`satinalma-talep-formu` · `tedarikciler` (kanonik `prepareFrame`; İZOLE fikstürler — stok salt-okur
tuzağı). Beş kapı + gövde anahtar testleri. Smoke: tedarikçi aç → talep aç (taslak→submit) →
teklif gir → select-and-order telden (talep `ordered` + sipariş doğdu) → stok girişiyle sipariş
`delivered` zinciri (SA S4 canlı kanıtı) → temizlik (sıfır görünür kalıntı).
