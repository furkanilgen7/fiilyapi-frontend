# F-TH — Taşeron Hakedişi Ekranları (frontend spec)

Tarih: 2026-08-03 · Durum: **ONAYLANDI (2026-08-03)** — §6'nın ÜÇ sorusu da önerildiği gibi onaylandı:
S1 detay = Ekran 15'in taşeron uyarlaması + durum-bazlı buton seti (ayrı mockup gelmeyecek) ·
S2 kar/marj frontend'de iki summary'den türetilir · S3 `/hakedisler` "İşveren | Taşeron" sekmeli.
Rozet renk eşlemesi 2026-08-03'te tekleştirildi: Onaylandı=yeşil, Ödendi=mavi — mockup seti tutarsızdı, kullanıcı kararı; sapma diye geri alınmaz.
Mockup'lar: `Ekran 2 - Taşeron Hakedişi.dc.html` (L — liste) · `Taşeron Hakediş Oluştur.dc.html` (O — form)
Backend: TH CANLIDA (11 yol / 13 operasyon) + `EmployerContractDetail.index_type` artık dönüyor.
Üst kural geçerli: **mockup'ta ne varsa birebir basılır**; backend'i olmayan parça pending/devre-dışı, gövdeye sızmaz.

## 1. Rotalar (§6 S1-S3 kararlarına bağlı)
| Rota | Ekran | Not |
|---|---|---|
| `/hakedisler/taseron` | Ekran 2 — taşeron listesi (filtreler + 4 KPI + 8 kolon tablo) | §6 S3: `/hakedisler` ile sekmeli kardeş |
| `/hakedisler/taseron/yeni` | Sözleşme seçim adımı → O formu | seçim adımı F-P7 emsali (proje seçim adımı gibi) |
| `/hakedisler/taseron/[paymentId]` | Detay — **mockup YOK** → §6 S1 | |
| `/hakedisler/taseron/[paymentId]/duzenle` | O formu, düzenleme kipi (yalnız draft) | giriş: detaydaki Düzenle |
| Şantiye sekmesi | `Şantiye - Hakedişler`in TAŞERON sütunu + KPI'ları DOLDURULUR | F-P7'de pending kalmıştı |

## 2. Alan eşlemesi (mockup satır → TH şeması)
- **Liste (L):** Taşeron adı+iş kategorisi (L141) → sözleşme snapshot'ları · `#47` (L142) → `sequence_no`
  (sözleşme kapsamlı) · Dönem (L143) → `period_year/month` · Brüt/KDV/Net (L144-146) → hesap bloğu —
  **L146'nın "Net=Brüt−KDV" görünümü mockup hesap HATASI, backend'in doğru neti basılır (onaylı)** ·
  KDV etiketi **%20** (L145'teki %18 artefakt — backend kararı) · Durum rozetleri: Onay Bekliyor/
  Onaylandı/Ödendi + **"Revize Gerekli" = `is_revision_required` türevi** (L177) · İlerleme (L148) →
  backend liste/summary şemasında karşılığı neyse o; ŞEMADA YOKSA zarif düşüş + kapanış raporuna yaz.
- **KPI'lar (L105-122):** `GET .../summary` — Toplam Hakediş / Onay Bekliyor / Bu Ay Ödenen / Aktif Taşeron.
- **Filtreler (L82-101):** proje + dönem + durum + taşeron arama → liste ucunun query parametreleri.
- **Form (O):** hiyerarşi şeridi (O33-42: SZL→proje→şantiye→TSZ + "Sözleşmeyi Gör →" — hedef rota P5
  ekranı gelmediyse link BASILMAZ, F-P7 "ölü link bırakma" emsali) · üst form (taşeron/şantiye readonly,
  dönem select) · **Bölüm seçici (O58)** → `section_id` (bilgi alanı; sözleşme şantiyesinin bölümleri +
  "Tüm Bölümler"=null) · kalem tablosu: Poz/Ad/Birim/Sözleşme B.F. readonly + **Bu Ay Miktar** input +
  Tutar türev; grup başlıkları `group_name` · kaynak notları ("Günlük kayıttan/Elle giriş", O87/128) →
  `quantity_source` alanından; bu dilimde hepsi `manual` görünür, `diary` rozeti SD ekran dilimiyle canlanır ·
  tfoot: Brüt + KDV(%20) + Avans Kesintisi + **Teminat Kesintisi (onaylı sapma — mockup'ta yok, EKLENİR)** +
  Net; fiyat farkı katsayısı başlıkta (onaylı sapma, işveren formu deseni) · Taslak Kaydet + Onaya Gönder.
- **Durum aksiyonları:** F-P7 kararı aynen — detay başlığında durum-bazlı buton seti
  (submit/approve/reject(gerekçeli)/mark-paid/unapprove; izinle görünür) → §6 S1'e bağlı.

## 3. Teknik zincir
**BFF kökleri (İLK İŞ):** `subcontractor-progress-payments` + `subcontractor-contracts` +
`subcontractors` — üçü de listede YOK; grep'le doğrula. openapi zaten senkron (91 yol devri) —
`gen:api` GEREKMEZ (schema.d.ts güncel), yalnız hook'lar yazılır.
Hook'lar: liste/summary/detay/create/update/lines/durum aksiyonları/refresh-prices + sözleşme
listesi (seçim adımı için). Rozet/para formatları F-P7 bileşenlerinden PAYLAŞILIR (kopyalama değil —
ortak `progress-payments/shared` çıkarımı serbest). Görsel spec'ler: liste + detay + form + şantiye
sekmesi güncellemesi (baseline yenilenecekler listesine).

## 4. Şantiye sekmesi güncellemesi
`.../santiyeler/[siteId]/hakedisler`: taşeron sütunu gerçek veriyle dolar (o şantiyeye bağlı
sözleşmelerin hakedişleri); KPI'lardan "Toplam Taşeron Ödemesi" gerçek olur; **"Brüt Kar Marjı" → §6 S2.**

## 5. Kapsam dışı / pending
`Şantiye - Hakediş Özeti` ekranı hâlâ kapsam DIŞI (SD ekran dilimi) · "📅 Günlük kayıttan" gerçek
rozeti SD ekran dilimiyle · taşeron sözleşme EKRANLARI (P5-frontend) ayrı dilim — bu dilimde sözleşme
yalnız seçim adımı + readonly bağlam olarak kullanılır.

## 6. AÇIK SORULAR (kullanıcı cevabı ŞART)
- **S1 — Detay ekranı mockup'sız:** taşeron hakediş DETAYI için mockup yok (yalnız liste + oluştur var).
  Önerim: **işveren detayının (Ekran 15) taşeron uyarlaması** — aynı yerleşim (KPI + kalem tablosu +
  ödeme hesabı kartı) + F-P7'nin durum-bazlı buton seti kararı aynen. Alternatif: mockup verirsin, beklerim.
- **S2 — Kar Analizi (O203-223 kartı + şantiye KPI "Brüt Kar Marjı"):** backend çapraz-modül kâr ucu YOK;
  iki taraf da canlıda olduğuna göre frontend İKİ summary'den türetebilir (işveren − taşeron).
  Önerim: **frontend türetir** (basit çıkarma; iş kuralı değil gösterim). Alternatif: pending kalsın.
- **S3 — Rota/yerleşim:** `/hakedisler` sayfası "İşveren | Taşeron" sekme çifti olur (nav'da tek
  "Hakedişler" girişi; Ekran 2 taşeron sekmesinin içeriği; işveren listesi mevcut haliyle işveren sekmesi).
  Önerim: **evet, sekmeli**. Alternatif: tamamen ayrı sayfa `/hakedisler/taseron` (sekmesiz).
