// Backend pending_module anahtari doner; kullaniciya gosterilen metin frontend'in isi.
// Tek kaynak: hem gosterge paneli (F6) hem Projeler (P1) bunu kullanir (spec §7.2).
const MODULE_LABELS: Record<string, string> = {
  progress_payments: "Hakediş modülüyle birlikte gelir",
  invoicing: "Fatura yönetimiyle birlikte gelir",
  approvals: "Onay kutusuyla birlikte gelir",
  inventory: "Stok ve saha modülleriyle birlikte gelir",
  timesheet: "Puantaj modülüyle birlikte gelir",
  subcontracts: "Taşeron sözleşmeleriyle birlikte gelir",
  units: "Ünite satış modülüyle birlikte gelir",
  project_costs: "Maliyet takibiyle birlikte gelir",
  // P2 (Şantiye & Bölüm) — spec §7.1
  contracts: "Sözleşme modülüyle birlikte gelir",
  boq: "İş kalemleri modülüyle birlikte gelir",
  stock: "Stok modülüyle birlikte gelir",
  documents: "Belge modülüyle birlikte gelir",
  site_diary: "Şantiye günlüğüyle birlikte gelir",
  // F-P6 T3 (Bölüm formu) — devre dışı kartlar
  equipment: "Ekipman/makine modülüyle birlikte gelir",
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
  work_category: "İş kategorisi alanıyla birlikte gelir",
  vat: "KDV hesaplamasıyla birlikte gelir",
  progress: "İlerleme takibiyle birlikte gelir",
  // F-TH T4 (Ekran 15 taşeron uyarlaması) — PDF/dışa aktarma ucu openapi'de
  // yok (yalnız CRUD + durum aksiyonları var); "Sözleşme İlerlemesi" kartının
  // üç çubuğu ve "Toplam Hakediş"/"Kalan" KPI'ları
  // `SubcontractorContractDetail.progress_payment_summary` alanına bağlı —
  // şema bu alanı BUGÜN her zaman `null` döndürüyor (bkz. openapi açıklaması).
  pdf_export: "Dışa aktarma modülüyle birlikte gelir",
  contract_progress: "Sözleşme ilerleme özetiyle birlikte gelir",
  // F-TH T5 fix round 1 (coordinator review) — taşeron hakedişi satırında
  // bölüm KİMLİĞİ (`section_id`) var ama ADINI çözecek bir uç/hook bu
  // dilimde YOK. `section_id === null` (gerçekten "Tüm Bölümler") bu
  // etiketi KULLANMAZ — yalnız `section_id` DOLU olup adı çözülemeyen
  // durumda gösterilir.
  section_name: "Bölüm adı çözümlemesiyle birlikte gelir",
  // ⚠️ F-P5 T7'de KALDIRILDI: `subcontractor_contract_detail` etiketi F-TH'nin
  // devre-dışı "Sözleşmeyi Gör →" + breadcrumb bağlantılarının gerekçesiydi.
  // TSD rotası (`/sozlesmeler/taseron/[contractId]`) yazıldı, iki bağlantı da
  // gerçek `Link`e döndü — etiketin tüketicisi kalmadı, yeniden eklenmemeli.
  // F-P5 T2 (SZL · Sözleşmeler listesi) — TAŞERON sekmesinde backend'in
  // BİLEREK `None` döndürdüğü iki alan (spec §2, openapi açıklaması):
  // hakediş toplamı KPI'ı (`ContractSummary.progress_payment_total`) ve satır
  // ilerlemesi (`ContractListItem.progress_pct`). Sahte `0` basmak yerine
  // kart/kolon yerinde durur, "—" + bu gerekçe gösterilir.
  subcontractor_progress_payment_total: "Taşeron hakediş toplamı henüz hesaplanmıyor",
  subcontractor_progress_pct: "Taşeron sözleşmesinde ilerleme henüz hesaplanmıyor",
  // F-P5 T3 (E14 · İşveren sözleşme detayı) — mockup'ta ÇİZİLİ olup backend
  // karşılığı OLMAYAN üç yüzey. Üst kural: bölüm/buton SİLİNMEZ, yerinde
  // devre dışı + görünür gerekçeyle basılır.
  // 99-123 "Milestone Takvimi": `EmployerContractDetail.milestones` şemada
  // AÇIKÇA `null` tipindedir (proje takvimi = P11).
  // ⚠️ AÇIK BORÇ (F-TKV T4'te ÖLÇÜLDÜ, BİLEREK DEĞİŞTİRİLMEDİ): P11 uçları
  // artık AÇIK ve `/projeler/takvim` ekranı YAZILDI — bu metin bugün YANLIŞ
  // bir şeyi işaret ediyor (eksik olan takvim modülü değil, `Employer
  // ContractDetail.milestones` ALANININ kendisi). Doğrusu: "Sözleşme
  // milestone'ları uçtan gelmiyor (şemada null)". DEĞİŞTİRİLMEDİ çünkü metin
  // F-P5 yüzeyinin görsel baseline'ında ve iki iddiada sabittir
  // (`EmployerContractDetailView.test.tsx:348`, `e2e/employer-contract-detail
  // .spec.ts:81`); paralel dilim turunda başka bir ekranın karesini oynatmak
  // merge sırasını riske atar. Yönetim kararına bırakıldı.
  contract_milestones: "Proje takvimi (P11) ile birlikte gelir",
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
  procurement: "Satınalma modülüyle birlikte gelir",
  // F-ST T3 — CANLI SUNUCUNUN gerçek anahtarları. Backend
  // `app/modules/inventory/service.py`: `PENDING_PURCHASING = "purchasing"`
  // (E3 "Bekleyen Sipariş" KPI'ı) ve `PENDING_SITE_PLANNING = "site_planning"`
  // (ŞS "Aylık İhtiyaç" + "Bölüm" sütunları). T2'de yalnız `procurement`
  // eşlenmişti; canlıda o anahtar HİÇ gelmediği için KPI gerekçesi genel
  // metne düşerdi — iki anahtar da burada eşlenir (`procurement` izin
  // matrisinin modül anahtarı olarak ayrıca yaşamaya devam eder).
  purchasing: "Satınalma modülüyle birlikte gelir",
  site_planning: "Şantiye planlama türeviyle birlikte gelir",
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
  section_boq: "Bu bölüme henüz iş kalemi bağlanamıyor",
  section_timesheet: "Puantaj bu bölüme henüz kırılmıyor (şantiye genelinde tutulur)",
  section_stock: "Malzeme hareketleri bu bölüme henüz kırılmıyor (şantiye genelinde tutulur)",
  section_progress_payments: "Hakediş bu bölüme henüz kırılmıyor (şantiye genelinde tutulur)",
  section_site_diary: "Günlük kayıt bu bölüme henüz kırılmıyor (şantiye genelinde tutulur)",
};

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
