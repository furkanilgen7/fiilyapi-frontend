import { createServer, type Server } from "node:http";

// exp'i uzak gelecekte olan sahte JWT (base64url payload).
function fakeJwt(): string {
  const payload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: "u1" })).toString("base64url");
  return `h.${payload}.s`;
}

const TOKEN_PAIR = { access_token: fakeJwt(), refresh_token: fakeJwt(), token_type: "bearer" };
const ME = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "patron@fiil.com",
  full_name: "Ahmet Yılmaz",
  title: "Patron",
  role_key: "patron",
  status: "active",
};

// NOT: Gercek backend semasi (bkz. src/lib/api/schema.d.ts) tip-basi metrikleri duz
// alanlar olarak degil, ContractingCard/InvestmentCard/LandShareCard icine gomulu
// MetricPlaceholder/CountPlaceholder olarak doner — plan Task 7'nin varsaydigi duz
// spent/headcount/subcontractor_count/sales/profit alanlari yerine bu yapi kullanildi.
interface MockMetric {
  available: boolean;
  value: string | null;
  pending_module: string;
}
interface MockCount {
  available: boolean;
  count: number | null;
  pending_module: string;
}
interface MockContracting {
  spent: MockMetric;
  physical_progress: MockMetric;
  final_progress_payment: MockMetric;
  worker_count: MockCount;
  subcontractor_count: MockCount;
}
interface MockInvestment {
  sales_target: string | null;
  land_cost: string | null;
  sold_amount: MockMetric;
  sales_ratio: MockMetric;
  unit_summary: MockCount;
  total_cost: MockMetric;
  estimated_profit: MockMetric;
  margin: MockMetric;
}
interface MockLandShare {
  landowner_name: string;
  our_share_pct: string;
  owner_share_pct: string;
  land_cost: string;
  contract_no: string | null;
  notary_date: string | null;
  land_area_m2: string | null;
  construction_area_m2: string | null;
  delivery_date: string | null;
  daily_penalty: string | null;
  guarantee_amount: string | null;
  shareholder_count: number;
  shareholders: Array<{ id: string; name: string; share_pct: string }>;
  our_unit_count: MockCount;
  owner_unit_count: MockCount;
  our_share_value: MockMetric;
  construction_cost: MockMetric;
  estimated_profit: MockMetric;
  margin: MockMetric;
  construction_progress: MockMetric;
}
interface MockProject {
  id: string;
  code: string;
  name: string;
  project_type: string;
  status: string;
  category: string | null;
  city: string | null;
  employer_name: string | null;
  contract_no: string | null;
  contract_amount: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: string;
  progress_pct: string;
  contracting: MockContracting | null;
  investment: MockInvestment | null;
  land_share: MockLandShare | null;
}

// Task 8/9 — Proje Detay/Şantiye Detay ekranlarını görsel testler için besler
// (bkz. SiteDetailResponse/SectionResponse şeması, src/lib/api/schema.d.ts).
interface MockSite {
  id: string;
  project_id: string;
  code: string;
  name: string;
  // `SiteStatus` (schema.d.ts) dördü de: form "Hazırlık"ı da gönderebilir.
  status: "preparation" | "active" | "on_hold" | "completed";
  address: string | null;
  city: string | null;
  city_inherited: boolean;
  site_manager_name: string | null;
  start_date: string | null;
  end_date: string | null;
  delivery_date: string | null;
  remaining_days: number | null;
}

// P6 · T1 — `Section` modelinin TUM kolonlari (bkz. schema.d.ts
// SectionDetailResponse/SectionCreate/SectionUpdate). `status` P6'da
// `on_hold` ile genisledi (spec: SectionStatus docstring). Yer tutucu
// alanlar (progress_pct/boq_item_count/budget/worker_count) burada
// TUTULMAZ — GET yanitinda uretilir (buildSectionDetail), tipki
// buildSiteDetail'daki desende oldugu gibi.
interface MockSection {
  id: string;
  site_id: string;
  code: string | null;
  name: string;
  status: "planned" | "active" | "on_hold" | "completed";
  manager_user_id: string | null;
  manager_name: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  section_type: string | null;
  description: string | null;
  deputy_manager_user_id: string | null;
  deputy_manager_name: string | null;
  planned_worker_count: number | null;
  budget_amount: string | null;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

// Ekran 13 · İş Kalemleri (BOQ) — BoqGroupResponse/BoqItemResponse ile birebir
// (bkz. src/lib/api/schema.d.ts). `progress_pct` yanıtta üretilir, fikstürde
// tutulmaz: altı kalemin hepsi aynı yer tutucudur (spec §5.4).
interface MockBoqItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  amount: string;
  sort_order: number;
}

interface MockBoqGroup {
  id: string;
  name: string;
  sort_order: number;
  group_total: string;
  items: MockBoqItem[];
}

// P1.1a (F14) — Yeni Proje formunun İşveren seçicisini besler (bkz. EmployerResponse,
// src/lib/api/schema.d.ts). Mockup satır 98'deki statik seçeneklerle isim hizalı.
interface MockEmployer {
  id: string;
  name: string;
  tax_number: string | null;
  contact_person: string | null;
  is_active: boolean;
}

// P7 · Hakediş (İşveren) — poz dağılımı kalemi. `GET .../contract/distribution`
// yanıtının kaynağı; hakediş formunun (`ProgressPaymentForm`) pivot tablosu
// satırlarını besler. Kod/açıklama/birim/birim fiyat
// `İşveren Hakediş Oluştur.dc.html` satır 106-172'den BİREBİR (bkz. aşağıdaki
// CONTRACT_ITEMS_P1 yorumu — mockup satır numaraları orada).
interface MockContractItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  groupName: string;
  groupSortOrder: number;
  allocations: Array<{ site_id: string; quantity: string }>;
}

// `ProgressPaymentLineDetail` (schema.d.ts) ile birebir alan kümesi.
interface MockPaymentLine {
  id: string;
  contract_item_id: string | null;
  site_id: string;
  code: string;
  description: string;
  unit: string;
  contract_unit_price: string;
  coefficient: string;
  quantity: string;
  group_name: string | null;
  sort_order: number;
  adjusted_unit_price: string;
  line_total: string;
  previous_quantity: string;
  previous_amount: string;
  cumulative_quantity: string;
  cumulative_amount: string;
  is_price_stale: boolean | null;
}

// `ProgressPaymentGroupSummary` ile birebir.
interface MockPaymentGroup {
  group_name: string | null;
  previous_amount: string;
  this_amount: string;
  cumulative_amount: string;
  contract_amount: string;
}

// `PaymentCalculationBlock` ile birebir.
interface MockPaymentCalculation {
  gross: string;
  vat: string;
  advance_deduction: string;
  retention: string;
  net: string;
}

// `ProgressBlock` ile birebir.
interface MockPaymentProgress {
  financial_pct: string | null;
  physical_pct: string | null;
  duration_pct: string | null;
}

// --- F-TH T1 · Taşeron Hakedişi mock tipleri ------------------------------
// İşveren `MockPaymentLine`den FARKLI: `site_id` yok (taşeron satırında
// şantiye kırılımı yoktur, spec §2) ve `quantity_source` taşır (bu dilimde
// her zaman `"manual"`, spec §2 — `site_diary` modülü henüz yok).
interface MockSubcontractorPaymentLine {
  id: string;
  contract_item_id: string | null;
  code: string;
  description: string;
  unit: string;
  contract_unit_price: string;
  coefficient: string;
  quantity: string;
  group_name: string | null;
  sort_order: number;
  quantity_source: "manual" | "diary";
  adjusted_unit_price: string;
  line_total: string;
}

// `SubcontractorPaymentCalculation` ile birebir.
interface MockSubcontractorPaymentCalculation {
  gross: string;
  vat: string;
  advance_deduction: string;
  retention: string;
  net: string;
}

// Sözleşme kalemi — `SubcontractorContractItemResponse`in mock tohumu
// (birim fiyat + sabit miktar; gerçek backend'de miktar da ayrı saklanır).
interface MockSubcontractorContractItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  contractUnitPrice: string;
  contractQuantity: string;
  groupName: string | null;
}

// `SubcontractorContractDetail` başlığının mock tohumu.
interface MockSubcontractorContract {
  id: string;
  project_id: string;
  site_id: string | null;
  subcontractor_id: string | null;
  subcontractor_name: string | null;
  work_category: string | null;
  contract_no: string | null;
  signature_date: string | null;
  is_notarized: boolean;
  start_date: string | null;
  end_date: string | null;
  late_penalty_daily: string | null;
  advance_pct: string;
  retainage_pct: string;
  vat_pct: string;
  payment_period: "monthly" | "biweekly" | "on_completion";
  payment_term_days: number;
  materials_by_contractor: boolean;
  subcontractor_files_own_sgk: boolean;
  vat_withholding: boolean;
  status: "active" | "completed" | "on_hold";
  is_draft: boolean;
  items: MockSubcontractorContractItem[];
}

// `SubcontractorProgressPaymentDetail` ile birebir.
interface MockSubcontractorProgressPayment {
  id: string;
  contract_id: string;
  project_id: string;
  sequence_no: number;
  period_year: number | null;
  period_month: number | null;
  description: string | null;
  status: "draft" | "pending_approval" | "approved" | "paid";
  vat_pct: string;
  advance_pct: string;
  retainage_pct: string;
  default_coefficient: string;
  section_id: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  is_revision_required: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  lines: MockSubcontractorPaymentLine[];
  calculation: MockSubcontractorPaymentCalculation;
  dropped_orphan_count: number;
  // F-TH T6 TEST İZOLASYONU (`MockProgressPayment.hiddenFromLists` ile AYNI
  // desen): `true` ise bu kayıt liste (`GET /subcontractor-progress-
  // payments`) ve özet uçlarından DIŞLANIR — yalnız kimliğe göre okunur/
  // mutasyona uğratılır. `e2e/subcontractor-progress-payments.spec.ts`
  // (fonksiyonel spec) `scpp-6`/`scpp-7`yi bu bayrakla işaretler; böylece
  // görsel spec'ler (`subcontractor-progress-payments-visual.spec.ts` vb.)
  // fonksiyonel spec'in aynı paylaşılan mock sunucuda ne zaman/hangi sırada
  // koştuğundan TAMAMEN bağımsız kalır (`fullyParallel` altında sıra garanti
  // değildir).
  hiddenFromLists?: boolean;
}

// `ProgressPaymentDetail` ile birebir (liste satırı `gross_total`/`net_total`
// `calculation`den türetilir, ayrıca saklanmaz — bkz. `buildPaymentListItem`).
interface MockProgressPayment {
  id: string;
  project_id: string;
  sequence_no: number;
  period_year: number | null;
  period_month: number | null;
  description: string | null;
  status: "draft" | "pending_approval" | "approved" | "paid";
  vat_pct: string;
  advance_pct: string;
  retainage_pct: string;
  default_coefficient: string;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  lines: MockPaymentLine[];
  groups: MockPaymentGroup[];
  calculation: MockPaymentCalculation;
  progress: MockPaymentProgress;
  dropped_orphan_count: number;
  // TEST İZOLASYONU (bkz. `buildProgressPaymentFixtures` üstündeki not):
  // `true` ise bu kayıt liste (`GET /progress-payments`) ve özet
  // (`buildProgressPaymentSummary`) uçlarından DIŞLANIR — yalnız kimliğe
  // göre okunur/mutasyona uğratılır (detay, PATCH, PUT .../lines, durum
  // geçişleri). `e2e/progress-payments.spec.ts` (TEK mutasyon yapan
  // fonksiyonel spec) `pp-6`yı bu bayrakla işaretler; böylece görsel liste
  // spec'leri (`progress-payments-visual.spec.ts`,
  // `site-progress-payments-visual.spec.ts`) fonksiyonel spec'in aynı
  // paylaşılan mock sunucuda ne zaman/hangi sırada koştuğundan TAMAMEN
  // bağımsız kalır — `fullyParallel` altında sıra garanti değildir.
  hiddenFromLists?: boolean;
}

interface MockState {
  users: Array<{ id: string; email: string; full_name: string; title: string; role_id: string; status: string }>;
  roles: Array<{ id: string; key: string; name: string; emoji: string; description: string; is_system: boolean }>;
  modules: Array<{ id: string; key: string; name: string; group: string; sort_order: number }>;
  projects: MockProject[];
  sites: MockSite[];
  sections: MockSection[];
  employers: MockEmployer[];
  // P7 T7 — İşveren hakedişleri (mevcut proje evrenine bağlı, bkz.
  // CONTRACT_ITEMS_P1/EMPLOYER_CONTRACT_P1 yorumları).
  progressPayments: MockProgressPayment[];
  // F-TH T1 — Taşeron sözleşmeleri + hakedişleri (mevcut proje evrenine
  // bağlı, bkz. SUBCONTRACTOR_CONTRACTS yorumu).
  subcontractorContracts: MockSubcontractorContract[];
  subcontractorProgressPayments: MockSubcontractorProgressPayment[];
  permissions: Record<string, Record<string, { access_level: string; scope: string }>>;
  projectAccess: Record<string, { all_projects: boolean; project_ids: string[] }>;
  company: {
    id: string;
    name: string | null;
    tax_number: string | null;
    tax_office: string | null;
    trade_registry_no: string | null;
    kep_address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    brand_color: string;
    gib_integration_code: string | null;
    earsiv_portal: string | null;
    default_vat_rate: string;
    auto_einvoice: boolean;
    has_logo: boolean;
    logo_url: string;
  };
  preferences: {
    locale: string;
    currency: string;
    date_format: string;
    density: string;
    theme: string;
    accent_color: string;
  };
  notifications: Array<{ event_key: string; label: string; email: boolean; in_app: boolean; sms: boolean }>;
  auditLog: Array<{
    id: string;
    occurred_at: string;
    action: string;
    detail: string;
    ip_address: string | null;
    actor: { id: string; full_name: string; role_name: string } | null;
  }>;
}

const METRIC_PENDING = (m: string): MockMetric => ({ available: false, value: null, pending_module: m });
const COUNT_PENDING = (m: string): MockCount => ({ available: false, count: null, pending_module: m });

const CONTRACTING_PLACEHOLDERS = (): MockContracting => ({
  spent: METRIC_PENDING("project_costs"),
  physical_progress: METRIC_PENDING("progress_payments"),
  final_progress_payment: METRIC_PENDING("progress_payments"),
  worker_count: COUNT_PENDING("timesheet"),
  subcontractor_count: COUNT_PENDING("subcontracts"),
});

const INVESTMENT_PLACEHOLDERS = (salesTarget: string, landCost: string): MockInvestment => ({
  sales_target: salesTarget,
  land_cost: landCost,
  sold_amount: METRIC_PENDING("units"),
  sales_ratio: METRIC_PENDING("units"),
  unit_summary: COUNT_PENDING("units"),
  total_cost: METRIC_PENDING("project_costs"),
  estimated_profit: METRIC_PENDING("progress_payments"),
  margin: METRIC_PENDING("progress_payments"),
});

const LAND_SHARE_PLACEHOLDERS = (
  landownerName: string,
  ourSharePct: string,
  ownerSharePct: string,
): MockLandShare => ({
  landowner_name: landownerName,
  our_share_pct: ourSharePct,
  owner_share_pct: ownerSharePct,
  land_cost: "0",
  contract_no: null,
  notary_date: null,
  land_area_m2: null,
  construction_area_m2: null,
  delivery_date: null,
  daily_penalty: null,
  guarantee_amount: null,
  shareholder_count: 0,
  shareholders: [],
  our_unit_count: COUNT_PENDING("units"),
  owner_unit_count: COUNT_PENDING("units"),
  our_share_value: METRIC_PENDING("units"),
  construction_cost: METRIC_PENDING("project_costs"),
  estimated_profit: METRIC_PENDING("progress_payments"),
  margin: METRIC_PENDING("progress_payments"),
  construction_progress: METRIC_PENDING("progress_payments"),
});

// Dört tip/durumu da kapsar; "Kule A"/"Villa B" adları korunur — mevcut
// dashboard/settings e2e'leri onlara bakıyor (plan Task 7).
const PROJECT_FIXTURES: MockProject[] = [
  {
    id: "p-1", code: "PRJ-1", name: "Kule A", project_type: "taahhut", status: "active",
    category: "Konut", city: "Ankara", employer_name: "Güneşkent A.Ş.", contract_no: "SZL-2025-01",
    contract_amount: "11200000", start_date: "2025-03-01", end_date: "2026-12-01",
    budget: "1000000", progress_pct: "20", contracting: CONTRACTING_PLACEHOLDERS(),
    investment: null, land_share: null,
  },
  {
    id: "p-2", code: "PRJ-2", name: "Villa B", project_type: "kendi_yatirim", status: "active",
    category: "Konut Geliştirme", city: "Ankara", employer_name: null, contract_no: null,
    contract_amount: null, start_date: "2025-01-01", end_date: "2026-06-01",
    budget: "500000", progress_pct: "40", contracting: null,
    investment: INVESTMENT_PLACEHOLDERS("48200000", "5000000"), land_share: null,
  },
  {
    id: "p-3", code: "PRJ-3", name: "Bahçelievler Konut", project_type: "kat_karsiligi",
    status: "active", category: "Konut", city: "Ankara", employer_name: null, contract_no: null,
    contract_amount: null, start_date: "2025-06-01", end_date: "2027-03-01",
    budget: "700000", progress_pct: "42", contracting: null, investment: null,
    land_share: LAND_SHARE_PLACEHOLDERS("Yılmaz Ailesi", "55", "45"),
  },
  {
    id: "p-4", code: "PRJ-4", name: "Güneşkent B-Blok", project_type: "taahhut",
    status: "completed", category: "Konut", city: "Ankara", employer_name: "Güneşkent A.Ş.",
    contract_no: "SZL-2023-04", contract_amount: "9400000", start_date: "2023-01-01",
    end_date: "2025-01-01", budget: "900000", progress_pct: "100",
    contracting: CONTRACTING_PLACEHOLDERS(), investment: null, land_share: null,
  },
];

// Ekran 13 · İş Kalemleri (BOQ) — görsel baseline yükü (F11, spec §11.2).
// Değerler `Ekran 13 - İş Kalemleri.dc.html` satır 106–178'den BİREBİR alınmıştır:
// 3 grup / 6 kalem, `grand_total` 12.399.900. `amount` gerçek backend'de türev
// alandır; burada mockup'ın bastığı tutar aynen verilir (frontend hesaplamaz).
// Mockup'ın renkli `Gerç. %` rozetleri veri tarafında da yer tutucudur (spec §5.4):
// altı kalem + genel toplam yüzdesi hakediş modülünü bekler.
const BOQ_FIXTURE: MockBoqGroup[] = [
  {
    id: "bg-1", name: "TOPRAK VE TEMEL İŞLERİ", sort_order: 10, group_total: "471900.00",
    items: [
      { id: "bi-1", code: "01.001", description: "Kazı (Makine ile)", unit: "m³", quantity: "1240.000", unit_price: "280.00", amount: "347200.00", sort_order: 0 },
      { id: "bi-2", code: "01.002", description: "Geri Dolgu ve Sıkıştırma", unit: "m³", quantity: "860.000", unit_price: "145.00", amount: "124700.00", sort_order: 1 },
    ],
  },
  {
    id: "bg-2", name: "BETONARME İŞLERİ", sort_order: 20, group_total: "9250000.00",
    items: [
      { id: "bi-3", code: "02.001", description: "C25/30 Beton (Döşeme)", unit: "m³", quantity: "3200.000", unit_price: "1850.00", amount: "5920000.00", sort_order: 0 },
      { id: "bi-4", code: "02.002", description: "Demir Donatı (Ø8-Ø20)", unit: "Ton", quantity: "180.000", unit_price: "18500.00", amount: "3330000.00", sort_order: 1 },
    ],
  },
  {
    id: "bg-3", name: "DUVAR VE KAPLAMA İŞLERİ", sort_order: 30, group_total: "2678000.00",
    items: [
      { id: "bi-5", code: "03.001", description: "Tuğla Duvar (19cm)", unit: "m²", quantity: "4800.000", unit_price: "280.00", amount: "1344000.00", sort_order: 0 },
      { id: "bi-6", code: "03.002", description: "İç Sıva (Çimento+Alçı)", unit: "m²", quantity: "9200.000", unit_price: "145.00", amount: "1334000.00", sort_order: 1 },
    ],
  },
];

// --- P7 T7 · Hakediş (İşveren) fikstürleri --------------------------------
// Kimlikler MEVCUT evrene bağlanır (brief §Belirsizlik çözümü 1): proje p-1
// ("Kule A"), şantiyeler s-1 ("A-Blok Şantiyesi") / s-2 ("B-Blok Şantiyesi").
// Proje/şantiye İSİMLERİ mockup'takiyle (Güneşkent Konut / A-Blok) AYNI
// DEĞİL — brief kimlikleri bağlamayı istiyor, ismi değil.
function money2(n: number): string {
  return n.toFixed(2);
}
function qty3(n: number): string {
  return n.toFixed(3);
}

// Poz dağılımı — `İşveren Hakediş Oluştur.dc.html` satır 106-172'den
// BİREBİR: kod/açıklama/birim/sözleşme birim fiyatı + A-Blok/B-Blok miktar
// girdileri (satır 121-172 `qty-input` value'ları). Toplam sözleşme miktarı
// (`quantity`) mockup'ta YOK — iki şantiyeye dağıtılan miktarların (`900+420`,
// `204+96`, `40.8+20.4`, `2880+0`) üstüne makul bir pay eklenerek türetildi,
// tamamı dağıtılmış (`remaining_quantity` sıfır) sayılır.
const CONTRACT_ITEMS_P1: MockContractItem[] = [
  {
    id: "ci-1", code: "03.001", description: "Kat Döşemesi C25/30", unit: "m³",
    quantity: "3200.000", unit_price: "1850.00", groupName: "Betonarme İşleri", groupSortOrder: 10,
    allocations: [
      { site_id: "s-1", quantity: "1800.000" },
      { site_id: "s-2", quantity: "1400.000" },
    ],
  },
  {
    id: "ci-2", code: "03.002", description: "Kolon Betonu C30/37", unit: "m³",
    quantity: "620.000", unit_price: "2100.00", groupName: "Betonarme İşleri", groupSortOrder: 10,
    allocations: [
      { site_id: "s-1", quantity: "420.000" },
      { site_id: "s-2", quantity: "200.000" },
    ],
  },
  {
    id: "ci-3", code: "03.003", description: "Nervürlü Demir Ø12–Ø20", unit: "Ton",
    quantity: "180.000", unit_price: "21500.00", groupName: "Betonarme İşleri", groupSortOrder: 10,
    allocations: [
      { site_id: "s-1", quantity: "120.000" },
      { site_id: "s-2", quantity: "60.000" },
    ],
  },
  {
    id: "ci-4", code: "03.010", description: "Döşeme Kalıbı", unit: "m²",
    quantity: "5200.000", unit_price: "185.00", groupName: "Kalıp İşleri", groupSortOrder: 20,
    allocations: [
      { site_id: "s-1", quantity: "3200.000" },
      { site_id: "s-2", quantity: "2000.000" },
    ],
  },
];

function findContractItem(itemId: string): MockContractItem | undefined {
  return CONTRACT_ITEMS_P1.find((i) => i.id === itemId);
}

// İşveren sözleşmesi (E14/hakediş formu FF bandı) — `amount`/`contract_no`
// mevcut proje fikstürü (p-1) ile hizalı (11.200.000 / SZL-2025-01), diğer
// alanlar `İşveren Hakediş Oluştur.dc.html` (Fiyat Farkı: Var, Katsayı
// 1,142) + `Ekran 15…` (KDV %20 / Avans %20 / Teminat %5) satırlarından.
const EMPLOYER_CONTRACT_P1 = {
  project_id: "p-1",
  contract_no: "SZL-2025-01",
  signature_date: "2025-03-01",
  amount: "11200000.00",
  advance_pct: "20.00",
  retainage_pct: "5.00",
  vat_pct: "20.00",
  late_penalty_daily: null as string | null,
  has_price_escalation: true,
  status: "active" as const,
  start_date: "2025-03-01",
  end_date: "2026-12-01",
  employer_name: "Güneşkent A.Ş.",
  contractor_name: "FİİL Yapı Ltd. Şti.",
  // 4 poz kaleminin sözleşme tutarları toplamı (3200×1850 + 620×2100 +
  // 180×21500 + 5200×185).
  items_total: "12054000.00",
  items_total_diff: "0.00",
  advance_amount: "2240000.00",
};

// `ProgressPaymentSummary` — SABİT (liste uzunluğundan bağımsız), BOQ_FIXTURE
// totals'ının aynı deseni: `Ekran 15…`in KPI'ları (Toplam Hakediş ₺8,4M /
// Kalan ₺2,8M) + `Şantiye - Hakedişler.dc.html`in "%75" ilerlemesiyle
// BİREBİR — 11.200.000 (sözleşme) − 8.400.000 (kümülatif) = 2.800.000 kalan,
// 8.400.000/11.200.000 = %75 aritmetiği de mockup'la örtüşüyor.
// `payment_count`/`pending_count` YALNIZ bunlar dinamik — gerçek
// `progressPayments` dizisinden hesaplanır. `hiddenFromLists` (bkz.
// `MockProgressPayment`) işaretli kayıtlar (pp-6 — fonksiyonel e2e'nin
// mutasyona uğrattığı test-izoleli taslak) bu sayıma KATILMAZ; SABİT
// `pp-7` (dört durum kuralı için eklenen, dokunulmayan taslak) KATILIR —
// bu yüzden sayı mockup'ın "4 kaydına EK olarak" pp-2..pp-5 + pp-7 = 5
// kayıt üzerinden "5 hakediş" basar (bkz. `buildProgressPaymentFixtures`
// İZOLASYON notu — pp-7'nin eklenme gerekçesi).
function buildProgressPaymentSummary(state: MockState, projectId: string) {
  const projectPayments = state.progressPayments.filter(
    (p) => p.project_id === projectId && !p.hiddenFromLists,
  );
  const paymentCount = projectPayments.length;
  const pendingCount = projectPayments.filter((p) => p.status === "pending_approval").length;
  if (projectId !== "p-1") {
    const project = state.projects.find((p) => p.id === projectId);
    const contractAmount = project?.contract_amount ? money2(Number(project.contract_amount)) : null;
    return {
      contract_amount: contractAmount,
      cumulative_gross: "0.00",
      progress_pct: contractAmount ? "0.00" : null,
      advance_deduction_total: "0.00",
      retention_total: "0.00",
      net_total: "0.00",
      payment_count: paymentCount,
      pending_count: pendingCount,
      remaining: contractAmount,
    };
  }
  return {
    contract_amount: "11200000.00",
    cumulative_gross: "8400000.00",
    progress_pct: "75.00",
    advance_deduction_total: "1680000.00",
    retention_total: "420000.00",
    net_total: "7980000.00",
    payment_count: paymentCount,
    pending_count: pendingCount,
    remaining: "2800000.00",
  };
}

// Sabit satır → hesaplanmış satır. `PUT …/lines` gövdesinden ve `create`
// atomik `lines[]`'ından çağrılır. `previous_*`: mock'ta geçmiş hakediş
// kümülatifi izlenmez (basitleştirme, rapora not düşüldü) — var olan satır
// bu değerleri korur, yeni satır "0" ile başlar.
function computeLine(
  itemId: string,
  siteId: string,
  quantityRaw: number | string,
  coefficientRaw: number | string | null | undefined,
  existing: MockPaymentLine | undefined,
  sortOrder: number,
): MockPaymentLine {
  const item = findContractItem(itemId);
  const quantity = Number(quantityRaw) || 0;
  const coefficient =
    coefficientRaw !== undefined && coefficientRaw !== null && coefficientRaw !== ""
      ? Number(coefficientRaw)
      : existing
        ? Number(existing.coefficient)
        : 1;
  const unitPrice = item ? Number(item.unit_price) : 0;
  const adjustedUnitPrice = unitPrice * coefficient;
  const lineTotal = adjustedUnitPrice * quantity;
  const previousQuantity = existing ? Number(existing.previous_quantity) : 0;
  const previousAmount = existing ? Number(existing.previous_amount) : 0;
  return {
    id: existing?.id ?? `ppl-${itemId}-${siteId}`,
    contract_item_id: itemId,
    site_id: siteId,
    code: item?.code ?? "",
    description: item?.description ?? "",
    unit: item?.unit ?? "",
    contract_unit_price: item ? item.unit_price : "0.00",
    coefficient: money2(coefficient),
    quantity: qty3(quantity),
    group_name: item?.groupName ?? null,
    sort_order: sortOrder,
    adjusted_unit_price: money2(adjustedUnitPrice),
    line_total: money2(lineTotal),
    previous_quantity: qty3(previousQuantity),
    previous_amount: money2(previousAmount),
    cumulative_quantity: qty3(previousQuantity + quantity),
    cumulative_amount: money2(previousAmount + lineTotal),
    // Sözleşme kalemi fiyatı mock'ta hiç değişmez → hiçbir satır bayat değil.
    is_price_stale: item ? false : null,
  };
}

// `lines[]`den `groups[]`/`calculation` türetir — YALNIZ gerçek
// `CONTRACT_ITEMS_P1`e bağlı satırlar (PUT …/lines, create, refresh-prices)
// için çağrılır. Fikstür-tohumlu geçmiş hakedişlerin (#2-#5) elle yazılmış
// `groups`/`calculation`'ı BURADAN GEÇMEZ — `Ekran 15…` mockup'ının grup
// adları (Betonarme/Elektrik/Mekanik/Duvar) `CONTRACT_ITEMS_P1`in gruplarıyla
// (Betonarme/Kalıp) örtüşmüyor, yeniden hesaplama onları BOZARDI.
function recomputePaymentTotals(payment: MockProgressPayment): void {
  const groupMap = new Map<string, { previous: number; thisAmt: number; cumulative: number }>();
  for (const line of payment.lines) {
    const key = line.group_name ?? "";
    const acc = groupMap.get(key) ?? { previous: 0, thisAmt: 0, cumulative: 0 };
    acc.previous += Number(line.previous_amount);
    acc.thisAmt += Number(line.line_total);
    acc.cumulative += Number(line.cumulative_amount);
    groupMap.set(key, acc);
  }
  payment.groups = Array.from(groupMap.entries()).map(([groupName, acc]) => {
    const contractTotal = CONTRACT_ITEMS_P1.filter((i) => i.groupName === groupName).reduce(
      (sum, i) => sum + Number(i.quantity) * Number(i.unit_price),
      0,
    );
    return {
      group_name: groupName || null,
      previous_amount: money2(acc.previous),
      this_amount: money2(acc.thisAmt),
      cumulative_amount: money2(acc.cumulative),
      contract_amount: money2(contractTotal),
    };
  });
  const gross = payment.lines.reduce((sum, l) => sum + Number(l.line_total), 0);
  const vat = gross * (Number(payment.vat_pct) / 100);
  const advance = gross * (Number(payment.advance_pct) / 100);
  const retention = gross * (Number(payment.retainage_pct) / 100);
  payment.calculation = {
    gross: money2(gross),
    vat: money2(vat),
    advance_deduction: money2(advance),
    retention: money2(retention),
    net: money2(gross + vat - advance - retention),
  };
}

// İşveren hakedişleri (proje p-1) — `Şantiye - Hakedişler.dc.html` satır
// 90-107 (İşveren Hakedişleri kartları #2-#5) BİREBİR taşınır: dönem,
// açıklama, tutar. `Ekran 15…` yalnız #5'i (pending_approval) tam
// detaylandırır (KPI/gruplar/Ödeme Hesabı/İlerleme, satır 61-193) — diğer
// üçü (#2/#4 ödendi, #3) basit tek-grup özetlerle doldurulur (mockup'ta
// kalem kırılımları YOK, yalnız kart tutarları var).
//
// Brief'in "dört durumun hepsi temsil edilsin" kuralı mockup'ın kendi
// durumlarıyla (yalnız pending_approval + ödendi) ÇELİŞİR — bilinçli sapma:
// #3 mockup'ta "Ödendi" iken burada `approved` yapıldı (aksiyon butonu seti
// görselleşsin diye) VE mockup'ta olmayan bir taslak (#6) eklendi.
function buildProgressPaymentFixtures(): MockProgressPayment[] {
  const patronId = "11111111-1111-1111-1111-111111111111"; // ME.id — onaylayan aktör
  const singleGroupPayment = (params: {
    id: string;
    sequenceNo: number;
    year: number;
    month: number;
    description: string;
    status: MockProgressPayment["status"];
    gross: number;
    previous: number;
    contractTotal: number;
    createdAt: string;
    submittedAt: string | null;
    approvedAt: string | null;
    approvedBy: string | null;
    paidAt: string | null;
  }): MockProgressPayment => {
    const vat = params.gross * 0.2;
    const advance = params.gross * 0.2;
    const retention = params.gross * 0.05;
    return {
      id: params.id,
      project_id: "p-1",
      sequence_no: params.sequenceNo,
      period_year: params.year,
      period_month: params.month,
      description: params.description,
      status: params.status,
      vat_pct: "20.00",
      advance_pct: "20.00",
      retainage_pct: "5.00",
      default_coefficient: "1.000",
      submitted_at: params.submittedAt,
      approved_at: params.approvedAt,
      approved_by: params.approvedBy,
      paid_at: params.paidAt,
      created_by: "u-2",
      created_at: params.createdAt,
      updated_at: params.paidAt ?? params.approvedAt ?? params.submittedAt ?? params.createdAt,
      lines: [
        {
          id: `ppl-${params.id}-1`,
          contract_item_id: null,
          site_id: "s-1",
          code: "02.000",
          description: "Kaba İnşaat (dönem toplamı)",
          unit: "kalem",
          contract_unit_price: money2(params.gross),
          coefficient: "1.000",
          quantity: "1.000",
          group_name: "Kaba İnşaat",
          sort_order: 0,
          adjusted_unit_price: money2(params.gross),
          line_total: money2(params.gross),
          previous_quantity: "0.000",
          previous_amount: money2(params.previous),
          cumulative_quantity: "1.000",
          cumulative_amount: money2(params.previous + params.gross),
          is_price_stale: null,
        },
      ],
      groups: [
        {
          group_name: "Kaba İnşaat",
          previous_amount: money2(params.previous),
          this_amount: money2(params.gross),
          cumulative_amount: money2(params.previous + params.gross),
          contract_amount: money2(params.contractTotal),
        },
      ],
      calculation: {
        gross: money2(params.gross),
        vat: money2(vat),
        advance_deduction: money2(advance),
        retention: money2(retention),
        net: money2(params.gross + vat - advance - retention),
      },
      progress: {
        financial_pct: money2(Math.min(100, ((params.previous + params.gross) / params.contractTotal) * 100)),
        physical_pct: money2(Math.min(100, ((params.previous + params.gross) / params.contractTotal) * 100)),
        duration_pct: money2(Math.min(100, params.sequenceNo * 15)),
      },
      dropped_orphan_count: 0,
    };
  };

  const pp2 = singleGroupPayment({
    id: "pp-2", sequenceNo: 2, year: 2026, month: 3, description: "Bodrum + kat 1–2",
    status: "paid", gross: 2100000, previous: 0, contractTotal: 9000000,
    createdAt: "2026-03-01T08:00:00Z", submittedAt: "2026-03-05T09:00:00Z",
    approvedAt: "2026-03-08T10:00:00Z", approvedBy: patronId, paidAt: "2026-03-20T12:00:00Z",
  });
  const pp3 = singleGroupPayment({
    id: "pp-3", sequenceNo: 3, year: 2026, month: 5, description: "Kaba inşaat 3. dönem",
    // Mockup'ta "Ödendi" — dört durum kuralı için bilinçli sapma: approved.
    status: "approved", gross: 1960000, previous: 2100000, contractTotal: 9000000,
    createdAt: "2026-05-01T08:00:00Z", submittedAt: "2026-05-04T09:00:00Z",
    approvedAt: "2026-05-07T10:00:00Z", approvedBy: patronId, paidAt: null,
  });
  const pp4 = singleGroupPayment({
    id: "pp-4", sequenceNo: 4, year: 2026, month: 6, description: "Kat 1–5 tamamlama",
    status: "paid", gross: 2240000, previous: 4060000, contractTotal: 9000000,
    createdAt: "2026-06-01T08:00:00Z", submittedAt: "2026-06-04T09:00:00Z",
    approvedAt: "2026-06-07T10:00:00Z", approvedBy: patronId, paidAt: "2026-06-25T12:00:00Z",
  });

  // #5 — `Ekran 15 - İşveren Hakedişi.dc.html` satır 61-193 BİREBİR: dört
  // grup (Betonarme/Elektrik/Mekanik/Duvar), Ödeme Hesabı, İlerleme.
  const pp5: MockProgressPayment = {
    id: "pp-5", project_id: "p-1", sequence_no: 5, period_year: 2026, period_month: 7,
    description: "Kat 6–8 döşeme", status: "pending_approval",
    vat_pct: "20.00", advance_pct: "20.00", retainage_pct: "5.00", default_coefficient: "1.142",
    submitted_at: "2026-07-28T09:00:00Z", approved_at: null, approved_by: null, paid_at: null,
    created_by: "u-2", created_at: "2026-07-25T08:00:00Z", updated_at: "2026-07-28T09:00:00Z",
    // `lines[]` bu ekranda HİÇ render edilmez (`PaymentGroupTable` yalnız
    // `groups[]` okur) — grup başına tek özet satır şema geçerliliği için
    // yeterli; mockup'ta kalem kırılımı YOK, yalnız grup toplamları var.
    lines: [
      { id: "ppl-pp-5-1", contract_item_id: null, site_id: "s-1", code: "02.100", description: "Betonarme İşleri (kümülatif)", unit: "kalem", contract_unit_price: "5920000.00", coefficient: "1.000", quantity: "1.000", group_name: "Betonarme İşleri", sort_order: 0, adjusted_unit_price: "5920000.00", line_total: "640000.00", previous_quantity: "0.000", previous_amount: "3800000.00", cumulative_quantity: "1.000", cumulative_amount: "4440000.00", is_price_stale: null },
      { id: "ppl-pp-5-2", contract_item_id: null, site_id: "s-1", code: "02.200", description: "Elektrik Tesisatı (kümülatif)", unit: "kalem", contract_unit_price: "1240000.00", coefficient: "1.000", quantity: "1.000", group_name: "Elektrik Tesisatı", sort_order: 1, adjusted_unit_price: "1240000.00", line_total: "380000.00", previous_quantity: "0.000", previous_amount: "620000.00", cumulative_quantity: "1.000", cumulative_amount: "1000000.00", is_price_stale: null },
      { id: "ppl-pp-5-3", contract_item_id: null, site_id: "s-1", code: "02.300", description: "Mekanik Tesisat (kümülatif)", unit: "kalem", contract_unit_price: "980000.00", coefficient: "1.000", quantity: "1.000", group_name: "Mekanik Tesisat", sort_order: 2, adjusted_unit_price: "980000.00", line_total: "280000.00", previous_quantity: "0.000", previous_amount: "480000.00", cumulative_quantity: "1.000", cumulative_amount: "760000.00", is_price_stale: null },
      { id: "ppl-pp-5-4", contract_item_id: null, site_id: "s-1", code: "02.400", description: "Duvar & Kaplama (kümülatif)", unit: "kalem", contract_unit_price: "2678000.00", coefficient: "1.000", quantity: "1.000", group_name: "Duvar & Kaplama", sort_order: 3, adjusted_unit_price: "2678000.00", line_total: "810000.00", previous_quantity: "0.000", previous_amount: "1390000.00", cumulative_quantity: "1.000", cumulative_amount: "2200000.00", is_price_stale: null },
    ],
    groups: [
      { group_name: "Betonarme İşleri", previous_amount: "3800000.00", this_amount: "640000.00", cumulative_amount: "4440000.00", contract_amount: "5920000.00" },
      { group_name: "Elektrik Tesisatı", previous_amount: "620000.00", this_amount: "380000.00", cumulative_amount: "1000000.00", contract_amount: "1240000.00" },
      { group_name: "Mekanik Tesisat", previous_amount: "480000.00", this_amount: "280000.00", cumulative_amount: "760000.00", contract_amount: "980000.00" },
      { group_name: "Duvar & Kaplama", previous_amount: "1390000.00", this_amount: "810000.00", cumulative_amount: "2200000.00", contract_amount: "2678000.00" },
    ],
    calculation: { gross: "2110000.00", vat: "422000.00", advance_deduction: "422000.00", retention: "105500.00", net: "2004500.00" },
    progress: { financial_pct: "75.00", physical_pct: "75.00", duration_pct: "62.00" },
    dropped_orphan_count: 0,
  };

  // #6 — mockup'ta YOK (dört durum kuralı için eklendi, bkz. üstteki not).
  // `contract_item_id` GERÇEKTEN `CONTRACT_ITEMS_P1`e bağlı — yalnız bu
  // hakediş `draft` olduğundan düzenlenebilir (form pivot tablosu bunu
  // render eder), fonksiyonel e2e'nin durum-geçişi + form-kaydetme akışı
  // BU kayıt üzerinden çalışır.
  //
  // İZOLASYON (test determinizmi düzeltmesi, bkz. `MockProgressPayment.
  // hiddenFromLists`): `e2e/progress-payments.spec.ts` bu kaydı GERÇEKTEN
  // mutasyona uğratır (satır miktarı + durum: draft → pending_approval).
  // `fullyParallel: true` altında TÜM spec dosyaları aynı paylaşılan mock
  // sunucuyu (`e2e/global-setup.ts`) kullandığından, pp-6 sıradan bir liste
  // kaydı olsaydı hem proje-genel listede (`/hakedisler`) hem şantiye
  // sekmesinde (`/projeler/p-1/santiyeler/s-1/hakedisler`) görünür ve o
  // ekranların görsel baseline'ları mutasyon testinin o ana kadar koşup
  // koşmadığına göre değişirdi (kanıt: CI run 30744996743'ün ürettiği iki
  // baseline'da aynı kayıt farklı içerikteydi). Bu YALNIZCA "mutasyon
  // testini sona koy" ile çözülemez — `fullyParallel` sıra garantisi
  // vermez ve mutasyon süresince (PATCH/PUT sırasında) bir görsel spec'in
  // tam da o anda ekran görüntüsü alması hâlâ mümkündür. Bu yüzden pp-6
  // `hiddenFromLists: true` ile işaretlenir: liste (`GET /progress-
  // payments`) ve özet (`buildProgressPaymentSummary`) uçlarından TAMAMEN
  // dışlanır, yalnız doğrudan kimlikle erişilir (detay + PATCH + PUT
  // .../lines + durum geçişleri) — tıpkı fonksiyonel spec'in zaten yaptığı
  // gibi (`/hakedisler/pp-6/duzenle`, `/hakedisler/pp-6` doğrudan URL'lerle,
  // hiçbir zaman liste satırından tıklanarak DEĞİL). Sonuç: görsel spec'ler
  // artık mutasyon testinin çalışıp çalışmadığından/ne zaman çalıştığından
  // yapısal olarak bağımsız — zamanlamaya güvenen bir çözüm değil.
  //
  // Elenen alternatifler:
  //  - Sıralamaya güvenmek (mutasyonu sona koymak): yukarıda açıklandığı
  //    gibi `fullyParallel` altında sıra garanti değil, YETERSİZ.
  //  - Test-only reset ucu + `afterAll`: sıfırlama yalnız test bittikten
  //    SONRA çalışır; mutasyonun sürdüğü pencerede (PATCH/PUT arası) hâlâ
  //    paralel bir görsel spec kirli veriyi görebilir — zamanlamaya bağımlı
  //    kalır, aynı kök sorunu tam çözmez.
  //  - `fullyParallel: false` + `workers: 1`: TÜM suite'i serileştirir
  //    (yavaş), yine de dosya çalışma sırası playwright'ın iç keşif
  //    sırasına bağlıdır — açıkça garanti edilen bir sözleşme değil, ayrıca
  //    her yeni spec dosyasında kırılgan.
  //  - Ayrı proje/mock backend per test dosyası: `playwright.config.ts`
  //    `webServer` TEK bir Next.js sunucusu + TEK `BACKEND_URL` üzerine
  //    kurulu; worker başına ayrı mock backend başlatmak Next sunucusunun
  //    hangi backend'e bağlanacağını build zamanında sabitlemesi yüzünden
  //    mimari çapta bir değişiklik gerektirir — bu görevin kapsamı dışı.
  //  - Seçilen: kaydı SAKLA (id/`#6` başlığı/pivot satırları DEĞİŞMEDİ,
  //    fonksiyonel spec'in hiçbir assertion'ı bozulmadı) ama liste/özet
  //    uçlarından bayrakla DIŞLA — en az invaziv, zamanlamadan tamamen
  //    bağımsız, ürün koduna dokunmaz.
  const line1 = computeLine("ci-1", "s-1", 100, "1.000", undefined, 0);
  const line2 = computeLine("ci-2", "s-1", 50, "1.000", undefined, 1);
  const pp6: MockProgressPayment = {
    id: "pp-6", project_id: "p-1", sequence_no: 6, period_year: 2026, period_month: 8,
    description: null, status: "draft",
    vat_pct: "20.00", advance_pct: "20.00", retainage_pct: "5.00", default_coefficient: "1.000",
    submitted_at: null, approved_at: null, approved_by: null, paid_at: null,
    created_by: "u-1", created_at: "2026-08-01T08:00:00Z", updated_at: "2026-08-01T08:00:00Z",
    lines: [line1, line2],
    groups: [], calculation: { gross: "0.00", vat: "0.00", advance_deduction: "0.00", retention: "0.00", net: "0.00" },
    progress: { financial_pct: null, physical_pct: null, duration_pct: null },
    dropped_orphan_count: 0,
    hiddenFromLists: true,
  };
  recomputePaymentTotals(pp6);

  // #7 — mockup'ta YOK (pp-6 ile AYNI "dört durum kuralı" gerekçesiyle
  // eklendi, bkz. üstteki not), ama pp-6'dan farklı olarak HİÇBİR test
  // buna dokunmaz/mutasyona uğratmaz — yalnız `draft` rozetinin görsel
  // kapsamda kalmasını sağlayan SABİT bir kayıt. pp-6 `hiddenFromLists`
  // ile liste/özet uçlarından dışlanınca (yukarıdaki İZOLASYON notu) hiçbir
  // liste ekranı `draft` rozeti basmaz hâle geldi — bu, koordinatör
  // incelemesinde kabul edilmeyen bir yan etki olarak işaretlendi. pp-7,
  // pp-6'nın YERİNE değil YANINA eklenir: `hiddenFromLists` YOK, dolayısıyla
  // liste + özet sayımına (`payment_count`) katılır ve `#1` sırasıyla
  // (dönemsel olarak pp-2'den ÖNCE, projenin ilk hakedişi) render edilir.
  // `singleGroupPayment` deseni pp-2..pp-4 ile BİREBİR — yalnız `status`
  // "draft" ve tüm onay/ödeme alanları `null`.
  const pp7 = singleGroupPayment({
    id: "pp-7", sequenceNo: 1, year: 2026, month: 1, description: "Hafriyat + şantiye kurulumu",
    status: "draft", gross: 850000, previous: 0, contractTotal: 9000000,
    createdAt: "2026-01-15T08:00:00Z", submittedAt: null, approvedAt: null, approvedBy: null, paidAt: null,
  });

  return [pp7, pp2, pp3, pp4, pp5, pp6];
}

// `GET .../contract/distribution` yanıtı — `CONTRACT_ITEMS_P1`den türetilir.
function buildContractDistributionResponse(state: MockState, projectId: string) {
  const sites = state.sites
    .filter((s) => s.project_id === projectId)
    .map((s) => ({ id: s.id, name: s.name }));
  const groupNames = Array.from(new Set(CONTRACT_ITEMS_P1.map((i) => i.groupName)));
  const groups = groupNames.map((name, index) => ({
    id: `cg-${index + 1}`,
    name,
    sort_order: CONTRACT_ITEMS_P1.find((i) => i.groupName === name)?.groupSortOrder ?? 0,
    items: CONTRACT_ITEMS_P1.filter((i) => i.groupName === name).map((item) => ({
      id: item.id, code: item.code, description: item.description, unit: item.unit,
      quantity: item.quantity, unit_price: item.unit_price,
      allocations: item.allocations.map((a) => ({ site_id: a.site_id, quantity: a.quantity, boq_item_id: item.id })),
      remaining_quantity: money2(
        Number(item.quantity) - item.allocations.reduce((sum, a) => sum + Number(a.quantity), 0),
      ),
    })),
  }));
  const siteSummaries = sites.map((site) => {
    const items = CONTRACT_ITEMS_P1.map((item) => {
      const allocation = item.allocations.find((a) => a.site_id === site.id);
      if (!allocation) return null;
      const amount = Number(allocation.quantity) * Number(item.unit_price);
      return { code: item.code, description: item.description, quantity: allocation.quantity, unit_price: item.unit_price, amount: money2(amount) };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
    return {
      site_id: site.id,
      site_name: site.name,
      items,
      total_amount: money2(items.reduce((sum, i) => sum + Number(i.amount), 0)),
    };
  });
  return {
    sites,
    groups,
    undistributed_item_count: 0,
    undistributed_item_names: [] as string[],
    site_summaries: siteSummaries,
    distributed_item_count: CONTRACT_ITEMS_P1.length,
    total_item_count: CONTRACT_ITEMS_P1.length,
  };
}

function buildPaymentDetail(state: MockState, payment: MockProgressPayment) {
  const project = state.projects.find((p) => p.id === payment.project_id);
  return {
    id: payment.id,
    project_id: payment.project_id,
    project_name: project?.name ?? "",
    sequence_no: payment.sequence_no,
    period_year: payment.period_year,
    period_month: payment.period_month,
    description: payment.description,
    status: payment.status,
    vat_pct: payment.vat_pct,
    advance_pct: payment.advance_pct,
    retainage_pct: payment.retainage_pct,
    default_coefficient: payment.default_coefficient,
    submitted_at: payment.submitted_at,
    approved_at: payment.approved_at,
    approved_by: payment.approved_by,
    paid_at: payment.paid_at,
    created_by: payment.created_by,
    created_at: payment.created_at,
    updated_at: payment.updated_at,
    lines: payment.lines,
    groups: payment.groups,
    calculation: payment.calculation,
    progress: payment.progress,
    dropped_orphan_count: payment.dropped_orphan_count,
  };
}

function buildPaymentListItem(state: MockState, payment: MockProgressPayment) {
  const project = state.projects.find((p) => p.id === payment.project_id);
  return {
    id: payment.id,
    project_id: payment.project_id,
    project_name: project?.name ?? "",
    sequence_no: payment.sequence_no,
    period_year: payment.period_year,
    period_month: payment.period_month,
    description: payment.description,
    status: payment.status,
    gross_total: payment.calculation.gross,
    net_total: payment.calculation.net,
  };
}

// --- F-TH T1 · Taşeron Hakedişi fikstürleri -------------------------------
// Kimlikler MEVCUT evrene bağlanır (P7 T7 deseniyle ayni): proje p-1
// ("Kule A"), şantiyeler s-1/s-2. İKİ ayrı sözleşme (sc-1/sc-2) —
// `useSubcontractorContractOptions` distinct türetmesinin >1 sonuç
// döndüğünü doğrulamak için gerekli (T1 §2.1 kullanıcı kararı).
const SUBCONTRACTOR_CONTRACT_ITEMS_SC1: MockSubcontractorContractItem[] = [
  { id: "sci-1", code: "E.01", description: "Kaba Elektrik Tesisatı", unit: "m", contractUnitPrice: "45.00", contractQuantity: "5200.000", groupName: "Elektrik İşleri" },
  { id: "sci-2", code: "E.02", description: "Priz/Anahtar Montajı", unit: "Adet", contractUnitPrice: "120.00", contractQuantity: "620.000", groupName: "Elektrik İşleri" },
  { id: "sci-3", code: "E.03", description: "Pano Montajı", unit: "Adet", contractUnitPrice: "3500.00", contractQuantity: "18.000", groupName: "Elektrik İşleri" },
];
const SUBCONTRACTOR_CONTRACT_ITEMS_SC2: MockSubcontractorContractItem[] = [
  { id: "sci-4", code: "M.01", description: "Duvar Örgü İşleri", unit: "m²", contractUnitPrice: "280.00", contractQuantity: "4800.000", groupName: "Duvar İşleri" },
  { id: "sci-5", code: "M.02", description: "Sıva İşleri", unit: "m²", contractUnitPrice: "145.00", contractQuantity: "9200.000", groupName: "Duvar İşleri" },
];

const SUBCONTRACTOR_CONTRACTS: MockSubcontractorContract[] = [
  {
    id: "sc-1", project_id: "p-1", site_id: "s-1", subcontractor_id: "sub-1",
    subcontractor_name: "Aydın Elektrik Taah.", work_category: "Elektrik",
    contract_no: "TSD-2026-01", signature_date: "2026-01-15", is_notarized: true,
    start_date: "2026-02-01", end_date: "2026-12-01", late_penalty_daily: "500.00",
    advance_pct: "20.00", retainage_pct: "5.00", vat_pct: "20.00",
    payment_period: "monthly", payment_term_days: 30,
    materials_by_contractor: false, subcontractor_files_own_sgk: true, vat_withholding: false,
    status: "active", is_draft: false, items: SUBCONTRACTOR_CONTRACT_ITEMS_SC1,
  },
  {
    id: "sc-2", project_id: "p-1", site_id: "s-2", subcontractor_id: "sub-2",
    subcontractor_name: "Çelik İnşaat Taah.", work_category: "Duvar/Sıva",
    contract_no: "TSD-2026-02", signature_date: "2026-02-01", is_notarized: false,
    start_date: "2026-03-01", end_date: "2026-11-01", late_penalty_daily: null,
    advance_pct: "15.00", retainage_pct: "5.00", vat_pct: "20.00",
    payment_period: "monthly", payment_term_days: 15,
    materials_by_contractor: true, subcontractor_files_own_sgk: false, vat_withholding: true,
    status: "active", is_draft: false, items: SUBCONTRACTOR_CONTRACT_ITEMS_SC2,
  },
];

function findSubcontractorContractItem(
  contractId: string,
  itemId: string,
): MockSubcontractorContractItem | undefined {
  return SUBCONTRACTOR_CONTRACTS.find((c) => c.id === contractId)?.items.find((i) => i.id === itemId);
}

function findSubcontractorContract(
  state: MockState,
  contractId: string,
): MockSubcontractorContract | undefined {
  return state.subcontractorContracts.find((c) => c.id === contractId);
}

function computeSubcontractorLine(
  contractId: string,
  itemId: string,
  quantityRaw: number | string,
  coefficientRaw: number | string | null | undefined,
  existing: MockSubcontractorPaymentLine | undefined,
  sortOrder: number,
): MockSubcontractorPaymentLine {
  const item = findSubcontractorContractItem(contractId, itemId);
  const quantity = Number(quantityRaw) || 0;
  const coefficient =
    coefficientRaw !== undefined && coefficientRaw !== null && coefficientRaw !== ""
      ? Number(coefficientRaw)
      : existing
        ? Number(existing.coefficient)
        : 1;
  const unitPrice = item ? Number(item.contractUnitPrice) : 0;
  const adjustedUnitPrice = unitPrice * coefficient;
  const lineTotal = adjustedUnitPrice * quantity;
  return {
    id: existing?.id ?? `scppl-${contractId}-${itemId}`,
    contract_item_id: itemId,
    code: item?.code ?? "",
    description: item?.description ?? "",
    unit: item?.unit ?? "",
    contract_unit_price: item ? item.contractUnitPrice : "0.00",
    coefficient: money2(coefficient),
    quantity: qty3(quantity),
    group_name: item?.groupName ?? null,
    sort_order: sortOrder,
    // Bu dilimde `site_diary` modülü yok — her satır her zaman `manual`
    // (spec §2, `QuantitySource`).
    quantity_source: "manual",
    adjusted_unit_price: money2(adjustedUnitPrice),
    line_total: money2(lineTotal),
  };
}

function recomputeSubcontractorPaymentTotals(payment: MockSubcontractorProgressPayment): void {
  const gross = payment.lines.reduce((sum, l) => sum + Number(l.line_total), 0);
  const vat = gross * (Number(payment.vat_pct) / 100);
  const advance = gross * (Number(payment.advance_pct) / 100);
  const retention = gross * (Number(payment.retainage_pct) / 100);
  payment.calculation = {
    gross: money2(gross),
    vat: money2(vat),
    advance_deduction: money2(advance),
    retention: money2(retention),
    net: money2(gross + vat - advance - retention),
  };
}

// Beş kayıt: `sequence_no` SÖZLEŞME KAPSAMLI numaralandırılır (sc-1 altında
// 1-4, sc-2 altında 1) — dört durumun hepsi + `is_revision_required` hem
// `true` hem `false` örneği (brief §3 zorunlu kapsam).
function buildSubcontractorProgressPaymentFixtures(): MockSubcontractorProgressPayment[] {
  const patronId = "11111111-1111-1111-1111-111111111111";

  function linesFor(contractId: string, qtys: [string, number][]): MockSubcontractorPaymentLine[] {
    return qtys.map(([itemId, qty], index) => computeSubcontractorLine(contractId, itemId, qty, "1", undefined, index));
  }

  function withTotals(
    payment: Omit<MockSubcontractorProgressPayment, "calculation">,
  ): MockSubcontractorProgressPayment {
    const full: MockSubcontractorProgressPayment = {
      ...payment,
      calculation: { gross: "0.00", vat: "0.00", advance_deduction: "0.00", retention: "0.00", net: "0.00" },
    };
    recomputeSubcontractorPaymentTotals(full);
    return full;
  }

  // #1 — sc-1, Mayıs, ÖDENDİ.
  const scpp1 = withTotals({
    id: "scpp-1", contract_id: "sc-1", project_id: "p-1", sequence_no: 1,
    period_year: 2026, period_month: 5, description: "Mayıs hakedişi",
    status: "paid", vat_pct: "20.00", advance_pct: "20.00", retainage_pct: "5.00",
    default_coefficient: "1.00", section_id: null,
    submitted_at: "2026-06-01T09:00:00Z", approved_at: "2026-06-03T09:00:00Z", approved_by: patronId,
    paid_at: "2026-06-10T09:00:00Z", rejected_at: null, rejection_reason: null,
    is_revision_required: false, created_by: patronId,
    created_at: "2026-05-25T09:00:00Z", updated_at: "2026-06-10T09:00:00Z",
    lines: linesFor("sc-1", [["sci-1", 800], ["sci-2", 60], ["sci-3", 2]]),
    dropped_orphan_count: 0,
  });

  // #2 — sc-1, Haziran, ONAYLANDI (henüz ödenmedi).
  const scpp2 = withTotals({
    id: "scpp-2", contract_id: "sc-1", project_id: "p-1", sequence_no: 2,
    period_year: 2026, period_month: 6, description: "Haziran hakedişi",
    status: "approved", vat_pct: "20.00", advance_pct: "20.00", retainage_pct: "5.00",
    default_coefficient: "1.00", section_id: null,
    submitted_at: "2026-07-01T09:00:00Z", approved_at: "2026-07-03T09:00:00Z", approved_by: patronId,
    paid_at: null, rejected_at: null, rejection_reason: null,
    is_revision_required: false, created_by: patronId,
    created_at: "2026-06-25T09:00:00Z", updated_at: "2026-07-03T09:00:00Z",
    lines: linesFor("sc-1", [["sci-1", 900], ["sci-2", 80], ["sci-3", 3]]),
    dropped_orphan_count: 0,
  });

  // #3 — sc-1, Temmuz, ONAY BEKLİYOR.
  const scpp3 = withTotals({
    id: "scpp-3", contract_id: "sc-1", project_id: "p-1", sequence_no: 3,
    period_year: 2026, period_month: 7, description: "Temmuz hakedişi",
    status: "pending_approval", vat_pct: "20.00", advance_pct: "20.00", retainage_pct: "5.00",
    default_coefficient: "1.00", section_id: null,
    submitted_at: "2026-08-01T09:00:00Z", approved_at: null, approved_by: null,
    paid_at: null, rejected_at: null, rejection_reason: null,
    is_revision_required: false, created_by: patronId,
    created_at: "2026-07-25T09:00:00Z", updated_at: "2026-08-01T09:00:00Z",
    lines: linesFor("sc-1", [["sci-1", 400], ["sci-2", 30]]),
    dropped_orphan_count: 0,
  });

  // #4 — sc-1, Ağustos, TASLAK + "Revize Gerekli" (spec §5: BEŞİNCİ durum
  // DEĞİL — `draft AND rejected_at IS NOT NULL` türevi, `is_revision_required: true`).
  const scpp4 = withTotals({
    id: "scpp-4", contract_id: "sc-1", project_id: "p-1", sequence_no: 4,
    period_year: 2026, period_month: 8, description: "Ağustos hakedişi",
    status: "draft", vat_pct: "20.00", advance_pct: "20.00", retainage_pct: "5.00",
    default_coefficient: "1.00", section_id: null,
    submitted_at: null, approved_at: null, approved_by: null,
    paid_at: null, rejected_at: "2026-08-15T09:00:00Z", rejection_reason: "eksik metraj — pano sayısı kontrol edilsin",
    is_revision_required: true, created_by: patronId,
    created_at: "2026-08-10T09:00:00Z", updated_at: "2026-08-15T09:00:00Z",
    lines: linesFor("sc-1", [["sci-1", 200]]),
    dropped_orphan_count: 0,
  });

  // #5 — sc-2, dönemsiz taze TASLAK (satırsız, `is_revision_required: false`).
  const scpp5 = withTotals({
    id: "scpp-5", contract_id: "sc-2", project_id: "p-1", sequence_no: 1,
    period_year: null, period_month: null, description: null,
    status: "draft", vat_pct: "20.00", advance_pct: "15.00", retainage_pct: "5.00",
    default_coefficient: "1.00", section_id: null,
    submitted_at: null, approved_at: null, approved_by: null,
    paid_at: null, rejected_at: null, rejection_reason: null,
    is_revision_required: false, created_by: patronId,
    created_at: "2026-08-01T09:00:00Z", updated_at: "2026-08-01T09:00:00Z",
    lines: [],
    dropped_orphan_count: 0,
  });

  // #6 — sc-2, taze TASLAK, `hiddenFromLists: true` (F-TH T6 test izolasyonu,
  // yukarıdaki not). `e2e/subcontractor-progress-payments.spec.ts` bu kaydı
  // "Taslak Kaydet" + veri-kaybı korkuluğu (`PUT .../lines` gövdesinde TÜM
  // satırlar) senaryosunda GERÇEKTEN mutasyona uğratır.
  const scpp6 = withTotals({
    id: "scpp-6", contract_id: "sc-2", project_id: "p-1", sequence_no: 2,
    period_year: null, period_month: null, description: null,
    status: "draft", vat_pct: "20.00", advance_pct: "15.00", retainage_pct: "5.00",
    default_coefficient: "1.00", section_id: null,
    submitted_at: null, approved_at: null, approved_by: null,
    paid_at: null, rejected_at: null, rejection_reason: null,
    is_revision_required: false, created_by: patronId,
    created_at: "2026-08-02T09:00:00Z", updated_at: "2026-08-02T09:00:00Z",
    lines: [],
    dropped_orphan_count: 0,
    hiddenFromLists: true,
  });

  // #7 — sc-1, TASLAK + satırlı, `hiddenFromLists: true` (F-TH T6 test
  // izolasyonu). `e2e/subcontractor-progress-payments.spec.ts` bu kaydı
  // durum-makinesi senaryosunda (draft→onaya gönder→reddet→onaya gönder→
  // onayla→onayı geri al→onayla→ödendi işaretle) uçtan uca mutasyona uğratır.
  const scpp7 = withTotals({
    id: "scpp-7", contract_id: "sc-1", project_id: "p-1", sequence_no: 5,
    period_year: 2026, period_month: 9, description: "Eylül hakedişi",
    status: "draft", vat_pct: "20.00", advance_pct: "20.00", retainage_pct: "5.00",
    default_coefficient: "1.00", section_id: null,
    submitted_at: null, approved_at: null, approved_by: null,
    paid_at: null, rejected_at: null, rejection_reason: null,
    is_revision_required: false, created_by: patronId,
    created_at: "2026-08-20T09:00:00Z", updated_at: "2026-08-20T09:00:00Z",
    lines: linesFor("sc-1", [["sci-1", 150], ["sci-2", 12]]),
    dropped_orphan_count: 0,
    hiddenFromLists: true,
  });

  return [scpp1, scpp2, scpp3, scpp4, scpp5, scpp6, scpp7];
}

function buildSubcontractorPaymentDetail(state: MockState, payment: MockSubcontractorProgressPayment) {
  const contract = findSubcontractorContract(state, payment.contract_id);
  const project = state.projects.find((p) => p.id === payment.project_id);
  return {
    id: payment.id,
    contract_id: payment.contract_id,
    project_id: payment.project_id,
    project_name: project?.name ?? "",
    subcontractor_name: contract?.subcontractor_name ?? null,
    contract_no: contract?.contract_no ?? null,
    sequence_no: payment.sequence_no,
    period_year: payment.period_year,
    period_month: payment.period_month,
    description: payment.description,
    status: payment.status,
    vat_pct: payment.vat_pct,
    advance_pct: payment.advance_pct,
    retainage_pct: payment.retainage_pct,
    default_coefficient: payment.default_coefficient,
    section_id: payment.section_id,
    submitted_at: payment.submitted_at,
    approved_at: payment.approved_at,
    approved_by: payment.approved_by,
    paid_at: payment.paid_at,
    rejected_at: payment.rejected_at,
    rejection_reason: payment.rejection_reason,
    is_revision_required: payment.is_revision_required,
    created_by: payment.created_by,
    created_at: payment.created_at,
    updated_at: payment.updated_at,
    lines: payment.lines,
    calculation: payment.calculation,
    dropped_orphan_count: payment.dropped_orphan_count,
  };
}

function buildSubcontractorPaymentListItem(state: MockState, payment: MockSubcontractorProgressPayment) {
  const contract = findSubcontractorContract(state, payment.contract_id);
  const project = state.projects.find((p) => p.id === payment.project_id);
  return {
    id: payment.id,
    contract_id: payment.contract_id,
    project_id: payment.project_id,
    project_name: project?.name ?? "",
    subcontractor_name: contract?.subcontractor_name ?? null,
    contract_no: contract?.contract_no ?? null,
    sequence_no: payment.sequence_no,
    period_year: payment.period_year,
    period_month: payment.period_month,
    description: payment.description,
    status: payment.status,
    section_id: payment.section_id,
    created_at: payment.created_at,
    gross_total: payment.calculation.gross,
    net_total: payment.calculation.net,
    is_revision_required: payment.is_revision_required,
  };
}

function buildSubcontractorContractDetailResponse(contract: MockSubcontractorContract) {
  const items = contract.items.map((item, index) => ({
    id: item.id,
    contract_id: contract.id,
    source_contract_item_id: null,
    code: item.code,
    description: item.description,
    unit: item.unit,
    quantity: item.contractQuantity,
    unit_price: item.contractUnitPrice,
    sort_order: index,
    group: item.groupName ? { id: `scg-${contract.id}-${item.groupName}`, name: item.groupName } : null,
    line_total: money2(Number(item.contractQuantity) * Number(item.contractUnitPrice)),
  }));
  const contractTotal = items.reduce((sum, i) => sum + Number(i.line_total), 0);
  return {
    id: contract.id,
    project_id: contract.project_id,
    site_id: contract.site_id,
    subcontractor_id: contract.subcontractor_id,
    subcontractor_name: contract.subcontractor_name,
    work_category: contract.work_category,
    contract_no: contract.contract_no,
    signature_date: contract.signature_date,
    is_notarized: contract.is_notarized,
    start_date: contract.start_date,
    end_date: contract.end_date,
    late_penalty_daily: contract.late_penalty_daily,
    advance_pct: contract.advance_pct,
    retainage_pct: contract.retainage_pct,
    vat_pct: contract.vat_pct,
    payment_period: contract.payment_period,
    payment_term_days: contract.payment_term_days,
    materials_by_contractor: contract.materials_by_contractor,
    subcontractor_files_own_sgk: contract.subcontractor_files_own_sgk,
    vat_withholding: contract.vat_withholding,
    status: contract.status,
    is_draft: contract.is_draft,
    items,
    contract_total: money2(contractTotal),
    items_missing_price: 0,
    progress_payment_summary: null,
    documents: null,
    pending_modules: [] as string[],
  };
}

function buildSubcontractorPaymentSummary(state: MockState, query: URLSearchParams) {
  const projectId = query.get("project_id");
  const periodYearParam = query.get("period_year");
  const periodMonthParam = query.get("period_month");
  const statusParam = query.get("status");
  const q = (query.get("q") ?? "").trim().toLocaleLowerCase("tr");

  // `hiddenFromLists` işaretli kayıtlar özetten de dışlanır (liste ucuyla
  // AYNI izolasyon kuralı).
  let items = state.subcontractorProgressPayments.filter((p) => !p.hiddenFromLists);
  if (projectId) items = items.filter((p) => p.project_id === projectId);
  if (periodYearParam) items = items.filter((p) => p.period_year === Number(periodYearParam));
  if (periodMonthParam) items = items.filter((p) => p.period_month === Number(periodMonthParam));
  if (statusParam) items = items.filter((p) => p.status === statusParam);
  if (q) {
    items = items.filter((p) => {
      const contract = findSubcontractorContract(state, p.contract_id);
      const name = (contract?.subcontractor_name ?? "").toLocaleLowerCase("tr");
      const no = (contract?.contract_no ?? "").toLocaleLowerCase("tr");
      return name.includes(q) || no.includes(q);
    });
  }

  const sumBy = (predicate: (p: MockSubcontractorProgressPayment) => boolean) =>
    items.filter(predicate).reduce((sum, p) => sum + Number(p.calculation.gross), 0);

  return {
    total_gross: money2(sumBy(() => true)),
    pending_gross: money2(sumBy((p) => p.status === "pending_approval")),
    paid_period_gross: money2(sumBy((p) => p.status === "paid")),
    active_subcontractor_count: new Set(
      state.subcontractorContracts.filter((c) => c.status === "active").map((c) => c.subcontractor_id),
    ).size,
    // Şema alanı ZORUNLUDUR (nullable değil) — filtre dönemi vermezse
    // fikstürlerin ağırlık merkezi olan 2026 Temmuz'a düşer.
    period_year: periodYearParam ? Number(periodYearParam) : 2026,
    period_month: periodMonthParam ? Number(periodMonthParam) : 7,
  };
}

function seedState(): MockState {
  // Gerçek backend seed'iyle hizalı (bkz. backend/app/modules/roles/seed_data.py):
  // aynı rol/modül anahtarları, isimleri, gruplar ve sıralama.
  const roles = [
    { id: "role-admin", key: "system_admin", name: "Sistem Yöneticisi", emoji: "🛡️", description: "Tüm modüller · Tüm projeler · Ayarlar · Kullanıcı yönetimi · Silme yetkisi", is_system: true },
    { id: "role-patron", key: "patron", name: "Patron", emoji: "👔", description: "Tüm modüller · Tüm projeler · Sistem ayarları", is_system: true },
    { id: "role-saha", key: "site_chief", name: "Şantiye Şefi", emoji: "👷", description: "Günlük kayıt · Puantaj · Stok görüntüleme · Hakediş (taslak)", is_system: false },
    { id: "role-accounting", key: "accounting", name: "Muhasebe", emoji: "📒", description: "Yevmiye · Bordro · Hakediş onay · Mali tablolar · e-Fatura", is_system: false },
    { id: "role-pm", key: "project_manager", name: "Proje Müdürü", emoji: "🏗️", description: "Proje görünümü · Raporlar · Hakediş onay · Sözleşmeler", is_system: false },
    { id: "role-procurement", key: "procurement", name: "Satınalma", emoji: "🛒", description: "Stok · Satınalma · Teklif · Tedarikçi yönetimi", is_system: false },
  ];
  const modules = [
    { id: "m-dashboard", key: "dashboard", name: "Gösterge Paneli", group: "GENEL", sort_order: 1 },
    { id: "m-approvals", key: "approvals", name: "Onay Kutusu", group: "GENEL", sort_order: 2 },
    { id: "m-projects", key: "projects", name: "Projeler", group: "GENEL", sort_order: 15 },
    { id: "m-site-diary", key: "site_diary", name: "Günlük Kayıt", group: "SAHA", sort_order: 3 },
    { id: "m-timesheet", key: "timesheet", name: "Puantaj", group: "SAHA", sort_order: 4 },
    { id: "m-personnel", key: "personnel", name: "Personel", group: "SAHA", sort_order: 5 },
    { id: "m-payroll", key: "payroll", name: "Bordro", group: "SAHA", sort_order: 6 },
    { id: "m-inventory", key: "inventory", name: "Stok & Depo", group: "STOK_SATINALMA", sort_order: 7 },
    { id: "m-procurement", key: "procurement", name: "Satınalma & Teklif", group: "STOK_SATINALMA", sort_order: 8 },
    { id: "m-progress-payments", key: "progress_payments", name: "Hakedişler", group: "MALI", sort_order: 9 },
    { id: "m-accounting", key: "accounting", name: "Muhasebe", group: "MALI", sort_order: 10 },
    { id: "m-invoicing", key: "invoicing", name: "Fatura Yönetimi", group: "MALI", sort_order: 11 },
    { id: "m-treasury", key: "treasury", name: "Hazine", group: "MALI", sort_order: 12 },
    { id: "m-settings", key: "settings", name: "Ayarlar", group: "SISTEM", sort_order: 13 },
    { id: "m-user-management", key: "user_management", name: "Kullanıcı & Rol Yönetimi", group: "SISTEM", sort_order: 14 },
    // P4 (BOQ) — backend seed_data.py'de 17. modül olarak eklendi (spec §4, 2026-07-30).
    // Ayarlar - İzin Matrisi mockup'ında bu satır yok; bilinçli sapma, backend'in gerçeği.
    { id: "m-boq", key: "boq", name: "İş Kalemleri", group: "GENEL", sort_order: 17 },
  ];
  const NONE = { access_level: "none", scope: "all" };
  const permissions: MockState["permissions"] = {
    "role-admin": Object.fromEntries(modules.map((m) => [m.key, { access_level: "admin", scope: "all" }])),
    "role-patron": Object.fromEntries(modules.map((m) => [m.key, { access_level: "full", scope: "all" }])),
    "role-saha": {
      dashboard: { access_level: "full", scope: "all" },
      approvals: NONE,
      site_diary: { access_level: "full", scope: "all" },
      timesheet: { access_level: "full", scope: "all" },
      personnel: NONE,
      payroll: NONE,
      inventory: { access_level: "view", scope: "all" },
      procurement: { access_level: "request", scope: "all" },
      progress_payments: { access_level: "draft", scope: "project" },
      accounting: NONE,
      invoicing: NONE,
      treasury: NONE,
      settings: NONE,
      user_management: NONE,
      // backend seed_data.py MATRIX["boq"]: site_chief=view/limited (görür).
      boq: { access_level: "view", scope: "limited" },
    },
    "role-accounting": {
      dashboard: { access_level: "full", scope: "all" },
      approvals: NONE,
      site_diary: NONE,
      timesheet: { access_level: "view", scope: "all" },
      personnel: NONE,
      payroll: { access_level: "full", scope: "all" },
      inventory: NONE,
      procurement: NONE,
      progress_payments: { access_level: "approve", scope: "all" },
      accounting: { access_level: "full", scope: "all" },
      invoicing: { access_level: "full", scope: "all" },
      treasury: { access_level: "full", scope: "all" },
      settings: NONE,
      user_management: NONE,
      // backend seed_data.py MATRIX["boq"]: accounting=view/finance (görür).
      boq: { access_level: "view", scope: "finance" },
    },
    "role-pm": {
      dashboard: { access_level: "full", scope: "all" },
      approvals: NONE,
      site_diary: { access_level: "view", scope: "all" },
      timesheet: NONE,
      personnel: NONE,
      payroll: NONE,
      inventory: { access_level: "view", scope: "all" },
      procurement: { access_level: "approve", scope: "all" },
      progress_payments: { access_level: "approve", scope: "all" },
      accounting: { access_level: "view", scope: "all" },
      invoicing: { access_level: "view", scope: "all" },
      treasury: NONE,
      settings: NONE,
      user_management: NONE,
      // backend seed_data.py MATRIX["boq"]: project_manager=full/all (görür).
      boq: { access_level: "full", scope: "all" },
    },
    "role-procurement": {
      dashboard: NONE,
      approvals: NONE,
      site_diary: NONE,
      timesheet: NONE,
      personnel: NONE,
      payroll: NONE,
      inventory: { access_level: "full", scope: "all" },
      procurement: { access_level: "full", scope: "all" },
      progress_payments: NONE,
      accounting: NONE,
      invoicing: NONE,
      treasury: NONE,
      settings: NONE,
      user_management: NONE,
      // backend seed_data.py MATRIX["boq"]: procurement=none (görmez).
      boq: NONE,
    },
  };
  // Proje Detay/Şantiye Detay görsel testleri (Task 12) için p-1 (Kule A) altına
  // iki şantiye + s-1 altına iki bölüm. Alanlar SiteCard/SiteDetailResponse/
  // SectionResponse (schema.d.ts) ile birebir, sayfa testlerindeki (page.test.tsx)
  // sabit değerlerle hizalı.
  const sites: MockSite[] = [
    {
      id: "s-1", project_id: "p-1", code: "A-BLOK", name: "A-Blok Şantiyesi", status: "active",
      address: "Kuyubaşı Mah.", city: "Ankara", city_inherited: false, site_manager_name: "S. Öztürk",
      start_date: "2025-03-01", end_date: "2026-12-31", delivery_date: null, remaining_days: 157,
    },
    {
      id: "s-2", project_id: "p-1", code: "B-BLOK", name: "B-Blok Şantiyesi", status: "completed",
      address: "Kuyubaşı Mah.", city: "Ankara", city_inherited: false, site_manager_name: "K. Arslan",
      start_date: "2024-01-01", end_date: null, delivery_date: "2026-05-01", remaining_days: null,
    },
  ];
  // P6 · T1 — sec-1 "en az bir dolu bölüm" fikstürüdür (spec kabul kriteri):
  // TÜM P6 alanları dolu, `is_draft: false`. sec-2/sec-3 durum çeşitliliği
  // sağlar (completed / on_hold+taslak). name/code/status/manager_name/
  // start_date/end_date/sort_order DEĞİŞMEDİ — `e2e/site-detail-visual.spec.ts`
  // bu değerlere metinle bağlı (görsel baseline kırılmasın diye).
  const sections: MockSection[] = [
    {
      id: "sec-1", site_id: "s-1", code: "A-01", name: "Kat 6–10 Kaba İnşaat", status: "active",
      manager_user_id: "u-2", manager_name: "Sercan Öztürk", start_date: "2026-01-01", end_date: "2026-09-30",
      sort_order: 0, section_type: "structural", description: "6-10 kat arası kaba inşaat imalatları.",
      deputy_manager_user_id: "u-4", deputy_manager_name: "Kadir Arslan", planned_worker_count: 24,
      budget_amount: "1250000.00", is_draft: false,
      created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z",
    },
    {
      id: "sec-2", site_id: "s-1", code: "A-02", name: "Zemin Kat Kaba İnşaat", status: "completed",
      manager_user_id: null, manager_name: "M. Arslan", start_date: "2025-03-01", end_date: "2025-12-01",
      sort_order: 1, section_type: "structural", description: null, deputy_manager_user_id: null,
      deputy_manager_name: null, planned_worker_count: 12, budget_amount: "480000.00", is_draft: false,
      created_at: "2025-03-01T08:00:00Z", updated_at: "2025-12-01T08:00:00Z",
    },
    // Taslak + `on_hold` — §4 zorunluluk kuralinin YALNIZ `is_draft: false`
    // iken uyguladigini kanitlayan kayit (bolum tipi/sorumlu/tarih/bedel bos).
    {
      id: "sec-3", site_id: "s-1", code: null, name: "Peyzaj Düzenlemesi (Taslak)", status: "on_hold",
      manager_user_id: null, manager_name: null, start_date: null, end_date: null, sort_order: 2,
      section_type: null, description: null, deputy_manager_user_id: null, deputy_manager_name: null,
      planned_worker_count: null, budget_amount: null, is_draft: true,
      created_at: "2026-02-01T08:00:00Z", updated_at: "2026-02-01T08:00:00Z",
    },
  ];
  return {
    users: [
      { id: "u-1", email: "patron@fiilinsaat.com", full_name: "Ahmet Yılmaz", title: "Patron", role_id: "role-patron", status: "active" },
      { id: "u-2", email: "s.ozturk@fiilinsaat.com", full_name: "Sercan Öztürk", title: "Şantiye Şefi", role_id: "role-saha", status: "active" },
      { id: "u-3", email: "a.demir@fiilinsaat.com", full_name: "Ayşe Demir", title: "Muhasebe Müdürü", role_id: "role-accounting", status: "active" },
      { id: "u-4", email: "k.arslan@fiilinsaat.com", full_name: "Kadir Arslan", title: "Proje Müdürü", role_id: "role-pm", status: "on_leave" },
      { id: "u-5", email: "y.kaya@fiilinsaat.com", full_name: "Yusuf Kaya", title: "Satınalma Uzmanı", role_id: "role-procurement", status: "active" },
    ],
    roles,
    modules,
    projects: PROJECT_FIXTURES,
    sites,
    sections,
    // Mockup satır 98 statik seçenekleriyle isim hizalı (Form - Proje Oluştur.dc.html).
    employers: [
      { id: "emp-1", name: "Güneşkent Gayrimenkul A.Ş.", tax_number: "9876543210", contact_person: "Ahmet Güneş", is_active: true },
      { id: "emp-2", name: "Çelik Holding A.Ş.", tax_number: "1122334455", contact_person: "Fatma Çelik", is_active: true },
      { id: "emp-3", name: "Bursa Belediyesi", tax_number: null, contact_person: "Kurumsal İletişim", is_active: true },
    ],
    progressPayments: buildProgressPaymentFixtures(),
    subcontractorContracts: SUBCONTRACTOR_CONTRACTS,
    subcontractorProgressPayments: buildSubcontractorProgressPaymentFixtures(),
    permissions,
    projectAccess: {
      "u-1": { all_projects: true, project_ids: [] },
      "u-2": { all_projects: false, project_ids: ["p-1"] },
      "u-3": { all_projects: true, project_ids: [] },
      "u-4": { all_projects: false, project_ids: ["p-1", "p-2"] },
      "u-5": { all_projects: true, project_ids: [] },
    },
    company: {
      id: "company-1",
      name: "FİİL Yapı Ltd. Şti.",
      tax_number: "1234567890",
      tax_office: "Çankaya",
      trade_registry_no: "TR-12345",
      kep_address: "fiil@hs01.kep.tr",
      phone: "+90 312 555 00 00",
      email: "info@fiilinsaat.com",
      website: "www.fiilinsaat.com",
      address: "Kızılay Mah. Atatürk Bulvarı No:45/3\nÇankaya / ANKARA",
      brand_color: "#2563eb",
      gib_integration_code: "GB2025FIIL001",
      earsiv_portal: "Logo e-Fatura",
      default_vat_rate: "20.00",
      auto_einvoice: true,
      has_logo: false,
      logo_url: "",
    },
    preferences: {
      locale: "tr",
      currency: "TRY",
      date_format: "DD.MM.YYYY",
      density: "normal",
      theme: "light",
      accent_color: "#2563eb",
    },
    notifications: [
      { event_key: "progress_payment_created", label: "Hakediş oluşturuldu", email: true, in_app: true, sms: false },
      { event_key: "progress_payment_approved", label: "Hakediş onaylandı", email: true, in_app: true, sms: false },
      { event_key: "vat_due_soon", label: "KDV ödemesi yaklaşıyor", email: true, in_app: true, sms: false },
      { event_key: "purchase_approval_pending", label: "Satınalma onay bekliyor", email: false, in_app: true, sms: false },
      { event_key: "stock_low", label: "Stok kritik seviyede", email: false, in_app: true, sms: false },
      { event_key: "payroll_payday", label: "Bordro ödeme günü", email: true, in_app: true, sms: false },
      { event_key: "daily_log_missing", label: "Günlük kayıt girilmedi", email: false, in_app: true, sms: false },
    ],
    // Mockup'taki satirlarla hizali (../projedesign/Ayarlar - Denetim Günlüğü.dc.html);
    // occurred_at gercek backend gibi UTC'dir (Z), ekran Europe/Istanbul'a cevirir —
    // yani UTC 06:14 mockup'taki 09:14 olarak gorunur ve baseline TZ'den etkilenmez.
    auditLog: [
      { id: "al-1", occurred_at: "2026-07-17T06:14:00Z", action: "login", detail: "Sisteme giriş yapıldı", ip_address: "192.168.1.100", actor: { id: "u-1", full_name: "Ahmet Yılmaz", role_name: "Patron" } },
      { id: "al-2", occurred_at: "2026-07-17T05:52:00Z", action: "create", detail: "Günlük kayıt oluşturuldu · A-Blok · 17 Tem", ip_address: "10.0.0.45", actor: { id: "u-2", full_name: "Sercan Öztürk", role_name: "Şantiye Şefi" } },
      { id: "al-3", occurred_at: "2026-07-17T05:30:00Z", action: "approve", detail: "Hakediş #47 onaylandı · ₺1.240.000", ip_address: "192.168.1.55", actor: { id: "u-3", full_name: "Ayşe Demir", role_name: "Muhasebe" } },
      { id: "al-4", occurred_at: "2026-07-16T14:20:00Z", action: "update", detail: "Kullanıcı rolü değiştirildi: Kadir Arslan → PM", ip_address: "192.168.1.100", actor: { id: "u-1", full_name: "Ahmet Yılmaz", role_name: "Patron" } },
      { id: "al-5", occurred_at: "2026-07-15T11:05:00Z", action: "delete", detail: "Taslak satın alma talebi silindi · SAT-2026-0041", ip_address: "10.0.0.88", actor: { id: "u-5", full_name: "Yusuf Kaya", role_name: "Satınalma" } },
      { id: "al-6", occurred_at: "2026-07-15T06:00:00Z", action: "backup", detail: "Otomatik yedekleme tamamlandı · 2,3 GB", ip_address: null, actor: null },
    ],
  };
}

/** FK → ad çözümü: sunucu `site_manager_name`/`manager_name`'i kimlikten yazar. */
function userNameById(state: MockState, userId: unknown): string | null {
  if (typeof userId !== "string" || !userId) return null;
  return state.users.find((u) => u.id === userId)?.full_name ?? null;
}

/**
 * `SiteDetailResponse` gövdesi (schema.d.ts) — `GET /sites/{id}` ve
 * `POST /projects/{id}/sites` AYNI şekli döndürür, tek yerde kurulur.
 */
function buildSiteDetail(state: MockState, site: MockSite) {
  const project = state.projects.find((p) => p.id === site.project_id);
  const sectionItems = state.sections
    .filter((sec) => sec.site_id === site.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((sec) => ({
      id: sec.id, code: sec.code, name: sec.name, status: sec.status, manager_name: sec.manager_name,
      start_date: sec.start_date, end_date: sec.end_date, sort_order: sec.sort_order,
      progress_pct: METRIC_PENDING("boq"),
      boq_item_count: COUNT_PENDING("boq"),
      budget: METRIC_PENDING("boq"),
      worker_count: COUNT_PENDING("timesheet"),
    }));
  return {
    id: site.id, code: site.code, name: site.name, status: site.status, address: site.address,
    city: site.city, city_inherited: site.city_inherited, site_manager_name: site.site_manager_name,
    start_date: site.start_date, end_date: site.end_date, delivery_date: site.delivery_date,
    remaining_days: site.remaining_days, section_count: sectionItems.length,
    worker_count: COUNT_PENDING("timesheet"),
    progress_pct: METRIC_PENDING("progress_payments"),
    project: {
      id: project?.id ?? site.project_id,
      name: project?.name ?? "",
      city: project?.city ?? null,
      employer_name: project?.employer_name ?? null,
    },
    section_status_counts: {
      planned: sectionItems.filter((s) => s.status === "planned").length,
      active: sectionItems.filter((s) => s.status === "active").length,
      completed: sectionItems.filter((s) => s.status === "completed").length,
    },
    sections: sectionItems,
    total_progress_payment: METRIC_PENDING("progress_payments"),
    contract_amount: METRIC_PENDING("project_costs"),
  };
}

/**
 * `SectionDetailResponse` gövdesi (schema.d.ts) — `GET /sections/{id}`,
 * `POST /sites/{site_id}/sections` VE `PATCH /sections/{id}` AYNI şekli
 * döndürür (tıpkı `buildSiteDetail` gibi tek yerde kurulur). Dört yer
 * tutucu (`progress_pct`/`boq_item_count`/`budget`/`worker_count`) burada
 * üretilir, fikstürde SAKLANMAZ — `budget` (BOQ türevi) ile `budget_amount`
 * (elle girilen gerçek kolon) AYNI ŞEY DEĞİLDİR (P6 §7 S2a).
 */
function buildSectionDetail(section: MockSection) {
  return {
    id: section.id,
    code: section.code,
    name: section.name,
    status: section.status,
    manager_user_id: section.manager_user_id,
    manager_name: section.manager_name,
    start_date: section.start_date,
    end_date: section.end_date,
    sort_order: section.sort_order,
    progress_pct: METRIC_PENDING("boq"),
    boq_item_count: COUNT_PENDING("boq"),
    budget: METRIC_PENDING("boq"),
    worker_count: COUNT_PENDING("timesheet"),
    site_id: section.site_id,
    section_type: section.section_type,
    description: section.description,
    deputy_manager_user_id: section.deputy_manager_user_id,
    deputy_manager_name: section.deputy_manager_name,
    planned_worker_count: section.planned_worker_count,
    budget_amount: section.budget_amount,
    is_draft: section.is_draft,
    created_at: section.created_at,
    updated_at: section.updated_at,
  };
}

/**
 * Backend'in çalışma-zamanı doğrulama kuralı — `app/modules/sites/guards.py::
 * validate_section` (P6 §7 spec, OpenAPI'de KODLU DEĞİL). Tutarlılık kuralı
 * taslakta DA uygulanır; zorunluluk kuralları YALNIZ `is_draft: false` iken.
 * `budget_amount` kontrolü `=== null` — `0` GEÇERLİ bir bedeldir, falsy
 * kontrolü YANLIŞ olurdu.
 */
function validateSectionInput(input: {
  is_draft: boolean;
  section_type: string | null;
  manager_user_id: string | null;
  manager_name: string | null;
  start_date: string | null;
  end_date: string | null;
  budget_amount: string | null;
}): string | null {
  if (input.start_date && input.end_date && input.end_date < input.start_date) {
    return "Planlanan bitiş tarihi başlangıçtan önce olamaz.";
  }
  if (input.is_draft) return null;
  if (input.section_type === null) return "Bölüm tipi seçiniz.";
  const hasManager =
    input.manager_user_id !== null || (input.manager_name !== null && input.manager_name.trim() !== "");
  if (!hasManager) return "Bölüm sorumlusu seçiniz.";
  if (input.start_date === null || input.end_date === null) {
    return "Başlangıç ve planlanan bitiş tarihi zorunludur.";
  }
  if (input.budget_amount === null) return "Bölüm bedeli zorunludur.";
  return null;
}

// Gercek FastAPI yerine gecen minik mock — hermetik E2E icin.
export function startMockBackend(port: number): { server: Server; close: () => Promise<void> } {
  const state = seedState();

  const server = createServer((req, res) => {
    const rawUrl = req.url ?? "";
    const parsed = new URL(rawUrl, "http://mock");
    const path = parsed.pathname;
    const method = req.method ?? "GET";

    const send = (status: number, body?: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };

    // Auth uclari (Bearer gerektirmez)
    if (method === "POST" && path === "/auth/login") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}");
        if (body.password === "wrong") return send(401, { detail: "invalid" });
        return send(200, TOKEN_PAIR);
      });
      return;
    }
    if (method === "POST" && path === "/auth/refresh") return send(200, TOKEN_PAIR);

    // Bundan sonrasi Bearer gerektirir
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) return send(401, { detail: "unauthenticated" });

    if (method === "GET" && path === "/auth/me") return send(200, ME);

    // Govde okuma yardimcisi
    const withBody = (handler: (body: Record<string, unknown>) => void) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => handler(JSON.parse(raw || "{}")));
    };

    // Gosterge paneli ozeti (F6) — v1'de kartlar bos durum doner.
    if (method === "GET" && path === "/dashboard/summary") {
      return send(200, {
        role_name: "Patron",
        active_project_count: state.projects.filter((p) => p.status === "active").length,
        projects: state.projects.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          status: p.status,
          budget: p.budget,
          progress_pct: p.progress_pct,
        })),
        portfolio: { available: false, value: null, pending_module: "progress_payments" },
        receivables: { available: false, value: null, pending_module: "invoicing" },
        average_margin: { available: false, value: null, pending_module: "progress_payments" },
        pending_approvals: { available: false, items: [], count: 0, pending_module: "approvals" },
        risks: { available: false, items: [], pending_module: "inventory" },
      });
    }

    // /modules, /roles listeleri
    if (method === "GET" && path === "/modules") return send(200, state.modules);
    if (method === "GET" && path === "/roles") return send(200, state.roles);

    // /projects — sayaçlar filtreden bağımsız, item listesi filtrelenir (spec §3).
    if (method === "GET" && path === "/projects") {
      const type = parsed.searchParams.get("type");
      const status = parsed.searchParams.get("status");
      const counts = {
        all: state.projects.length,
        taahhut: state.projects.filter((p) => p.project_type === "taahhut").length,
        kendi_yatirim: state.projects.filter((p) => p.project_type === "kendi_yatirim").length,
        kat_karsiligi: state.projects.filter((p) => p.project_type === "kat_karsiligi").length,
        completed: state.projects.filter((p) => p.status === "completed").length,
      };
      let items = state.projects;
      if (type) items = items.filter((p) => p.project_type === type);
      if (status) items = items.filter((p) => p.status === status);
      return send(200, { counts, items });
    }
    if (method === "POST" && path === "/projects") {
      return withBody((body) => {
        const projectType = String(body.project_type ?? "taahhut");
        const project: MockProject = {
          id: `p-${state.projects.length + 1}`,
          code: String(body.code ?? ""),
          name: String(body.name ?? ""),
          project_type: projectType,
          status: "active",
          category: body.category ? String(body.category) : null,
          city: body.city ? String(body.city) : null,
          employer_name: body.employer_name ? String(body.employer_name) : null,
          contract_no: body.contract_no ? String(body.contract_no) : null,
          contract_amount: body.contract_amount ? String(body.contract_amount) : null,
          start_date: null,
          end_date: null,
          budget: "0",
          progress_pct: "0",
          contracting: projectType === "taahhut" ? CONTRACTING_PLACEHOLDERS() : null,
          investment:
            projectType === "kendi_yatirim" && body.investment
              ? INVESTMENT_PLACEHOLDERS(
                  String((body.investment as { sales_target?: unknown }).sales_target ?? ""),
                  String((body.investment as { land_cost?: unknown }).land_cost ?? "0"),
                )
              : null,
          land_share:
            projectType === "kat_karsiligi" && body.land_share
              ? LAND_SHARE_PLACEHOLDERS(
                  String((body.land_share as { landowner_name?: unknown }).landowner_name ?? ""),
                  String((body.land_share as { our_share_pct?: unknown }).our_share_pct ?? "0"),
                  String((body.land_share as { owner_share_pct?: unknown }).owner_share_pct ?? "0"),
                )
              : null,
        };
        state.projects.push(project);
        return send(201, project);
      });
    }

    // /projects/{project_id} — Proje Detay hero + sekmeler (Task 8, spec §4.1).
    const projectIdMatch = path.match(/^\/projects\/([^/]+)$/);
    if (method === "GET" && projectIdMatch) {
      const projectId = projectIdMatch[1];
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return send(404, { detail: "proje yok" });
      const siteCount = state.sites.filter((s) => s.project_id === projectId).length;
      return send(200, { ...project, site_count: siteCount });
    }

    // /projects/{project_id}/sites — Proje Detay şantiye ızgarası (Task 5, spec §4.3).
    const projectSitesMatch = path.match(/^\/projects\/([^/]+)\/sites$/);
    if (method === "GET" && projectSitesMatch) {
      const projectId = projectSitesMatch[1];
      const items = state.sites
        .filter((s) => s.project_id === projectId)
        .map((s) => ({
          id: s.id, code: s.code, name: s.name, status: s.status, address: s.address, city: s.city,
          city_inherited: s.city_inherited, site_manager_name: s.site_manager_name,
          start_date: s.start_date, end_date: s.end_date, delivery_date: s.delivery_date,
          remaining_days: s.remaining_days,
          section_count: state.sections.filter((sec) => sec.site_id === s.id).length,
          worker_count: COUNT_PENDING("timesheet"),
          progress_pct: METRIC_PENDING("progress_payments"),
        }));
      return send(200, {
        counts: {
          all: items.length,
          active: items.filter((i) => i.status === "active").length,
          on_hold: items.filter((i) => i.status === "on_hold").length,
          completed: items.filter((i) => i.status === "completed").length,
        },
        items,
        totals: {
          total_progress_payment: METRIC_PENDING("progress_payments"),
          subcontractor_count: COUNT_PENDING("subcontracts"),
          active_worker_count: COUNT_PENDING("timesheet"),
          average_margin: METRIC_PENDING("project_costs"),
        },
      });
    }

    // POST /projects/{project_id}/sites — Şantiye Ekle formunun ATOMİK gönderimi
    // (plan T13, spec §3.4/§9.3): şantiye + bölümler tek gövdede gelir, yanıt
    // `SiteDetailResponse`'tur (form başarıda `site.id`'ye yönlendirir).
    if (method === "POST" && projectSitesMatch) {
      const projectId = projectSitesMatch[1];
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return send(404, { detail: "proje yok" });
      return withBody((body) => {
        const siteId = `s-${state.sites.length + 1}`;
        const city = body.city ? String(body.city) : null;
        const site: MockSite = {
          id: siteId,
          project_id: projectId,
          // Kod boş gelirse sunucu üretir (spec §3.6) — mock da aynısını yapar.
          code: body.code ? String(body.code) : `SNT-2026-${state.sites.length + 1}`,
          name: String(body.name ?? ""),
          status: String(body.status ?? "preparation") as MockSite["status"],
          address: body.address ? String(body.address) : null,
          city: city ?? project.city,
          city_inherited: city === null,
          site_manager_name: userNameById(state, body.site_manager_user_id),
          start_date: body.start_date ? String(body.start_date) : null,
          end_date: body.end_date ? String(body.end_date) : null,
          delivery_date: null,
          remaining_days: null,
        };
        state.sites.push(site);
        const rows = Array.isArray(body.sections) ? (body.sections as Array<Record<string, unknown>>) : [];
        const nowIso = new Date().toISOString();
        rows.forEach((row, index) => {
          // Şantiye Ekle formu (bu uç) P6 alanlarını TOPLAMAZ — bölüm satırı
          // yalnız kod/ad/sorumlu/tarih taşır, kalan P6 kolonları boş/varsayılan
          // başlar (taslak değil ama zorunluluk kuralı burada uygulanmaz —
          // bu form P6'nın SectionCreate/§4 doğrulamasından ayrı bir uçtur).
          const managerUserId = typeof row.manager_user_id === "string" ? row.manager_user_id : null;
          state.sections.push({
            id: `sec-${state.sections.length + 1}`,
            site_id: siteId,
            code: row.code ? String(row.code) : null,
            name: String(row.name ?? ""),
            status: "planned",
            manager_user_id: managerUserId,
            manager_name: userNameById(state, row.manager_user_id),
            start_date: row.start_date ? String(row.start_date) : null,
            end_date: row.end_date ? String(row.end_date) : null,
            sort_order: index,
            section_type: null,
            description: null,
            deputy_manager_user_id: null,
            deputy_manager_name: null,
            planned_worker_count: null,
            budget_amount: null,
            is_draft: false,
            created_at: nowIso,
            updated_at: nowIso,
          });
        });
        return send(201, buildSiteDetail(state, site));
      });
    }

    // /sites/{site_id} — Şantiye Detay hero + sekmeler + bölüm listesi (Task 8/9, spec §5).
    const siteIdMatch = path.match(/^\/sites\/([^/]+)$/);
    if (method === "GET" && siteIdMatch) {
      const siteId = siteIdMatch[1];
      const site = state.sites.find((s) => s.id === siteId);
      if (!site) return send(404, { detail: "santiye yok" });
      return send(200, buildSiteDetail(state, site));
    }

    // POST /sites/{site_id}/sections — Bölüm Detay dilimi (P6 §5, T3'te tam
    // sayfa form): tekil bölüm oluşturma. Şantiye Ekle formunun atomik satır
    // gönderiminden (yukarıdaki `projectSitesMatch` POST'u) AYRI bir uçtur —
    // orada P6 doğrulaması uygulanmaz, burada uygulanır (`useCreateSection`
    // hook'unun çağırdığı uç budur).
    const siteSectionsMatch = path.match(/^\/sites\/([^/]+)\/sections$/);
    if (method === "POST" && siteSectionsMatch) {
      const siteId = siteSectionsMatch[1];
      const site = state.sites.find((s) => s.id === siteId);
      if (!site) return send(404, { detail: "santiye yok" });
      return withBody((body) => {
        const code = body.code ? String(body.code) : null;
        if (code && state.sections.some((sec) => sec.site_id === siteId && sec.code === code)) {
          return send(409, { detail: "Bu bölüm kodu bu şantiyede zaten kullanılıyor" });
        }
        const isDraft = body.is_draft === true;
        const managerUserId = typeof body.manager_user_id === "string" ? body.manager_user_id : null;
        const managerName = body.manager_name ? String(body.manager_name) : null;
        const startDate = body.start_date ? String(body.start_date) : null;
        const endDate = body.end_date ? String(body.end_date) : null;
        const sectionType = body.section_type ? String(body.section_type) : null;
        const budgetAmount =
          body.budget_amount === undefined || body.budget_amount === null ? null : String(body.budget_amount);
        const validationError = validateSectionInput({
          is_draft: isDraft,
          section_type: sectionType,
          manager_user_id: managerUserId,
          manager_name: managerName ?? userNameById(state, managerUserId),
          start_date: startDate,
          end_date: endDate,
          budget_amount: budgetAmount,
        });
        if (validationError) return send(422, { detail: validationError });
        const nowIso = new Date().toISOString();
        const section: MockSection = {
          id: `sec-${state.sections.length + 1}`,
          site_id: siteId,
          // Kod boş gelirse sunucu `BLM-NN` biçiminde üretir (spec §5).
          code: code ?? `BLM-${String(state.sections.length + 1).padStart(2, "0")}`,
          name: String(body.name ?? ""),
          status: (body.status ? String(body.status) : "planned") as MockSection["status"],
          manager_user_id: managerUserId,
          manager_name: managerName ?? userNameById(state, managerUserId),
          start_date: startDate,
          end_date: endDate,
          sort_order: typeof body.sort_order === "number" ? body.sort_order : state.sections.length,
          section_type: sectionType,
          description: body.description ? String(body.description) : null,
          deputy_manager_user_id: typeof body.deputy_manager_user_id === "string" ? body.deputy_manager_user_id : null,
          deputy_manager_name: body.deputy_manager_name ? String(body.deputy_manager_name) : null,
          planned_worker_count: typeof body.planned_worker_count === "number" ? body.planned_worker_count : null,
          budget_amount: budgetAmount,
          is_draft: isDraft,
          created_at: nowIso,
          updated_at: nowIso,
        };
        state.sections.push(section);
        return send(201, buildSectionDetail(section));
      });
    }

    // GET /sections/{section_id} — Bölüm Detay ekranının tekil kaynağı (P6 §5).
    const sectionIdMatch = path.match(/^\/sections\/([^/]+)$/);
    if (method === "GET" && sectionIdMatch) {
      const sectionId = sectionIdMatch[1];
      const section = state.sections.find((sec) => sec.id === sectionId);
      if (!section) return send(404, { detail: "bolum yok" });
      return send(200, buildSectionDetail(section));
    }

    // PATCH /sections/{section_id} — tam sayfa Bölüm formunun güncelleme ucu
    // (T3). `SectionUpdate`te `site_id` YOKTUR (bölüm başka şantiyeye
    // taşınamaz), bu yüzden burada da değişmez. §4 doğrulaması, gövdede
    // GELMEYEN alanlar için MEVCUT kayıttan (merge) kontrol edilir — kısmi
    // PATCH ile taslak-dışı bir bölümü eksik bırakmak engellenir.
    if (method === "PATCH" && sectionIdMatch) {
      const sectionId = sectionIdMatch[1];
      const section = state.sections.find((sec) => sec.id === sectionId);
      if (!section) return send(404, { detail: "bolum yok" });
      return withBody((body) => {
        const hasCode = Object.prototype.hasOwnProperty.call(body, "code");
        const code = hasCode ? (body.code ? String(body.code) : null) : section.code;
        if (
          code &&
          state.sections.some((sec) => sec.id !== sectionId && sec.site_id === section.site_id && sec.code === code)
        ) {
          return send(409, { detail: "Bu bölüm kodu bu şantiyede zaten kullanılıyor" });
        }
        const pick = <K extends keyof MockSection>(key: K, transform: (v: unknown) => MockSection[K]): MockSection[K] =>
          Object.prototype.hasOwnProperty.call(body, key) ? transform((body as Record<string, unknown>)[key]) : section[key];

        const isDraft = pick("is_draft", (v) => (v === true) as MockSection["is_draft"]);
        const managerUserId = pick("manager_user_id", (v) => (typeof v === "string" ? v : null));
        const managerNameRaw = pick("manager_name", (v) => (v ? String(v) : null));
        const startDate = pick("start_date", (v) => (v ? String(v) : null));
        const endDate = pick("end_date", (v) => (v ? String(v) : null));
        const sectionType = pick("section_type", (v) => (v ? String(v) : null));
        const budgetAmount = pick("budget_amount", (v) => (v === undefined || v === null ? null : String(v)));
        const managerName = managerNameRaw ?? userNameById(state, managerUserId);

        const validationError = validateSectionInput({
          is_draft: isDraft,
          section_type: sectionType,
          manager_user_id: managerUserId,
          manager_name: managerName,
          start_date: startDate,
          end_date: endDate,
          budget_amount: budgetAmount,
        });
        if (validationError) return send(422, { detail: validationError });

        const updated: MockSection = {
          ...section,
          code,
          name: pick("name", (v) => (v ? String(v) : section.name)),
          status: pick("status", (v) => (v ? (String(v) as MockSection["status"]) : section.status)),
          manager_user_id: managerUserId,
          manager_name: managerName,
          start_date: startDate,
          end_date: endDate,
          sort_order: pick("sort_order", (v) => (typeof v === "number" ? v : section.sort_order)),
          section_type: sectionType,
          description: pick("description", (v) => (v ? String(v) : null)),
          deputy_manager_user_id: pick("deputy_manager_user_id", (v) => (typeof v === "string" ? v : null)),
          deputy_manager_name: pick("deputy_manager_name", (v) => (v ? String(v) : null)),
          planned_worker_count: pick("planned_worker_count", (v) => (typeof v === "number" ? v : null)),
          budget_amount: budgetAmount,
          is_draft: isDraft,
          updated_at: new Date().toISOString(),
        };
        Object.assign(section, updated);
        return send(200, buildSectionDetail(section));
      });
    }

    // /sites/{site_id}/boq — Ekran 13 İş Kalemleri (F11, spec §6.1). Tablo ve üst
    // KPI şeridi tek yanıttan beslenir. Fikstür şantiyeden bağımsızdır: görsel test
    // tek şantiyeye bakar, ikinci bir yük çeşidi baseline'a değer katmaz.
    const boqMatch = path.match(/^\/sites\/([^/]+)\/boq$/);
    if (method === "GET" && boqMatch) {
      const site = state.sites.find((s) => s.id === boqMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      return send(200, {
        groups: BOQ_FIXTURE.map((group) => ({
          ...group,
          items: group.items.map((item) => ({
            ...item,
            progress_pct: METRIC_PENDING("progress_payments"),
          })),
        })),
        totals: {
          // Dördü de yer tutucu (spec §3.2/§4): sözleşme P5'i, hakediş P7'yi bekler.
          contract_total: METRIC_PENDING("contracts"),
          realized_total: METRIC_PENDING("progress_payments"),
          remaining_total: METRIC_PENDING("progress_payments"),
          revision_total: METRIC_PENDING("contracts"),
          // Mockup 176 — tek gerçek toplam; frontend yeniden hesaplamaz.
          grand_total: "12399900.00",
          grand_progress_pct: METRIC_PENDING("progress_payments"),
        },
      });
    }

    // --- P7 T7 · Hakediş (İşveren) uçları ---------------------------------

    // GET /progress-payments — liste (proje/şantiye/durum filtresi).
    // `hiddenFromLists` işaretli kayıtlar (pp-6) burada HİÇ görünmez — bkz.
    // `MockProgressPayment.hiddenFromLists` + `buildProgressPaymentFixtures`
    // İZOLASYON notu (test determinizmi düzeltmesi).
    if (method === "GET" && path === "/progress-payments") {
      const projectId = parsed.searchParams.get("project_id");
      const siteId = parsed.searchParams.get("site_id");
      const status = parsed.searchParams.get("status");
      let items = state.progressPayments.filter((p) => !p.hiddenFromLists);
      if (projectId) items = items.filter((p) => p.project_id === projectId);
      if (siteId) items = items.filter((p) => p.lines.some((l) => l.site_id === siteId));
      if (status) items = items.filter((p) => p.status === status);
      return send(200, { items: items.map((p) => buildPaymentListItem(state, p)) });
    }

    // POST /projects/{project_id}/progress-payments — atomik oluşturma
    // (başlık + satırlar tek gövdede, spec §9.2).
    const createPaymentMatch = path.match(/^\/projects\/([^/]+)\/progress-payments$/);
    if (method === "POST" && createPaymentMatch) {
      const projectId = createPaymentMatch[1];
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return send(404, { detail: "proje yok" });
      return withBody((body) => {
        const existingForProject = state.progressPayments.filter((p) => p.project_id === projectId);
        const nextSeq = existingForProject.length > 0 ? Math.max(...existingForProject.map((p) => p.sequence_no)) + 1 : 1;
        const contract = projectId === "p-1" ? EMPLOYER_CONTRACT_P1 : null;
        const rawLines = Array.isArray(body.lines) ? (body.lines as Array<Record<string, unknown>>) : [];
        const lines = rawLines.map((l, index) =>
          computeLine(
            String(l.contract_item_id ?? ""),
            String(l.site_id ?? ""),
            (l.quantity as number | string) ?? 0,
            l.coefficient as number | string | null | undefined,
            undefined,
            index,
          ),
        );
        const payment: MockProgressPayment = {
          id: `pp-${state.progressPayments.length + 2}`,
          project_id: projectId,
          sequence_no: nextSeq,
          period_year: (body.period_year as number | null | undefined) ?? null,
          period_month: (body.period_month as number | null | undefined) ?? null,
          description: body.description ? String(body.description) : null,
          status: "draft",
          vat_pct: contract?.vat_pct ?? "20.00",
          advance_pct: contract?.advance_pct ?? "20.00",
          retainage_pct: contract?.retainage_pct ?? "5.00",
          default_coefficient: body.default_coefficient ? String(body.default_coefficient) : "1",
          submitted_at: null, approved_at: null, approved_by: null, paid_at: null,
          created_by: "11111111-1111-1111-1111-111111111111",
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          lines,
          groups: [],
          calculation: { gross: "0.00", vat: "0.00", advance_deduction: "0.00", retention: "0.00", net: "0.00" },
          progress: { financial_pct: null, physical_pct: null, duration_pct: null },
          dropped_orphan_count: 0,
        };
        recomputePaymentTotals(payment);
        state.progressPayments.push(payment);
        return send(201, buildPaymentDetail(state, payment));
      });
    }

    // GET /projects/{project_id}/progress-payments/summary — Ekran 14 sekmesi
    // + Şantiye - Hakedişler KPI şeridi (brief §Ortak KPI şeridi ZORUNLU ucu).
    const summaryMatch = path.match(/^\/projects\/([^/]+)\/progress-payments\/summary$/);
    if (method === "GET" && summaryMatch) {
      const project = state.projects.find((p) => p.id === summaryMatch[1]);
      if (!project) return send(404, { detail: "proje yok" });
      return send(200, buildProgressPaymentSummary(state, summaryMatch[1]));
    }

    // GET /projects/{project_id}/contract — hakediş formu Fiyat Farkı bandı.
    const contractMatch = path.match(/^\/projects\/([^/]+)\/contract$/);
    if (method === "GET" && contractMatch) {
      const projectId = contractMatch[1];
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return send(404, { detail: "proje yok" });
      if (projectId !== "p-1") return send(404, { detail: "bu proje icin sozlesme yok" });
      return send(200, {
        ...EMPLOYER_CONTRACT_P1,
        progress_payment_summary: buildProgressPaymentSummary(state, projectId),
        milestones: null,
        documents: null,
        pending_modules: [] as string[],
      });
    }

    // GET /projects/{project_id}/contract/distribution — hakediş formu pivot
    // tablosu kaynağı (`İşveren Hakediş Oluştur.dc.html`).
    const distributionMatch = path.match(/^\/projects\/([^/]+)\/contract\/distribution$/);
    if (method === "GET" && distributionMatch) {
      const projectId = distributionMatch[1];
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return send(404, { detail: "proje yok" });
      if (projectId !== "p-1") return send(404, { detail: "bu proje icin poz dagilimi yok" });
      return send(200, buildContractDistributionResponse(state, projectId));
    }

    // /progress-payments/{payment_id}/lines — DEĞİŞTİRME semantiği (spec §9.2).
    const linesMatch = path.match(/^\/progress-payments\/([^/]+)\/lines$/);
    if (method === "PUT" && linesMatch) {
      const payment = state.progressPayments.find((p) => p.id === linesMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      return withBody((body) => {
        const rawLines = Array.isArray(body.lines) ? (body.lines as Array<Record<string, unknown>>) : [];
        payment.lines = rawLines.map((l, index) => {
          const itemId = String(l.contract_item_id ?? "");
          const siteId = String(l.site_id ?? "");
          const existing = payment.lines.find((pl) => pl.contract_item_id === itemId && pl.site_id === siteId);
          return computeLine(itemId, siteId, (l.quantity as number | string) ?? 0, l.coefficient as number | string | null | undefined, existing, index);
        });
        recomputePaymentTotals(payment);
        payment.updated_at = new Date().toISOString();
        return send(200, buildPaymentDetail(state, payment));
      });
    }

    // /progress-payments/{payment_id}/refresh-prices — draft-only fiyat/katsayı
    // tazeleme (spec §9.3). Mock'ta sözleşme kalemi fiyatı hiç değişmediğinden
    // yalnız bağı sağlam (contract_item_id != null) satırlar yeniden hesaplanır.
    const refreshMatch = path.match(/^\/progress-payments\/([^/]+)\/refresh-prices$/);
    if (method === "POST" && refreshMatch) {
      const payment = state.progressPayments.find((p) => p.id === refreshMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "draft") return send(409, { detail: "yalniz taslak tazelenebilir" });
      let refreshedCount = 0;
      payment.lines = payment.lines.map((line, index) => {
        if (!line.contract_item_id) return line;
        refreshedCount += 1;
        return computeLine(line.contract_item_id, line.site_id, line.quantity, payment.default_coefficient, line, index);
      });
      recomputePaymentTotals(payment);
      payment.updated_at = new Date().toISOString();
      return send(200, { refreshed_count: refreshedCount });
    }

    // Durum geçişleri (spec §7) — govde almazlar (reject harici), yalniz
    // payment_id. Gecersiz gecis 409 dondurur; guncel detay HER ZAMAN
    // durumu yansitir (brief §Belirsizlik çözümü 3 — sabit tek yanit YETMEZ).
    const submitMatch = path.match(/^\/progress-payments\/([^/]+)\/submit$/);
    if (method === "POST" && submitMatch) {
      const payment = state.progressPayments.find((p) => p.id === submitMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "draft") return send(409, { detail: "yalniz taslak onaya gonderilebilir" });
      payment.status = "pending_approval";
      payment.submitted_at = new Date().toISOString();
      payment.updated_at = payment.submitted_at;
      return send(200, buildPaymentDetail(state, payment));
    }
    const approveMatch = path.match(/^\/progress-payments\/([^/]+)\/approve$/);
    if (method === "POST" && approveMatch) {
      const payment = state.progressPayments.find((p) => p.id === approveMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "pending_approval") return send(409, { detail: "yalniz onay bekleyen onaylanabilir" });
      payment.status = "approved";
      payment.approved_at = new Date().toISOString();
      payment.approved_by = "11111111-1111-1111-1111-111111111111";
      payment.updated_at = payment.approved_at;
      return send(200, buildPaymentDetail(state, payment));
    }
    const rejectMatch = path.match(/^\/progress-payments\/([^/]+)\/reject$/);
    if (method === "POST" && rejectMatch) {
      const payment = state.progressPayments.find((p) => p.id === rejectMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "pending_approval") return send(409, { detail: "yalniz onay bekleyen reddedilebilir" });
      // RejectBody.reason denetim gunlugune yazilir (kalici kolon YOK, spec
      // §7 K12) — mock'ta ayrica saklanmaz, yalniz durum geri alinir.
      payment.status = "draft";
      payment.submitted_at = null;
      payment.updated_at = new Date().toISOString();
      return send(200, buildPaymentDetail(state, payment));
    }
    const markPaidMatch = path.match(/^\/progress-payments\/([^/]+)\/mark-paid$/);
    if (method === "POST" && markPaidMatch) {
      const payment = state.progressPayments.find((p) => p.id === markPaidMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "approved") return send(409, { detail: "yalniz onaylanmis odendi isaretlenebilir" });
      payment.status = "paid";
      payment.paid_at = new Date().toISOString();
      payment.updated_at = payment.paid_at;
      return send(200, buildPaymentDetail(state, payment));
    }
    const unapproveMatch = path.match(/^\/progress-payments\/([^/]+)\/unapprove$/);
    if (method === "POST" && unapproveMatch) {
      const payment = state.progressPayments.find((p) => p.id === unapproveMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "approved") return send(409, { detail: "yalniz onaylanmis onayi geri alinabilir" });
      payment.status = "pending_approval";
      payment.approved_at = null;
      payment.approved_by = null;
      payment.updated_at = new Date().toISOString();
      return send(200, buildPaymentDetail(state, payment));
    }

    // GET/PATCH /progress-payments/{payment_id} — TEKİL rota son sırada
    // kontrol edilir (yukarıdaki alt-yol regex'leri her zaman önce eşleşir,
    // sıralama önemli değildir ama okunabilirlik için aksiyon uçlarından
    // sonra yerleştirildi).
    const paymentIdMatch = path.match(/^\/progress-payments\/([^/]+)$/);
    if (method === "GET" && paymentIdMatch) {
      const payment = state.progressPayments.find((p) => p.id === paymentIdMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      return send(200, buildPaymentDetail(state, payment));
    }
    if (method === "PATCH" && paymentIdMatch) {
      const payment = state.progressPayments.find((p) => p.id === paymentIdMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      return withBody((body) => {
        if (body.period_year !== undefined) payment.period_year = body.period_year as number | null;
        if (body.period_month !== undefined) payment.period_month = body.period_month as number | null;
        if (body.description !== undefined) payment.description = body.description ? String(body.description) : null;
        if (body.default_coefficient !== undefined && body.default_coefficient !== null) {
          payment.default_coefficient = String(body.default_coefficient);
        }
        payment.updated_at = new Date().toISOString();
        return send(200, buildPaymentDetail(state, payment));
      });
    }

    // --- F-TH T1 · Taşeron Hakedişi uçları ---------------------------------

    // GET /subcontractor-progress-payments/summary — ÖNCE kontrol edilir:
    // aşağıdaki tekil `{payment_id}` regex'i "summary"yi de id sayardı
    // (audit-log/export.xlsx sıralama uyarısıyla ayni tuzak).
    if (method === "GET" && path === "/subcontractor-progress-payments/summary") {
      return send(200, buildSubcontractorPaymentSummary(state, parsed.searchParams));
    }

    // GET /subcontractor-progress-payments — liste (proje/dönem/durum/arama +
    // sayfalama).
    if (method === "GET" && path === "/subcontractor-progress-payments") {
      const projectId = parsed.searchParams.get("project_id");
      const periodYear = parsed.searchParams.get("period_year");
      const periodMonth = parsed.searchParams.get("period_month");
      const status = parsed.searchParams.get("status");
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");

      // `hiddenFromLists` işaretli kayıtlar (scpp-6/scpp-7) burada HİÇ
      // görünmez — bkz. `MockSubcontractorProgressPayment.hiddenFromLists`.
      let items = state.subcontractorProgressPayments.filter((p) => !p.hiddenFromLists);
      if (projectId) items = items.filter((p) => p.project_id === projectId);
      if (periodYear) items = items.filter((p) => p.period_year === Number(periodYear));
      if (periodMonth) items = items.filter((p) => p.period_month === Number(periodMonth));
      if (status) items = items.filter((p) => p.status === status);
      if (q) {
        items = items.filter((p) => {
          const contract = findSubcontractorContract(state, p.contract_id);
          const name = (contract?.subcontractor_name ?? "").toLocaleLowerCase("tr");
          const no = (contract?.contract_no ?? "").toLocaleLowerCase("tr");
          return name.includes(q) || no.includes(q);
        });
      }
      const total = items.length;
      const page = items.slice(offset, offset + limit);
      return send(200, {
        items: page.map((p) => buildSubcontractorPaymentListItem(state, p)),
        total,
        limit,
        offset,
      });
    }

    // POST /subcontractor-contracts/{contract_id}/progress-payments —
    // oluşturma. İşveren şemasından FARKLI: gövde `lines[]` TAŞIMAZ, satırlar
    // ayrı `PUT …/lines` ile girilir (T3), bu yüzden taze taslak satırsız açılır.
    const createSubcontractorPaymentMatch = path.match(
      /^\/subcontractor-contracts\/([^/]+)\/progress-payments$/,
    );
    if (method === "POST" && createSubcontractorPaymentMatch) {
      const contractId = createSubcontractorPaymentMatch[1];
      const contract = state.subcontractorContracts.find((c) => c.id === contractId);
      if (!contract) return send(404, { detail: "sozlesme yok" });
      return withBody((body) => {
        const existingForContract = state.subcontractorProgressPayments.filter(
          (p) => p.contract_id === contractId,
        );
        const nextSeq =
          existingForContract.length > 0
            ? Math.max(...existingForContract.map((p) => p.sequence_no)) + 1
            : 1;
        const payment: MockSubcontractorProgressPayment = {
          id: `scpp-${state.subcontractorProgressPayments.length + 1}`,
          contract_id: contractId,
          project_id: contract.project_id,
          sequence_no: nextSeq,
          period_year: (body.period_year as number | null | undefined) ?? null,
          period_month: (body.period_month as number | null | undefined) ?? null,
          description: body.description ? String(body.description) : null,
          status: "draft",
          vat_pct: contract.vat_pct,
          advance_pct: contract.advance_pct,
          retainage_pct: contract.retainage_pct,
          default_coefficient: body.default_coefficient ? String(body.default_coefficient) : "1",
          section_id: (body.section_id as string | null | undefined) ?? null,
          submitted_at: null, approved_at: null, approved_by: null, paid_at: null,
          rejected_at: null, rejection_reason: null, is_revision_required: false,
          created_by: "11111111-1111-1111-1111-111111111111",
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          lines: [],
          calculation: { gross: "0.00", vat: "0.00", advance_deduction: "0.00", retention: "0.00", net: "0.00" },
          dropped_orphan_count: 0,
        };
        state.subcontractorProgressPayments.push(payment);
        return send(201, buildSubcontractorPaymentDetail(state, payment));
      });
    }

    // /subcontractor-progress-payments/{payment_id}/lines — DEĞİŞTİRME
    // semantiği: gövdede olmayan satır SİLİNİR.
    const subcontractorLinesMatch = path.match(/^\/subcontractor-progress-payments\/([^/]+)\/lines$/);
    if (method === "PUT" && subcontractorLinesMatch) {
      const payment = state.subcontractorProgressPayments.find((p) => p.id === subcontractorLinesMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      return withBody((body) => {
        const rawLines = Array.isArray(body.lines) ? (body.lines as Array<Record<string, unknown>>) : [];
        payment.lines = rawLines.map((l, index) => {
          const itemId = String(l.contract_item_id ?? "");
          const existing = payment.lines.find((pl) => pl.contract_item_id === itemId);
          return computeSubcontractorLine(
            payment.contract_id,
            itemId,
            (l.quantity as number | string) ?? 0,
            l.coefficient as number | string | null | undefined,
            existing,
            index,
          );
        });
        recomputeSubcontractorPaymentTotals(payment);
        payment.updated_at = new Date().toISOString();
        return send(200, buildSubcontractorPaymentDetail(state, payment));
      });
    }

    // /subcontractor-progress-payments/{payment_id}/refresh-prices — yalniz
    // taslakta fiyat/katsayı tazeleme.
    const subcontractorRefreshMatch = path.match(
      /^\/subcontractor-progress-payments\/([^/]+)\/refresh-prices$/,
    );
    if (method === "POST" && subcontractorRefreshMatch) {
      const payment = state.subcontractorProgressPayments.find((p) => p.id === subcontractorRefreshMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "draft") return send(409, { detail: "yalniz taslak tazelenebilir" });
      let refreshedCount = 0;
      payment.lines = payment.lines.map((line, index) => {
        if (!line.contract_item_id) return line;
        refreshedCount += 1;
        return computeSubcontractorLine(
          payment.contract_id,
          line.contract_item_id,
          line.quantity,
          payment.default_coefficient,
          line,
          index,
        );
      });
      recomputeSubcontractorPaymentTotals(payment);
      payment.updated_at = new Date().toISOString();
      return send(200, { refreshed_count: refreshedCount });
    }

    // Durum geçişleri — govde almazlar (reject harici), yalniz payment_id.
    const subcontractorSubmitMatch = path.match(/^\/subcontractor-progress-payments\/([^/]+)\/submit$/);
    if (method === "POST" && subcontractorSubmitMatch) {
      const payment = state.subcontractorProgressPayments.find((p) => p.id === subcontractorSubmitMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "draft") return send(409, { detail: "yalniz taslak onaya gonderilebilir" });
      payment.status = "pending_approval";
      payment.submitted_at = new Date().toISOString();
      payment.updated_at = payment.submitted_at;
      // `is_revision_required` TÜREV bir alandır (`draft AND rejected_at IS
      // NOT NULL`, bkz. yukarıdaki #4 fikstür notu) — durum artık `draft`
      // OLMADIĞINDAN yeniden hesaplanır (F-TH T6 fix: mock önceden bu bayrağı
      // statik tutuyordu, resubmit sonrası "Revize Gerekli" rozeti yanlışlıkla
      // asılı kalıyordu).
      payment.is_revision_required = false;
      return send(200, buildSubcontractorPaymentDetail(state, payment));
    }
    const subcontractorApproveMatch = path.match(/^\/subcontractor-progress-payments\/([^/]+)\/approve$/);
    if (method === "POST" && subcontractorApproveMatch) {
      const payment = state.subcontractorProgressPayments.find((p) => p.id === subcontractorApproveMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "pending_approval") return send(409, { detail: "yalniz onay bekleyen onaylanabilir" });
      payment.status = "approved";
      payment.approved_at = new Date().toISOString();
      payment.approved_by = "11111111-1111-1111-1111-111111111111";
      payment.updated_at = payment.approved_at;
      return send(200, buildSubcontractorPaymentDetail(state, payment));
    }
    const subcontractorRejectMatch = path.match(/^\/subcontractor-progress-payments\/([^/]+)\/reject$/);
    if (method === "POST" && subcontractorRejectMatch) {
      const payment = state.subcontractorProgressPayments.find((p) => p.id === subcontractorRejectMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "pending_approval") return send(409, { detail: "yalniz onay bekleyen reddedilebilir" });
      return withBody((body) => {
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (!reason) return send(422, { detail: "gerekce zorunludur" });
        payment.status = "draft";
        payment.submitted_at = null;
        payment.rejected_at = new Date().toISOString();
        payment.rejection_reason = reason;
        payment.is_revision_required = true;
        payment.updated_at = payment.rejected_at;
        return send(200, buildSubcontractorPaymentDetail(state, payment));
      });
    }
    const subcontractorMarkPaidMatch = path.match(/^\/subcontractor-progress-payments\/([^/]+)\/mark-paid$/);
    if (method === "POST" && subcontractorMarkPaidMatch) {
      const payment = state.subcontractorProgressPayments.find((p) => p.id === subcontractorMarkPaidMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "approved") return send(409, { detail: "yalniz onaylanmis odendi isaretlenebilir" });
      payment.status = "paid";
      payment.paid_at = new Date().toISOString();
      payment.updated_at = payment.paid_at;
      return send(200, buildSubcontractorPaymentDetail(state, payment));
    }
    const subcontractorUnapproveMatch = path.match(
      /^\/subcontractor-progress-payments\/([^/]+)\/unapprove$/,
    );
    if (method === "POST" && subcontractorUnapproveMatch) {
      const payment = state.subcontractorProgressPayments.find((p) => p.id === subcontractorUnapproveMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "approved") return send(409, { detail: "yalniz onaylanmis onayi geri alinabilir" });
      payment.status = "pending_approval";
      payment.approved_at = null;
      payment.approved_by = null;
      payment.updated_at = new Date().toISOString();
      return send(200, buildSubcontractorPaymentDetail(state, payment));
    }

    // GET/PATCH/DELETE /subcontractor-progress-payments/{payment_id} —
    // tekil rota (yukarıdaki alt-yol regex'lerinden SONRA, `summary`
    // literal path'inden de SONRA kontrol edilir).
    const subcontractorPaymentIdMatch = path.match(/^\/subcontractor-progress-payments\/([^/]+)$/);
    if (method === "GET" && subcontractorPaymentIdMatch) {
      const payment = state.subcontractorProgressPayments.find((p) => p.id === subcontractorPaymentIdMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      return send(200, buildSubcontractorPaymentDetail(state, payment));
    }
    if (method === "PATCH" && subcontractorPaymentIdMatch) {
      const payment = state.subcontractorProgressPayments.find((p) => p.id === subcontractorPaymentIdMatch[1]);
      if (!payment) return send(404, { detail: "hakedis yok" });
      if (payment.status !== "draft") return send(409, { detail: "yalniz taslak guncellenebilir" });
      return withBody((body) => {
        if (body.period_year !== undefined) payment.period_year = body.period_year as number | null;
        if (body.period_month !== undefined) payment.period_month = body.period_month as number | null;
        if (body.description !== undefined) payment.description = body.description ? String(body.description) : null;
        if (body.default_coefficient !== undefined && body.default_coefficient !== null) {
          payment.default_coefficient = String(body.default_coefficient);
        }
        if (body.section_id !== undefined) payment.section_id = body.section_id as string | null;
        payment.updated_at = new Date().toISOString();
        return send(200, buildSubcontractorPaymentDetail(state, payment));
      });
    }
    if (method === "DELETE" && subcontractorPaymentIdMatch) {
      const index = state.subcontractorProgressPayments.findIndex(
        (p) => p.id === subcontractorPaymentIdMatch[1],
      );
      if (index === -1) return send(404, { detail: "hakedis yok" });
      state.subcontractorProgressPayments.splice(index, 1);
      return send(204);
    }

    // GET /subcontractor-contracts/{contract_id} — sözleşme detayı (T2-T5'in
    // başlık/kalem okuması). Not: sözleşme OLUŞTURMA/GÜNCELLEME uçları bu
    // dilimin kapsamı DIŞI (yalnız okuma + hakediş oluşturma/liste bağı).
    const subcontractorContractIdMatch = path.match(/^\/subcontractor-contracts\/([^/]+)$/);
    if (method === "GET" && subcontractorContractIdMatch) {
      const contract = state.subcontractorContracts.find((c) => c.id === subcontractorContractIdMatch[1]);
      if (!contract) return send(404, { detail: "sozlesme yok" });
      return send(200, buildSubcontractorContractDetailResponse(contract));
    }

    // /employers — Yeni Proje formu İşveren seçicisi (P1.1a F14, spec §3.1/§3.2).
    if (method === "GET" && path === "/employers") {
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      const activeOnly = parsed.searchParams.get("active_only") !== "false";
      let items = state.employers;
      if (activeOnly) items = items.filter((e) => e.is_active);
      if (q) items = items.filter((e) => e.name.toLocaleLowerCase("tr").includes(q));
      return send(200, { items: [...items].sort((a, b) => a.name.localeCompare(b.name, "tr")) });
    }
    if (method === "POST" && path === "/employers") {
      return withBody((body) => {
        const taxNumber = body.tax_number ? String(body.tax_number) : null;
        if (taxNumber && state.employers.some((e) => e.tax_number === taxNumber)) {
          return send(409, { detail: "Bu VKN ile kayıtlı bir işveren zaten var." });
        }
        const employer: MockEmployer = {
          id: `emp-${state.employers.length + 1}`,
          name: String(body.name ?? ""),
          tax_number: taxNumber,
          contact_person: body.contact_person ? String(body.contact_person) : null,
          is_active: true,
        };
        state.employers.push(employer);
        return send(201, employer);
      });
    }

    if (method === "POST" && path === "/roles") {
      return withBody((body) => {
        const role = {
          id: `role-${state.roles.length + 1}`,
          key: String(body.key ?? ""),
          name: String(body.name ?? ""),
          emoji: String(body.emoji ?? ""),
          description: String(body.description ?? ""),
          is_system: false,
        };
        state.roles.push(role);
        state.permissions[role.id] = Object.fromEntries(state.modules.map((m) => [m.key, { access_level: "none", scope: "all" }]));
        return send(201, role);
      });
    }

    // /roles/{id}/permissions
    const permListMatch = path.match(/^\/roles\/([^/]+)\/permissions$/);
    if (method === "GET" && permListMatch) {
      const roleId = permListMatch[1];
      const map = state.permissions[roleId] ?? {};
      const cells = Object.entries(map).map(([module_key, v]) => ({ module_key, access_level: v.access_level, scope: v.scope }));
      return send(200, cells);
    }

    // /roles/{id}/permissions/{module_key}
    const permCellMatch = path.match(/^\/roles\/([^/]+)\/permissions\/([^/]+)$/);
    if (method === "PUT" && permCellMatch) {
      const [, roleId, moduleKey] = permCellMatch;
      return withBody((body) => {
        state.permissions[roleId] = state.permissions[roleId] ?? {};
        const cell = { access_level: String(body.access_level), scope: String(body.scope) };
        state.permissions[roleId][moduleKey] = cell;
        return send(200, { module_key: moduleKey, access_level: cell.access_level, scope: cell.scope });
      });
    }

    // /roles/{id} PATCH/DELETE
    const roleIdMatch = path.match(/^\/roles\/([^/]+)$/);
    if (roleIdMatch && method === "PATCH") {
      const roleId = roleIdMatch[1];
      return withBody((body) => {
        const role = state.roles.find((r) => r.id === roleId);
        if (!role) return send(404, { detail: "rol yok" });
        role.name = String(body.name ?? role.name);
        role.emoji = String(body.emoji ?? role.emoji);
        role.description = String(body.description ?? role.description);
        return send(200, role);
      });
    }
    if (roleIdMatch && method === "DELETE") {
      const roleId = roleIdMatch[1];
      state.roles = state.roles.filter((r) => r.id !== roleId);
      return send(204);
    }

    // /audit-log (B5) — ikili export ucu JSON degil, xlsx imzasi doner
    if (method === "GET" && path === "/audit-log/export.xlsx") {
      res.writeHead(200, {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="denetim-gunlugu.xlsx"',
      });
      res.end(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      return;
    }
    if (method === "GET" && path === "/audit-log") {
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const action = parsed.searchParams.get("action");
      const actorUserId = parsed.searchParams.get("actor_user_id");
      // `q`: detay metni veya aktor adinda kismi arama; bos/whitespace = filtre yok.
      const search = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      let rows = state.auditLog;
      if (action) rows = rows.filter((row) => row.action === action);
      if (actorUserId) rows = rows.filter((row) => row.actor?.id === actorUserId);
      if (search) {
        rows = rows.filter(
          (row) =>
            row.detail.toLocaleLowerCase("tr").includes(search) ||
            (row.actor?.full_name ?? "").toLocaleLowerCase("tr").includes(search),
        );
      }
      return send(200, { items: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
    }

    // /users list + create
    if (method === "GET" && path === "/users") {
      const limit = Number(parsed.searchParams.get("limit") ?? "20");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const items = state.users.slice(offset, offset + limit);
      return send(200, { items, total: state.users.length, limit, offset });
    }
    if (method === "POST" && path === "/users") {
      return withBody((body) => {
        const user = {
          id: `u-${state.users.length + 1}`,
          email: String(body.email ?? ""),
          full_name: String(body.full_name ?? ""),
          title: String(body.title ?? ""),
          role_id: String(body.role_id ?? ""),
          status: String(body.status ?? "active"),
        };
        state.users.push(user);
        return send(201, user);
      });
    }

    // /users/{id}/password
    const pwMatch = path.match(/^\/users\/([^/]+)\/password$/);
    if (method === "PATCH" && pwMatch) return withBody(() => send(204));

    // /users/{id}/project-access
    const paMatch = path.match(/^\/users\/([^/]+)\/project-access$/);
    if (paMatch && method === "GET") {
      const userId = paMatch[1];
      return send(200, state.projectAccess[userId] ?? { all_projects: false, project_ids: [] });
    }
    if (paMatch && method === "PUT") {
      const userId = paMatch[1];
      return withBody((body) => {
        const access = {
          all_projects: Boolean(body.all_projects),
          project_ids: Array.isArray(body.project_ids) ? (body.project_ids as string[]) : [],
        };
        state.projectAccess[userId] = access;
        return send(200, access);
      });
    }

    // /users/{id} PATCH/DELETE
    const userIdMatch = path.match(/^\/users\/([^/]+)$/);
    if (userIdMatch && method === "PATCH") {
      const userId = userIdMatch[1];
      return withBody((body) => {
        const user = state.users.find((u) => u.id === userId);
        if (!user) return send(404, { detail: "kullanici yok" });
        if (body.full_name !== undefined) user.full_name = String(body.full_name);
        if (body.title !== undefined) user.title = String(body.title);
        if (body.role_id !== undefined) user.role_id = String(body.role_id);
        if (body.status !== undefined) user.status = String(body.status);
        return send(200, user);
      });
    }
    if (userIdMatch && method === "DELETE") {
      const userId = userIdMatch[1];
      state.users = state.users.filter((u) => u.id !== userId);
      return send(204);
    }

    // /company
    if (method === "GET" && path === "/company") return send(200, state.company);
    if (method === "PUT" && path === "/company") {
      return withBody((body) => {
        state.company = { ...state.company, ...body } as MockState["company"];
        return send(200, state.company);
      });
    }

    // /settings/preferences
    if (method === "GET" && path === "/settings/preferences") return send(200, state.preferences);
    if (method === "PUT" && path === "/settings/preferences") {
      return withBody((body) => {
        state.preferences = { ...state.preferences, ...body } as MockState["preferences"];
        return send(200, state.preferences);
      });
    }

    // /settings/notifications
    if (method === "GET" && path === "/settings/notifications") return send(200, state.notifications);
    if (method === "PUT" && path === "/settings/notifications") {
      return withBody((body) => {
        const items = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [];
        for (const item of items) {
          const target = state.notifications.find((n) => n.event_key === item.event_key);
          if (!target) continue;
          if (item.email !== undefined) target.email = Boolean(item.email);
          if (item.in_app !== undefined) target.in_app = Boolean(item.in_app);
          if (item.sms !== undefined) target.sms = Boolean(item.sms);
        }
        return send(200, state.notifications);
      });
    }

    return send(404, { detail: "not found" });
  });

  server.listen(port);
  return {
    server,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
