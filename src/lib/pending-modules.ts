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
  // F-TH final inceleme F-1 (kalıcı kural: backend'i/rotası olmayan mockup
  // öğesi SİLİNMEZ, devre dışı + görünür gerekçeyle basılır) — Taşeron
  // Hakediş Oluştur mockup'ındaki "Sözleşmeyi Gör →" ve breadcrumb'daki
  // taşeron adı + sözleşme no bağlantısının hedefi olan Taşeron Sözleşme
  // Detay ekranı bu repo'da HENÜZ YOK.
  subcontractor_contract_detail: "Taşeron sözleşme detay ekranı henüz eklenmedi",
};

const FALLBACK_LABEL = "İlgili modülle birlikte gelir";

export function pendingModuleLabel(key: string): string {
  return MODULE_LABELS[key] ?? FALLBACK_LABEL;
}
