// Backend pending_module anahtari doner; kullaniciya gosterilen metin frontend'in isi.
// Tek kaynak: hem gosterge paneli (F6) hem Projeler (P1) bunu kullanir (spec §7.2).
//
// 🔴 F-UNIT1 T5 · TOPLU BAYATLIK DÜZELTMESİ (2026-08-21).
//
// Bu haritanın ilk kuşak metinleri "<Modül> modülüyle birlikte gelir" kalıbını
// kullanıyordu ve kullanıcıya MODÜLÜN OLMADIĞINI söylüyordu. ÖLÇÜLDÜ: o
// modüllerin neredeyse hepsi ARADA GELDİ ve canlıda kendi rotası var —
// `/hakedisler` · `/faturalar` · `/puantaj` · `/sozlesmeler(/taseronlar)` ·
// `/satis` · `/is-kalemleri` · `/stok` · `/belgeler` · `/makine` ·
// `/satinalma` · `/gunluk-kayit`. Yani metinler artık YALAN söylüyordu.
//
// Anahtarlar SİLİNMEDİ (biri hariç, aşağıda): hepsi hâlâ CANLI —
// backend'in `pending_module` alanından ya da ekranın kendi çağrısından
// geliyorlar. Değişen yalnız METİNDİR: eksik olan MODÜL değil, o modülün
// verisinin BU YÜZEYE BAĞLANMASIDIR. `gantt` (F-TKV) · `income_statement`
// (F-MT2) · `section_boq` (BOQ-SEC-F) emsalleri ise gerçekten ÖLMÜŞ
// anahtarlardı ve silindiler; ayrım şudur:
//   · gerekçe hâlâ okunuyor ama YANLIŞ  → METİN düzeltilir (bu tur),
//   · gerekçeyi okuyan kimse kalmamış   → ANAHTAR silinir.
//
// 🔴 P-YT2 (2026-08-23, backend merge `a843ecd`) — yukarıdaki "⚠️ F-OK T6" notu
// ARTIK YANLIŞ: `backend/app/modules/dashboard/service.py:106-108` artık
// `PendingApprovalsPlaceholder(available=True, count=<gerçek toplam>,
// pending_module="approvals")` döndürüyor. `available` HER ZAMAN `true`,
// `count` GERÇEK bir sayı; yalnız `items` bilinçli olarak boş kalıyor (backend
// gerekçesi: mockup satırının dört olgusunu — başlık · tutar · göreli zaman ·
// aciliyet çipi — sunucuda bir metne yapıştırmak, ekranın vermesi gereken bir
// sunum kararını sunucuda üretmek olurdu). Gösterge panelinin kartı da
// düzeltildi: artık `available`a değil `count`/`items`e dallanıyor ve
// `count === 0`ken boş-durum ipucu satırını BASMIYOR. Sonuç:
// `pendingModuleLabel("approvals")` artık HİÇBİR ürün kodu tarafından
// çağrılmıyor.
//
// Anahtar yine de SİLİNMEZ: backend'in kendi yorumu (`service.py:38-42`)
// `pending_module`ın anlamını KASITLI olarak genişletti — "bekleyen" demeye
// devam etse de artık yalnızca KAYNAĞI işaret eder: "bağlı bir kart da
// anahtarını taşır, çünkü ekran 'bu sayı nereden geliyor' sorusunu sormaya
// devam eder". `approvals` artık "modül eksik" istisnası DEĞİL, KAYNAK
// ETİKETİ örneğidir — diğer anahtarlarla (`progress_payments`, `invoicing`,
// …) AYNI kalıba uymaz, ondan AYRI bir sınıftadır (bkz. aşağıdaki giriş).
/**
 * ⚠️ DIŞA AÇIK olmasının TEK nedeni ÇÜRÜME BEKÇİSİDİR (`pending-modules.test.ts`):
 * yeni bir anahtar "<Modül> modülüyle birlikte gelir" kalıbıyla eklenirse test
 * kırmızıya döner. Ürün kodu bu haritayı DOĞRUDAN OKUMAZ — tek giriş
 * `pendingModuleLabel`dir (yedek metin dalı orada yaşar).
 */
export const MODULE_LABELS: Record<string, string> = {
  // `/hakedisler` CANLI (+ `/hakedisler/taseron`, `/hakedisler/yeni`). Boş
  // kalan şey hakediş modülü değil, hakediş toplamlarının proje/şantiye/BOQ
  // kartlarına ve gösterge paneli portföyüne toplanmasıdır.
  progress_payments: "Hakediş verisi bu yüzeye henüz bağlanmadı",
  // `/faturalar` (+ `/faturalar/kes`, detay) CANLI.
  invoicing: "Fatura verisi bu yüzeye henüz bağlanmadı",
  // 🔴 P-YT2 · DÜZELTİLDİ (2026-08-23, backend merge `a843ecd`). Önceki not
  // burada da aynı YALANI tekrarlıyordu: "PendingApprovalsPlaceholder zarfı
  // hâlâ boş döner". ÖLÇÜLDÜ — artık dönmüyor: `available` HER ZAMAN `true`,
  // `count` GERÇEK bir toplam (yalnız `items` bilinçli boş). Gösterge
  // panelinin kartı (`PendingApprovalsCard`) bu veriye bağlandı; eksik olan
  // BAĞLANTI değil. Anahtar yine de SİLİNMEZ — backend'in kendi yorumu
  // (`service.py:38-42`) `pending_module`ı artık bir KAYNAK ETİKETİ olarak
  // tanımlıyor: "bağlı bir kart da anahtarını taşır, çünkü ekran 'bu sayı
  // nereden geliyor' sorusunu sormaya devam eder". Metin de bunu söylüyor —
  // eksik bir bağlantı VAAT ETMİYOR, sayının KAYNAĞINI adlandırıyor.
  approvals: "Onay verisi Onay Kutusu ekranından gelir",
  // Gösterge panelinin `risks` listesi. Anahtar `inventory` ama eksik olan stok
  // DEĞİL (`/stok` canlı): riski hesaplayan bir uç HİÇ yoktur.
  inventory: "Risk listesi henüz hiçbir uçtan hesaplanmıyor",
  // `/puantaj` CANLI. Anahtar ayrıca DOLU zarfın kaynak etiketidir
  // (`CountPlaceholder(available=True, …, pending_module="timesheet")`).
  timesheet: "Puantaj verisi bu yüzeye henüz bağlanmadı",
  // `/sozlesmeler/taseronlar` + `/sozlesmeler/taseron/[id]` CANLI. Bölüm
  // formundaki "Görevli Taşeronlar" paneli de bu anahtarı okur.
  subcontracts: "Taşeron sözleşmesi verisi bu yüzeye henüz bağlanmadı",
  // 🔴 BRIEF'İN ÖRNEĞİ. Eski metin ("Ünite satış modülüyle birlikte gelir")
  // P8/P9'dan beri YALANDI: `/satis` canlı, `sales_revenue`/`sold_units`
  // gerçek değer döndürüyor. Anahtar SİLİNEMEZ — `projects/service.py`
  // (`_UNITS = "units"`) onu ALTI proje-kartı ölçütü için hâlâ yayınlıyor:
  // `sold_amount`/`sales_ratio`/`unit_summary` (154-156) ve
  // `our_unit_count`/`owner_unit_count`/`our_share_value` (181-185).
  units: "Ünite verisi bu yüzeye henüz bağlanmadı",
  // P10 maliyet kartları CANLI (`cost_cards.py` gerçek değer basar); zarf
  // yalnız o projenin kaydı YOKKEN boş döner. Ünite maliyet/kâr alanları ve
  // şantiye ortalama marjı ise hiç hesaplanmıyor.
  project_costs: "Maliyet verisi bu yüzeye henüz bağlanmadı",
  // P2 (Şantiye & Bölüm) — spec §7.1
  // `/sozlesmeler` CANLI.
  contracts: "Sözleşme verisi bu yüzeye henüz bağlanmadı",
  // `/projeler/…/santiyeler/…/is-kalemleri` CANLI.
  boq: "İş kalemi verisi bu yüzeye henüz bağlanmadı",
  // `/stok` CANLI. Tek tüketicisi `PlanMaterialsCard` (haftalık malzeme
  // türevi); backend bu anahtarı HİÇ yayınlamıyor.
  stock: "Stok verisi bu yüzeye henüz bağlanmadı",
  // `/belgeler` CANLI (F-BC). Eksik olan belge modülü değil, kaydın kendi
  // belge yuvasıdır.
  documents: "Belge verisi bu yüzeye henüz bağlanmadı",
  // ⚠️ F-UNIT1 T5'te KALDIRILDI: `site_diary` anahtarı. ÖLÇÜLDÜ — backend onu
  // HİÇBİR yerde `pending_module` olarak yayınlamıyor (yalnız izin matrisi
  // anahtarı olarak yaşıyor: `site_diary/service.py:PERMISSION_MODULE`) ve
  // frontend'de de `pendingModuleLabel("site_diary")` çağıran KİMSE yok
  // (bölüm detayı F-BOLLINK'te `section_site_diary`ye geçti). `gunluk-kayit`
  // rotası da CANLI. Yani hem gerekçe YALANDI hem de okuyanı kalmamıştı —
  // `gantt`/`income_statement`/`section_boq` emsali.
  // F-P6 T3 (Bölüm formu) — devre dışı kartlar. `/makine` CANLI; eksik olan
  // bölüm formunun makine ataması taşımamasıdır.
  equipment: "Makine verisi bu yüzeye henüz bağlanmadı",
  // ⚠️ F-TKV T5'te KALDIRILDI: `gantt` anahtarı bölüm formundaki üç kontrolün
  // (Bağımlılık seçici + Milestone metin/tarih) devre-dışı gerekçesiydi. P11
  // uçları açıldı (`SectionCreate.depends_on_section_id`/`milestones`,
  // `SectionUpdate` aynısı) ve `/projeler/takvim` ekranı yazıldı — üç kontrol
  // de GERÇEK oldu, anahtarın tüketicisi kalmadı. Yeniden eklenmemeli:
  // "Gantt modülü yok" artık YALAN bir gerekçedir (F-PRJTAB kanonu).
  // F-TKV T4 (Proje Takvimi ekranı) — mockup'ta ÇİZİLİ olup ürününde KARŞILIĞI
  // OLMAYAN üç yüzey. Üst kural (F-TH kanonu): öğe SİLİNMEZ, yerinde devre
  // dışı + GÖRÜNÜR gerekçeyle basılır; gerekçe `title`da SAKLANMAZ.
  //
  // 🔴 K2 — PT 159/187/214/243/271 proje `%75`, faz `%62` gibi yüzdeler ve iki
  // parçalı (koyu tamamlanan + açık kalan) barlar çiziyor. Bu verinin kaynağı
  // üründe YOKTUR ve P11 bunu KALICI olarak reddetti — `TimelineSection` şema
  // açıklaması gerekçeyi kendi yazıyor: "ILERLEME YUZDESI YOKTUR … Kaynagi
  // olmayan bir sayiyi bos zarfla dondurmek, ekranda doldurulmayi bekleyen
  // sahte bir sozlesme birakir." Barlar TEK PARÇADIR, rengi `status`tan gelir.
  // (`projects.progress_pct` kolonu BAĞLANMAZ: `ProjectCreate`/`ProjectUpdate`
  // şemalarında yoktur, `default=0`dır ve canlıda her projede 0 basar.)
  timeline_progress_pct: "İlerleme yüzdesi ölçülmüyor — barlar bölüm durumundan renklenir",
  // 🔴 K4 — PT 32 "Haftalık" düğmesi. Uç zaten zoom parametresi almaz (üçü de
  // istemci işidir), ama haftalık ızgara veriden türeyen pencerede yüzlerce
  // sütun eder ve mockup onu HİÇ çizmemiştir (ızgara 120-147 yalnız ay
  // sütunları). Düğme silinmez, devre dışı + gerekçeli durur.
  timeline_weekly_zoom: "Haftalık ızgara çizilmedi — portföy penceresi yüzlerce sütun eder",
  // 🔴 K6 — PT 301 "Toplam Hakediş". Portföy düzeyinde hakediş toplayan bir uç
  // YOKTUR (`/projects/timeline` gövdesi hakediş taşımaz, şema açıklaması bunu
  // adıyla kapsam dışına koyuyor: "PT 300-303 portfoy ozeti (toplam sozlesme/
  // hakedis) buraya KONMAZ"). Tek dekoratif sayı için proje başına ek istek +
  // kısmi hata dalı AÇILMAZ. Öbür üç sayı gövdeden hesaplanır ve basılır.
  portfolio_progress_payment_total: "Portföy hakediş toplamı tek uçtan gelmiyor",
  // F-TKV T5 — `Form - Bolum Ekle` 237 "Bölümü proje takvimine (Gantt)
  // otomatik ekle". Kutu artık "modül yok" diye değil, SEÇENEK OLMADIĞI için
  // devre dışıdır: `/projects/timeline` şantiyeleri atlayıp bölümleri doğrudan
  // projenin altına dizer ve HER bölümü döndürür — bir bölümü takvimden
  // dışarıda tutan bir alan ne şemada ne de üründe vardır.
  gantt_auto_add: "Bölümler proje takvimine her zaman girer; ayrı bir seçim yoktur",
  // F-TH T2 (Ekran 2 · Taşeron Hakedişi listesi) — `SubcontractorProgress
  // PaymentListItem` şemasında taşımayan ÜÇ alan (brief §Zarif düşüş): kolon
  // silinmez, mockup'taki yerinde bu etiketlerle pending gösterilir.
  //
  // 🔴 F-UNIT1 T5 · ÜÇÜ DE DÜZELTİLDİ. Eski metinler bir MODÜL/YETENEK
  // eksikliği ima ediyordu; ÖLÇÜLDÜ, ikisi üründe ZATEN VAR: KDV taşeron
  // hakediş formunda hesaplanıp basılıyor (`payment-calculation-rows.ts`
  // `vat` satırı + `SubcontractorProgressPaymentForm` `percents.vat_pct`) ve
  // ilerleme hakediş DETAYINDA gösteriliyor (`PaymentProgressCard`,
  // `ProgressPaymentDetail["progress"]`). Eksik olan yetenek değil, LİSTE
  // UCUNUN o alanları taşımamasıdır — `purchase_request_quantity` /
  // `purchase_request_quote_count` emsalinin birebir aynısı.
  work_category: "İş kategorisi liste ucundan gelmiyor",
  vat: "KDV liste ucundan gelmiyor (hakediş formunda hesaplanır)",
  progress: "İlerleme liste ucundan gelmiyor (hakediş detayında gösterilir)",
  // F-TH T4 (Ekran 15 taşeron uyarlaması) — PDF/dışa aktarma ucu openapi'de
  // yok (yalnız CRUD + durum aksiyonları var); "Sözleşme İlerlemesi" kartının
  // üç çubuğu ve "Toplam Hakediş"/"Kalan" KPI'ları
  // `SubcontractorContractDetail.progress_payment_summary` alanına bağlı —
  // şema bu alanı BUGÜN her zaman `null` döndürüyor (bkz. openapi açıklaması).
  // 🔴 F-UNIT1 T5 · İKİSİ DE DÜZELTİLDİ. "Dışa aktarma modülü" diye bir şey
  // ÜRÜNDE YOKTUR ve olması da beklenmiyor — muhasebe/mali tablo kardeşlerinin
  // hepsi (`accounting_export`, `trial_balance_export`, `balance_sheet_export`
  // …) eksiği doğru adıyla "dışa aktarma UCU henüz açılmadı" diye anıyor.
  // `contract_progress` ise bir modül değil, ŞEMA ALANI eksikliğidir:
  // `SubcontractorContractDetail.progress_payment_summary` bugün her zaman
  // `null` döner (`contract_milestones` emsalinin birebir aynısı).
  pdf_export: "Dışa aktarma ucu henüz açılmadı",
  contract_progress: "Sözleşme ilerleme özeti uçtan gelmiyor (şemada null)",
  // F-TH T5 fix round 1 (coordinator review) — taşeron hakedişi satırında
  // bölüm KİMLİĞİ (`section_id`) var ama ADINI çözecek bir uç/hook bu
  // dilimde YOK. `section_id === null` (gerçekten "Tüm Bölümler") bu
  // etiketi KULLANMAZ — yalnız `section_id` DOLU olup adı çözülemeyen
  // durumda gösterilir.
  // 🔴 F-UNIT1 T5 · DÜZELTİLDİ. Eski metin bölüm adı çözümlemesini GELECEK bir
  // yetenek gibi anlatıyordu; ÖLÇÜLDÜ, o yetenek ÜRÜNDE VAR
  // (`useSection` → `GET /sections/{section_id}`, `useSiteSections` →
  // `GET /sites/{site_id}/sections`). Eksik olan, taşeron hakedişi satırının
  // o çözümlemeye BAĞLANMAMIŞ olmasıdır.
  section_name: "Bölüm adı bu satırda çözümlenmiyor (yalnız kimliği geliyor)",
  // ⚠️ F-P5 T7'de KALDIRILDI: `subcontractor_contract_detail` etiketi F-TH'nin
  // devre-dışı "Sözleşmeyi Gör →" + breadcrumb bağlantılarının gerekçesiydi.
  // TSD rotası (`/sozlesmeler/taseron/[contractId]`) yazıldı, iki bağlantı da
  // gerçek `Link`e döndü — etiketin tüketicisi kalmadı, yeniden eklenmemeli.
  // F-P5 T2 (SZL · Sözleşmeler listesi) — iki alan da "sahte `0` basma, `—` bas"
  // deseninin örneğiydi: hakediş toplamı KPI'ı
  // (`ContractSummary.progress_payment_total`) ve satır ilerlemesi
  // (`ContractListItem.progress_pct`). Kart/kolon SİLİNMEZ, "—" + gerekçe basılır.
  //
  // 🔴 F-SZLPCT (2026-08-25) — İKİSİNİN DE GEREKÇESİ BAYATLADI, metinler
  // düzeltildi (yukarıdaki "gerekçe hâlâ okunuyor ama YANLIŞ → METİN
  // düzeltilir" kuralı). ÖLÇÜM:
  //   · `progress_payment_total`: TH-SUM (`cb9e26e`, 2026-08-16) bağladı;
  //     `contracts/service.py:296-305` artık İKİ dalda da gerçek toplamı
  //     döndürüyor ve backend yorumu harfiyen *"`None` bir daha DÖNMEZ"* diyor.
  //     Anahtar SİLİNMEZ: şema tipi `Decimal | None` kaldığı için kart hâlâ
  //     savunmacı `null` dalını taşır — ama gerekçe artık "hesaplanmıyor" değil.
  //   · `progress_pct`: P-YT4 (`c0d3ac8`, 2026-08-23) bağladı; taşeron satırı
  //     da işveren satırıyla AYNI formülü kullanıyor. "—" hücresi bundan sonra
  //     YALNIZ bedelsiz (`amount <= 0`) sözleşmede görünür — `progress_pct`
  //     sıfır/negatif paydada bölme yapmaz. Metin bu yüzden SEBEBİ söyler;
  //     "taşeron sekmesinde ilerleme hiç hesaplanmıyor" demek artık YALANDI.
  //     Gerekçe iki sekmede de aynı ProgressCell'den okunur (işveren sözleşmesi
  //     de bedelsiz olabilir) — bu yüzden metin sekmeden BAĞIMSIZ yazılır.
  subcontractor_progress_payment_total: "Taşeron hakediş toplamı bu görünüme gelmedi",
  subcontractor_progress_pct: "Sözleşme bedeli girilmemiş — ilerleme oranı hesaplanamaz",
  // F-P5 T3 (E14 · İşveren sözleşme detayı) — mockup'ta ÇİZİLİ olup backend
  // karşılığı OLMAYAN üç yüzey. Üst kural: bölüm/buton SİLİNMEZ, yerinde
  // devre dışı + görünür gerekçeyle basılır.
  // 99-123 "Milestone Takvimi": `EmployerContractDetail.milestones` şemada
  // AÇIKÇA `null` tipindedir (proje takvimi = P11).
  // F-TB2 T2'de DÜZELTİLDİ: eski metin ("Proje takvimi (P11) ile birlikte
  // gelir") P11 uçları açılıp `/projeler/takvim` yazıldıktan sonra YANLIŞ
  // hâle gelmişti — eksik olan takvim modülü değil, `EmployerContractDetail
  // .milestones` ALANININ kendisiydi (şemada hâlâ null). İki iddia + görsel
  // baseline eşzamanlı güncellendi: `EmployerContractDetailView.test.tsx:348`,
  // `e2e/employer-contract-detail.spec.ts:81`.
  contract_milestones: "Sözleşme milestone'ları uçtan gelmiyor (şemada null)",
  // 77 "Düzenle": işveren sözleşmesinin kendi alanları için backend'de YAZMA
  // UCU YOKTUR (şema açıklaması: "Sözleşmenin kendi alanları için YENİ yazma
  // ucu AÇILMAZ … bu yalnız okuma şemasıdır") ve proje formu yalnız OLUŞTURMA
  // kipindedir (`/projeler/yeni`; düzenleme rotası repoda yok).
  employer_contract_edit:
    "İşveren sözleşmesi proje formunda kurulur; ayrı düzenleme ekranı henüz yok",
  // F-P5 T5 (TL · Taşeron Listesi 51/62 "PUAN" kolonu) — ONAYLI KARAR S4:
  // taşeron uçlarının HİÇBİRİNDE değerlendirme/puan alanı yoktur
  // (`SubcontractorResponse`: id/name/tax_number/contact_person/phone/email/
  // category/is_active). Kolon SİLİNMEZ, yıldız İCAT EDİLMEZ — "—" + bu
  // gerekçe basılır (backend adayı olarak ROADMAP'e yazılır).
  subcontractor_rating: "Taşeron değerlendirme özelliği henüz yok",
  // F-ST T2 (E3 · Stok & Depo) — `StockSummaryKpis.pending_orders` zarfının
  // taşıdığı anahtar. "Bekleyen Sipariş" kartının (E3 81-84) kaynağı SATINALMA
  // modülüdür; backend bugün `available: false` döndürür, ekran uydurma sayı
  // basmak yerine "—" + bu gerekçeyi gösterir.
  // `/satinalma` (+ talepler/siparisler/tedarikciler) CANLI.
  procurement: "Satınalma verisi bu yüzeye henüz bağlanmadı",
  // F-ST T3 — CANLI SUNUCUNUN gerçek anahtarları. Backend
  // `app/modules/inventory/service.py`: `PENDING_PURCHASING = "purchasing"`
  // (E3 "Bekleyen Sipariş" KPI'ı) ve `PENDING_SITE_PLANNING = "site_planning"`
  // (ŞS "Aylık İhtiyaç" + "Bölüm" sütunları). T2'de yalnız `procurement`
  // eşlenmişti; canlıda o anahtar HİÇ gelmediği için KPI gerekçesi genel
  // metne düşerdi — iki anahtar da burada eşlenir (`procurement` izin
  // matrisinin modül anahtarı olarak ayrıca yaşamaya devam eder).
  purchasing: "Satınalma verisi bu yüzeye henüz bağlanmadı",
  // `/…/gunluk-kayit/planlama` CANLI; eksik olan stok satırının plana
  // bağlanmasıdır.
  site_planning: "Şantiye planlama verisi bu yüzeye henüz bağlanmadı",
  // F-SA T2 (SAT · Satınalma & Teklif tablosu) — `PurchaseRequestListRow`
  // şemasının BİLEREK taşımadığı iki sütun. Şema açıklaması gerekçeyi
  // kendi yazıyor: "SAT tablosunun bir satiri — KALEMLERI TASIMAZ … tasimak
  // sayfadaki her satir icin ikinci bir sorgu (ve her kalem icin bir bakiye
  // turevi) demek olurdu" (N+1). Satır yalnız `line_count` taşır.
  //
  // Üst kural (F-TH T2 `work_category`/`vat`/`progress`, F-P5 T5
  // `subcontractor_rating` emsali): KOLON SİLİNMEZ, VERİ İCAT EDİLMEZ —
  // hücre yerinde durur, "—" + bu gerekçe basılır.
  //
  // SAT 104/115 "Miktar": talebin kalemleri toplanmadan yazılamaz; toplam
  // miktar zaten BİRİMSİZ olurdu ("15 Ton" + "500 m" toplanamaz). Değer
  // talep detayında (`GET /purchase-requests/{id}`) kalem kalem görünür.
  purchase_request_quantity: "Talep miktarı liste ucundan gelmiyor",
  // SAT 106/117 "Teklif": teklifler talebin ALT KAYNAĞIDIR
  // (`GET /purchase-requests/{id}/quotes`); sayacı listeye koymak satır
  // başına ikinci bir sorgu demektir (aynı N+1 gerekçesi). Sayı teklif
  // karşılaştırma ekranında gerçek kartlarla görünür.
  purchase_request_quote_count: "Teklif sayısı liste ucundan gelmiyor",
  // F-SA T2 (TED 55-58 · tedarikçi kartının yıldız satırı) —
  // `subcontractor_rating` emsalinin İKİZİ: `SupplierCard`/`SupplierResponse`
  // şemalarında puan alanı YOKTUR ve şema açıklaması bunu açıkça gerekçelendirir
  // ("PUAN ALANI YOKTUR … yildizlarin giris yuzeyi hicbir ekranda yoktur ve
  // uydurma bir puan gostermektense hic gostermemek dogrudur"). Yıldızlar
  // İCAT EDİLMEZ; satır yerinde durur, "—" + bu gerekçe basılır.
  supplier_rating: "Tedarikçi değerlendirme özelliği henüz yok",
  // F-SA T3 (FST · Satın Alma Talebi formu) — mockup'ta ÇİZİLİ olup şemada
  // KARŞILIĞI OLMAYAN üç yüzey. `PurchaseRequestCreate` açıklaması ikisini
  // adıyla sayar: "FST'nin 'Teklif Istenecek Tedarikciler' listesi ve 'Odeme
  // Vadesi Tercihi' burada YOKTUR". Üçü de yerinde devre dışı + görünür
  // gerekçeyle basılır, gövdeye HİÇBİR anahtar eklemez.
  purchase_quote_suppliers: "Teklif istenecek tedarikçi seçimi henüz saklanmıyor",
  purchase_payment_terms: "Ödeme vadesi tercihi henüz saklanmıyor",
  purchase_supplier_email: "E-posta bildirimleri henüz yok",
  // F-SA T4 (TEK 100 · "EN HIZLI" rozeti) — `PurchaseQuoteCard` şemasının
  // açıklaması gerekçeyi kendi yazıyor: "`delivery_time` serbest metindir
  // ('Yarin sabah' ile '3 is gunu' karsilastirilamaz)" → sunucuda SIRALI bir
  // veri kaynağı YOKTUR. Rozet mockup'ta ÇİZİLİ olduğu için SİLİNMEZ; her
  // kartın rozet yuvasında devre dışı + gerekçeli durur (F-P5 T5
  // `subcontractor_rating` emsali). "EN İYİ FİYAT" rozetinin İKİZİ DEĞİLDİR:
  // o rozet sunucunun `is_best_price` damgasıdır ve gerçekten basılır.
  quote_fastest_badge: "Teslim süresi sıralaması henüz yok (serbest metin)",
  // F-SA T4 (SIP 67 "Detay" · 35 "+ Sipariş Oluştur") — spec §3 K4. İkisi de
  // MOCKUP'TA VARDIR ama arkasındaki EKRAN çizilmemiştir; düğme silinmez,
  // devre dışı + görünür gerekçeyle basılır (F-P5 `employer_contract_edit`
  // emsali).
  purchase_order_detail: "Sipariş detay ekranı henüz çizilmedi",
  // `PurchaseOrderCreate` şeması bu kararı ayrıca destekler: gövdede
  // `request_id` YOKTUR (talebe bağlı siparişin tek yolu `select-and-order`)
  // ve KALEM TABLOSU da yoktur — çizilmemiş bir formu icat etmek, mockup'ın
  // hiç göstermediği alanları uydurmak olurdu.
  purchase_order_create: "Doğrudan sipariş formu henüz çizilmedi",
  // F-SA T4 (SIP 48 "Malzeme" · 51 "Miktar") — `PurchaseOrderResponse` KALEM
  // TAŞIMAZ: `PurchaseOrderCreate` açıklaması "KALEM DE YOKTUR … dogrudan
  // siparis tek bir `total_amount` tasir" der. Kolonlar SİLİNMEZ, değer İCAT
  // EDİLMEZ (F-TH `work_category` emsali) — "—" + bu gerekçe basılır.
  purchase_order_material: "Sipariş kalemleri henüz saklanmıyor (sipariş tek tutar taşır)",
  purchase_order_quantity: "Sipariş miktarı henüz saklanmıyor (sipariş tek tutar taşır)",
  // F-MU1 T2 (E8:66 "Dışa Aktar") — muhasebe kökünde HİÇBİR dışa aktarma ucu
  // yoktur (`/audit-log/export.xlsx` denetim günlüğünündür, yevmiyenin değil).
  // Düğme SİLİNMEZ (F-TH kanonu), devre dışı + GÖRÜNÜR gerekçeyle basılır —
  // gerekçeyi `title`da saklamak yasaktır.
  accounting_export: "Yevmiye defteri dışa aktarma ucu henüz açılmadı",
  // F-MU1 T3 (HP:49 "Excel") — AYRI bir anahtar açıldı, `accounting_export`
  // paylaşılmadı: o metin adıyla "yevmiye defteri" der ve Hesap Planı
  // ekranında yanlış yüzeyi işaret ederdi. İkisi de aynı gerçeği anlatır
  // (muhasebe kökünde HİÇBİR dışa aktarma ucu yoktur) ama her ekran kendi
  // düğmesinin gerekçesini okur.
  chart_of_accounts_export: "Hesap planı dışa aktarma ucu henüz açılmadı",
  // F-MU2 T2 (MZ:48 "Excel" · MZ:49 "PDF") — K6: EKRAN BAŞINA ayrı anahtar.
  // `accounting_export` "yevmiye defteri" der, `chart_of_accounts_export`
  // "hesap planı" — ikisi de mizan ekranında YANLIŞ yüzeyi işaret ederdi.
  // Tek metin iki düğmeyi birden karşılar: ikisinin de eksiği AYNI şeydir
  // (mizanın hiçbir dışa aktarma ucu yok), biçim farkı değil.
  trial_balance_export: "Mizan dışa aktarma ucu henüz açılmadı (Excel de PDF de)",
  // F-MT T2 (BL:38 "PDF") — AYNI K6 kuralı: EKRAN BAŞINA ayrı anahtar.
  // `trial_balance_export` adıyla "mizan" der ve bilanço ekranında YANLIŞ
  // yüzeyi işaret ederdi. Uç açıklaması kapsam dışını adıyla sayıyor:
  // "`PDF` düğmesi (BL:38 — düğme dışında hiçbir şey söylemiyor)".
  balance_sheet_export: "Bilanço dışa aktarma ucu henüz açılmadı (PDF)",
  // F-MT T3 (NA:38 "PDF") — AYNI K6 kuralı: EKRAN BAŞINA ayrı anahtar.
  // `balance_sheet_export` adıyla "bilanço" der ve nakit akışı ekranında
  // YANLIŞ yüzeyi işaret ederdi.
  cash_flow_statement_export: "Nakit akış tablosu dışa aktarma ucu henüz açılmadı (PDF)",
  // F-MT T3 · K8 (NA:143-159 "3 Aylık Projeksiyon") — uç açıklaması kartı
  // ADIYLA kapsam dışına koyuyor: ileriye dönük tahmin, algoritması mockup'ta
  // YOK, satır açıklamaları ("Hakediş + bordro") serbest metin. Üç satır
  // UYDURULMAZ; kart yerinde durur, gerekçe BU anahtardan türer.
  cash_flow_projection: "Nakit akışı projeksiyonu henüz hesaplanmıyor (tahmin ucu yok)",
  // ⚠️ F-MT2'de KALDIRILDI: `income_statement` anahtarı E11 tablosunun "uç yok"
  // gerekçesiydi. `GET /income-statement` AÇILDI ve tablo GERÇEK oldu; anahtarın
  // tüketicisi kalmadı. Yeniden eklenmemeli — "gelir tablosu ucu yok" artık
  // YALAN bir gerekçedir (F-PRJTAB kanonu, `gantt` emsali).
  // ⚠️ `income_statement_period` de AYNI turda kaldırıldı: dönem gezgini artık
  // ÇALIŞIYOR ve ucu gerçekten yeniden çağırıyor.
  //
  // 🔴 F-MT2 K2 · E11:151-167 · E11:169-189 — iki özet kartı GELİR TABLOSU
  // UCUYLA AÇILMADI ve eski metinleri ("… gelir tablosu ucuyla birlikte gelir
  // (MT-2)") bugün YALAN olurdu. ÖLÇÜLDÜ:
  //   · `Performans Özeti`nin üç satırından yalnız `Brüt Marj %14,1` (ki aslında
  //     NET marjdır) hesaplanabilir ve o zaten tablonun kapanış satırındadır;
  //     `Bütçe Kullanımı %76,7` ile `Tahsilat Oranı %66,3` HİÇBİR uçtan gelmez
  //     (bütçe/tahsilat mali tablo uçlarının kapsamında değil).
  //   · `Proje Bazlı Karlılık` bir uç eksikliği DEĞİL, bir VERİ MODELİ
  //     eksikliğidir: üç mali tablo ucunun hiçbiri `project_id`/`site_id`
  //     taşımaz ve muhasebe tabloları proje kırılımı TUTMAZ.
  financial_performance_summary:
    "Bütçe kullanımı ve tahsilat oranı hiçbir uçtan gelmiyor (net marj tabloda basılır)",
  project_profitability:
    "Muhasebe kayıtları proje kırılımı tutmuyor (mali tablo uçları project_id almıyor)",
  // E11:71 (`PDF İndir`) — K6, EKRAN BAŞINA ayrı anahtar: `balance_sheet_export`
  // adıyla "bilanço", `cash_flow_statement_export` "nakit akış tablosu" der;
  // ikisi de bu ekranda YANLIŞ yüzeyi işaret ederdi.
  income_statement_export: "Gelir tablosu dışa aktarma ucu henüz açılmadı (PDF)",
  // 🔴 F-MT2 K2 (E11:99 `↑ %8,3` TREND sütunu) — uç trendi BİLEREK dışladı.
  // `IncomeStatementLine` şema açıklaması gerekçeyi kendi yazıyor: "trend
  // önceki dönem karşılaştırması ister; mockup hangi dönem olduğunu SÖYLEMİYOR
  // ve algoritma İCAT EDİLMEZ". Sütun silinmez; gelir kalemlerinde `—` basar.
  income_statement_trend: "Trend için önceki dönem karşılaştırması yok (uç trend döndürmüyor)",
  // 🔴 E11:82 (proje süzgeci) — ÖLÇÜLDÜ: canlı iki ucun sorgu parametrelerinde
  // `project_id` YOKTUR ve uç açıklamaları kapsam dışını adıyla sayıyor:
  // "proje/şantiye süzgeci (üç muhasebe tablosunda da `project_id`/`site_id`
  // YOKTUR ve mockup süzgeç çizmiyor)".
  financial_statements_project_filter:
    "Mali tablolarda proje süzgeci yok (uçlar project_id parametresi almıyor)",
  // F-MU2 T3 (KDV:48 "XML İndir" · KDV:49 "GİB'e Gönder") — gerekçe metni
  // `accounting-nav-config.ts:72`den gelen KARARIN aynısıdır: e-Fatura/GİB
  // entegrasyonu kullanıcı kararıyla ertelendi. Beyannameyi XML'e yazmak da
  // GİB'e göndermek de O entegrasyonun parçasıdır.
  vat_return_gib: "e-Fatura/GİB entegrasyonu ertelendi (kullanıcı kararı)",
  // 🔴 F-BOLLINK (2026-08-17) — BÖLÜM DETAYINA ÖZEL beş anahtar. Ekran daha
  // önce `boq`/`timesheet`/`stock`/`progress_payments`/`site_diary` anahtarlarını
  // kullanıyordu; o metinler "… modülüyle birlikte gelir" diyerek kullanıcıya
  // MODÜLÜN OLMADIĞINI söylüyordu. ÖLÇÜLDÜ: beş modülün de şantiye seviyesinde
  // YAZILI rotası var (`is-kalemleri` · `puantaj` · `stok` · `hakedisler` ·
  // `gunluk-kayit`) — eksik olan MODÜL değil, BÖLÜM BAĞI.
  // Paylaşılan anahtarların metni DEĞİŞTİRİLMEDİ: aynı beş anahtar backend'in
  // `pending_module` alanından proje/şantiye/kart yüzeylerine de geliyor
  // (ölçüldü: `SectionCard`, `SiteCard`, `SiteHeroBar`, `ProjectCard`,
  // `SiteTotalsStrip`, `PlanMaterialsCard`, `BoqAssignmentCard`, `SectionsCard`).
  // K6 kuralı: EKRAN BAŞINA ayrı anahtar.
  // BOQ-SEC-F (2026-08-18): `section_boq` SİLİNDİ — bölüm ↔ iş kalemi bağı
  // AÇILDI (`GET /sites/{id}/boq?section_id=`), sekme gerçek tablo basıyor.
  // Anahtarı bırakmak, hiçbir yerin okumadığı ölü bir gerekçe metni olurdu.
  section_timesheet: "Puantaj bu bölüme henüz kırılmıyor (şantiye genelinde tutulur)",
  section_stock: "Malzeme hareketleri bu bölüme henüz kırılmıyor (şantiye genelinde tutulur)",
  section_progress_payments: "Hakediş bu bölüme henüz kırılmıyor (şantiye genelinde tutulur)",
  section_site_diary: "Günlük kayıt bu bölüme henüz kırılmıyor (şantiye genelinde tutulur)",
  // 🔴 F-PKK T1 (2026-08-23) — Proje Özeti (KY = `Proje - Kendi Yatırım`,
  // KK = `Proje - Kat Karşılığı`) ve Paylaşım Tablosu
  // (KKP = `Kat Karşılığı - Paylaşım`) ekranlarının mockup'ta ÇİZİLİ olup
  // üründe KARŞILIĞI OLMAYAN yüzeyleri. Üst kural (F-TH kanonu): öğe
  // SİLİNMEZ, yerinde devre dışı + GÖRÜNÜR gerekçeyle basılır. Beşi de bir
  // MODÜL değil ALAN/UÇ eksikliğidir (`work_category` emsali).
  //
  // KY 83 · KK 89 · KKP 183 "İnşaat İlerlemesi %68/%42" — İKİ kaynak da
  // sahte: `LandShareCard.construction_progress` BOŞ ZARF
  // (`projects/service.py` `_metric(_PROGRESS_PAYMENTS)`) ve
  // `ProjectDetailResponse.progress_pct` TUZAK (kolon Create/Update
  // şemalarında YOK, `default=0`, canlıda her projede 0 — `timeline_progress
  // _pct` ile aynı ölçüm).
  //
  // ⚠️ ALAN ADRESİ DÜZELTİLDİ (F-PKK T2, ölçüm): önceki hâli bu zarfı
  // `ProjectCostBreakdown.construction_progress` diye adresliyordu —
  // `ProjectCostBreakdown`ta BÖYLE BİR ALAN YOKTUR (yedi alanı:
  // `land_cost` · `construction_spent` · `construction_budget` · `permits` ·
  // `financing` · `marketing` · `total_spent`). Zarf `LandShareCard`tadır ve
  // YALNIZ kat karşılığı projesinde döner; kendi yatırımda (`InvestmentCard`)
  // karşılığı hiç yoktur. Gerekçe İKİ ekranda da geçerlidir, adresi tekti.
  construction_progress:
    "İnşaat ilerlemesi hesaplanmıyor (hakediş yüzdesi proje düzeyine toplanmıyor)",
  // 🔴 F-PKK T2 — ÖNCEDEN KAYIT EDİLMİŞ BORÇ ÖDENDİ. Aşağıdaki
  // `FALLBACK_LABEL` notu bu iki anahtarı isim isim sayıp *"O ekran
  // yazıldığında iki anahtar BURAYA eklenmelidir, aksi hâlde kullanıcı bu
  // genel metni görür"* diyordu. O ekran BU DİLİMDE yazıldı (Proje Özeti,
  // `/projeler/[projectId]/ozet`) ve `ProjectCostBreakdown`ın ÜÇ zarfını
  // basıyor. Backend eşlemesi ÖLÇÜLDÜ (`projects/cost_summary.py:154-156`):
  //   `permits`   → `accounting`
  //   `financing` → `treasury`
  //   `marketing` → `accounting`
  // Anahtarlar eklenmeseydi KY 88-100 kırılımının üç satırı da "İlgili
  // modülle birlikte gelir" genel metnini basardı.
  //
  // İkisi de MODÜL eksikliği DEĞİL (`/muhasebe` ve `/hazine` CANLI, rotaları
  // ölçüldü): eksik olan, o modüllerin verisinin PROJEYE KIRILMASIDIR.
  accounting: "Muhasebe verisi bu yüzeye henüz bağlanmadı (gider hesapları projeye kırılmıyor)",
  treasury: "Hazine verisi bu yüzeye henüz bağlanmadı (kredi ve faiz projeye kırılmıyor)",
  // KY 103 "Nakit Durumu ₺11,1M". `ProjectCostsResponse` NAKİT TAŞIMAZ
  // (breakdown + profit + subcontractors) ve hazine uçları proje kırılımı
  // tutmaz — `project_profitability` ile aynı sınıf eksiklik.
  project_cash_position: "Proje nakit durumu hiçbir uçtan gelmiyor (maliyet ucu nakit taşımaz)",
  // KY 193 "Başabaş noktası: 32 ünite". `ProjectProfitProjection`ın ALTI
  // alanının (`revenue` · `cost` · `profit` · `margin_pct` · `realized_sales` ·
  // `remaining_stock_value`) hiçbiri eşik ünite sayısı değildir; ortalama
  // fiyattan istemcide türetmek mockup'ın söylemediği bir formül uydurmak
  // olurdu. (Sayı F-PKK T2'de ölçülerek düzeltildi: "beş" yazıyordu.)
  sales_breakeven: "Başabaş noktası hesaplanmıyor (maliyet ucu eşik ünite sayısı döndürmüyor)",
  // KKP 176-197 "Arsa Sahibi Teslim Takibi" kartı — backend emri BİLİNÇLİ
  // kapsam dışı bıraktı: `LandShareSummaryResponse` sözleşme/denge/hissedar
  // taşır, TESLİM ADIMI taşımaz. Kartın tek GERÇEK sayısı `daily_penalty`dir
  // (KKP 197) ve o basılır.
  landowner_delivery_tracking:
    "Arsa sahibi teslim takibi hiçbir uçtan gelmiyor (kat karşılığı özeti teslim adımı taşımaz)",
  // KK 218 "Durum" sütunu (227/235 "Aktif" · 243 "Başlamadı") — İKİ eksiklik
  // üst üste: `SubcontractorCostRow`da durum alanı YOK, ayrıca
  // `ContractStatus{active,completed,on_hold}` mockup sözcüklerine de oturmaz.
  subcontractor_contract_status: "Sözleşme durumu maliyet satırından gelmiyor",
  // ⚠️ F-PKK T1'de EKLENMEDİ: `shareholder_unit_count` (KK 161-163 "10
  // ünite"). ÖLÇÜLDÜ ve ÇÜRÜTÜLDÜ — kaynak VAR: `LandShareShareholderRow`
  // (`land-share/summary` → `shareholders[]`) `unit_count` taşır, hook'u
  // canlı (`useLandShareSummary`). Gerekçe basmak gerçek veriyi bastırıp
  // YALAN söylerdi (`section_boq` emsali); yokluğu testte çakılıdır.
};

/**
 * 🔴 F-UNIT1 T5 ÖLÇÜMÜ — bu metin de aynı bayat kalıptadır ama DEĞİŞTİRİLMEDİ:
 * tanınmayan anahtar hangi modülü kastettiğini SÖYLEMEZ, dolayısıyla ondan daha
 * doğru bir cümle kurulamaz. Bugün buraya düşen CANLI anahtarlar ölçüldü:
 * backend `projects/cost_summary.py` `accounting` ve `treasury` yayınlıyor;
 * ikisinin de tüketicisi henüz YOK (proje maliyet özeti ekranı yazılmadı).
 * O ekran yazıldığında iki anahtar BURAYA eklenmelidir, aksi hâlde kullanıcı
 * bu genel metni görür.
 *
 * ✅ F-PKK T2 (2026-08-23) — YUKARIDAKİ TALİMAT YERİNE GETİRİLDİ; paragraf
 * artık TARİHSELDİR. "Proje maliyet özeti ekranı" bu dilimde yazıldı
 * (`/projeler/[projectId]/ozet`) ve `ProjectCostBreakdown`ın üç zarfını
 * basıyor, dolayısıyla `accounting` + `treasury` `MODULE_LABELS`a EKLENDİ.
 * İkisi de artık bu yedeğe DÜŞMEZ ve düşmediklerini `pending-modules.test.ts`
 * çakar — not bir gün yeniden bayatlarsa test kırmızıya döner.
 */
const FALLBACK_LABEL = "İlgili modülle birlikte gelir";

// P10 devri (2026-08-11): `app__modules__projects__schemas__MetricPlaceholder`
// artik `pending_module?: string | null` tasiyor (dashboard ikizi degismedi).
// Anahtar tasiyan TUM prop/tip kopyalari bu tek takma adi kullanir — dort ayri
// `pendingModule: string` bildirimi yeniden uretilmez.
export type PendingModuleKey = string | null | undefined;

export function pendingModuleLabel(key: PendingModuleKey): string {
  if (!key) return FALLBACK_LABEL;
  return MODULE_LABELS[key] ?? FALLBACK_LABEL;
}
