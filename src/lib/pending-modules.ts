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
};

const FALLBACK_LABEL = "İlgili modülle birlikte gelir";

export function pendingModuleLabel(key: string): string {
  return MODULE_LABELS[key] ?? FALLBACK_LABEL;
}
