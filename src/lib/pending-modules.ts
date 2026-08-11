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
