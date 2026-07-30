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
  status: "active" | "on_hold" | "completed";
  address: string | null;
  city: string | null;
  city_inherited: boolean;
  site_manager_name: string | null;
  start_date: string | null;
  end_date: string | null;
  delivery_date: string | null;
  remaining_days: number | null;
}

interface MockSection {
  id: string;
  site_id: string;
  code: string | null;
  name: string;
  status: "planned" | "active" | "completed";
  manager_name: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
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

interface MockState {
  users: Array<{ id: string; email: string; full_name: string; title: string; role_id: string; status: string }>;
  roles: Array<{ id: string; key: string; name: string; emoji: string; description: string; is_system: boolean }>;
  modules: Array<{ id: string; key: string; name: string; group: string; sort_order: number }>;
  projects: MockProject[];
  sites: MockSite[];
  sections: MockSection[];
  employers: MockEmployer[];
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
  const sections: MockSection[] = [
    {
      id: "sec-1", site_id: "s-1", code: "A-01", name: "Kat 6–10 Kaba İnşaat", status: "active",
      manager_name: "Sercan Öztürk", start_date: "2026-01-01", end_date: "2026-09-30", sort_order: 0,
    },
    {
      id: "sec-2", site_id: "s-1", code: "A-02", name: "Zemin Kat Kaba İnşaat", status: "completed",
      manager_name: "M. Arslan", start_date: "2025-03-01", end_date: "2025-12-01", sort_order: 1,
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

    // /sites/{site_id} — Şantiye Detay hero + sekmeler + bölüm listesi (Task 8/9, spec §5).
    const siteIdMatch = path.match(/^\/sites\/([^/]+)$/);
    if (method === "GET" && siteIdMatch) {
      const siteId = siteIdMatch[1];
      const site = state.sites.find((s) => s.id === siteId);
      if (!site) return send(404, { detail: "santiye yok" });
      const project = state.projects.find((p) => p.id === site.project_id);
      const sectionItems = state.sections
        .filter((sec) => sec.site_id === siteId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((sec) => ({
          id: sec.id, code: sec.code, name: sec.name, status: sec.status, manager_name: sec.manager_name,
          start_date: sec.start_date, end_date: sec.end_date, sort_order: sec.sort_order,
          progress_pct: METRIC_PENDING("boq"),
          boq_item_count: COUNT_PENDING("boq"),
          budget: METRIC_PENDING("boq"),
          worker_count: COUNT_PENDING("timesheet"),
        }));
      return send(200, {
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
