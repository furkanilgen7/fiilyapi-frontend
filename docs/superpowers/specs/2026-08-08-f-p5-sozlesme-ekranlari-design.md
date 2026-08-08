# F-P5 — Sözleşme Ekranları (frontend spec)

Tarih: 2026-08-08 · Durum: **ONAYLANDI (2026-08-08)** — §7'nin BEŞ sorusu da önerildiği gibi onaylandı:
S1 rota yerleşimi §1 tablosu · S2 "+ Yeni Sözleşme" taşeronda form, işverende devre-dışı+gerekçe ·
S3 koşul alanları E14'e salt-okunur + TSD'ye düzenlenebilir Şartlar bölümü (mockup'lar arası tamamlama) ·
S4 Puan kolonu "—"+gerekçe (backend adayı ROADMAP'e) · S5 POZ kaydetme: kirli hücreler + boşaltılan=null
+ `0` asla + Σ kuralı yumuşak.
Mockup'lar: `Sözleşmeler.dc.html` (SZL) · `Ekran 14 - Sözleşme Detay.dc.html` (E14) ·
`Form - Sözleşme Oluştur.dc.html` (FSO — **taşeron** sözleşmesi formu!) · `İşveren Sözleşme - Poz
Dağılımı.dc.html` (POZ) · `Taşeron Listesi.dc.html` (TL) · `Taşeron Sözleşme Detay.dc.html` (TSD).
Backend: contracts modülü CANLIDA (TB2/TB3 liste+sayfalama dahil). Üst kural geçerli ·
tarih artefaktı istisnası. Frontend'in kalan EN BÜYÜK dilimi.

## 1. Rotalar (§7 S1)
| Rota | Ekran |
|---|---|
| `/sozlesmeler` | SZL — sekmeli liste (İşveren \| Taşeron; `GET /contracts?type=`) — nav'da var, ComingSoon'dan çıkar |
| `/sozlesmeler/isveren/[projectId]` | E14 — işveren detay (proje başına tek sözleşme) |
| `/sozlesmeler/isveren/[projectId]/poz-dagilimi` | POZ — dağılım ızgarası |
| `/sozlesmeler/taseron/[contractId]` | TSD — taşeron sözleşme detay (**F-TH'nin devre-dışı "Sözleşmeyi Gör" linklerinin hedefi**) |
| `/sozlesmeler/taseron/yeni` | FSO — taşeron sözleşme formu |
| `/sozlesmeler/taseronlar` | TL — taşeron FİRMA listesi (SZL taşeron sekmesinde görünür "Taşeron Firmaları →" girişi) |
BFF: `contracts`+`subcontractor-contracts`+`subcontractors` kökleri ZATEN AÇIK (grep teyidi).

## 2. SZL + TL (listeler)
- SZL: 4 KPI (`ContractSummary`) + tablo (`ContractListItem`; taşeron sekmesinde progress/hakediş
  alanları backend `None` → "—"). Satır → detay.
- TL: `GET /subcontractors` + U1 sözleşme listesi + taşeron hakediş listesinden İSTEMCİ agregasyonu
  (Aktif Sözl./Bedel/Ödenen/Bekleyen + 4 KPI); kırpılma varsa para değerleri PENDING (F-TH korkuluğu;
  TB3 `total` okunur). `/subcontractors`'ta arama parametresi yok → arama/kategori istemci süzer.
  **Puan/yıldız → §7 S4.** Kategori rozeti serbest metin (renk haritası token'lı; seçenek tutarsızlığı
  artefakt). "+ Taşeron Ekle" → `SubcontractorCreate` modalı (EmployerFormModal emsali).
- SZL "+ Yeni Sözleşme" → §7 S2.

## 3. E14 (işveren detay)
- Başlık kartı + 5 metrik (`EmployerContractDetail`) · Hakediş Özeti kartı (`progress_payment_summary`
  birebir) · Milestone Takvimi → PENDING (`project_schedule`, P11) · PDF → devre-dışı+gerekçe ·
  "Düzenle" → proje formuna link (işveren sözleşmesi orada kurulur — mevcut akış).
- Sekmeler: Genel · İş Kalemleri (`EmployerContractItemsResponse` gruplar+kalemler,
  `distributed/remaining_quantity` kolonlarıyla) · Hakedişler (işveren hakediş listesi proje filtreli —
  F-P7 bileşenleri paylaşılır) · Belgeler → BC CANLI ama arşiv EKRANI F-BC'nin işi: sekme basılır,
  içerik PENDING kartı — karar.
- **§7 S3:** şemada olup mockup'ta olmayan koşullar (KDV %, gecikme cezası, eskalasyon+`index_type`)
  Genel'e salt-okunur "Sözleşme Koşulları" satırları olarak eklenir (veri kaybı önlenir; FF bandı emsali).

## 4. POZ (dağılım ızgarası) — EN KRİTİK SEMANTİK
- `GET .../contract/distribution` her şeyi verir (dinamik şantiye kolonları, gruplar, allocations,
  remaining, undistributed uyarısı, şantiye özet kartları). Başlıktaki no/işveren/bedel detay çağrısından.
- **Kaydet = BİRLEŞTİRME (hakediş PUT'unun TERSİ):** yalnız KİRLİ hücreler gönderilir; BOŞALTILAN hücre
  `quantity: null` (bağ koparma — satır silinmez, SET NULL); dokunulmamış hücre GÖNDERİLMEZ ve korunur.
  **`0` GÖNDERMEK 422** — boş=null kuralı (P5 backend'inden beri kayıtlı frontend kontratı).
- "Σ kota = toplam olmalı" mockup metni YUMUŞAK gösterim (Kalan rozeti ✓0/kırmızı) — hard validation
  EKLENMEZ (backend yalnız `≤`; aşım 422 Türkçe gösterilir) — karar.
- Şantiye özet kartlarında birim: şemada `unit` yok → kalem kodundan istemci join'i; olmazsa birim
  gösterilmez + rapora not.

## 5. FSO + TSD (taşeron form + detay)
- FSO: 5 kart birebir — Proje Bağlantısı (işveren sözleşmesi salt-okunur) · Taşeron Bilgileri (seçince
  VKN/yetkili/tel/e-posta salt-okunur dolar; "+ Yeni Taşeron Ekle" → aynı modal) · Sözleşme Şartları
  (TÜM alanlar backend'de birebir) · Poz Listesi (`load-from-employer` + created/skipped bildirimi;
  Miktar + Taşeron B.F. düzenlenebilir; satır sil; `unit_price` boş="girilmedi" + `items_missing_price`
  uyarısı) · Belgeler (6 kutu) → PENDING devre-dışı (BC form-slot sonraki dilim). Taslak Kaydet + Oluştur.
- TSD: başlık kartı (VKN için `GET /subcontractors/{id}` ek çağrısı) · bağlantı zinciri · poz tablosu:
  tek yazılabilir alan Taşeron B.F. (PATCH items) · Hakediş % kolonu taşeron hakediş verisinden türev
  (kırpılmada pending) · **tfoot = `contract_total` TEK KAYNAK (başlıktaki ₺4,82M mockup çelişkisi —
  K5 emsali)** · Hakediş Geçmişi (taşeron hakediş listesinden; contract filtresi yoksa proje+istemci
  süzme, rapora not) · "+ Hakediş Oluştur" → `/hakedisler/taseron/yeni` (sözleşme önseçili) · PDF
  devre-dışı+gerekçe · **§7 S3 taşeron ayağı:** FSO kart-3'ün aynısı "Sözleşme Şartları" bölümü TSD'ye
  DÜZENLENEBİLİR eklenir (Kaydet=PATCH; alanlar FSO mockup'ından — icat değil, mockup'lar arası tamamlama).

## 6. T1 — devir + TB3 takibi (karar verilmişti)
TB3 şema devri (backend main'den taze openapi) + `gen:api` + kapılar → main'de TEK commit ·
`useSiteSubcontractorPayments` U1 join'i sökülür (`work_category` artık listede) · seçim adımına
`total` kırpma korkuluğu · yeni hook'lar (contracts detay/items/distribution + subcontractor CRUD).

## 7. AÇIK SORULAR (kullanıcı cevabı ŞART)
- **S1 — Rota yerleşimi** (§1 tablosu): onay?
- **S2 — SZL "+ Yeni Sözleşme":** taşeron sekmesinde → FSO formu; işveren sekmesinde devre-dışı+gerekçe
  ("işveren sözleşmesi proje formunda kurulur"). Onay?
- **S3 — Şemada olup mockup'ta olmayan koşul alanları:** E14'e salt-okunur "Sözleşme Koşulları" +
  TSD'ye FSO kart-3 kopyası (düzenlenebilir). Veri kaybını önler; alanlar başka mockup'tan — icat değil.
  Onay?
- **S4 — TL Puan/yıldız:** backend'de karşılığı HİÇ yok → kolon basılır, "—" + gerekçe (değerlendirme
  özelliği ileride backend adayı — ROADMAP'e). Onay?
- **S5 — POZ kaydetme disiplini:** yalnız kirli hücreler + boşaltılan=null + `0` asla gönderilmez +
  Σ kuralı yumuşak. Onay?
