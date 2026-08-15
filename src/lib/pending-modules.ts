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
  gantt: "Proje takvimi (Gantt) modülüyle birlikte gelir",
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
