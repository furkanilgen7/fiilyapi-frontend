import { createServer, type Server } from "node:http";

// YALNIZ tip: derleme sonrasi silinir, Playwright calisma zamanina sizmaz.
import type { components } from "@/lib/api/schema";

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
// F-P10 T1: zarf tipleri artik ELLE yazilmaz, `schema.d.ts`ten TURETILIR —
// fikstur ile sema arasindaki kayma typecheck'te patlar (F-P5 dersi).
// ⚠️ Iki tam nitelikli `MetricPlaceholder` yasar: proje kartlari
// `app__modules__projects__…` (P10'da `pending_module` NULLABLE oldu, dolu
// zarf modul adi TASIMAZ), gosterge paneli `app__modules__dashboard__…`
// (degismedi). Karistirma.
type MockMetric = components["schemas"]["app__modules__projects__schemas__MetricPlaceholder"];
type MockCount = components["schemas"]["CountPlaceholder"];
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
  // F-TKV T6 — P11 alanları. `SectionResponse`/`SectionDetailResponse` ikisi de
  // ZORUNLU taşır; eksik bırakılırsa Gantt ekranı elmasları hiç göremezdi.
  depends_on_section_id: string | null;
  milestones: MockMilestone[];
  created_at: string;
  updated_at: string;
}

interface MockMilestone {
  id: string;
  title: string;
  milestone_date: string;
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

// P7 · Hakediş (İşveren) — poz dağılımı kalemi. `GET .../contract/distribution`
// yanıtının kaynağı; hakediş formunun (`ProgressPaymentForm`) pivot tablosu
// satırlarını besler. Kod/açıklama/birim/birim fiyat
// `İşveren Hakediş Oluştur.dc.html` satır 106-172'den BİREBİR (bkz. aşağıdaki
// CONTRACT_ITEMS_P1 yorumu — mockup satır numaraları orada).
interface MockContractItem {
  id: string;
  /**
   * F-POZGRUP · sahibi proje. Fikstürlerin TAMAMI `p-1`e aittir, bu yüzden
   * alan İSTEĞE BAĞLIdır ve boşsa `p-1` sayılır — mevcut fikstür sabiti
   * (`CONTRACT_ITEMS_P1`) dokunulmadan kalır. Boş sözleşme fikstürüne
   * (`p-4`) eklenen kalemler kendi projelerini taşır.
   */
  projectId?: string;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  groupName: string;
  groupSortOrder: number;
  allocations: Array<{ site_id: string; quantity: string }>;
}

/** F-POZGRUP · `POST /projects/{id}/contract/groups` ile yaratılan poz grubu. */
interface MockContractGroup {
  id: string;
  projectId: string;
  name: string;
  sort_order: number;
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
  // F-P10 T1 devri: işveren satırı da SUNUCU damgası taşır (SD-2) — taşeron
  // satırındaki (`MockSubcontractorPaymentLine`) alanla aynı sözleşme.
  quantity_source: "manual" | "diary";
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
  // F-P5 T1: `null` = "birim fiyat girilmedi" (`items_missing_price` sayacı).
  contractUnitPrice: string | null;
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
  // F-P5 T1 — POZ dağılımı KAYDEDİLEBİLİR olduğu için kalemler artık
  // DEĞİŞTİRİLEBİLİR durumdadır (modül sabiti `CONTRACT_ITEMS_P1`den
  // kopyalanır). Birleştirme semantiğinin e2e kanıtı buna dayanır.
  contractItems: MockContractItem[];
  /**
   * F-POZGRUP · İşveren poz GRUPLARI artık GERÇEK bir koleksiyondur.
   *
   * 🔴 Eskiden gruplar YALNIZCA kalemlerin `groupName` alanından türetiliyordu;
   * bu yüzden BOŞ bir grup (ve dolayısıyla "grup yaratıldı ama kalem
   * eklenemedi" hâli) mock'ta hiç temsil edilemiyordu. Koleksiyon BOŞ başlar —
   * `p-1` yanıtı bire bir eskisi gibi kalemlerden türer, kare/test kaymaz.
   */
  contractGroups: MockContractGroup[];
  contractGroupSeq: number;
  // F-P5 T1 — Taşeron FİRMA kayıtları (TL listesi + "+ Taşeron Ekle" modalı).
  subcontractors: MockSubcontractor[];
  subcontractorSeq: number;
  // F-TH T1 — Taşeron sözleşmeleri + hakedişleri (mevcut proje evrenine
  // bağlı, bkz. SUBCONTRACTOR_CONTRACTS yorumu).
  subcontractorContracts: MockSubcontractorContract[];
  subcontractorContractSeq: number;
  subcontractorProgressPayments: MockSubcontractorProgressPayment[];
  // F-SD T1 — Şantiye Günlüğü kayıtları (bkz. buildDiaryEntryFixtures).
  diaryEntries: MockDiaryEntry[];
  // F-PL T1 — Şantiye Planlama (haftalık ızgara). Dört PUT ucu bu dizileri
  // DEĞİŞTİRME semantiğiyle yeniden yazar; `planSeq` yeni kayıt kimliklerini
  // deterministik üretir (`Date.now()` YOK).
  planRows: MockPlanRow[];
  planCells: MockPlanCell[];
  planGoals: MockPlanGoal[];
  planSprints: MockPlanSprint[];
  planSeq: number;
  // F-PT T1 — Puantaj (personel kartlari + ay matrisinin SEYREK hucreleri).
  // `PUT .../timesheet` bu diziyi DEĞİŞTİRME semantiğiyle yeniden yazar;
  // `personnelSeq` yeni personel kimliklerini deterministik üretir.
  personnel: MockPersonnel[];
  timesheetCells: MockTimesheetCell[];
  personnelSeq: number;
  // F-BC T1 — Belge Arşivi. `documentSeq` yeni kimlikleri deterministik üretir
  // (`Date.now()` YOK — baseline'lar sabit kalsın).
  documentFolders: MockDocumentFolder[];
  documents: MockDocument[];
  documentSeq: number;
  // F-ST T1 — Stok & Depo. Bakiye/durum SAKLANMAZ, hareketlerden TÜREVDİR
  // (bkz. `buildStockSummaryRow`). `stockSeq` yeni kimlikleri deterministik
  // üretir (`Date.now()` YOK — baseline'lar sabit kalsın).
  warehouses: MockWarehouse[];
  stockItems: MockStockItem[];
  stockEntries: MockStockEntry[];
  stockSeq: number;
  // F-P8 T1 — Satış (müşteriler · ünite satışları · taksitler) + satışın
  // dayandığı ünite/blok evreni. `saleSeq` yeni kimlikleri deterministik üretir
  // (`Date.now()` YOK — baseline'lar sabit kalsın).
  //
  // 🔒 FİKSTÜR İZOLASYONU (F-ST/F-BC dersi): `p-1`in satışları BASELINE
  // KAYNAĞIDIR (`satis-listesi` kadrajı) ve yazma akışları onlara DOKUNMAZ.
  // Yazma spec'leri `p-2` (Villa B) üzerinde çalışır: `p-2` sıfır satışla
  // başlar, kendi blok/üniteleri vardır ve `p-1`in liste/`totals`/KPI
  // türevlerini hiçbir şekilde etkilemez.
  customers: MockCustomer[];
  unitBlocks: MockUnitBlock[];
  units: MockUnit[];
  unitSales: MockUnitSale[];
  saleInstallments: MockSaleInstallment[];
  saleSeq: number;
  // F-SA T1 — Satınalma (tedarikçi · talep · teklif · sipariş). Tutar/rozet
  // türevleri SAKLANMAZ, gövde kurulurken hesaplanır (`buildQuoteCards`,
  // `buildSupplierCard`, `buildPurchasingSummary`). `purchasingSeq` yeni
  // kimlikleri deterministik üretir (`Date.now()` YOK — baseline'lar sabit).
  //
  // 🔒 İZOLASYON: bu dört dizi başka HİÇBİR yüzey tarafından okunmaz; stok/
  // satış/proje fikstürlerine yalnız SALT-OKUR atıf yapılır.
  suppliers: MockSupplier[];
  purchaseRequests: MockPurchaseRequest[];
  purchaseQuotes: MockPurchaseQuote[];
  purchaseOrders: MockPurchaseOrder[];
  purchasingSeq: number;
  // F-MK T5b — Makine & Ekipman (MK-1). Özet/sapma/rozet SAKLANMAZ, SABİT
  // fikstürlerden döner (sunucu damgası kanonu: istemci eşik hesaplamaz).
  // `equipmentSeq` yeni kimlikleri deterministik üretir (`Date.now()` YOK).
  equipment: MockEquipment[];
  workLogs: MockWorkLog[];
  fuelLogs: MockFuelLog[];
  equipmentSeq: number;
  // F-BLG T3 — ekipman belgeleri (MK-2). Yükleme akışı `eq-2`ye sürgündür;
  // `eq-1`in sayacı GÖRSEL kadrajın kaynağıdır ve DEĞİŞMEZ.
  equipmentDocuments: components["schemas"]["EquipmentDocumentResponse"][];
  equipmentDocumentSeq: number;
  // F-BLG T3 — personel belge takip kayıtları (İK-1). Anahtar `personnel_id`.
  // 🔒 `per-1`/`per-3` GÖRSEL kadrajların kaynağıdır; yazma akışı `per-2`ye
  // sürgündür (o personel BOŞ listeyle başlar).
  personnelDocuments: Record<string, components["schemas"]["PersonnelDocumentResponse"][]>;
  personnelDocumentSeq: number;
  // F-BLG T3 — işveren sözleşmesine elle eklenen poz sayacı.
  contractItemSeq: number;
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

// F-P10: DOLU zarf. Sunucu sozlesmesi geregi dolu zarf `pending_module`
// TASIMAZ (`app__modules__projects__schemas__MetricPlaceholder` aciklamasi) —
// fikstur bunu birebir taklit eder, aksi halde ekran "hem deger hem bekliyor"
// gibi imkansiz bir durumu test ederdi.
const METRIC_VALUE = (value: string): MockMetric => ({ available: true, value, pending_module: null });

// P10 sonrasi maliyet/kar zarflari ARTIK DOLABILIR. Fikstur evreni her iki
// dali da tasir: deger veren proje (`spent`/`total_cost`/… gercek) ve hic
// maliyeti olmayan proje (yer tutucu gorunumu KORUNUR) — ekran ikisini de
// dogru basmak zorunda.
const CONTRACTING_PLACEHOLDERS = (spent?: string): MockContracting => ({
  spent: spent === undefined ? METRIC_PENDING("project_costs") : METRIC_VALUE(spent),
  physical_progress: METRIC_PENDING("progress_payments"),
  final_progress_payment: METRIC_PENDING("progress_payments"),
  worker_count: COUNT_PENDING("timesheet"),
  subcontractor_count: COUNT_PENDING("subcontracts"),
});

// `costs` verilmezse KY karti eski (tumuyle yer tutucu) gorunumunu korur.
// `total_cost` = HARCANAN (P10 karari), `estimated_profit`/`margin` butce
// tabanli — iki taban BILEREK ayridir.
interface MockInvestmentCosts {
  total_cost: string;
  estimated_profit: string;
  margin: string;
}

const INVESTMENT_PLACEHOLDERS = (
  salesTarget: string,
  landCost: string,
  costs?: MockInvestmentCosts,
): MockInvestment => ({
  sales_target: salesTarget,
  land_cost: landCost,
  sold_amount: METRIC_PENDING("units"),
  sales_ratio: METRIC_PENDING("units"),
  unit_summary: COUNT_PENDING("units"),
  total_cost: costs ? METRIC_VALUE(costs.total_cost) : METRIC_PENDING("project_costs"),
  estimated_profit: costs ? METRIC_VALUE(costs.estimated_profit) : METRIC_PENDING("progress_payments"),
  margin: costs ? METRIC_VALUE(costs.margin) : METRIC_PENDING("progress_payments"),
});

interface MockLandShareCosts {
  our_share_value: string;
  construction_cost: string;
  estimated_profit: string;
  margin: string;
}

const LAND_SHARE_PLACEHOLDERS = (
  landownerName: string,
  ourSharePct: string,
  ownerSharePct: string,
  costs?: MockLandShareCosts,
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
  our_share_value: costs ? METRIC_VALUE(costs.our_share_value) : METRIC_PENDING("units"),
  construction_cost: costs ? METRIC_VALUE(costs.construction_cost) : METRIC_PENDING("project_costs"),
  estimated_profit: costs ? METRIC_VALUE(costs.estimated_profit) : METRIC_PENDING("progress_payments"),
  margin: costs ? METRIC_VALUE(costs.margin) : METRIC_PENDING("progress_payments"),
  construction_progress: METRIC_PENDING("progress_payments"),
});

// Dört tip/durumu da kapsar; "Kule A"/"Villa B" adları korunur — mevcut
// dashboard/settings e2e'leri onlara bakıyor (plan Task 7).
/**
 * F-TKV T6 — `/projects/timeline` sunucu damgası. Sabit: istemcinin saatinden
 * BAĞIMSIZDIR ve `page.clock.setFixedTime` bunu değiştirmez (damga gövdeden
 * gelir), bu yüzden bugün çizgisi her turda AYNI yerde durur.
 */
const MOCK_TIMELINE_TODAY = "2026-07-17";

const PROJECT_FIXTURES: MockProject[] = [
  {
    id: "p-1", code: "PRJ-1", name: "Kule A", project_type: "taahhut", status: "active",
    category: "Konut", city: "Ankara", employer_name: "Güneşkent A.Ş.", contract_no: "SZL-2025-01",
    contract_amount: "11200000", start_date: "2025-03-01", end_date: "2026-12-01",
    budget: "1000000", progress_pct: "20", contracting: CONTRACTING_PLACEHOLDERS("6480000"),
    investment: null, land_share: null,
  },
  {
    id: "p-2", code: "PRJ-2", name: "Villa B", project_type: "kendi_yatirim", status: "active",
    category: "Konut Geliştirme", city: "Ankara", employer_name: null, contract_no: null,
    contract_amount: null, start_date: "2025-01-01", end_date: "2026-06-01",
    budget: "500000", progress_pct: "40", contracting: null,
    investment: INVESTMENT_PLACEHOLDERS("48200000", "5000000", {
      total_cost: "31400000",
      estimated_profit: "16800000",
      margin: "34.85",
    }),
    land_share: null,
  },
  {
    id: "p-3", code: "PRJ-3", name: "Bahçelievler Konut", project_type: "kat_karsiligi",
    status: "active", category: "Konut", city: "Ankara", employer_name: null, contract_no: null,
    contract_amount: null, start_date: "2025-06-01", end_date: "2027-03-01",
    budget: "700000", progress_pct: "42", contracting: null, investment: null,
    land_share: LAND_SHARE_PLACEHOLDERS("Yılmaz Ailesi", "55", "45", {
      our_share_value: "26400000",
      construction_cost: "18900000",
      estimated_profit: "7500000",
      margin: "28.41",
    }),
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
  // F-P5 T3: E14'ün salt-okunur "Sözleşme Koşulları" bloğu (§7 S3) bu alanı
  // gösterir; şemada zorunlu (nullable) olduğu hâlde fikstürde eksikti.
  index_type: "tufe" as "ufe" | "tufe" | "construction_cost" | "fixed_coefficient" | null,
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

/**
 * F-POZGRUP · BOŞ (GRUPSUZ) SÖZLEŞME FİKSTÜRÜ.
 *
 * "Yeni bir sözleşmeye ilk poz eklenemiyor" kusuru YALNIZCA hiç grubu olmayan
 * bir sözleşmede görülebilir; `p-1` dört kalemle ve iki grupla doludur. Bu
 * yüzden ikinci bir proje (`p-4` · Güneşkent B-Blok, taahhüt) boş bir işveren
 * sözleşmesi taşır. `p-1`in davranışı HİÇ değişmez.
 *
 * Şekil `EMPLOYER_CONTRACT_P1`den KOPYALANIR (alan kayması olmasın); yalnız
 * kimlik ve toplamlar boş sözleşmeye çekilir.
 */
const EMPTY_CONTRACT_PROJECT_ID = "p-4";

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
    // Mock'ta günlük kaydından doldurma yolu YOK → sunucu damgası hep `manual`;
    // var olan satır kendi damgasını korur (sunucu davranışı).
    quantity_source: existing?.quantity_source ?? "manual",
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
          quantity_source: "manual",
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
      { id: "ppl-pp-5-1", contract_item_id: null, site_id: "s-1", code: "02.100", description: "Betonarme İşleri (kümülatif)", unit: "kalem", contract_unit_price: "5920000.00", coefficient: "1.000", quantity: "1.000", group_name: "Betonarme İşleri", sort_order: 0, quantity_source: "manual", adjusted_unit_price: "5920000.00", line_total: "640000.00", previous_quantity: "0.000", previous_amount: "3800000.00", cumulative_quantity: "1.000", cumulative_amount: "4440000.00", is_price_stale: null },
      { id: "ppl-pp-5-2", contract_item_id: null, site_id: "s-1", code: "02.200", description: "Elektrik Tesisatı (kümülatif)", unit: "kalem", contract_unit_price: "1240000.00", coefficient: "1.000", quantity: "1.000", group_name: "Elektrik Tesisatı", sort_order: 1, quantity_source: "manual", adjusted_unit_price: "1240000.00", line_total: "380000.00", previous_quantity: "0.000", previous_amount: "620000.00", cumulative_quantity: "1.000", cumulative_amount: "1000000.00", is_price_stale: null },
      { id: "ppl-pp-5-3", contract_item_id: null, site_id: "s-1", code: "02.300", description: "Mekanik Tesisat (kümülatif)", unit: "kalem", contract_unit_price: "980000.00", coefficient: "1.000", quantity: "1.000", group_name: "Mekanik Tesisat", sort_order: 2, quantity_source: "manual", adjusted_unit_price: "980000.00", line_total: "280000.00", previous_quantity: "0.000", previous_amount: "480000.00", cumulative_quantity: "1.000", cumulative_amount: "760000.00", is_price_stale: null },
      { id: "ppl-pp-5-4", contract_item_id: null, site_id: "s-1", code: "02.400", description: "Duvar & Kaplama (kümülatif)", unit: "kalem", contract_unit_price: "2678000.00", coefficient: "1.000", quantity: "1.000", group_name: "Duvar & Kaplama", sort_order: 3, quantity_source: "manual", adjusted_unit_price: "2678000.00", line_total: "810000.00", previous_quantity: "0.000", previous_amount: "1390000.00", cumulative_quantity: "1.000", cumulative_amount: "2200000.00", is_price_stale: null },
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

// `GET .../contract/distribution` yanıtı — `state.contractItems`ten türetilir
// (F-P5 T1: PUT ucu bu diziyi BİRLEŞTİRME semantiğiyle değiştirir).
function buildContractDistributionResponse(state: MockState, projectId: string) {
  // F-POZGRUP · kalemler artık proje taşır; boş sözleşme fikstürüne (`p-4`)
  // eklenenler `p-1`in dağılım ızgarasına SIZMAZ.
  const contractItems = state.contractItems.filter(
    (i) => (i.projectId ?? "p-1") === projectId,
  );
  const sites = state.sites
    .filter((s) => s.project_id === projectId)
    .map((s) => ({ id: s.id, name: s.name }));
  const groupNames = Array.from(new Set(contractItems.map((i) => i.groupName)));
  const groups = groupNames.map((name, index) => ({
    id: `cg-${index + 1}`,
    name,
    sort_order: contractItems.find((i) => i.groupName === name)?.groupSortOrder ?? 0,
    items: contractItems.filter((i) => i.groupName === name).map((item) => ({
      id: item.id, code: item.code, description: item.description, unit: item.unit,
      quantity: item.quantity, unit_price: item.unit_price,
      allocations: item.allocations.map((a) => ({ site_id: a.site_id, quantity: a.quantity, boq_item_id: item.id })),
      remaining_quantity: money2(
        Number(item.quantity) - item.allocations.reduce((sum, a) => sum + Number(a.quantity), 0),
      ),
    })),
  }));
  const siteSummaries = sites.map((site) => {
    const items = contractItems.map((item) => {
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
  // F-P5 T4: dağıtılmamış kalemler SABİT DEĞİL, allocation'lardan türetilir —
  // aksi hâlde POZ ekranının uyarı bandı (mockup 63-66) e2e'de hiç görünmez ve
  // kaydetmenin bağ koparma yolu kanıtlanamaz.
  const undistributed = contractItems.filter((i) => i.allocations.length === 0);
  return {
    sites,
    groups,
    undistributed_item_count: undistributed.length,
    undistributed_item_names: undistributed.map((i) => i.description),
    site_summaries: siteSummaries,
    distributed_item_count: contractItems.filter((i) => i.allocations.length > 0).length,
    total_item_count: contractItems.length,
  };
}

/**
 * F-P5 T1 · `PUT /projects/{id}/contract/distribution` — **BİRLEŞTİRME**
 * semantiğinin mock uygulaması. Gerçek backend'le AYNI üç kural:
 *   - gövdede GEÇMEYEN hücreye DOKUNULMAZ (korunur),
 *   - `quantity: null` gelen hücrenin bağı KOPARILIR (kayıt silinir),
 *   - `0` gelirse 422 (frontend'in "boş = null" kuralı burada da zorlanır).
 * Aksi hâlde e2e yeşil olur ama canlıda kaydetme 422 alırdı.
 */
function applyDistributionSave(
  state: MockState,
  allocations: Array<Record<string, unknown>>,
): { error: string | null } {
  for (const allocation of allocations) {
    const itemId = String(allocation.contract_item_id ?? "");
    const siteId = String(allocation.site_id ?? "");
    const rawQuantity = allocation.quantity;
    const item = state.contractItems.find((i) => i.id === itemId);
    if (!item) return { error: "Sözleşme kalemi bulunamadı." };
    if (!state.sites.some((s) => s.id === siteId)) return { error: "Şantiye bulunamadı." };

    if (rawQuantity === null || rawQuantity === undefined) {
      item.allocations = item.allocations.filter((a) => a.site_id !== siteId);
      continue;
    }
    const quantity = Number(rawQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: "Miktar 0 veya negatif olamaz; boşaltmak için null gönderin." };
    }
    const existing = item.allocations.find((a) => a.site_id === siteId);
    if (existing) existing.quantity = qty3(quantity);
    else item.allocations = [...item.allocations, { site_id: siteId, quantity: qty3(quantity) }];
  }
  return { error: null };
}

/** `GET /contracts` — SZL sekmeli listesi (özet + satırlar). */
function buildContractsListResponse(state: MockState, query: URLSearchParams) {
  const type = query.get("type") ?? "employer";
  const projectId = query.get("project_id");
  const status = query.get("status");
  const q = (query.get("q") ?? "").trim().toLocaleLowerCase("tr");

  type Row = {
    id: string;
    title: string;
    contract_no: string | null;
    counterparty_name: string | null;
    amount: string;
    start_date: string | null;
    end_date: string | null;
    progress_pct: string | null;
    status: "active" | "completed" | "on_hold";
    is_draft: boolean;
  };

  let rows: Row[];
  if (type === "employer") {
    // Tek işveren sözleşmesi vardır (p-1) — proje başına en fazla bir tane.
    const project = state.projects.find((p) => p.id === "p-1");
    rows = project
      ? [
          {
            id: EMPLOYER_CONTRACT_P1.project_id,
            title: project.name,
            contract_no: EMPLOYER_CONTRACT_P1.contract_no,
            counterparty_name: EMPLOYER_CONTRACT_P1.employer_name,
            amount: EMPLOYER_CONTRACT_P1.amount,
            start_date: EMPLOYER_CONTRACT_P1.start_date,
            end_date: EMPLOYER_CONTRACT_P1.end_date,
            progress_pct: "75.00",
            status: EMPLOYER_CONTRACT_P1.status,
            is_draft: false,
          },
        ]
      : [];
  } else {
    rows = state.subcontractorContracts.map((contract) => {
      const detail = buildSubcontractorContractDetailResponse(contract);
      return {
        id: contract.id,
        title: contract.work_category ?? "Taşeron Sözleşmesi",
        contract_no: contract.contract_no,
        counterparty_name: contract.subcontractor_name,
        amount: detail.contract_total,
        start_date: contract.start_date,
        end_date: contract.end_date,
        // Taşeron satırlarında backend `None` döner (spec §2) — "—" basılır.
        progress_pct: null,
        status: contract.status,
        is_draft: contract.is_draft,
      };
    });
  }

  if (projectId) {
    rows = rows.filter((row) =>
      type === "employer"
        ? row.id === projectId
        : state.subcontractorContracts.find((c) => c.id === row.id)?.project_id === projectId,
    );
  }
  if (status) rows = rows.filter((row) => row.status === status);
  if (q) {
    rows = rows.filter(
      (row) =>
        row.title.toLocaleLowerCase("tr").includes(q) ||
        (row.contract_no ?? "").toLocaleLowerCase("tr").includes(q) ||
        (row.counterparty_name ?? "").toLocaleLowerCase("tr").includes(q),
    );
  }

  return {
    summary: {
      total_amount: money2(rows.reduce((sum, row) => sum + Number(row.amount), 0)),
      active_count: rows.filter((row) => row.status === "active").length,
      progress_payment_total: type === "employer" ? "8400000.00" : null,
      expiring_this_month_count: 0,
    },
    items: rows,
  };
}

/**
 * `GET /projects/{id}/contract/items` — E14 "İş Kalemleri" sekmesi.
 *
 * F-BLG T3: dönüş tipi ARTIK `schema.d.ts`ten TÜRETİLİR (F-SA dersi) — mock
 * ile şema arasındaki kayma `pnpm typecheck`te patlasın. Aynı kurucu POST
 * yanıtını da besler (yeni kalem listeden okunur, elle kurulmaz).
 */
function buildEmployerContractItemsResponse(
  state: MockState,
  projectId = "p-1",
): components["schemas"]["EmployerContractItemsResponse"] {
  const items = state.contractItems.filter((i) => (i.projectId ?? "p-1") === projectId);
  // F-POZGRUP · İKİ kaynak birleşir: (1) kalemlerden TÜRETİLEN gruplar —
  // fikstür davranışı, id'leri ve sırası DEĞİŞMEDEN korunur; (2) uçtan
  // YARATILAN gruplar, sona eklenir (boş olabilirler). Koleksiyon boşken
  // sonuç eski kurucuyla bire bir aynıdır.
  const created = state.contractGroups.filter((g) => g.projectId === projectId);
  const createdNames = new Set(created.map((g) => g.name));
  const derived = Array.from(new Set(items.map((i) => i.groupName)))
    .filter((name) => !createdNames.has(name))
    .map((name, index) => ({
      id: `cg-${index + 1}`,
      name,
      sort_order: items.find((i) => i.groupName === name)?.groupSortOrder ?? 0,
    }));
  const groups = [
    ...derived,
    ...created.map((g) => ({ id: g.id, name: g.name, sort_order: g.sort_order })),
  ];
  return {
    groups: groups.map(({ id, name, sort_order }) => ({
      id,
      name,
      sort_order,
      items: items
        .filter((i) => i.groupName === name)
        .map((item, itemIndex) => {
          const distributed = item.allocations.reduce((sum, a) => sum + Number(a.quantity), 0);
          return {
            id: item.id,
            group_id: id,
            code: item.code,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            sort_order: itemIndex,
            distributed_quantity: qty3(distributed),
            remaining_quantity: qty3(Number(item.quantity) - distributed),
          };
        }),
    })),
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
  // TB2 takip · U1 kanıt kaydı: HİÇ hakedişi olmayan sözleşme. Eski sınır
  // (hakedişten türetme) bu sözleşmeyi seçim adımında HİÇ göstermezdi — U1'e
  // geçişin kanıtı budur (bkz. `subcontractor-progress-payments.spec.ts`
  // "hiç hakedişi olmayan sözleşme de listelenir").
  //
  // ⚠️ Coordinator review (Important) — `subcontractor_id` BİLİNÇLİ olarak
  // sc-1 ile AYNI (`sub-1`) tutuldu: `buildSubcontractorPaymentSummary`teki
  // `active_subcontractor_count` (satır ~1497) `state.subcontractorContracts`
  // üzerinden projeye/hakedişe göre SÜZÜLMEDEN, TÜM aktif sözleşmelerin
  // distinct `subcontractor_id`sini sayar. Yeni bir subcontractor_id
  // eklemek bu sayıyı 2→3 yapar ve `subcontractor-progress-payments-
  // visual.spec.ts`teki "Aktif Taşeron" KPI'ını (dolayısıyla
  // `taseron-hakedisleri-listesi.png` baseline'ını) SESSİZCE bozardı. U1
  // kanıtı `subcontractor_id`nin tekil olmasına bağlı DEĞİL — yalnız
  // `subcontractor_name`in seçim kutusunda göründüğü test ediliyor, o farklı
  // (`Yılmaz Boya A.Ş.`) kalabilir. `active_subcontractor_count`ın 2'de
  // kaldığı `subcontractor-progress-payments.spec.ts`teki "Aktif Taşeron"
  // KPI testiyle kilitlenmiştir.
  {
    id: "sc-3", project_id: "p-1", site_id: null, subcontractor_id: "sub-1",
    subcontractor_name: "Yılmaz Boya A.Ş.", work_category: "Boya",
    contract_no: "TSD-2026-03", signature_date: "2026-03-01", is_notarized: false,
    start_date: "2026-04-01", end_date: "2026-10-01", late_penalty_daily: null,
    advance_pct: "10.00", retainage_pct: "5.00", vat_pct: "20.00",
    payment_period: "monthly", payment_term_days: 15,
    materials_by_contractor: false, subcontractor_files_own_sgk: true, vat_withholding: false,
    status: "active", is_draft: false, items: [],
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
  const unitPrice = item ? Number(item.contractUnitPrice ?? 0) : 0;
  const adjustedUnitPrice = unitPrice * coefficient;
  const lineTotal = adjustedUnitPrice * quantity;
  return {
    id: existing?.id ?? `scppl-${contractId}-${itemId}`,
    contract_item_id: itemId,
    code: item?.code ?? "",
    description: item?.description ?? "",
    unit: item?.unit ?? "",
    contract_unit_price: item ? (item.contractUnitPrice ?? "0.00") : "0.00",
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
    // TB3 ile hem LİSTE hem DETAY şemasına eklendi. F-P5 T1'de
    // `useSiteSubcontractorPayments`in U1 join'i söküldü ve değer artık
    // DOĞRUDAN buradan okunuyor — mock bu alanı basmazsa şantiye hakediş
    // sekmesinde iş kategorisi SESSİZCE kaybolur (baseline turunda fiilen
    // yakalandı: "Elektrik · Tüm Bölümler" → "· Tüm Bölümler").
    // ⚠️ Elle yazılmış mock TİPSİZ olduğu için `pnpm typecheck` bunu GÖRMEZ;
    // şemaya alan eklendiğinde bu iki üreticiyi elle güncellemek ŞARTTIR.
    work_category: contract?.work_category ?? null,
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
    // TB3 ile hem LİSTE hem DETAY şemasına eklendi. F-P5 T1'de
    // `useSiteSubcontractorPayments`in U1 join'i söküldü ve değer artık
    // DOĞRUDAN buradan okunuyor — mock bu alanı basmazsa şantiye hakediş
    // sekmesinde iş kategorisi SESSİZCE kaybolur (baseline turunda fiilen
    // yakalandı: "Elektrik · Tüm Bölümler" → "· Tüm Bölümler").
    // ⚠️ Elle yazılmış mock TİPSİZ olduğu için `pnpm typecheck` bunu GÖRMEZ;
    // şemaya alan eklendiğinde bu iki üreticiyi elle güncellemek ŞARTTIR.
    work_category: contract?.work_category ?? null,
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

// TB2 U1 (`GET /subcontractor-contracts`) satırı — hakediş açma seçim adımı
// + `useSiteSubcontractorPayments`in workCategory join'i. Bilinçli olarak
// DAR: bedel/hakediş türevleri TAŞIMAZ (bkz. `SubcontractorContractListItem`
// docstring'i, openapi.json).
function buildSubcontractorContractListItem(state: MockState, contract: MockSubcontractorContract) {
  const project = state.projects.find((p) => p.id === contract.project_id);
  const site = contract.site_id ? state.sites.find((s) => s.id === contract.site_id) : undefined;
  return {
    id: contract.id,
    contract_no: contract.contract_no,
    subcontractor_name: contract.subcontractor_name,
    work_category: contract.work_category,
    project_id: contract.project_id,
    project_name: project?.name ?? "",
    site_id: contract.site_id,
    site_name: site?.name ?? null,
    status: contract.status,
    is_draft: contract.is_draft,
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
    line_total: money2(Number(item.contractQuantity) * Number(item.contractUnitPrice ?? 0)),
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
    // F-P5 T1: FSO'nun "birim fiyatı girilmemiş kalem" uyarısının kaynağı.
    items_missing_price: contract.items.filter((i) => i.contractUnitPrice === null).length,
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
      // F-TKV T6 — Gantt elmasları + bağımlılık zinciri (sec-2 → sec-1).
      depends_on_section_id: "sec-2",
      milestones: [
        { id: "ms-1", title: "Kat 8 döşeme tamamlandı", milestone_date: "2026-05-15", sort_order: 0 },
        { id: "ms-2", title: "Kaba inşaat teslim", milestone_date: "2026-09-30", sort_order: 1 },
      ],
      created_at: "2026-01-01T08:00:00Z", updated_at: "2026-01-01T08:00:00Z",
    },
    {
      id: "sec-2", site_id: "s-1", code: "A-02", name: "Zemin Kat Kaba İnşaat", status: "completed",
      manager_user_id: null, manager_name: "M. Arslan", start_date: "2025-03-01", end_date: "2025-12-01",
      sort_order: 1, section_type: "structural", description: null, deputy_manager_user_id: null,
      deputy_manager_name: null, planned_worker_count: 12, budget_amount: "480000.00", is_draft: false,
      depends_on_section_id: null,
      milestones: [
        { id: "ms-3", title: "Zemin kat teslim", milestone_date: "2025-12-01", sort_order: 0 },
      ],
      created_at: "2025-03-01T08:00:00Z", updated_at: "2025-12-01T08:00:00Z",
    },
    // Taslak + `on_hold` — §4 zorunluluk kuralinin YALNIZ `is_draft: false`
    // iken uyguladigini kanitlayan kayit (bolum tipi/sorumlu/tarih/bedel bos).
    {
      id: "sec-3", site_id: "s-1", code: null, name: "Peyzaj Düzenlemesi (Taslak)", status: "on_hold",
      manager_user_id: null, manager_name: null, start_date: null, end_date: null, sort_order: 2,
      section_type: null, description: null, deputy_manager_user_id: null, deputy_manager_name: null,
      planned_worker_count: null, budget_amount: null, is_draft: true,
      // Tarihsiz + milestone'suz: Gantt'ta BAR ÇİZİLMEZ ama satır KALIR (K8).
      depends_on_section_id: null, milestones: [],
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
    // F-P5 T1 — DERİN kopya: dağılım PUT'u `allocations`ı yerinde değiştirir,
    // modül sabiti kirlenmemelidir.
    contractItems: CONTRACT_ITEMS_P1.map((item) => ({
      ...item,
      allocations: item.allocations.map((a) => ({ ...a })),
    })),
    // F-POZGRUP · BOŞ başlar: `p-1` grupları eskisi gibi kalemlerden türer.
    contractGroups: [],
    contractGroupSeq: 0,
    subcontractors: SUBCONTRACTOR_FIXTURES.map((s) => ({ ...s })),
    subcontractorSeq: 0,
    subcontractorContracts: SUBCONTRACTOR_CONTRACTS.map((c) => ({
      ...c,
      items: c.items.map((i) => ({ ...i })),
    })),
    subcontractorContractSeq: 0,
    subcontractorProgressPayments: buildSubcontractorProgressPaymentFixtures(),
    diaryEntries: buildDiaryEntryFixtures(),
    planRows: PLAN_ROW_FIXTURES.map((r) => ({ ...r })),
    planCells: PLAN_CELL_FIXTURES.map((c) => ({ ...c })),
    planGoals: PLAN_GOAL_FIXTURES.map((g) => ({ ...g })),
    planSprints: PLAN_SPRINT_FIXTURES.map((s) => ({ ...s })),
    planSeq: 0,
    personnel: PERSONNEL_FIXTURES.map((p) => ({ ...p })),
    timesheetCells: TIMESHEET_CELL_FIXTURES.map((c) => ({ ...c })),
    personnelSeq: 0,
    documentFolders: PROJECT_FOLDER_FIXTURES.map((f) => ({ ...f })),
    documents: DOCUMENT_FIXTURES.map((d) => ({ ...d })),
    documentSeq: 0,
    warehouses: WAREHOUSE_FIXTURES.map((w) => ({ ...w })),
    stockItems: STOCK_ITEM_FIXTURES.map((i) => ({ ...i })),
    stockEntries: STOCK_ENTRY_FIXTURES.map((e) => ({
      ...e,
      lines: e.lines.map((l) => ({ ...l })),
    })),
    stockSeq: 0,
    customers: CUSTOMER_FIXTURES.map((c) => ({ ...c })),
    unitBlocks: UNIT_BLOCK_FIXTURES.map((b) => ({ ...b })),
    units: UNIT_FIXTURES.map((u) => ({ ...u })),
    unitSales: UNIT_SALE_FIXTURES.map((s) => ({ ...s })),
    saleInstallments: SALE_INSTALLMENT_FIXTURES.map((i) => ({ ...i })),
    saleSeq: 0,
    suppliers: SUPPLIER_FIXTURES.map((s) => ({ ...s })),
    purchaseRequests: PURCHASE_REQUEST_FIXTURES.map((r) => ({
      ...r,
      lines: r.lines.map((l) => ({ ...l })),
    })),
    purchaseQuotes: PURCHASE_QUOTE_FIXTURES.map((q) => ({ ...q })),
    purchaseOrders: PURCHASE_ORDER_FIXTURES.map((o) => ({ ...o })),
    purchasingSeq: 0,
    equipment: EQUIPMENT_FIXTURES.map((item) => ({ ...item })),
    workLogs: WORK_LOG_FIXTURES.map((log) => ({ ...log })),
    fuelLogs: FUEL_LOG_FIXTURES.map((log) => ({ ...log })),
    equipmentSeq: 0,
    equipmentDocuments: EQUIPMENT_DOCUMENT_FIXTURES.map((doc) => ({ ...doc })),
    equipmentDocumentSeq: 0,
    // DERİN kopya: POST diziyi büyütür, modül sabiti kirlenmemelidir.
    personnelDocuments: Object.fromEntries(
      Object.entries(PERSONNEL_DOCUMENT_FIXTURES).map(([id, docs]) => [
        id,
        docs.map((doc) => ({ ...doc })),
      ]),
    ),
    personnelDocumentSeq: 0,
    contractItemSeq: 0,
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
/**
 * `SectionResponse[]` (dar gövde) — HEM `GET /sites/{id}` hero'sunun gömülü
 * listesi HEM `GET /sites/{id}/sections` liste ucu aynı şekli döndürür, bu
 * yüzden tek yerde kurulur.
 */
function buildSectionListItems(state: MockState, siteId: string) {
  return state.sections
    .filter((sec) => sec.site_id === siteId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((sec) => ({
      id: sec.id, code: sec.code, name: sec.name, status: sec.status, manager_name: sec.manager_name,
      start_date: sec.start_date, end_date: sec.end_date, sort_order: sec.sort_order,
      progress_pct: METRIC_PENDING("boq"),
      boq_item_count: COUNT_PENDING("boq"),
      budget: METRIC_PENDING("boq"),
      worker_count: COUNT_PENDING("timesheet"),
      depends_on_section_id: sec.depends_on_section_id,
      milestones: sec.milestones,
    }));
}

function buildSiteDetail(state: MockState, site: MockSite) {
  const project = state.projects.find((p) => p.id === site.project_id);
  const sectionItems = buildSectionListItems(state, site.id);
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
    depends_on_section_id: section.depends_on_section_id,
    milestones: section.milestones,
    created_at: section.created_at,
    updated_at: section.updated_at,
  };
}

/**
 * F-TKV T6 — `SectionUpdate.milestones` İKİ GÖVDE SEMANTİĞİ (backend
 * `_merge_milestones` emsali): anahtar YOK / `null` = DOKUNMA, `[]` = HEPSİNİ
 * SİL, dolu dizi = birleştir. `id` verilen satır YERİNDE güncellenir,
 * verilmeyen YENİdir. `sort_order` GÖVDEDEN GELMEZ — dizi sırasından atanır.
 * Bilinmeyen/başka bölüme ait `id` sessizce yeni satıra DÖNMEZ, 422 verir.
 */
function mergeMilestones(
  current: MockMilestone[],
  raw: unknown,
  seq: () => string,
): MockMilestone[] | { error: string } {
  if (raw === undefined || raw === null) return current;
  if (!Array.isArray(raw)) return { error: "milestones bir liste olmalıdır" };
  const known = new Set(current.map((m) => m.id));
  const next: MockMilestone[] = [];
  for (const [index, entry] of raw.entries()) {
    const row = entry as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const date = typeof row.milestone_date === "string" ? row.milestone_date : "";
    if (!title || !date) return { error: "Milestone icin ad ve tarih zorunludur" };
    const id = typeof row.id === "string" && row.id ? row.id : null;
    if (id !== null && !known.has(id)) {
      return { error: "Bilinmeyen milestone id" };
    }
    next.push({ id: id ?? seq(), title, milestone_date: date, sort_order: index });
  }
  return next;
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

// --- F-SD T1 · Şantiye Günlüğü fikstürleri --------------------------------
// Satır iskeleti BOQ pozlarından üretilir (gerçek backend de öyle yapar:
// `POST /sites/{id}/diary` gövdesinde `lines[]` YOKTUR). Kayıtlar mevcut
// evrene bağlanır: proje p-1, şantiyeler s-1 / s-2.

/**
 * Mock'un günlük→sözleşme köprüsü. Gerçekte köprü BOQ kaleminin sözleşme
 * kalemine bağlanmasıyla kurulur (backend işi); burada açık bir eşleme
 * tablosu tutulur ki "Günlükten Doldur" akışı e2e'de gerçek veriyle
 * çalışsın. Eşlemesi OLMAYAN poz önerilere GİRMEZ ve
 * `skipped_unbridged_count`a sayılır — üst kural: sessizce yutma yok.
 */
const DIARY_BOQ_BRIDGE: Record<string, { employerItemId?: string; subcontractorItemId?: string }> = {
  "bi-3": { employerItemId: "ci-1" }, // C25/30 Beton → Kat Döşemesi C25/30
  "bi-4": { employerItemId: "ci-3" }, // Demir Donatı → Nervürlü Demir
  "bi-5": { subcontractorItemId: "sci-4" }, // Tuğla Duvar → Duvar Örgü İşleri (sc-2)
  "bi-6": { subcontractorItemId: "sci-5" }, // İç Sıva → Sıva İşleri (sc-2)
};

interface MockDiaryLine {
  id: string;
  boq_item_id: string;
  code: string;
  description: string;
  unit: string;
  unit_price: string;
  quantity: string;
}
interface MockDiaryWorkerCount {
  id: string;
  trade: string;
  source: "company" | "subcontractor" | "general";
  count: number;
}
interface MockDiaryEntry {
  id: string;
  site_id: string;
  project_id: string;
  entry_date: string;
  section_id: string | null;
  weather: string | null;
  temperature_c: string | null;
  work_done: string | null;
  chief_note: string | null;
  safety_meeting_held: boolean;
  ppe_checked: boolean;
  has_incident: boolean;
  incident_note: string | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  lines: MockDiaryLine[];
  worker_counts: MockDiaryWorkerCount[];
}

const ALL_BOQ_ITEMS = BOQ_FIXTURE.flatMap((g) => g.items);

/** Yeni kaydın satır iskeleti: TÜM BOQ pozları, miktar sıfır. */
function buildDiaryLineSkeleton(entryId: string, quantities: Record<string, number> = {}): MockDiaryLine[] {
  return ALL_BOQ_ITEMS.map((item) => ({
    id: `${entryId}-l-${item.id}`,
    boq_item_id: item.id,
    code: item.code,
    description: item.description,
    unit: item.unit,
    unit_price: item.unit_price,
    quantity: qty3(quantities[item.id] ?? 0),
  }));
}

/**
 * Kümülatif miktar: AYNI şantiyede, AYNI poz için, bu güne KADAR (dahil)
 * girilmiş miktarların toplamı. Ekran bu türevi hesaplamaz, yanıttan okur.
 */
function diaryCumulativeQuantity(state: MockState, entry: MockDiaryEntry, boqItemId: string): number {
  return state.diaryEntries
    .filter((e) => e.site_id === entry.site_id && e.entry_date <= entry.entry_date)
    .flatMap((e) => e.lines.filter((l) => l.boq_item_id === boqItemId))
    .reduce((sum, l) => sum + Number(l.quantity), 0);
}

function buildDiaryLineRead(state: MockState, entry: MockDiaryEntry, line: MockDiaryLine) {
  return {
    id: line.id,
    boq_item_id: line.boq_item_id,
    code: line.code,
    description: line.description,
    unit: line.unit,
    unit_price: line.unit_price,
    quantity: line.quantity,
    cumulative_quantity: qty3(diaryCumulativeQuantity(state, entry, line.boq_item_id)),
    line_amount: money2(Number(line.quantity) * Number(line.unit_price)),
  };
}

function diaryLinesTotal(entry: MockDiaryEntry): number {
  return entry.lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_price), 0);
}

function diaryWorkerTotal(entry: MockDiaryEntry): number {
  return entry.worker_counts.reduce((sum, w) => sum + w.count, 0);
}

function buildDiaryEntryDetail(state: MockState, entry: MockDiaryEntry) {
  return {
    id: entry.id,
    site_id: entry.site_id,
    project_id: entry.project_id,
    entry_date: entry.entry_date,
    section_id: entry.section_id,
    weather: entry.weather,
    temperature_c: entry.temperature_c,
    work_done: entry.work_done,
    chief_note: entry.chief_note,
    safety_meeting_held: entry.safety_meeting_held,
    ppe_checked: entry.ppe_checked,
    has_incident: entry.has_incident,
    incident_note: entry.incident_note,
    status: entry.status,
    submitted_at: entry.submitted_at,
    created_by: entry.created_by,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    lines: entry.lines.map((l) => buildDiaryLineRead(state, entry, l)),
    worker_counts: entry.worker_counts,
    lines_total: money2(diaryLinesTotal(entry)),
    worker_total: diaryWorkerTotal(entry),
    dropped_orphan_count: 0,
  };
}

function buildDiaryEntryListItem(entry: MockDiaryEntry) {
  return {
    id: entry.id,
    site_id: entry.site_id,
    project_id: entry.project_id,
    entry_date: entry.entry_date,
    section_id: entry.section_id,
    weather: entry.weather,
    has_incident: entry.has_incident,
    status: entry.status,
    worker_total: diaryWorkerTotal(entry),
    lines_total: money2(diaryLinesTotal(entry)),
    created_by: entry.created_by,
    created_at: entry.created_at,
  };
}

/** `YYYY-MM-DD` → yıl/ay; string karşılaştırması yeterli, Date kurulmaz. */
function diaryEntryInPeriod(entry: MockDiaryEntry, year: number | null, month: number | null): boolean {
  if (year !== null && Number(entry.entry_date.slice(0, 4)) !== year) return false;
  if (month !== null && Number(entry.entry_date.slice(5, 7)) !== month) return false;
  return true;
}

/**
 * Fikstür kayıtları BİLEREK GEÇMİŞ günlerdedir (2026-07-15/16): bugünün
 * tarihi boş kalsın ki "bugüne kayıt aç" akışı e2e'de 409'a takılmasın.
 * İki kayıt + bir taslak — sağ paneldeki "Son Kayıtlar" listesi kadrajı
 * bozacak kadar uzamasın (P7 dersi).
 */
function buildDiaryEntryFixtures(): MockDiaryEntry[] {
  return [
    {
      id: "d-1", site_id: "s-1", project_id: "p-1", entry_date: "2026-07-15",
      section_id: "sec-1", weather: "sunny", temperature_c: "28.0",
      work_done: "6. kat döşeme betonu döküldü.", chief_note: "Beton pompası 08:00'de sahada.",
      safety_meeting_held: true, ppe_checked: true, has_incident: false, incident_note: null,
      status: "submitted", submitted_at: "2026-07-15T17:30:00Z",
      created_by: "u-2", created_at: "2026-07-15T08:00:00Z", updated_at: "2026-07-15T17:30:00Z",
      lines: buildDiaryLineSkeleton("d-1", { "bi-3": 120, "bi-4": 8.5, "bi-5": 240 }),
      worker_counts: [
        { id: "d-1-w-1", trade: "Betoncu", source: "company", count: 12 },
        { id: "d-1-w-2", trade: "Kalıpçı", source: "subcontractor", count: 8 },
        { id: "d-1-w-3", trade: "Düz İşçi", source: "general", count: 6 },
      ],
    },
    {
      id: "d-2", site_id: "s-1", project_id: "p-1", entry_date: "2026-07-16",
      section_id: "sec-1", weather: "rainy", temperature_c: "19.0",
      work_done: "Yağış nedeniyle beton dökümü ertelendi.", chief_note: null,
      safety_meeting_held: true, ppe_checked: false, has_incident: false, incident_note: null,
      status: "draft", submitted_at: null,
      created_by: "u-2", created_at: "2026-07-16T08:00:00Z", updated_at: "2026-07-16T09:15:00Z",
      lines: buildDiaryLineSkeleton("d-2", { "bi-6": 180 }),
      worker_counts: [{ id: "d-2-w-1", trade: "Sıvacı", source: "subcontractor", count: 5 }],
    },
    {
      id: "d-3", site_id: "s-2", project_id: "p-1", entry_date: "2026-07-15",
      section_id: null, weather: "partly_cloudy", temperature_c: "26.0",
      work_done: "Duvar örgü ve sıva imalatı sürdü.", chief_note: null,
      safety_meeting_held: true, ppe_checked: true, has_incident: false, incident_note: null,
      status: "submitted", submitted_at: "2026-07-15T18:00:00Z",
      created_by: "u-2", created_at: "2026-07-15T08:00:00Z", updated_at: "2026-07-15T18:00:00Z",
      lines: buildDiaryLineSkeleton("d-3", { "bi-5": 320, "bi-6": 260 }),
      worker_counts: [{ id: "d-3-w-1", trade: "Duvarcı", source: "subcontractor", count: 10 }],
    },
  ];
}

/**
 * Poz bazlı aylık birikim — YALNIZ `submitted` günler (gerçek backend de
 * öyle: taslak gün hakedişe girmez).
 */
function buildDiarySummary(
  state: MockState,
  siteId: string,
  year: number | null,
  month: number | null,
) {
  const entries = state.diaryEntries.filter(
    (e) => e.site_id === siteId && e.status === "submitted" && diaryEntryInPeriod(e, year, month),
  );
  const items = ALL_BOQ_ITEMS.map((item) => {
    const quantity = entries
      .flatMap((e) => e.lines.filter((l) => l.boq_item_id === item.id))
      .reduce((sum, l) => sum + Number(l.quantity), 0);
    const unitPrice = Number(item.unit_price);
    const boqQuantity = Number(item.quantity);
    return {
      boq_item_id: item.id,
      code: item.code,
      description: item.description,
      unit: item.unit,
      unit_price: item.unit_price,
      quantity: qty3(quantity),
      amount: money2(quantity * unitPrice),
      boq_quantity: item.quantity,
      boq_amount: money2(boqQuantity * unitPrice),
      completion_ratio: boqQuantity > 0 ? ((quantity / boqQuantity) * 100).toFixed(2) : null,
      contract_item_id: DIARY_BOQ_BRIDGE[item.id]?.employerItemId ?? null,
      contract_item_quantity: null,
      contract_item_unit_price: null,
    };
  }).filter((row) => Number(row.quantity) > 0);
  return {
    site_id: siteId,
    year,
    month,
    entry_count: entries.length,
    items,
    total_amount: money2(items.reduce((sum, row) => sum + Number(row.amount), 0)),
  };
}

/** `YYYY-MM-DD` + gün sayısı → tarih dizisi (UTC, saat dilimi kayması yok). */
function addDaysIso(startIso: string, offset: number): string {
  const base = new Date(`${startIso}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

/**
 * `GET /sites/{id}/plan/day-summary` — GK'nin gömülü planlama bloğu.
 * Planı OLMAYAN gün de bir kutudur (`has_plan: false`); hafta sonu ayrı
 * biçim alır, bu yüzden `is_weekend` türevi de döner.
 */
function buildPlanDaySummaryRange(state: MockState, siteId: string, start: string, days: number) {
  const site = state.sites.find((s) => s.id === siteId);
  const project = state.projects.find((p) => p.id === site?.project_id);
  const planTexts = [
    "6. kat döşeme betonu",
    "Kalıp sökümü + temizlik",
    "",
    "Duvar örgü (A aksı)",
    "İç sıva başlangıcı",
  ];
  const dayList = Array.from({ length: days }, (_, index) => {
    const planDate = addDaysIso(start, index);
    const weekday = new Date(`${planDate}T00:00:00Z`).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const text = isWeekend ? "" : (planTexts[index % planTexts.length] ?? "");
    return {
      plan_date: planDate,
      is_weekend: isWeekend,
      has_plan: text !== "",
      text,
      planned_worker_total: text !== "" ? 18 + index : 0,
      section_names: text !== "" ? ["Kat 6–10 Kaba İnşaat"] : [],
    };
  });
  return {
    site_id: siteId,
    site_name: site?.name ?? "",
    project_id: site?.project_id ?? "",
    project_name: project?.name ?? "",
    start,
    end: addDaysIso(start, days - 1),
    days: dayList,
  };
}

// --- F-PL T1 · Şantiye Planlama (haftalık ızgara) ------------------------
// Kayıtlar BELLEKTE tutulur ve PUT uçları gerçek backend gibi DEĞİŞTİRME
// (replace) semantiği uygular. Fikstürler DETERMİNİSTİK'tir (rastgelelik yok,
// `Date.now()` yok) — T4 görsel spec'i bu değerlere bakacak.

interface MockPlanRow {
  id: string;
  site_id: string;
  kind: "crew" | "equipment";
  section_id: string | null;
  label: string;
  planned_worker_count: number | null;
  sort_order: number;
}
interface MockPlanCell {
  site_id: string;
  row_id: string;
  plan_date: string;
  text: string;
  tag: string | null;
}
interface MockPlanGoal {
  id: string;
  site_id: string;
  week_start: string;
  title: string;
  note: string | null;
  is_done: boolean;
  status: "completed" | "in_progress" | "waiting" | "service_pending";
  sort_order: number;
}
interface MockPlanSprint {
  id: string;
  site_id: string;
  name: string;
  is_active: boolean;
}

/** Fikstür haftası (Pazartesi). Hücreler + hedefler bu haftaya bağlıdır. */
const PLAN_FIXTURE_WEEK_START = "2026-08-03";

/**
 * İki grup: bölümlü ekip grubu (`sec-1`) + bölümsüz ekipman grubu. Gruplama
 * anahtarı `(kind, section_id)` ikilisi olduğu için ekipman satırları AYRI
 * başlık altına düşer.
 */
const PLAN_ROW_FIXTURES: MockPlanRow[] = [
  { id: "pr-1", site_id: "s-1", kind: "crew", section_id: "sec-1", label: "Kalıpçı Ekibi", planned_worker_count: 14, sort_order: 0 },
  { id: "pr-2", site_id: "s-1", kind: "crew", section_id: "sec-1", label: "Demirci Ekibi", planned_worker_count: 18, sort_order: 1 },
  { id: "pr-3", site_id: "s-1", kind: "crew", section_id: "sec-1", label: "Elektrikçi Ekibi", planned_worker_count: 8, sort_order: 2 },
  { id: "pr-4", site_id: "s-1", kind: "equipment", section_id: null, label: "Tower Crane", planned_worker_count: null, sort_order: 3 },
  { id: "pr-5", site_id: "s-1", kind: "equipment", section_id: null, label: "Beton Pompası", planned_worker_count: null, sort_order: 4 },
  // 🔒 FİKSTÜR İZOLASYONU (F-PL T4): `site-planning.spec.ts` planı MUTASYONA
  // uğratır (satır ekle/sil, hücre, hedef, sprint) ve bu uçların üçü ŞANTİYE
  // kapsamlıdır — hafta ayırmak yetmez, ŞANTİYE ayırmak gerekir. Bu yüzden
  // fonksiyonel akış s-2'de yürür; `site-planning-visual.spec.ts` yalnız
  // s-1'e bakar ve s-1'i hiçbir spec değiştirmez (P7 dersi).
  //
  // s-2'nin BÖLÜMÜ YOKTUR → ekip grubu "Bölümsüz Ekipler" başlığına düşer
  // (`UNASSIGNED_CREW_GROUP_TITLE`), böylece s-1'in kapsamadığı grup dalı da
  // uçtan uca koşulur.
  { id: "pr-6", site_id: "s-2", kind: "crew", section_id: null, label: "Duvarcı Ekibi", planned_worker_count: 10, sort_order: 0 },
  { id: "pr-7", site_id: "s-2", kind: "equipment", section_id: null, label: "Mini Ekskavatör", planned_worker_count: null, sort_order: 1 },
];

/** Altı renk etiketinin HEPSİ kullanılır; hafta sonu sütunları boş bırakılır. */
const PLAN_CELL_FIXTURES: MockPlanCell[] = [
  { site_id: "s-1", row_id: "pr-1", plan_date: "2026-08-03", text: "6. kat kalıp kurulumu", tag: "blue" },
  { site_id: "s-1", row_id: "pr-1", plan_date: "2026-08-05", text: "Kalıp sökümü (A aksı)", tag: "green" },
  { site_id: "s-1", row_id: "pr-2", plan_date: "2026-08-04", text: "Döşeme donatı serimi", tag: "yellow" },
  { site_id: "s-1", row_id: "pr-2", plan_date: "2026-08-06", text: "Kolon filiz montajı", tag: "purple" },
  { site_id: "s-1", row_id: "pr-3", plan_date: "2026-08-07", text: "Tesisat borusu çekimi", tag: "gray" },
  { site_id: "s-1", row_id: "pr-4", plan_date: "2026-08-03", text: "Vinç periyodik bakım", tag: "red" },
  { site_id: "s-1", row_id: "pr-5", plan_date: "2026-08-04", text: "Beton dökümü — 180 m³", tag: "blue" },
  // s-2 (fonksiyonel spec'in izole şantiyesi) — tek dolu hücre yeter: spec'in
  // kendisi yazıp okuyacak.
  { site_id: "s-2", row_id: "pr-6", plan_date: "2026-08-03", text: "Bodrum duvar örgüsü", tag: "blue" },
];

/** Dört `PlanGoalStatus` değerinin her biri BİRER kez. */
const PLAN_GOAL_FIXTURES: MockPlanGoal[] = [
  { id: "pg-1", site_id: "s-1", week_start: PLAN_FIXTURE_WEEK_START, title: "6. kat kalıp tamamlansın", note: "A ve B aksı öncelikli.", is_done: true, status: "completed", sort_order: 0 },
  { id: "pg-2", site_id: "s-1", week_start: PLAN_FIXTURE_WEEK_START, title: "Döşeme betonu dökülsün", note: null, is_done: false, status: "in_progress", sort_order: 1 },
  { id: "pg-3", site_id: "s-1", week_start: PLAN_FIXTURE_WEEK_START, title: "İskele revizyonu", note: "Malzeme bekleniyor.", is_done: false, status: "waiting", sort_order: 2 },
  { id: "pg-4", site_id: "s-1", week_start: PLAN_FIXTURE_WEEK_START, title: "Vinç yıllık muayenesi", note: null, is_done: false, status: "service_pending", sort_order: 3 },
  { id: "pg-5", site_id: "s-2", week_start: PLAN_FIXTURE_WEEK_START, title: "Bodrum duvarları bitsin", note: null, is_done: false, status: "waiting", sort_order: 0 },
];

const PLAN_SPRINT_FIXTURES: MockPlanSprint[] = [
  { id: "ps-1", site_id: "s-1", name: "Sprint 12 · 6. Kat Kaba İnşaat", is_active: true },
  { id: "ps-2", site_id: "s-2", name: "Sprint 4 · Bodrum Kabası", is_active: true },
];

/**
 * `GET /sites/{id}/plan` — haftalık ızgara.
 *
 * Gün iskeleti GERÇEK TAKVİMDEN BAĞIMSIZ: `week_start` neyse 7 gün ondan
 * üretilir (`is_weekend` Cmt/Paz). Hücreler SEYREKTİR — planı olmayan gün
 * hücre üretmez, ızgara deliklerini `days` doldurur.
 */
function buildSitePlanWeek(state: MockState, siteId: string, weekStart: string) {
  const site = state.sites.find((s) => s.id === siteId);
  const project = state.projects.find((p) => p.id === site?.project_id);
  const days = Array.from({ length: 7 }, (_, index) => {
    const planDate = addDaysIso(weekStart, index);
    const weekday = new Date(`${planDate}T00:00:00Z`).getUTCDay();
    return { plan_date: planDate, is_weekend: weekday === 0 || weekday === 6 };
  });
  const weekDates = new Set(days.map((d) => d.plan_date));

  const rows = state.planRows
    .filter((r) => r.site_id === siteId)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));

  // Gruplama anahtarı `(kind, section_id)` İKİLİSİ — ekipman satırları
  // bölümsüz oldukları için AYRI başlığa düşer.
  const groups: Array<{
    kind: MockPlanRow["kind"];
    section_id: string | null;
    section_name: string | null;
    section_manager_name: string | null;
    rows: unknown[];
  }> = [];
  for (const row of rows) {
    const section = state.sections.find((s) => s.id === row.section_id);
    const key = `${row.kind}::${row.section_id ?? ""}`;
    let group = groups.find((g) => `${g.kind}::${g.section_id ?? ""}` === key);
    if (!group) {
      group = {
        kind: row.kind,
        section_id: row.section_id,
        section_name: section?.name ?? null,
        section_manager_name: section?.manager_name ?? null,
        rows: [],
      };
      groups.push(group);
    }
    group.rows.push({
      id: row.id,
      kind: row.kind,
      section_id: row.section_id,
      label: row.label,
      planned_worker_count: row.planned_worker_count,
      sort_order: row.sort_order,
      cells: state.planCells
        .filter((c) => c.row_id === row.id && weekDates.has(c.plan_date))
        .slice()
        .sort((a, b) => a.plan_date.localeCompare(b.plan_date))
        .map((c) => ({ plan_date: c.plan_date, text: c.text, tag: c.tag })),
    });
  }

  const sprint = state.planSprints.find((s) => s.site_id === siteId && s.is_active);
  return {
    site_id: siteId,
    site_name: site?.name ?? "",
    project_id: site?.project_id ?? "",
    project_name: project?.name ?? "",
    week_start: weekStart,
    week_end: addDaysIso(weekStart, 6),
    days,
    groups,
    goals: state.planGoals
      .filter((g) => g.site_id === siteId && g.week_start === weekStart)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      .map((g) => ({
        id: g.id,
        title: g.title,
        note: g.note,
        is_done: g.is_done,
        status: g.status,
        sort_order: g.sort_order,
      })),
    active_sprint: sprint ? { id: sprint.id, name: sprint.name } : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// F-PT T1 · Puantaj — personel kartları + ay matrisi.
// ─────────────────────────────────────────────────────────────────────────────

type MockWorkerSource = "company" | "subcontractor" | "general";
type MockTimesheetCode = "worked" | "leave" | "holiday" | "overtime" | "temporary_duty";

/**
 * F-İK T2 — personel kaydı ARTIK şemaya BAĞLIDIR (F-SA dersi: elle yazılmış
 * anotasyonsuz fikstür, sunucu sözleşmesi büyüdüğünde sessizce eskir).
 * `PersonnelResponse` alan kazandığında bu tip derlemeyi kırar ve mock↔şema
 * kayması typecheck'te GÖRÜNÜR.
 */
type MockPersonnel = components["schemas"]["PersonnelResponse"];

/** Yeni İK alanlarının hepsi boş — fikstürler yalnız ilgilendikleri alanı yazar. */
const EMPTY_HR_FIELDS = {
  tc_no: null,
  birth_date: null,
  gender: null,
  marital_status: null,
  phone: null,
  email: null,
  address: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  hire_date: null,
  wage_type: null,
  wage_amount: null,
  payment_method: null,
  iban: null,
  sgk_no: null,
  assigned_project_id: null,
  assigned_section_id: null,
  is_draft: false,
} satisfies Omit<MockPersonnel, "id" | "full_name" | "trade" | "source" | "subcontractor_id" | "user_id" | "is_active">;

/**
 * Gövdedeki İK alanlarını `PersonnelResponse` biçimine çevirir (F-İK T4).
 * Gelmeyen alan `null` kalır; tip `MockPersonnel`e bağlıdır ⇒ sözleşme
 * büyüdüğünde burası derlemede GÖRÜNÜR.
 */
type MockHrFields = Pick<
  MockPersonnel,
  | "tc_no"
  | "birth_date"
  | "gender"
  | "marital_status"
  | "phone"
  | "email"
  | "address"
  | "emergency_contact_name"
  | "emergency_contact_phone"
  | "hire_date"
  | "wage_type"
  | "wage_amount"
  | "payment_method"
  | "iban"
  | "sgk_no"
  | "assigned_project_id"
  | "assigned_section_id"
>;

function hrFieldsFromBody(body: Record<string, unknown>): MockHrFields {
  const pick = <K extends keyof MockHrFields>(key: K): MockHrFields[K] =>
    (body[key] ?? null) as MockHrFields[K];
  return {
    tc_no: pick("tc_no"),
    birth_date: pick("birth_date"),
    gender: pick("gender"),
    marital_status: pick("marital_status"),
    phone: pick("phone"),
    email: pick("email"),
    address: pick("address"),
    emergency_contact_name: pick("emergency_contact_name"),
    emergency_contact_phone: pick("emergency_contact_phone"),
    hire_date: pick("hire_date"),
    wage_type: pick("wage_type"),
    wage_amount: pick("wage_amount"),
    payment_method: pick("payment_method"),
    iban: pick("iban"),
    sgk_no: pick("sgk_no"),
    assigned_project_id: pick("assigned_project_id"),
    assigned_section_id: pick("assigned_section_id"),
  };
}

/** Hücreler SEYREKTİR: girilmemiş gün kayıt ÜRETMEZ (gerçek backend gibi). */
interface MockTimesheetCell {
  site_id: string;
  personnel_id: string;
  work_date: string;
  code: MockTimesheetCode;
  overtime_hours: string | null;
  section_id: string | null;
}

/**
 * `subcontractor_id` → görünen ad. Taşeron sözleşmesi fikstürlerinden
 * TÜRETİLMEZ: `active_subcontractor_count` KPI'ı sözleşme listesinden sayılır
 * ve oraya dokunmak taşeron hakediş baseline'ını sessizce bozardı.
 */
const SUBCONTRACTOR_NAMES: Record<string, string> = {
  "sub-1": "Aydın Elektrik Taah.",
  "sub-2": "Çelik İnşaat Taah.",
};

// F-P5 T1 · `SubcontractorResponse` ile birebir alan kümesi. Adlar
// `SUBCONTRACTOR_NAMES`ten TÜRETİLİR — personel ekranının taşeron adı eşlemesi
// ile mock listesi ayrışmasın diye tek kaynak korunur.
interface MockSubcontractor {
  id: string;
  name: string;
  tax_number: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  is_active: boolean;
}

const SUBCONTRACTOR_FIXTURES: MockSubcontractor[] = [
  {
    id: "sub-1",
    name: SUBCONTRACTOR_NAMES["sub-1"],
    tax_number: "1234567890",
    contact_person: "Aydın Yurt",
    phone: "0532 111 22 33",
    email: "info@aydinelektrik.com",
    category: "Elektrik",
    is_active: true,
  },
  {
    id: "sub-2",
    name: SUBCONTRACTOR_NAMES["sub-2"],
    tax_number: "9988776655",
    contact_person: "Selim Çelik",
    phone: "0533 444 55 66",
    email: "muhasebe@celikinsaat.com",
    category: "Kaba İnşaat",
    is_active: true,
  },
];

/**
 * Üç `WorkerSource` değerinin hepsi + bir pasif kayıt (`is_active` süzgeci).
 *
 * F-İK T2: İK alanları (SGK sicil · ücret · atanan proje) liste ekranının ÜÇ
 * gerçek sütununu besler. Üç `wage_type` değerinin hepsi temsil edilir (günlük
 * sade tutar, aylık/saatlik birim ekli) ve en az bir kayıt her alanı BOŞ
 * bırakır — "—" düşüşü de kadrajda görünsün.
 */
const PERSONNEL_FIXTURES: MockPersonnel[] = [
  { ...EMPTY_HR_FIELDS, id: "per-1", full_name: "Mehmet Kılıç", trade: "Kalıpçı", source: "company", subcontractor_id: null, user_id: null, is_active: true, sgk_no: "1234567890", wage_type: "daily", wage_amount: "1450.00", assigned_project_id: "p-1" },
  { ...EMPTY_HR_FIELDS, id: "per-2", full_name: "Hasan Demirci", trade: "Demirci", source: "company", subcontractor_id: null, user_id: null, is_active: true, sgk_no: "2345678901", wage_type: "monthly", wage_amount: "42000.00", assigned_project_id: "p-1" },
  { ...EMPTY_HR_FIELDS, id: "per-3", full_name: "Ramazan Yıldız", trade: "Elektrikçi", source: "subcontractor", subcontractor_id: "sub-1", user_id: null, is_active: true, sgk_no: "3456789012", wage_type: "hourly", wage_amount: "185.50", assigned_project_id: "p-2" },
  { ...EMPTY_HR_FIELDS, id: "per-4", full_name: "İsmail Aksoy", trade: "Duvarcı", source: "subcontractor", subcontractor_id: "sub-2", user_id: null, is_active: true, sgk_no: "4567890123", wage_type: "daily", wage_amount: "1320.00", assigned_project_id: "p-2" },
  // Üç alanı da BOŞ: proje "atanmamış", SGK/ücret girilmemiş ⇒ üç hücre de "—".
  { ...EMPTY_HR_FIELDS, id: "per-5", full_name: "Osman Şahin", trade: "Düz İşçi", source: "general", subcontractor_id: null, user_id: null, is_active: true },
  { ...EMPTY_HR_FIELDS, id: "per-6", full_name: "Kemal Toprak", trade: "Sıvacı", source: "company", subcontractor_id: null, user_id: null, is_active: false, sgk_no: "5678901234", wage_type: "daily", wage_amount: "1180.00", assigned_project_id: "p-1" },
  // 🔒 F-PT2 T1 — FİKSTÜR İZOLASYONU (F-ST dersi): `per-1…per-6` puantaj
  // görsel baseline'larının (`timesheet-visual.spec.ts` → `pinRoster`) VE
  // ileride personel liste/detay baseline'larının kaynağıdır — personel
  // YAZMA (PATCH) testleri bu ALTI kaydı MUTASYONA UĞRATAMAZ. Aşağıdaki kayıt
  // yalnız personel detay/düzenleme akışının PATCH testleri İÇİNDİR; kimlik
  // ("per-new-" öneki) `pinRoster`ın MEVCUT süzgecine ("!id.startsWith
  // ('per-new-')") zaten uyar — timesheet kadrajlarına dokunmadan otomatik
  // dışlanır. Hiçbir timesheet hücresi TAŞIMAZ, bu yüzden puantaj matrisi
  // satırlarına da (hücre yoksa satır üretilmez) hiç GİRMEZ.
  { ...EMPTY_HR_FIELDS, id: "per-new-pt2-fixture-1", full_name: "Derya Aydın", trade: "Kaynakçı", source: "company", subcontractor_id: null, user_id: null, is_active: true },
];

/**
 * F-İK T2/T5 · `GET /hr/documents/summary` — SABİT özet. Sayılar sabittir ⇒
 * hem `/personel` uyarı bandının metni hem BT ekranının 5 KPI'ı, iki listesi
 * ve tip dağılımı DETERMİNİSTİKtir (baseline'lar buna dayanır).
 *
 * T5'te ZENGİNLEŞTİRİLDİ: BT ekranının HER bölümünün dolu olması gerekir —
 * iki satırlı "süresi dolan" listesi (biri `project_name: null` ile GERÇEK
 * boşluğu kanıtlar), iki satırlı "yaklaşan" listesi ve DÖRT tipli dağılım
 * (biri `missing > 0` ile gri dilimi, biri hepsi sıfır olan tip ile "çubuk
 * çökmesin" halini kanıtlar).
 *
 * ⚠️ KPI'lar listelerin UZUNLUĞU DEĞİLDİR (sunucu listeleri kırpabilir) —
 * ekranın istemcide sayı türetmediğini kanıtlamak için sayaçlar bilerek
 * liste uzunluklarından BÜYÜK tutulur.
 */
const HR_DOCUMENTS_SUMMARY_FIXTURE: components["schemas"]["HrDocumentsSummaryResponse"] = {
  total_documents: 12,
  valid: 7,
  expiring: 2,
  expired: 3,
  missing: 4,
  by_type: [
    {
      type_id: "dt-1",
      type_name: "Sağlık Raporu",
      is_mandatory: true,
      validity_months: 12,
      total_documents: 6,
      valid: 3,
      expiring: 1,
      expired: 2,
      missing: 2,
    },
    {
      type_id: "dt-2",
      type_name: "İSG Eğitim Belgesi",
      is_mandatory: true,
      validity_months: 24,
      total_documents: 6,
      valid: 4,
      expiring: 1,
      expired: 1,
      missing: 2,
    },
    {
      // Yalnız EKSİK kaydı olan tip — oran çubuğunun gri dilimini kanıtlar.
      type_id: "dt-3",
      type_name: "Mesleki Yeterlilik",
      is_mandatory: true,
      validity_months: null,
      total_documents: 0,
      valid: 0,
      expiring: 0,
      expired: 0,
      missing: 5,
    },
    {
      // HİÇ kaydı olmayan opsiyonel tip — çubuk ÇÖKMEMELİ (bölme hatası yok).
      type_id: "dt-4",
      type_name: "Operatör Belgesi",
      is_mandatory: false,
      validity_months: 60,
      total_documents: 0,
      valid: 0,
      expiring: 0,
      expired: 0,
      missing: 0,
    },
  ],
  expired_documents: [
    {
      id: "pd-1",
      personnel_id: "per-1",
      personnel_name: "Mehmet Kılıç",
      document_label: "Sağlık Raporu",
      project_name: "Kule A",
      valid_until: "2026-06-30",
      days_overdue: 44,
    },
    {
      // `project_name: null` — GERÇEK boşluk ("—"), pending gerekçesi DEĞİL.
      id: "pd-3",
      personnel_id: "per-2",
      personnel_name: "Hasan Demirci",
      document_label: "İSG Eğitim Belgesi",
      project_name: null,
      valid_until: "2026-07-20",
      days_overdue: 24,
    },
  ],
  expiring_documents: [
    {
      id: "pd-2",
      personnel_id: "per-3",
      personnel_name: "Ramazan Yıldız",
      document_label: "İSG Eğitim Belgesi",
      project_name: "Villa B",
      valid_until: "2026-08-25",
      days_left: 12,
    },
    {
      id: "pd-4",
      personnel_id: "per-4",
      personnel_name: "Sercan Öztürk",
      document_label: "Sağlık Raporu",
      project_name: "Kule A",
      valid_until: "2026-09-02",
      days_left: 20,
    },
  ],
};

/**
 * F-İK T5 · `GET /personnel/{personnel_id}/documents` — Personel Detay'daki
 * "Belgeler" kartının kaynağı. Kayıtlar SALT-OKUNURdur (bu dilimde POST/PATCH/
 * DELETE bağlanmadı) ⇒ mutasyon yok, fikstür deterministik kalır.
 *
 * `per-1` üç farklı hali taşır: katalog tipli + arşiv dosyalı geçerli belge ·
 * serbest etiketli (`type_name: null`) belge · geçerlilik tarihi OLMAYAN
 * (süresiz) belge. `per-3` süresi dolmuş tek kayıt taşır; diğer personel
 * BOŞ liste döndürür (boş-durum yolu kanıtlanır).
 */
const PERSONNEL_DOCUMENT_FIXTURES: Record<
  string,
  components["schemas"]["PersonnelDocumentResponse"][]
> = {
  "per-1": [
    {
      id: "pdoc-1",
      personnel_id: "per-1",
      type_id: "dt-1",
      type_name: "Sağlık Raporu",
      is_mandatory: true,
      validity_months: 12,
      free_label: null,
      document_id: "doc-1",
      issued_at: "2026-01-15",
      valid_until: "2027-01-15",
      note: null,
      status: "valid",
      days_left: 156,
      created_at: "2026-01-15T08:00:00Z",
      updated_at: "2026-01-15T08:00:00Z",
    },
    {
      // Serbest etiketli kayıt — ad `free_label`den gelir, dosyası YOK.
      id: "pdoc-2",
      personnel_id: "per-1",
      type_id: null,
      type_name: null,
      is_mandatory: null,
      validity_months: null,
      free_label: "İşe Giriş Taahhütnamesi",
      document_id: null,
      issued_at: "2025-11-02",
      valid_until: null,
      note: null,
      status: "valid",
      days_left: null,
      created_at: "2025-11-02T08:00:00Z",
      updated_at: "2025-11-02T08:00:00Z",
    },
  ],
  "per-3": [
    {
      id: "pdoc-3",
      personnel_id: "per-3",
      type_id: "dt-2",
      type_name: "İSG Eğitim Belgesi",
      is_mandatory: true,
      validity_months: 24,
      free_label: null,
      document_id: "doc-2",
      issued_at: "2024-06-01",
      valid_until: "2026-06-01",
      note: null,
      status: "expired",
      days_left: -73,
      created_at: "2024-06-01T08:00:00Z",
      updated_at: "2024-06-01T08:00:00Z",
    },
  ],
};

/**
 * 🔒 FİKSTÜR İZOLASYONU (F-PL dersi, PT'ye uyarlanmış): `PUT .../timesheet`
 * kapsamı DÖNEM + ŞANTİYE'dir, bu yüzden ŞANTİYE ayırmak GEREKMEZ — AY
 * ayırmak yeterlidir:
 *   • 2026-08 · s-1 → GÖRSEL kadraj (zengin fikstür). Hiçbir spec bu ayı
 *     DEĞİŞTİRMEZ.
 *   • 2026-09 · s-1 → fonksiyonel oyun alanı (kaydetme akışı burada koşar).
 *     İKİ FARKLI bölüme (sec-1 + sec-2) ait hücre taşır — T3/T5'in kapsam
 *     kuralı kanıtı ("bölüm filtresi açıkken kaydet → diğer bölüm silinmedi")
 *     bu kümenin üzerinden yürür.
 *   • 2026-08 · s-2 → "başka şantiyeye dokunulmadı" kanıtı.
 *
 * 2026-08 · s-1 kümesi mockup'ın ayak satırını üretir:
 *   03 Ağu → 4 çalışan + FM  ⇒ `4+`
 *   04 Ağu → 3 çalışan + 1 geçici görev ⇒ `3G`
 * Beş kodun HEPSİ ve saatli en az bir FM hücresi bu kümede vardır.
 */
const TIMESHEET_CELL_FIXTURES: MockTimesheetCell[] = [
  // 03 Ağu — dört kişi çalıştı, biri fazla mesai yaptı ⇒ ayak satırı "4+".
  { site_id: "s-1", personnel_id: "per-1", work_date: "2026-08-03", code: "worked", overtime_hours: null, section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-2", work_date: "2026-08-03", code: "worked", overtime_hours: null, section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-3", work_date: "2026-08-03", code: "overtime", overtime_hours: "3.00", section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-4", work_date: "2026-08-03", code: "worked", overtime_hours: null, section_id: "sec-2" },
  // 04 Ağu — üç kişi çalıştı, biri geçici görevde ⇒ ayak satırı "3G".
  { site_id: "s-1", personnel_id: "per-1", work_date: "2026-08-04", code: "worked", overtime_hours: null, section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-2", work_date: "2026-08-04", code: "worked", overtime_hours: null, section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-5", work_date: "2026-08-04", code: "worked", overtime_hours: null, section_id: "sec-2" },
  { site_id: "s-1", personnel_id: "per-3", work_date: "2026-08-04", code: "temporary_duty", overtime_hours: null, section_id: "sec-1" },
  // 05 Ağu — izin + tatil kodları (beş kodun tamamı kadraja girsin).
  { site_id: "s-1", personnel_id: "per-1", work_date: "2026-08-05", code: "leave", overtime_hours: null, section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-2", work_date: "2026-08-05", code: "worked", overtime_hours: null, section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-4", work_date: "2026-08-05", code: "holiday", overtime_hours: null, section_id: "sec-2" },
  // 06 Ağu — ikinci saatli FM (toplam FM saati 5,50 olur).
  { site_id: "s-1", personnel_id: "per-1", work_date: "2026-08-06", code: "worked", overtime_hours: null, section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-3", work_date: "2026-08-06", code: "overtime", overtime_hours: "2.50", section_id: "sec-1" },

  // 2026-09 · s-1 — fonksiyonel oyun alanı; İKİ bölüm (kapsam kuralı kanıtı).
  { site_id: "s-1", personnel_id: "per-1", work_date: "2026-09-01", code: "worked", overtime_hours: null, section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-2", work_date: "2026-09-02", code: "worked", overtime_hours: null, section_id: "sec-1" },
  { site_id: "s-1", personnel_id: "per-4", work_date: "2026-09-01", code: "worked", overtime_hours: null, section_id: "sec-2" },

  // 2026-08 · s-2 — "başka şantiyeye DOKUNULMADI" kanıt kaydı (bölümsüz).
  { site_id: "s-2", personnel_id: "per-5", work_date: "2026-08-03", code: "worked", overtime_hours: null, section_id: null },

  // 🔴 409 TETİKLEYİCİSİ (F-PT T5) — Ramazan Yıldız 10 Eylül'de s-2'de kayıtlı.
  // Aynı kişi-günü s-1'e yazmaya kalkan PUT çakışma alır. Bileşim BİLEREK
  // ayrılmıştır: hiçbir başka spec per-3'ün 2026-09-10'una dokunmaz, bu yüzden
  // ne kadraj fikstürleri ne de kapsam-kuralı akışı etkilenir.
  { site_id: "s-2", personnel_id: "per-3", work_date: "2026-09-10", code: "worked", overtime_hours: null, section_id: null },
];

function timesheetMonthDays(year: number, month: number): string[] {
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from(
    { length: dayCount },
    (_, index) => `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
  );
}

function cellInPeriod(cell: MockTimesheetCell, year: number, month: number): boolean {
  return cell.work_date.startsWith(`${year}-${String(month).padStart(2, "0")}-`);
}

/** `worked` + `overtime` adam-gün sayılır; `leave`/`holiday`/`G` SAYILMAZ. */
function countsAsManDay(code: MockTimesheetCode): boolean {
  return code === "worked" || code === "overtime";
}

/**
 * `GET|PUT /sites/{id}/timesheet` yanıtı.
 *
 * `sectionId` YALNIZ görünümü süzer (satır hücreleri süzülür, hücresi kalmayan
 * satır düşer). Ayak satırı ve toplamlar da süzülmüş kümeden türetilir — ekran
 * gördüğünün toplamını görür.
 */
function buildTimesheetMatrix(
  state: MockState,
  site: MockSite,
  year: number,
  month: number,
  sectionId: string | null,
) {
  const project = state.projects.find((p) => p.id === site.project_id);
  const section = sectionId ? state.sections.find((s) => s.id === sectionId) : undefined;

  const cells = state.timesheetCells.filter(
    (c) =>
      c.site_id === site.id &&
      cellInPeriod(c, year, month) &&
      (sectionId === null || c.section_id === sectionId),
  );

  const rows = state.personnel
    .filter((p) => cells.some((c) => c.personnel_id === p.id))
    .map((person) => {
      const personCells = cells
        .filter((c) => c.personnel_id === person.id)
        .slice()
        .sort((a, b) => a.work_date.localeCompare(b.work_date));
      return {
        personnel_id: person.id,
        full_name: person.full_name,
        trade: person.trade,
        source: person.source,
        subcontractor_name: person.subcontractor_id
          ? (SUBCONTRACTOR_NAMES[person.subcontractor_id] ?? null)
          : null,
        man_days: personCells.filter((c) => countsAsManDay(c.code)).length,
        cells: personCells.map((c) => ({
          work_date: c.work_date,
          code: c.code,
          overtime_hours: c.overtime_hours,
          section_id: c.section_id,
        })),
      };
    });

  // Gün iskeleti AYIN TAMAMIDIR (hücreler seyrek, sütunlar değil).
  const dayTotals = timesheetMonthDays(year, month).map((workDate) => {
    const dayCells = cells.filter((c) => c.work_date === workDate);
    return {
      work_date: workDate,
      // FM'li gün ÇALIŞILMIŞ sayılır; geçici görev SAYILMAZ.
      worked_count: dayCells.filter((c) => countsAsManDay(c.code)).length,
      has_overtime: dayCells.some((c) => c.code === "overtime"),
      temporary_duty_count: dayCells.filter((c) => c.code === "temporary_duty").length,
    };
  });

  const totalOvertime = cells.reduce((sum, c) => sum + Number(c.overtime_hours ?? 0), 0);

  return {
    site_id: site.id,
    site_name: site.name,
    project_id: site.project_id,
    project_name: project?.name ?? "",
    year,
    month,
    section_id: sectionId,
    section_name: section?.name ?? null,
    worker_count: rows.length,
    total_man_days: rows.reduce((sum, r) => sum + r.man_days, 0),
    total_overtime_hours: totalOvertime.toFixed(2),
    rows,
    day_totals: dayTotals,
  };
}

/**
 * Günlükten türetilen hakediş önerisi. İKİ uç da AYNI kuralı izler: yalnız
 * `submitted` günler, yalnız köprüsü olan pozlar; köprüsüz pozlar
 * `skipped_unbridged_count`a sayılır ve `reason` bunu açıkça söyler.
 */
function buildDiarySuggestionRows(
  entries: MockDiaryEntry[],
  bridgeKey: "employerItemId" | "subcontractorItemId",
  allowedItemIds: string[] | null,
): { rows: Map<string, { siteId: string; quantity: number }>; skipped: number } {
  const rows = new Map<string, { siteId: string; quantity: number }>();
  let skipped = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      const quantity = Number(line.quantity);
      if (quantity <= 0) continue;
      const targetId = DIARY_BOQ_BRIDGE[line.boq_item_id]?.[bridgeKey];
      if (!targetId || (allowedItemIds !== null && !allowedItemIds.includes(targetId))) {
        skipped += 1;
        continue;
      }
      const key = `${targetId}|${entry.site_id}`;
      const existing = rows.get(key);
      rows.set(key, {
        siteId: entry.site_id,
        quantity: (existing?.quantity ?? 0) + quantity,
      });
    }
  }
  return { rows, skipped };
}

// Gercek FastAPI yerine gecen minik mock — hermetik E2E icin.
// ─────────────────────────────────────────────────────────────────────────────
// F-BC T1 · Belge Arşivi — klasörler + belgeler.
//
// ⚠️ ALANLAR ŞEMAYLA BİREBİRDİR (`schema.d.ts`: `DocumentFolderRead`,
// `DocumentRead`). Uydurma alan eklemek yalnızca testi değil, bu fikstürlerden
// üretilecek GÖRSEL BASELINE'ları da yanlışlar (F-P5 dersi).
//
// `content` alanı şemada YOKTUR — yalnız indirme ucunun gövdesini üretmek için
// mock durumunda tutulur ve künye yanıtlarına ASLA konmaz (bkz.
// `buildDocumentRead`). Gerçek backend de baytları künyede dışarı vermez.
// ─────────────────────────────────────────────────────────────────────────────
interface MockDocumentFolder {
  id: string;
  project_id: string;
  site_id: string | null;
  parent_id: string | null;
  name: string;
  created_at: string;
}

interface MockDocument {
  id: string;
  folder_id: string | null;
  project_id: string;
  site_id: string | null;
  filename: string;
  mime_type: string;
  size_bytes: number;
  description: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  /** ŞEMA DIŞI — indirme gövdesi. Künyeye konmaz. */
  content: string;
}

/**
 * Mock yükleme sınırı 2 MB'tır (gerçek backend'in sınırı daha büyüktür).
 * Bilinçli: 413 dalını e2e'de tetiklemek için onlarca MB göndermek gerekmesin.
 */
const DOCUMENT_MAX_BYTES = 2 * 1024 * 1024;

/** Kabul edilen uzantılar — dışındakiler 422 alır (gerçek backend kuralı). */
const DOCUMENT_ALLOWED_EXTENSIONS = [
  "pdf", "xlsx", "xls", "docx", "doc", "jpg", "jpeg", "png", "dwg", "zip", "txt", "csv",
];

const PROJECT_FOLDER_FIXTURES: MockDocumentFolder[] = [
  // E12 mockup'ındaki proje kökü klasörleri (satır 79–98).
  { id: "df-p1-1", project_id: "p-1", site_id: null, parent_id: null, name: "Sözleşmeler", created_at: "2025-03-02T08:00:00Z" },
  { id: "df-p1-2", project_id: "p-1", site_id: null, parent_id: null, name: "Hakedişler", created_at: "2025-03-02T08:01:00Z" },
  { id: "df-p1-3", project_id: "p-1", site_id: null, parent_id: null, name: "Teknik Çizimler", created_at: "2025-03-02T08:02:00Z" },
  { id: "df-p1-4", project_id: "p-1", site_id: null, parent_id: null, name: "Onay & İzinler", created_at: "2025-03-02T08:03:00Z" },
  { id: "df-p1-5", project_id: "p-1", site_id: null, parent_id: null, name: "Faturalar", created_at: "2025-03-02T08:04:00Z" },
  // ŞB mockup'ındaki şantiye klasörleri (satır 44–68) — `site_id` DOLU.
  { id: "df-s1-1", project_id: "p-1", site_id: "s-1", parent_id: null, name: "Sözleşmeler", created_at: "2025-03-03T08:00:00Z" },
  { id: "df-s1-2", project_id: "p-1", site_id: "s-1", parent_id: null, name: "Hakedişler", created_at: "2025-03-03T08:01:00Z" },
  { id: "df-s1-3", project_id: "p-1", site_id: "s-1", parent_id: null, name: "Teknik Çizimler", created_at: "2025-03-03T08:02:00Z" },
  { id: "df-s1-4", project_id: "p-1", site_id: "s-1", parent_id: null, name: "İzin & Ruhsat", created_at: "2025-03-03T08:03:00Z" },
  { id: "df-s1-5", project_id: "p-1", site_id: "s-1", parent_id: null, name: "Günlük Raporlar", created_at: "2025-03-03T08:04:00Z" },
  { id: "df-s1-6", project_id: "p-1", site_id: "s-1", parent_id: null, name: "Fotoğraflar", created_at: "2025-03-03T08:05:00Z" },
  { id: "df-s1-7", project_id: "p-1", site_id: "s-1", parent_id: null, name: "İş Güvenliği", created_at: "2025-03-03T08:06:00Z" },
  { id: "df-s1-8", project_id: "p-1", site_id: "s-1", parent_id: null, name: "Faturalar", created_at: "2025-03-03T08:07:00Z" },
];

/** Kısa sahte gövde — indirme ucunun bayt bayt geçtiğini doğrulamaya yeter. */
const DOC_CONTENT = "%PDF-1.4 sahte belge icerigi";

const DOCUMENT_FIXTURES: MockDocument[] = [
  // Proje düzeyi (E12 kart ızgarası, mockup satır 128–158) — `site_id` NULL.
  { id: "doc-p1-1", folder_id: "df-p1-2", project_id: "p-1", site_id: null, filename: "Hakediş_47_Güneşkent.pdf", mime_type: "application/pdf", size_bytes: 1258291, description: null, uploaded_by_name: "Ahmet Yılmaz", created_at: "2026-07-17T06:20:00Z", content: DOC_CONTENT },
  { id: "doc-p1-2", folder_id: "df-p1-2", project_id: "p-1", site_id: null, filename: "Hakediş_46_Hesap.xlsx", mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size_bytes: 865280, description: null, uploaded_by_name: "Ayşe Demir", created_at: "2026-07-01T06:20:00Z", content: DOC_CONTENT },
  { id: "doc-p1-3", folder_id: "df-p1-2", project_id: "p-1", site_id: null, filename: "Hakediş_45_Onaylı.pdf", mime_type: "application/pdf", size_bytes: 2202009, description: null, uploaded_by_name: "Ayşe Demir", created_at: "2026-06-01T06:20:00Z", content: DOC_CONTENT },
  { id: "doc-p1-4", folder_id: "df-p1-2", project_id: "p-1", site_id: null, filename: "Fotoğraf_Kat8.jpg", mime_type: "image/jpeg", size_bytes: 3565158, description: null, uploaded_by_name: "Sercan Öztürk", created_at: "2026-07-17T05:00:00Z", content: DOC_CONTENT },
  { id: "doc-p1-5", folder_id: "df-p1-2", project_id: "p-1", site_id: null, filename: "Hakediş_44.pdf", mime_type: "application/pdf", size_bytes: 1003520, description: null, uploaded_by_name: "Ayşe Demir", created_at: "2026-05-01T06:20:00Z", content: DOC_CONTENT },
  { id: "doc-p1-6", folder_id: "df-p1-2", project_id: "p-1", site_id: null, filename: "Metraj_Tablosu.xlsx", mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size_bytes: 1887436, description: null, uploaded_by_name: "Kadir Arslan", created_at: "2026-04-15T06:20:00Z", content: DOC_CONTENT },
  { id: "doc-p1-7", folder_id: "df-p1-1", project_id: "p-1", site_id: null, filename: "Ana_Sözleşme_2025.pdf", mime_type: "application/pdf", size_bytes: 512000, description: "İmzalı nüsha", uploaded_by_name: "Ahmet Yılmaz", created_at: "2025-03-05T06:20:00Z", content: DOC_CONTENT },
  // Şantiye düzeyi (ŞB kart ızgarası, mockup satır 94–134) — `site_id` DOLU.
  { id: "doc-s1-1", folder_id: "df-s1-2", project_id: "p-1", site_id: "s-1", filename: "Hakediş_5_Jul2026.pdf", mime_type: "application/pdf", size_bytes: 1258291, description: null, uploaded_by_name: "Sercan Öztürk", created_at: "2026-07-17T06:00:00Z", content: DOC_CONTENT },
  { id: "doc-s1-2", folder_id: "df-s1-2", project_id: "p-1", site_id: "s-1", filename: "Puantaj_Tem2026.xlsx", mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size_bytes: 860160, description: null, uploaded_by_name: "Sercan Öztürk", created_at: "2026-07-16T06:00:00Z", content: DOC_CONTENT },
  { id: "doc-s1-3", folder_id: "df-s1-6", project_id: "p-1", site_id: "s-1", filename: "Kat8_Beton_Foto.jpg", mime_type: "image/jpeg", size_bytes: 3565158, description: null, uploaded_by_name: "Sercan Öztürk", created_at: "2026-07-17T07:00:00Z", content: DOC_CONTENT },
  { id: "doc-s1-4", folder_id: "df-s1-4", project_id: "p-1", site_id: "s-1", filename: "Yapı_Ruhsatı_2025.pdf", mime_type: "application/pdf", size_bytes: 2202009, description: null, uploaded_by_name: "Ahmet Yılmaz", created_at: "2025-03-10T06:00:00Z", content: DOC_CONTENT },
  { id: "doc-s1-5", folder_id: "df-s1-3", project_id: "p-1", site_id: "s-1", filename: "Mimari_Proje_Rev3.dwg", mime_type: "image/vnd.dwg", size_bytes: 18874368, description: null, uploaded_by_name: "Kadir Arslan", created_at: "2026-01-12T06:00:00Z", content: DOC_CONTENT },
  { id: "doc-s1-6", folder_id: "df-s1-4", project_id: "p-1", site_id: "s-1", filename: "Zemin_Etüdü_Raporu.pdf", mime_type: "application/pdf", size_bytes: 4404019, description: null, uploaded_by_name: "Kadir Arslan", created_at: "2025-03-20T06:00:00Z", content: DOC_CONTENT },
  { id: "doc-s1-7", folder_id: "df-s1-2", project_id: "p-1", site_id: "s-1", filename: "BOQ_ABlok_v4.xlsx", mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size_bytes: 1887436, description: null, uploaded_by_name: "Kadir Arslan", created_at: "2026-07-10T06:00:00Z", content: DOC_CONTENT },
  // ŞB "SON EKLENENLER" listesi (satır 137–164) — meta alt satırı `description`ten gelir.
  { id: "doc-s1-8", folder_id: "df-s1-5", project_id: "p-1", site_id: "s-1", filename: "Günlük_Rapor_17.07.2026.pdf", mime_type: "application/pdf", size_bytes: 250880, description: "Şantiye Şefi: S. Öztürk", uploaded_by_name: "Sercan Öztürk", created_at: "2026-07-17T12:30:00Z", content: DOC_CONTENT },
  { id: "doc-s1-9", folder_id: "df-s1-6", project_id: "p-1", site_id: "s-1", filename: "Santiye_Foto_Tem2026.zip", mime_type: "application/zip", size_bytes: 50331648, description: "48 fotoğraf", uploaded_by_name: "Sercan Öztürk", created_at: "2026-07-16T12:00:00Z", content: DOC_CONTENT },
  { id: "doc-s1-10", folder_id: "df-s1-7", project_id: "p-1", site_id: "s-1", filename: "ISG_Kontrol_Listesi_Tem.pdf", mime_type: "application/pdf", size_bytes: 327680, description: "Aylık denetim", uploaded_by_name: "Yusuf Kaya", created_at: "2026-07-14T09:00:00Z", content: DOC_CONTENT },
];

// --- F-ST T1 · Stok & Depo fikstürleri ------------------------------------
//
// ŞEMA SENKRONU (F-P5 dersi): aşağıdaki gövdeler `openapi/openapi.json`
// şemalarıyla BİREBİRDİR (`StockItemResponse` · `StockSummaryRow` ·
// `SiteStockRow` · `WarehouseResponse` · `StockEntryResponse`). Uydurma alan
// EKLENMEZ — mock'ta olup şemada olmayan alan canlıda kırılma demektir.
//
// TÜREV KURALI (backend spec §3): `balance` ve `status` KOLON DEĞİLDİR.
// Bakiye hareketlerden toplanır, durum `min_stock`tan hesaplanır ve bu hesap
// **YALNIZ BURADA (sunucu tarafında)** yapılır. İstemci hiçbir yerde durumu
// yeniden üretmez — bu mock o sözleşmenin e2e kapısıdır.

interface MockWarehouse {
  id: string;
  name: string;
  site_id: string | null;
  created_at: string;
}

interface MockStockItem {
  id: string;
  code: string;
  name: string;
  category: "structural" | "steel" | "electrical" | "mechanical" | "interior";
  unit: string;
  min_stock: string | null;
  is_active: boolean;
  created_at: string;
}

interface MockStockEntryLine {
  id: string;
  item_id: string;
  quantity: string;
  unit_price: string | null;
  quality: "ok" | "defective" | "rejected";
}

interface MockStockEntry {
  id: string;
  entry_type: "purchase" | "transfer" | "adjustment";
  entry_date: string;
  warehouse_id: string;
  source_warehouse_id: string | null;
  supplier_name: string | null;
  delivery_note_no: string | null;
  received_by_user_id: string | null;
  note: string | null;
  created_at: string;
  lines: MockStockEntryLine[];
}

/**
 * Depolar — E3 "Depo" sütununun (satır 130/148/…) dört adı + SG 84'teki
 * merkez depo. `site_id: null` MERKEZ DEPO demektir ve hiçbir şantiyenin
 * bakiyesine girmez.
 */
const WAREHOUSE_FIXTURES: MockWarehouse[] = [
  { id: "wh-0", name: "Merkez Depo (Sincan)", site_id: null, created_at: "2025-03-01T08:00:00Z" },
  { id: "wh-1", name: "D-1 Ambar", site_id: "s-1", created_at: "2025-03-01T08:01:00Z" },
  { id: "wh-2", name: "D-2 Açık Alan", site_id: "s-1", created_at: "2025-03-01T08:02:00Z" },
  { id: "wh-3", name: "D-3 Kapalı", site_id: "s-2", created_at: "2025-03-01T08:03:00Z" },
  { id: "wh-4", name: "Şantiye", site_id: "s-1", created_at: "2025-03-01T08:04:00Z" },
];

/**
 * Malzeme kartları — E3 tablosunun YEDİ satırı BİREBİR (kod/ad/kategori/
 * birim/min stok: mockup 108-185) + eşiksiz bir sekizinci kart.
 *
 * `it-8` bilerek `min_stock: null` taşır: durum hücresinin "—" bastığı ve
 * fiyatsız kalemin `items_without_price` sayacına düştüğü tek satırdır.
 */
const STOCK_ITEM_FIXTURES: MockStockItem[] = [
  { id: "it-1", code: "SNK-0421", name: "Nervürlü Demir Ø12", category: "steel", unit: "Ton", min_stock: "10.000", is_active: true, created_at: "2025-03-05T08:00:00Z" },
  { id: "it-2", code: "SNK-0108", name: "CTP32,5 Çimento", category: "structural", unit: "Torba", min_stock: "200.000", is_active: true, created_at: "2025-03-05T08:01:00Z" },
  { id: "it-3", code: "ELK-0334", name: "NYY 4x16 Kablo", category: "electrical", unit: "Metre", min_stock: "150.000", is_active: true, created_at: "2025-03-05T08:02:00Z" },
  { id: "it-4", code: "SNK-0055", name: "Tuğla 19x9x13", category: "structural", unit: "Adet", min_stock: "5000.000", is_active: true, created_at: "2025-03-05T08:03:00Z" },
  { id: "it-5", code: "SNK-0201", name: "C25/30 Hazır Beton", category: "structural", unit: "m³", min_stock: "20.000", is_active: true, created_at: "2025-03-05T08:04:00Z" },
  { id: "it-6", code: "MKN-0192", name: "Su Borusu PP-R 32mm", category: "mechanical", unit: "Metre", min_stock: "80.000", is_active: true, created_at: "2025-03-05T08:05:00Z" },
  { id: "it-7", code: "SNK-0447", name: "Alçı Levha 12.5mm", category: "interior", unit: "Adet", min_stock: "500.000", is_active: true, created_at: "2025-03-05T08:06:00Z" },
  { id: "it-8", code: "ICY-0090", name: "İzolasyon Bandı", category: "interior", unit: "Adet", min_stock: null, is_active: true, created_at: "2025-03-05T08:07:00Z" },
];

/**
 * Hareketler — bakiyeler E3'ün "Stok" sütunuyla BİREBİR çıksın diye kurulmuş
 * tek giriş dizisi (kritik/düşük/normal/fazla durumlarının HEPSİ kapsanır):
 * demir 2,4 (kritik) · çimento 840 (normal) · kablo 120 (düşük) · tuğla 12.400
 * (normal) · beton 85 (normal) · PP-R 30 (kritik) · alçı 2.800 (fazla).
 *
 * `se-8` FİYATSIZ bir `adjustment`tır: eşiksiz karta bakiye yazar ama toplam
 * stok değerine GİRMEZ (`items_without_price` sayacı bu yüzden 1'dir).
 */
const STOCK_ENTRY_FIXTURES: MockStockEntry[] = [
  { id: "se-1", entry_type: "purchase", entry_date: "2026-07-02", warehouse_id: "wh-1", source_warehouse_id: null, supplier_name: "Çelik San. A.Ş.", delivery_note_no: "İRS-10421", received_by_user_id: "u-2", note: null, created_at: "2026-07-02T08:00:00Z", lines: [{ id: "sel-1", item_id: "it-1", quantity: "2.400", unit_price: "32000.00", quality: "ok" }] },
  { id: "se-2", entry_type: "purchase", entry_date: "2026-07-03", warehouse_id: "wh-2", source_warehouse_id: null, supplier_name: "Çimsa Bayi", delivery_note_no: "İRS-10422", received_by_user_id: "u-2", note: null, created_at: "2026-07-03T08:00:00Z", lines: [{ id: "sel-2", item_id: "it-2", quantity: "840.000", unit_price: "180.00", quality: "ok" }] },
  { id: "se-3", entry_type: "purchase", entry_date: "2026-07-04", warehouse_id: "wh-1", source_warehouse_id: null, supplier_name: "Elektrik Ticaret", delivery_note_no: "İRS-10423", received_by_user_id: "u-2", note: null, created_at: "2026-07-04T08:00:00Z", lines: [{ id: "sel-3", item_id: "it-3", quantity: "120.000", unit_price: "95.00", quality: "ok" }] },
  { id: "se-4", entry_type: "purchase", entry_date: "2026-07-05", warehouse_id: "wh-2", source_warehouse_id: null, supplier_name: "Tuğla Sanayi", delivery_note_no: "İRS-10424", received_by_user_id: "u-2", note: null, created_at: "2026-07-05T08:00:00Z", lines: [{ id: "sel-4", item_id: "it-4", quantity: "12400.000", unit_price: "12.00", quality: "ok" }] },
  { id: "se-5", entry_type: "purchase", entry_date: "2026-07-06", warehouse_id: "wh-4", source_warehouse_id: null, supplier_name: "Beton A.Ş.", delivery_note_no: "İRS-10425", received_by_user_id: "u-2", note: null, created_at: "2026-07-06T08:00:00Z", lines: [{ id: "sel-5", item_id: "it-5", quantity: "85.000", unit_price: "2400.00", quality: "ok" }] },
  { id: "se-6", entry_type: "purchase", entry_date: "2026-07-07", warehouse_id: "wh-1", source_warehouse_id: null, supplier_name: "Mekanik Ltd.", delivery_note_no: "İRS-10426", received_by_user_id: "u-2", note: null, created_at: "2026-07-07T08:00:00Z", lines: [{ id: "sel-6", item_id: "it-6", quantity: "30.000", unit_price: "45.00", quality: "ok" }] },
  { id: "se-7", entry_type: "purchase", entry_date: "2026-07-08", warehouse_id: "wh-3", source_warehouse_id: null, supplier_name: "İç Yapı Market", delivery_note_no: "İRS-10427", received_by_user_id: "u-2", note: null, created_at: "2026-07-08T08:00:00Z", lines: [{ id: "sel-7", item_id: "it-7", quantity: "2800.000", unit_price: "210.00", quality: "ok" }] },
  { id: "se-8", entry_type: "adjustment", entry_date: "2026-07-09", warehouse_id: "wh-1", source_warehouse_id: null, supplier_name: null, delivery_note_no: null, received_by_user_id: null, note: "Sayım farkı", created_at: "2026-07-09T08:00:00Z", lines: [{ id: "sel-8", item_id: "it-8", quantity: "40.000", unit_price: null, quality: "ok" }] },
];

/**
 * Durum formülü — backend spec §7 S1 (E3'ün yedi örnek satırından türetilmiş,
 * kullanıcı onaylı). Eşik YOKSA durum da YOKTUR (`null` ⇒ ekran "—" basar).
 */
const STOCK_CRITICAL_RATIO = 0.5;
const STOCK_EXCESS_RATIO = 5;

function stockStatusOf(balance: number, minStock: string | null): string | null {
  if (minStock === null) return null;
  const min = Number(minStock);
  if (balance < min * STOCK_CRITICAL_RATIO) return "critical";
  if (balance < min) return "low";
  if (balance > min * STOCK_EXCESS_RATIO) return "excess";
  return "normal";
}

/**
 * Bir kalemin depo bazlı bakiyeleri. Transfer ÇİFT BACAKLIDIR: hedef depoya
 * `+miktar`, kaynak depoya `-miktar` yazılır — tek bacak stok YARATIRDI.
 */
function stockBalancesByWarehouse(state: MockState, itemId: string): Map<string, number> {
  const balances = new Map<string, number>();
  const add = (warehouseId: string, amount: number) => {
    balances.set(warehouseId, (balances.get(warehouseId) ?? 0) + amount);
  };
  for (const entry of state.stockEntries) {
    for (const line of entry.lines) {
      if (line.item_id !== itemId) continue;
      const quantity = Number(line.quantity);
      add(entry.warehouse_id, quantity);
      if (entry.entry_type === "transfer" && entry.source_warehouse_id) {
        add(entry.source_warehouse_id, -quantity);
      }
    }
  }
  return balances;
}

/** Toplam stok değerinin kaynağı: kalemin SON giriş fiyatı (spec §7 S6). */
function stockLastUnitPrice(state: MockState, itemId: string): string | null {
  let last: string | null = null;
  for (const entry of state.stockEntries) {
    for (const line of entry.lines) {
      if (line.item_id === itemId && line.unit_price !== null) last = line.unit_price;
    }
  }
  return last;
}

function buildStockSummaryRow(state: MockState, item: MockStockItem) {
  const balances = stockBalancesByWarehouse(state, item.id);
  const total = [...balances.values()].reduce((sum, value) => sum + value, 0);
  const warehouses = [...balances.entries()]
    .filter(([, value]) => value !== 0)
    .map(([warehouseId, value]) => {
      const warehouse = state.warehouses.find((w) => w.id === warehouseId);
      return {
        warehouse_id: warehouseId,
        warehouse_name: warehouse?.name ?? "",
        site_id: warehouse?.site_id ?? null,
        balance: qty3(value),
      };
    });
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category,
    unit: item.unit,
    min_stock: item.min_stock,
    balance: qty3(total),
    status: stockStatusOf(total, item.min_stock),
    last_unit_price: stockLastUnitPrice(state, item.id),
    warehouses,
  };
}

/** `MetricPlaceholder`/`ListPlaceholder` zarfları — elle kurulmaz, tek yerden.
 *
 * ⚠️ F-ST T3 düzeltmesi: anahtarlar CANLI SUNUCUDAN alınır
 * (`app/modules/inventory/service.py`): "Bekleyen Sipariş" → `purchasing`,
 * ŞS "Aylık İhtiyaç"/"Bölüm" → `site_planning`. T2'de ikisi de `procurement`
 * yazılmıştı; mock ile şema ayrışırsa canlıda gerekçe metni sessizce genel
 * metne düşer (F-P5 dersi: mock ŞEMAYLA senkron olmalı). */
const STOCK_PENDING_ORDERS = METRIC_PENDING("purchasing");
const SITE_STOCK_PENDING_NEED = METRIC_PENDING("site_planning");
const SITE_STOCK_PENDING_SECTION = {
  available: false,
  items: [],
  pending_module: "site_planning",
};

function buildStockKpis(rows: ReturnType<typeof buildStockSummaryRow>[]) {
  let totalValue = 0;
  let withoutPrice = 0;
  for (const row of rows) {
    const balance = Number(row.balance);
    if (row.last_unit_price === null) {
      if (balance !== 0) withoutPrice += 1;
      continue;
    }
    totalValue += balance * Number(row.last_unit_price);
  }
  return {
    total_value: money2(totalValue),
    critical_count: rows.filter((r) => r.status === "critical").length,
    low_count: rows.filter((r) => r.status === "low").length,
    total_items: rows.length,
    items_without_price: withoutPrice,
  };
}

/**
 * BOŞ KATALOG kadrajı (`stok-genel-bos`) için hazır gövde.
 *
 * Paylaşılan mock durumu BOŞALTILMAZ (F-PL emsali): boş durum, görsel spec'in
 * `page.route` ile TEK bir GET yanıtını bu sabitle karşılamasıyla üretilir —
 * böylece başka spec'lerle yarış oluşmaz.
 */
export const EMPTY_STOCK_SUMMARY_RESPONSE = {
  items: [],
  total: 0,
  limit: 50,
  offset: 0,
  kpis: {
    total_value: "0.00",
    critical_count: 0,
    low_count: 0,
    total_items: 0,
    items_without_price: 0,
    pending_orders: STOCK_PENDING_ORDERS,
  },
};

// --- F-P8 T1 · Satış fikstürleri -------------------------------------------
//
// ŞEMA SENKRONU (F-P5 dersi): aşağıdaki gövdeler `openapi/openapi.json`
// şemalarıyla BİREBİRDİR (`CustomerResponse` · `UnitSaleResponse` ·
// `UnitSaleTotals` · `SalesSummaryResponse` · `SalePlanResponse` ·
// `SaleInstallmentResponse` · `UnitListResponse`). Uydurma alan EKLENMEZ.
//
// TÜREV KURALI (P8 backend kararları): `paid_amount` · `remaining_amount` ·
// `installment_*` sayaçları · gecikme faizi · "rezervasyon süresi doldu" ·
// KPI'ların tamamı KOLON DEĞİLDİR, **yalnız burada (sunucu tarafında)**
// hesaplanır. İstemci hiçbirini yeniden üretmez — bu mock o sözleşmenin
// e2e kapısıdır.
//
// 🔒 FİKSTÜR İZOLASYONU (F-ST/F-BC dersi):
//   · `p-1` (Kule A) → BASELINE KAYNAĞI. Üç satış (`sl-1` aktif · `sl-2` tapu
//     devredilmiş · `sl-3` süresi dolmuş rezervasyon) + altı ünite. Yazma
//     spec'leri buraya DOKUNMAZ; dokunursa `satis-listesi` kadrajı sessizce
//     kırılır.
//   · `p-2` (Villa B) → YAZMA ALANI. Sıfır satışla başlar, kendi bloğu ve üç
//     boş ünitesi vardır. Buraya yazılan satış `p-1`in liste/`totals`/KPI
//     türevlerinin HİÇBİRİNİ etkilemez.
// Boş liste kadrajı (`satis-listesi-bos`) paylaşılan durumu BOŞALTMAZ —
// F-PL/F-ST emsali: görsel spec `page.route` ile `EMPTY_SALES_*` sabitlerini
// döndürür.

/** Mock'un "bugün"ü — tüm gecikme/vade türevleri buna göre hesaplanır. */
const SALES_TODAY = "2026-08-12";

interface MockCustomer {
  id: string;
  customer_type: "person" | "company";
  name: string;
  national_id: string | null;
  tax_number: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

/**
 * Blok — `BlockResponse` şemasının satış ekranlarının ihtiyaç duyduğu alt
 * kümesi. `site_id`/`site_name` şemada ZORUNLUDUR; `p-2`nin bloğu kendi
 * şantiye künyesini taşır (`state.sites` bu yüzey tarafından okunmaz).
 */
interface MockUnitBlock {
  id: string;
  project_id: string;
  name: string;
  site_id: string;
  site_name: string;
  sort_order: number;
}

interface MockUnit {
  id: string;
  project_id: string;
  block_id: string;
  unit_no: string;
  unit_kind: "apartment" | "shop" | "office" | "warehouse" | "parking";
  layout: string | null;
  gross_area_m2: string | null;
  net_area_m2: string | null;
  list_price: string | null;
  owner_side: "contractor" | "landowner" | null;
  floor: string | null;
  min_sale_price: string | null;
  vat_rate: string | null;
  /** SATIŞTAN TÜREVDİR — `POST /projects/{id}/sales` bunu sunucuda günceller. */
  sales_status: "listed" | "reserved" | "sold" | "closed";
  sort_order: number;
}

interface MockUnitSale {
  id: string;
  project_id: string;
  unit_id: string;
  customer_id: string;
  sale_type: "sale" | "reservation" | "pre_contract";
  status: "reservation" | "active" | "deed_transferred" | "cancelled";
  list_price_snapshot: string | null;
  discount_amount: string | null;
  sale_price: string;
  vat_pct: string | null;
  advisor_user_id: string | null;
  reservation_deposit: string | null;
  reservation_due_date: string | null;
  deed_condition: "full_payment" | "after_down_payment" | "at_contract" | null;
  planned_deed_date: string | null;
  delivery_date: string | null;
  has_condominium_easement: boolean;
  has_mortgage: boolean;
  late_fee_monthly_pct: string | null;
  payment_plan_type: "cash" | "down_payment_installments" | "bank_loan" | "barter" | null;
  down_payment: string | null;
  installment_count: number | null;
  first_installment_date: string | null;
  term_interest_pct: string | null;
}

interface MockSaleInstallment {
  id: string;
  sale_id: string;
  sequence_no: number;
  label: string;
  due_date: string;
  amount: string;
  payment_method: "transfer" | "cash" | "cheque" | "auto_payment" | null;
  paid_amount: string;
  paid_at: string | null;
}

const CUSTOMER_FIXTURES: MockCustomer[] = [
  { id: "cus-1", customer_type: "person", name: "Ayşe Yılmaz", national_id: "12345678901", tax_number: null, phone: "0532 111 22 33", email: "ayse@ornek.com", address: "Çankaya / Ankara" },
  { id: "cus-2", customer_type: "company", name: "Demir İnşaat Ltd. Şti.", national_id: null, tax_number: "1234567890", phone: "0312 444 55 66", email: "info@demirinsaat.com", address: "Ostim / Ankara" },
  { id: "cus-3", customer_type: "person", name: "Murat Kaya", national_id: "98765432109", tax_number: null, phone: "0533 777 88 99", email: null, address: null },
];

const UNIT_BLOCK_FIXTURES: MockUnitBlock[] = [
  { id: "blk-1", project_id: "p-1", name: "A Blok", site_id: "s-1", site_name: "A-Blok Şantiyesi", sort_order: 0 },
  // 🔒 YAZMA ALANI — `p-2`nin bloğu (kendi şantiye künyesiyle).
  { id: "blk-2", project_id: "p-2", name: "Villa Blok", site_id: "s-p2-1", site_name: "Villa B Şantiyesi", sort_order: 0 },
];

/**
 * `u-6` bilerek `owner_side: "landowner"` taşır: satış denemesinin 422 aldığı
 * (P8 arsa sahibi kapısı) e2e kanıtının fikstürüdür.
 */
const UNIT_FIXTURES: MockUnit[] = [
  { id: "u-1", project_id: "p-1", block_id: "blk-1", unit_no: "1", unit_kind: "apartment", layout: "3+1", gross_area_m2: "145.00", net_area_m2: "120.00", list_price: "2500000.00", owner_side: "contractor", floor: "1", min_sale_price: "2300000.00", vat_rate: "1.00", sales_status: "sold", sort_order: 0 },
  { id: "u-2", project_id: "p-1", block_id: "blk-1", unit_no: "2", unit_kind: "apartment", layout: "4+1", gross_area_m2: "180.00", net_area_m2: "150.00", list_price: "3200000.00", owner_side: "contractor", floor: "2", min_sale_price: "3000000.00", vat_rate: "1.00", sales_status: "sold", sort_order: 1 },
  { id: "u-3", project_id: "p-1", block_id: "blk-1", unit_no: "3", unit_kind: "apartment", layout: "2+1", gross_area_m2: "110.00", net_area_m2: "92.00", list_price: "1900000.00", owner_side: "contractor", floor: "3", min_sale_price: null, vat_rate: "1.00", sales_status: "reserved", sort_order: 2 },
  { id: "u-4", project_id: "p-1", block_id: "blk-1", unit_no: "4", unit_kind: "apartment", layout: "3+1", gross_area_m2: "145.00", net_area_m2: "120.00", list_price: "2550000.00", owner_side: "contractor", floor: "4", min_sale_price: "2350000.00", vat_rate: "1.00", sales_status: "listed", sort_order: 3 },
  { id: "u-5", project_id: "p-1", block_id: "blk-1", unit_no: "5", unit_kind: "shop", layout: null, gross_area_m2: "85.00", net_area_m2: "78.00", list_price: "4100000.00", owner_side: "contractor", floor: "Zemin", min_sale_price: null, vat_rate: "20.00", sales_status: "listed", sort_order: 4 },
  { id: "u-6", project_id: "p-1", block_id: "blk-1", unit_no: "6", unit_kind: "apartment", layout: "2+1", gross_area_m2: "110.00", net_area_m2: "92.00", list_price: "1950000.00", owner_side: "landowner", floor: "5", min_sale_price: null, vat_rate: "1.00", sales_status: "listed", sort_order: 5 },
  // 🔒 YAZMA ALANI — üçü de boş, hiçbiri baseline kadrajına girmez.
  { id: "u-p2-1", project_id: "p-2", block_id: "blk-2", unit_no: "V1", unit_kind: "apartment", layout: "5+2", gross_area_m2: "320.00", net_area_m2: "270.00", list_price: "8400000.00", owner_side: "contractor", floor: "Müstakil", min_sale_price: null, vat_rate: "1.00", sales_status: "listed", sort_order: 0 },
  { id: "u-p2-2", project_id: "p-2", block_id: "blk-2", unit_no: "V2", unit_kind: "apartment", layout: "5+2", gross_area_m2: "320.00", net_area_m2: "270.00", list_price: "8400000.00", owner_side: "contractor", floor: "Müstakil", min_sale_price: null, vat_rate: "1.00", sales_status: "listed", sort_order: 1 },
  { id: "u-p2-3", project_id: "p-2", block_id: "blk-2", unit_no: "V3", unit_kind: "apartment", layout: "6+2", gross_area_m2: "380.00", net_area_m2: "320.00", list_price: "9800000.00", owner_side: "contractor", floor: "Müstakil", min_sale_price: null, vat_rate: "1.00", sales_status: "listed", sort_order: 2 },
];

const UNIT_SALE_FIXTURES: MockUnitSale[] = [
  {
    id: "sl-1", project_id: "p-1", unit_id: "u-1", customer_id: "cus-1", sale_type: "sale",
    status: "active", list_price_snapshot: "2500000.00", discount_amount: "100000.00",
    sale_price: "2400000.00", vat_pct: "1.00", advisor_user_id: "u-1", reservation_deposit: null,
    reservation_due_date: null, deed_condition: "full_payment", planned_deed_date: "2026-12-01",
    delivery_date: "2026-11-01", has_condominium_easement: true, has_mortgage: false,
    late_fee_monthly_pct: "1.50", payment_plan_type: "down_payment_installments",
    down_payment: "600000.00", installment_count: 3, first_installment_date: "2026-07-05",
    term_interest_pct: "0.80",
  },
  {
    id: "sl-2", project_id: "p-1", unit_id: "u-2", customer_id: "cus-2", sale_type: "sale",
    status: "deed_transferred", list_price_snapshot: "3200000.00", discount_amount: "100000.00",
    sale_price: "3100000.00", vat_pct: "1.00", advisor_user_id: null, reservation_deposit: null,
    reservation_due_date: null, deed_condition: "full_payment", planned_deed_date: "2026-04-01",
    delivery_date: "2026-04-01", has_condominium_easement: true, has_mortgage: false,
    late_fee_monthly_pct: null, payment_plan_type: "cash", down_payment: null,
    installment_count: null, first_installment_date: null, term_interest_pct: null,
  },
  {
    // Vadesi GEÇMİŞ rezervasyon: `expired_reservations` türevinin kanıtı.
    // P8 kararı — otomatik iptal YOKTUR, yalnız gösterimdir.
    id: "sl-3", project_id: "p-1", unit_id: "u-3", customer_id: "cus-3", sale_type: "reservation",
    status: "reservation", list_price_snapshot: "1900000.00", discount_amount: null,
    sale_price: "1850000.00", vat_pct: "1.00", advisor_user_id: null,
    reservation_deposit: "50000.00", reservation_due_date: "2026-07-31", deed_condition: null,
    planned_deed_date: null, delivery_date: null, has_condominium_easement: false,
    has_mortgage: false, late_fee_monthly_pct: null, payment_plan_type: null, down_payment: null,
    installment_count: null, first_installment_date: null, term_interest_pct: null,
  },
];

/**
 * `sl-1`in planı: Σ = 2.400.000 = `sale_price` (P8 kuralı; `term_interest_pct`
 * planı ŞİŞİRMEZ). Peşinat ödenmiş, 1. taksit VADESİ GEÇMİŞ (gecikme faizi
 * türevinin kanıtı), 2-3. taksitler bekliyor.
 * `sl-2` peşin ödenmiştir; `sl-3` (rezervasyon) planSIZDIR.
 */
const SALE_INSTALLMENT_FIXTURES: MockSaleInstallment[] = [
  { id: "si-1", sale_id: "sl-1", sequence_no: 1, label: "Peşinat", due_date: "2026-06-05", amount: "600000.00", payment_method: "transfer", paid_amount: "600000.00", paid_at: "2026-06-05T10:00:00Z" },
  { id: "si-2", sale_id: "sl-1", sequence_no: 2, label: "1. Taksit", due_date: "2026-07-05", amount: "600000.00", payment_method: "transfer", paid_amount: "0.00", paid_at: null },
  { id: "si-3", sale_id: "sl-1", sequence_no: 3, label: "2. Taksit", due_date: "2026-09-05", amount: "600000.00", payment_method: "transfer", paid_amount: "0.00", paid_at: null },
  { id: "si-4", sale_id: "sl-1", sequence_no: 4, label: "3. Taksit", due_date: "2026-10-05", amount: "600000.00", payment_method: "cheque", paid_amount: "0.00", paid_at: null },
  { id: "si-5", sale_id: "sl-2", sequence_no: 1, label: "Peşin Ödeme", due_date: "2026-03-15", amount: "3100000.00", payment_method: "transfer", paid_amount: "3100000.00", paid_at: "2026-03-15T12:00:00Z" },
];

/** Gün farkı (UTC, saat dilimi kaymasız) — gecikme türevlerinin tek kaynağı. */
function daysBetween(fromIso: string, toIso: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY);
}

function saleInstallmentsOf(state: MockState, saleId: string): MockSaleInstallment[] {
  return state.saleInstallments
    .filter((i) => i.sale_id === saleId)
    .sort((a, b) => a.sequence_no - b.sequence_no);
}

/**
 * Gecikme faizi — P8 kararı gereği **yalnız GÖSTERİM TÜREVİ**: tahakkuk
 * edilmez, hiçbir yere yazılmaz. Aylık oran × gecikme ayı × kalan tutar.
 */
function installmentLateFee(sale: MockUnitSale, installment: MockSaleInstallment): number {
  const remaining = Number(installment.amount) - Number(installment.paid_amount);
  if (remaining <= 0) return 0;
  const daysOverdue = daysBetween(installment.due_date, SALES_TODAY);
  if (daysOverdue <= 0) return 0;
  const monthlyPct = Number(sale.late_fee_monthly_pct ?? 0);
  return (remaining * monthlyPct * daysOverdue) / (100 * 30);
}

function buildSaleInstallmentRead(sale: MockUnitSale, installment: MockSaleInstallment) {
  const remaining = Number(installment.amount) - Number(installment.paid_amount);
  return {
    id: installment.id,
    sale_id: installment.sale_id,
    sequence_no: installment.sequence_no,
    label: installment.label,
    due_date: installment.due_date,
    amount: installment.amount,
    payment_method: installment.payment_method,
    paid_amount: installment.paid_amount,
    paid_at: installment.paid_at,
    remaining_amount: money2(remaining),
    is_overdue: remaining > 0 && daysBetween(installment.due_date, SALES_TODAY) > 0,
  };
}

/** `SalePlanResponse` — toplamlar SUNUCUDAN; istemci `items`ten toplamaz. */
function buildSalePlanResponse(state: MockState, sale: MockUnitSale) {
  const items = saleInstallmentsOf(state, sale.id);
  const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
  const paid = items.reduce((sum, i) => sum + Number(i.paid_amount), 0);
  // Vade farkı BİLGİ alanıdır — planı ŞİŞİRMEZ (Σ = sale_price korunur).
  const termInterest = (Number(sale.sale_price) * Number(sale.term_interest_pct ?? 0)) / 100;
  return {
    sale_id: sale.id,
    sale_price: sale.sale_price,
    total_amount: money2(total),
    paid_amount: money2(paid),
    term_interest_amount: money2(termInterest),
    items: items.map((i) => buildSaleInstallmentRead(sale, i)),
  };
}

function buildUnitSaleResponse(state: MockState, sale: MockUnitSale) {
  const unit = state.units.find((u) => u.id === sale.unit_id);
  const block = state.unitBlocks.find((b) => b.id === unit?.block_id);
  const customer = state.customers.find((c) => c.id === sale.customer_id);
  const advisor = state.users.find((u) => u.id === sale.advisor_user_id);
  const items = saleInstallmentsOf(state, sale.id);
  const paid = items.reduce((sum, i) => sum + Number(i.paid_amount), 0);
  const overdue = items.filter(
    (i) =>
      Number(i.amount) - Number(i.paid_amount) > 0 && daysBetween(i.due_date, SALES_TODAY) > 0,
  );
  const blockName = block?.name ?? "";
  const unitNo = unit?.unit_no ?? "";
  return {
    id: sale.id,
    project_id: sale.project_id,
    unit_id: sale.unit_id,
    customer_id: sale.customer_id,
    sale_type: sale.sale_type,
    status: sale.status,
    block_name: blockName,
    unit_no: unitNo,
    unit_label: `${blockName} · ${unitNo}`,
    customer_name: customer?.name ?? "",
    customer_type: customer?.customer_type ?? "person",
    customer_national_id: customer?.national_id ?? null,
    customer_tax_number: customer?.tax_number ?? null,
    list_price_snapshot: sale.list_price_snapshot,
    discount_amount: sale.discount_amount,
    sale_price: sale.sale_price,
    vat_pct: sale.vat_pct,
    advisor_user_id: sale.advisor_user_id,
    advisor_name: advisor?.full_name ?? null,
    reservation_deposit: sale.reservation_deposit,
    reservation_due_date: sale.reservation_due_date,
    deed_condition: sale.deed_condition,
    planned_deed_date: sale.planned_deed_date,
    delivery_date: sale.delivery_date,
    has_condominium_easement: sale.has_condominium_easement,
    has_mortgage: sale.has_mortgage,
    late_fee_monthly_pct: sale.late_fee_monthly_pct,
    payment_plan_type: sale.payment_plan_type,
    down_payment: sale.down_payment,
    installment_count: sale.installment_count,
    first_installment_date: sale.first_installment_date,
    term_interest_pct: sale.term_interest_pct,
    paid_amount: money2(paid),
    remaining_amount: money2(Number(sale.sale_price) - paid),
    installment_total: items.length,
    installment_paid_count: items.filter((i) => Number(i.paid_amount) >= Number(i.amount)).length,
    overdue_installment_count: overdue.length,
    // P10 "Bu Satıştan Kâr" — maliyet/kâr GERÇEKTİR (zarf `available: true`).
    unit_cost: METRIC_VALUE(money2(Number(sale.sale_price) * 0.62)),
    sale_profit: METRIC_VALUE(money2(Number(sale.sale_price) * 0.38)),
    pending_modules: [],
  };
}

/** Satışları listeler — `cancelled` kayıtlar da döner (durum süzgeci İSTEMCİDE). */
function buildUnitSaleListResponse(state: MockState, projectId: string) {
  const sales = state.unitSales.filter((s) => s.project_id === projectId);
  const items = sales.map((s) => buildUnitSaleResponse(state, s));
  const active = items.filter((i) => i.status !== "cancelled");
  const salePriceTotal = active.reduce((sum, i) => sum + Number(i.sale_price), 0);
  const paidTotal = active.reduce((sum, i) => sum + Number(i.paid_amount), 0);
  return {
    totals: {
      count: active.length,
      sale_price_total: money2(salePriceTotal),
      paid_total: money2(paidTotal),
      remaining_total: money2(salePriceTotal - paidTotal),
    },
    items,
  };
}

/** `SalesSummaryResponse` — SY'nin beş KPI kutusunun TEK kaynağı. */
function buildSalesSummaryResponse(state: MockState, projectId: string) {
  const sales = state.unitSales.filter(
    (s) => s.project_id === projectId && s.status !== "cancelled",
  );
  const sold = sales.filter((s) => s.status === "active" || s.status === "deed_transferred");
  const reserved = sales.filter((s) => s.status === "reservation");
  const expired = reserved.filter(
    (s) => s.reservation_due_date !== null && s.reservation_due_date < SALES_TODAY,
  );
  const availableUnits = state.units.filter(
    (u) => u.project_id === projectId && u.sales_status === "listed",
  );

  const contracted = sales.reduce((sum, s) => sum + Number(s.sale_price), 0);
  const collected = sales.reduce(
    (sum, s) =>
      sum + saleInstallmentsOf(state, s.id).reduce((v, i) => v + Number(i.paid_amount), 0),
    0,
  );

  const overdueRows = sales.flatMap((sale) =>
    saleInstallmentsOf(state, sale.id)
      .filter(
        (i) =>
          Number(i.amount) - Number(i.paid_amount) > 0 &&
          daysBetween(i.due_date, SALES_TODAY) > 0,
      )
      .map((i) => ({ sale, installment: i })),
  );

  const upcoming = sales
    .flatMap((sale) =>
      saleInstallmentsOf(state, sale.id)
        .filter((i) => Number(i.amount) - Number(i.paid_amount) > 0)
        .map((i) => ({ sale, installment: i })),
    )
    .sort((a, b) => a.installment.due_date.localeCompare(b.installment.due_date))
    .slice(0, 5);

  return {
    project_id: projectId,
    as_of: SALES_TODAY,
    sold: {
      count: sold.length,
      deed_transferred_count: sold.filter((s) => s.status === "deed_transferred").length,
      amount: money2(sold.reduce((sum, s) => sum + Number(s.sale_price), 0)),
    },
    reserved: {
      count: reserved.length,
      expired_count: expired.length,
      amount: money2(reserved.reduce((sum, s) => sum + Number(s.sale_price), 0)),
    },
    available_units: {
      count: availableUnits.length,
      list_price_total: money2(
        availableUnits.reduce((sum, u) => sum + Number(u.list_price ?? 0), 0),
      ),
    },
    collection: {
      collected_amount: money2(collected),
      contracted_amount: money2(contracted),
      // Yüzde SUNUCUDAN; sözleşme tutarı 0 iken `null` (istemci bölme yapmaz).
      collection_pct: contracted > 0 ? money2((collected / contracted) * 100) : null,
    },
    overdue: {
      installment_count: overdueRows.length,
      amount: money2(
        overdueRows.reduce(
          (sum, r) => sum + Number(r.installment.amount) - Number(r.installment.paid_amount),
          0,
        ),
      ),
      late_fee_amount: money2(
        overdueRows.reduce((sum, r) => sum + installmentLateFee(r.sale, r.installment), 0),
      ),
    },
    upcoming_collections: upcoming.map(({ sale, installment }) => {
      const read = buildUnitSaleResponse(state, sale);
      const daysOverdue = Math.max(0, daysBetween(installment.due_date, SALES_TODAY));
      return {
        installment_id: installment.id,
        sale_id: sale.id,
        unit_label: read.unit_label,
        customer_name: read.customer_name,
        sequence_no: installment.sequence_no,
        label: installment.label,
        due_date: installment.due_date,
        amount: installment.amount,
        paid_amount: installment.paid_amount,
        remaining_amount: money2(Number(installment.amount) - Number(installment.paid_amount)),
        is_overdue: daysOverdue > 0,
        days_overdue: daysOverdue,
        late_fee_amount: money2(installmentLateFee(sale, installment)),
      };
    }),
    expired_reservations: expired.map((sale) => {
      const read = buildUnitSaleResponse(state, sale);
      return {
        sale_id: sale.id,
        unit_label: read.unit_label,
        customer_name: read.customer_name,
        reservation_due_date: sale.reservation_due_date as string,
        days_expired: daysBetween(sale.reservation_due_date as string, SALES_TODAY),
        reservation_deposit: sale.reservation_deposit,
      };
    }),
    pending_modules: [],
  };
}

function unitKindBreakdown(units: MockUnit[]) {
  const counts = { apartment: 0, shop: 0, office: 0, warehouse: 0, parking: 0 };
  for (const unit of units) counts[unit.unit_kind] += 1;
  return { ...counts, total: units.length };
}

function buildUnitResponse(state: MockState, unit: MockUnit) {
  const block = state.unitBlocks.find((b) => b.id === unit.block_id);
  const sale = state.unitSales.find(
    (s) => s.unit_id === unit.id && s.status !== "cancelled",
  );
  const customer = state.customers.find((c) => c.id === sale?.customer_id);
  const gross = Number(unit.gross_area_m2 ?? 0);
  const listPrice = Number(unit.list_price ?? 0);
  return {
    id: unit.id,
    block_id: unit.block_id,
    block_name: block?.name ?? "",
    unit_no: unit.unit_no,
    unit_kind: unit.unit_kind,
    layout: unit.layout,
    gross_area_m2: unit.gross_area_m2,
    net_area_m2: unit.net_area_m2,
    list_price: unit.list_price,
    appraisal_value: null,
    owner_side: unit.owner_side,
    sort_order: unit.sort_order,
    floor: unit.floor,
    facing: null,
    balcony_area_m2: null,
    bathroom_count: null,
    parking_right: null,
    min_sale_price: unit.min_sale_price,
    vat_rate: unit.vat_rate,
    sales_status: unit.sales_status,
    sale_price: sale?.sale_price ?? null,
    buyer_name: customer?.name ?? null,
    shareholder_id: null,
    shareholder_name: null,
    unit_cost: METRIC_VALUE(money2(listPrice * 0.62)),
    expected_profit: METRIC_VALUE(money2(listPrice * 0.38)),
    label: `${block?.name ?? ""} · ${unit.unit_no}`,
    unit_price_per_m2: gross > 0 ? money2(listPrice / gross) : null,
    is_landowner_share: unit.owner_side === "landowner",
  };
}

/** `UnitListResponse` — DS'nin ünite seçicisinin kaynağı (bloklara gruplu). */
function buildUnitListResponse(state: MockState, projectId: string) {
  const units = state.units
    .filter((u) => u.project_id === projectId)
    .sort((a, b) => a.sort_order - b.sort_order);
  const blocks = state.unitBlocks
    .filter((b) => b.project_id === projectId)
    .sort((a, b) => a.sort_order - b.sort_order);

  const totalListPrice = units.reduce((sum, u) => sum + Number(u.list_price ?? 0), 0);
  const totalGross = units.reduce((sum, u) => sum + Number(u.gross_area_m2 ?? 0), 0);
  const byStatus = { listed: 0, reserved: 0, sold: 0, closed: 0 };
  for (const unit of units) byStatus[unit.sales_status] += 1;
  const salesRevenue = state.unitSales
    .filter((s) => s.project_id === projectId && s.status !== "cancelled")
    .reduce((sum, s) => sum + Number(s.sale_price), 0);
  const soldCount = byStatus.sold + byStatus.closed;

  return {
    totals: {
      counts: unitKindBreakdown(units),
      value_basis: "list_price",
      total_value: money2(totalListPrice),
      average_value: units.length > 0 ? money2(totalListPrice / units.length) : null,
      total_list_price: money2(totalListPrice),
      total_appraisal_value: "0.00",
      total_gross_area_m2: money2(totalGross),
      sides: (["contractor", "landowner"] as const).map((side) => {
        const sideUnits = units.filter((u) => u.owner_side === side);
        const sideValue = sideUnits.reduce((sum, u) => sum + Number(u.list_price ?? 0), 0);
        return {
          side,
          counts: unitKindBreakdown(sideUnits),
          total_value: money2(sideValue),
          average_value: sideUnits.length > 0 ? money2(sideValue / sideUnits.length) : null,
          share_pct: totalListPrice > 0 ? money2((sideValue / totalListPrice) * 100) : null,
          sold: sideUnits.filter((u) => u.sales_status === "sold").length,
          reserved: sideUnits.filter((u) => u.sales_status === "reserved").length,
          listed: sideUnits.filter((u) => u.sales_status === "listed").length,
        };
      }),
      by_sales_status: byStatus,
      sold_units: soldCount,
      reserved_units: byStatus.reserved,
      available_units: byStatus.listed,
      sales_revenue: money2(salesRevenue),
      average_sale_price: soldCount > 0 ? money2(salesRevenue / soldCount) : null,
    },
    blocks: blocks.map((block) => {
      const blockUnits = units.filter((u) => u.block_id === block.id);
      return {
        block: {
          id: block.id,
          name: block.name,
          site_id: block.site_id,
          site_name: block.site_name,
          sort_order: block.sort_order,
          counts: unitKindBreakdown(blockUnits),
          code: null,
          basement_floor_count: null,
          floor_count: null,
          roof_type: null,
          units_per_floor: null,
          ground_floor_usage: null,
          shop_count: null,
          construction_area_m2: null,
          elevator_count: null,
          parking_type: null,
          estimated_delivery_date: null,
          status: null,
          notes: null,
          estimated_unit_count: null,
        },
        units: blockUnits.map((u) => buildUnitResponse(state, u)),
      };
    }),
  };
}

/**
 * Ünitenin `sales_status`u SATIŞTAN TÜREVDİR — satış açılınca/iptal edilince
 * sunucu günceller, istemci `PATCH /units` ile elle DEĞİŞTİREMEZ (P8 kararı:
 * elle giriş uçtan ÇIKARILDI).
 */
function syncUnitSalesStatus(state: MockState, unitId: string): void {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return;
  const open = state.unitSales.find((s) => s.unit_id === unitId && s.status !== "cancelled");
  if (!open) {
    unit.sales_status = "listed";
    return;
  }
  unit.sales_status = open.status === "reservation" ? "reserved" : "sold";
}

/**
 * `generate-plan` — kuruş dengelemesi SON TAKSİTTE, **Σ = `sale_price`**.
 * Vade farkı oranı planı ŞİŞİRMEZ (P8 onaylı sapması).
 */
function generateSalePlan(state: MockState, sale: MockUnitSale): MockSaleInstallment[] {
  const salePrice = Number(sale.sale_price);
  const downPayment = Number(sale.down_payment ?? 0);
  const count = sale.installment_count ?? 0;
  const rows: MockSaleInstallment[] = [];
  let sequence = 0;

  if (downPayment > 0) {
    sequence += 1;
    state.saleSeq += 1;
    rows.push({
      id: `si-new-${state.saleSeq}`,
      sale_id: sale.id,
      sequence_no: sequence,
      label: "Peşinat",
      due_date: sale.first_installment_date ?? SALES_TODAY,
      amount: money2(downPayment),
      payment_method: null,
      paid_amount: "0.00",
      paid_at: null,
    });
  }

  const remaining = salePrice - downPayment;
  if (count > 0 && remaining > 0) {
    // Kuruş dengelemesi: ilk n-1 taksit AŞAĞI yuvarlanır, artık SON taksite.
    const per = Math.floor((remaining * 100) / count) / 100;
    const base = sale.first_installment_date ?? SALES_TODAY;
    for (let index = 0; index < count; index += 1) {
      sequence += 1;
      state.saleSeq += 1;
      const due = new Date(`${base}T00:00:00Z`);
      due.setUTCMonth(due.getUTCMonth() + index + (downPayment > 0 ? 1 : 0));
      const amount = index === count - 1 ? remaining - per * (count - 1) : per;
      rows.push({
        id: `si-new-${state.saleSeq}`,
        sale_id: sale.id,
        sequence_no: sequence,
        label: `${index + 1}. Taksit`,
        due_date: due.toISOString().slice(0, 10),
        amount: money2(amount),
        payment_method: null,
        paid_amount: "0.00",
        paid_at: null,
      });
    }
  }
  return rows;
}

/**
 * BOŞ satış listesi + BOŞ KPI şeridi (`satis-listesi-bos` kadrajı) için hazır
 * gövdeler.
 *
 * Paylaşılan mock durumu BOŞALTILMAZ (F-PL/F-ST emsali): boş durum, görsel
 * spec'in `page.route` ile İKİ GET yanıtını bu sabitlerle karşılamasıyla
 * üretilir — böylece başka spec'lerle yarış oluşmaz.
 */
export const EMPTY_SALES_LIST_RESPONSE = {
  totals: {
    count: 0,
    sale_price_total: "0.00",
    paid_total: "0.00",
    remaining_total: "0.00",
  },
  items: [],
};

export const EMPTY_SALES_SUMMARY_RESPONSE = {
  project_id: "p-1",
  as_of: SALES_TODAY,
  sold: { count: 0, deed_transferred_count: 0, amount: "0.00" },
  reserved: { count: 0, expired_count: 0, amount: "0.00" },
  available_units: { count: 0, list_price_total: "0.00" },
  collection: {
    collected_amount: "0.00",
    contracted_amount: "0.00",
    // Sözleşme tutarı 0 iken yüzde `null`dur — istemci 0/0 bölmesi YAPMAZ.
    collection_pct: null,
  },
  overdue: { installment_count: 0, amount: "0.00", late_fee_amount: "0.00" },
  upcoming_collections: [],
  expired_reservations: [],
  pending_modules: [],
};

/** Künye — `content` DIŞARI VERİLMEZ (şemada yok). */
function buildDocumentRead(doc: MockDocument) {
  const { content: _content, ...rest } = doc;
  return rest;
}

function documentExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot < 0 ? "" : filename.slice(dot + 1).toLocaleLowerCase("tr");
}

interface MultipartPart {
  fields: Record<string, string>;
  file: { filename: string; mimeType: string; size: number } | null;
}

/**
 * Minimal multipart/form-data ayrıştırıcı.
 *
 * Var olma sebebi bir KAPI: BFF gövdeyi JSON'a çevirirse (ya da boundary'yi
 * yeniden üretirse) burada ayrıştırma BAŞARISIZ olur ve yükleme e2e'de 422
 * alır. Yani bu ayrıştırıcı, BFF'in ham geçirme davranışının canlı testidir.
 */
function parseMultipart(raw: Buffer, contentType: string): MultipartPart | null {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return null;
  const boundary = `--${(boundaryMatch[1] ?? boundaryMatch[2]).trim()}`;
  const segments = raw.toString("binary").split(boundary).slice(1, -1);
  if (segments.length === 0) return null;

  const fields: Record<string, string> = {};
  let file: MultipartPart["file"] = null;

  for (const segment of segments) {
    const withoutLeadingBreak = segment.startsWith("\r\n") ? segment.slice(2) : segment;
    const separator = withoutLeadingBreak.indexOf("\r\n\r\n");
    if (separator < 0) continue;
    const headerBlock = withoutLeadingBreak.slice(0, separator);
    let payload = withoutLeadingBreak.slice(separator + 4);
    if (payload.endsWith("\r\n")) payload = payload.slice(0, -2);

    const nameMatch = headerBlock.match(/name="([^"]*)"/i);
    if (!nameMatch) continue;
    const filenameMatch = headerBlock.match(/filename="([^"]*)"/i);
    if (filenameMatch) {
      const typeMatch = headerBlock.match(/content-type:\s*([^\r\n]+)/i);
      file = {
        // Başlıklar latin1 okundu; Türkçe dosya adı için UTF-8'e çevrilir.
        filename: Buffer.from(filenameMatch[1], "binary").toString("utf8"),
        mimeType: typeMatch ? typeMatch[1].trim() : "application/octet-stream",
        size: Buffer.byteLength(payload, "binary"),
      };
    } else {
      fields[nameMatch[1]] = Buffer.from(payload, "binary").toString("utf8");
    }
  }
  return { fields, file };
}

// --- F-SA T1 · Satınalma fikstürleri --------------------------------------
//
// 🔒 FİKSTÜR İZOLASYONU (F-ST/F-BC/F-P8 dersi): buradaki HİÇBİR kayıt mevcut
// bir ekranın verisini DEĞİŞTİRMEZ. Satınalma varlıkları (tedarikçi · talep ·
// teklif · sipariş) YENİ dizilerdir ve YALNIZCA `/suppliers`,
// `/purchase-requests*`, `/purchase-orders*`, `/purchasing/summary`
// rotalarından servis edilir. Proje/şantiye/stok kartlarına yapılan atıflar
// SALT-OKURDUR (`p-1`, `s-1`, `it-*`): stok BAKİYESİ okunur ama hiçbir stok
// hareketi YAZILMAZ → stok katalog/şantiye stok baseline'ları oynamaz.

/** Satınalma mock'unun "bugün"ü — gecikme türevleri buna göre kurulmuştur. */
const PURCHASING_TODAY = "2026-08-12";

type MockPaymentTerms = components["schemas"]["PaymentTerms"];

interface MockSupplier {
  id: string;
  name: string;
  category: string | null;
  tax_no: string | null;
  phone: string | null;
  payment_terms: MockPaymentTerms;
  is_active: boolean;
  created_at: string;
}

interface MockPurchaseRequestLine {
  id: string;
  sort_order: number;
  stock_item_id: string | null;
  free_text_name: string | null;
  free_text_unit: string | null;
  quantity: string;
  /** `null` = FİYAT BİLİNMİYOR. "0 TL" DEĞİLDİR (NULL-eşik kanonu). */
  estimated_unit_price: string | null;
}

interface MockPurchaseRequest {
  id: string;
  request_no: string;
  request_date: string;
  priority: components["schemas"]["PurchasePriority"];
  project_id: string;
  site_id: string | null;
  section_id: string | null;
  needed_by: string | null;
  justification: string | null;
  status: components["schemas"]["PurchaseRequestStatus"];
  quote_deadline: string | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_by_user_id: string;
  created_at: string;
  lines: MockPurchaseRequestLine[];
}

interface MockPurchaseQuote {
  id: string;
  request_id: string;
  supplier_id: string;
  unit_price: string;
  /** SERBEST METİN — sıralanamaz, "EN HIZLI" rozeti bu yüzden sunucuda YOK. */
  delivery_time: string;
  warranty_note: string | null;
  payment_terms: MockPaymentTerms;
  shipping_included: boolean;
  shipping_cost: string | null;
  is_selected: boolean;
  created_at: string;
}

interface MockPurchaseOrder {
  id: string;
  order_no: string;
  request_id: string | null;
  quote_id: string | null;
  supplier_id: string;
  project_id: string;
  total_amount: string;
  expected_delivery: string | null;
  status: components["schemas"]["PurchaseOrderStatus"];
  note: string | null;
  created_by_user_id: string;
  created_at: string;
}

const SUPPLIER_FIXTURES: MockSupplier[] = [
  { id: "sup-1", name: "Yıldız Hazır Beton A.Ş.", category: "Hazır Beton", tax_no: "1234567890", phone: "0312 111 22 33", payment_terms: "days_30", is_active: true, created_at: "2025-01-10T08:00:00Z" },
  { id: "sup-2", name: "Demir Çelik Ticaret Ltd.", category: "İnşaat Demiri", tax_no: "2345678901", phone: "0312 222 33 44", payment_terms: "days_60", is_active: true, created_at: "2025-01-11T08:00:00Z" },
  { id: "sup-3", name: "Anadolu Elektrik Malzeme", category: "Elektrik", tax_no: "3456789012", phone: "0312 333 44 55", payment_terms: "cash", is_active: true, created_at: "2025-01-12T08:00:00Z" },
  // 🔎 Siparişsiz + PASİF tedarikçi: kart türevinin `null` DEĞİL SIFIR
  // döndüğünü ve `is_active=false` süzgecinin gerçekten süzdüğünü kanıtlar.
  { id: "sup-4", name: "Eski Nakliyat Ltd.", category: null, tax_no: null, phone: null, payment_terms: "days_15", is_active: false, created_at: "2025-01-13T08:00:00Z" },
];

/**
 * Talepler — ALTI durumun HEPSİ temsil edilir (SAT sekme şeridi + rozetler).
 *
 * 🔴 NULL-EŞİK KANONU FİKSTÜRÜ (SA dersi, T4'te kullanılacak): `pr-2`nin
 * ikinci kalemi FİYATSIZDIR (`estimated_unit_price: null`). Talebin
 * `estimated_total`ı yalnız fiyatı BİLİNEN kalemleri toplar; ekran bu tutarı
 * "kesin toplam" gibi basamaz ve fiyatsız kalemi "0 TL" gösteremez.
 * `pr-2` ayrıca katalogsuz (serbest) kalem taşır → `current_stock` `null`
 * gelir ("stokta yok" ile "stok kartı bile yok" ayrımı).
 */
const PURCHASE_REQUEST_FIXTURES: MockPurchaseRequest[] = [
  {
    id: "pr-1", request_no: "SAT-2026-0001", request_date: "2026-08-10", priority: "urgent",
    project_id: "p-1", site_id: "s-1", section_id: null, needed_by: "2026-08-20",
    justification: "Kalıp imalatı için acil demir ihtiyacı.", status: "quote_wait",
    quote_deadline: "2026-08-15", approved_by_user_id: "u-1", approved_at: "2026-08-10T12:00:00Z",
    rejected_at: null, rejection_reason: null, created_by_user_id: "u-1",
    created_at: "2026-08-10T08:00:00Z",
    lines: [
      { id: "prl-1", sort_order: 0, stock_item_id: "it-1", free_text_name: null, free_text_unit: null, quantity: "12.000", estimated_unit_price: "28500.00" },
    ],
  },
  {
    id: "pr-2", request_no: "SAT-2026-0002", request_date: "2026-08-11", priority: "normal",
    project_id: "p-1", site_id: "s-1", section_id: null, needed_by: "2026-09-01",
    justification: "İnce işler hazırlığı.", status: "pending_approval",
    quote_deadline: null, approved_by_user_id: null, approved_at: null,
    rejected_at: null, rejection_reason: null, created_by_user_id: "u-1",
    created_at: "2026-08-11T09:00:00Z",
    lines: [
      { id: "prl-2", sort_order: 0, stock_item_id: "it-2", free_text_name: null, free_text_unit: null, quantity: "400.000", estimated_unit_price: "185.00" },
      // 🔴 FİYATSIZ + KATALOGSUZ kalem — iki `null` türevin kaynağı.
      { id: "prl-3", sort_order: 1, stock_item_id: null, free_text_name: "Özel kalıp yağı", free_text_unit: "Litre", quantity: "60.000", estimated_unit_price: null },
    ],
  },
  {
    id: "pr-3", request_no: "SAT-2026-0003", request_date: "2026-08-12", priority: "critical",
    project_id: "p-1", site_id: "s-1", section_id: null, needed_by: "2026-08-18",
    justification: null, status: "draft",
    quote_deadline: null, approved_by_user_id: null, approved_at: null,
    rejected_at: null, rejection_reason: null, created_by_user_id: "u-1",
    created_at: "2026-08-12T07:30:00Z",
    lines: [
      { id: "prl-4", sort_order: 0, stock_item_id: "it-3", free_text_name: null, free_text_unit: null, quantity: "300.000", estimated_unit_price: "142.50" },
    ],
  },
  {
    id: "pr-4", request_no: "SAT-2026-0004", request_date: "2026-08-05", priority: "normal",
    project_id: "p-1", site_id: "s-1", section_id: null, needed_by: "2026-08-14",
    justification: "Beton dökümü.", status: "ordered",
    quote_deadline: "2026-08-08", approved_by_user_id: "u-1", approved_at: "2026-08-05T14:00:00Z",
    rejected_at: null, rejection_reason: null, created_by_user_id: "u-1",
    created_at: "2026-08-05T08:00:00Z",
    lines: [
      { id: "prl-5", sort_order: 0, stock_item_id: "it-5", free_text_name: null, free_text_unit: null, quantity: "90.000", estimated_unit_price: "2450.00" },
    ],
  },
  {
    id: "pr-5", request_no: "SAT-2026-0005", request_date: "2026-07-28", priority: "normal",
    project_id: "p-1", site_id: "s-1", section_id: null, needed_by: "2026-08-05",
    justification: "Duvar imalatı.", status: "delivered",
    quote_deadline: null, approved_by_user_id: "u-1", approved_at: "2026-07-28T10:00:00Z",
    rejected_at: null, rejection_reason: null, created_by_user_id: "u-1",
    created_at: "2026-07-28T08:00:00Z",
    lines: [
      { id: "prl-6", sort_order: 0, stock_item_id: "it-4", free_text_name: null, free_text_unit: null, quantity: "8000.000", estimated_unit_price: "9.75" },
    ],
  },
  {
    id: "pr-6", request_no: "SAT-2026-0006", request_date: "2026-07-20", priority: "urgent",
    project_id: "p-1", site_id: "s-1", section_id: null, needed_by: "2026-07-30",
    justification: "Bütçe dışı talep.", status: "rejected",
    quote_deadline: null, approved_by_user_id: null, approved_at: null,
    rejected_at: "2026-07-21T09:00:00Z", rejection_reason: "Bütçe kalemi bu ay kapalı.",
    created_by_user_id: "u-1", created_at: "2026-07-20T08:00:00Z",
    lines: [
      { id: "prl-7", sort_order: 0, stock_item_id: "it-7", free_text_name: null, free_text_unit: null, quantity: "600.000", estimated_unit_price: "310.00" },
    ],
  },
];

/**
 * `pr-1`in üç teklifi — TEK ekranının karşılaştırma kartları.
 *
 * 🔎 "EN İYİ FİYAT" TUZAĞININ FİKSTÜRÜ: `q-2`nin BİRİM FİYATI en düşüktür
 * (27.900) ama nakliyesi HARİÇTİR (+42.000) → toplam maliyette `q-1` kazanır.
 * Rozet birim fiyata bakılarak verilseydi yanlış tedarikçi öne çıkardı.
 */
const PURCHASE_QUOTE_FIXTURES: MockPurchaseQuote[] = [
  { id: "q-1", request_id: "pr-1", supplier_id: "sup-2", unit_price: "28200.00", delivery_time: "3 iş günü", warranty_note: "TSE belgeli", payment_terms: "days_30", shipping_included: true, shipping_cost: null, is_selected: false, created_at: "2026-08-11T10:00:00Z" },
  { id: "q-2", request_id: "pr-1", supplier_id: "sup-1", unit_price: "27900.00", delivery_time: "Yarın sabah", warranty_note: null, payment_terms: "cash", shipping_included: false, shipping_cost: "42000.00", is_selected: false, created_at: "2026-08-11T11:00:00Z" },
  { id: "q-3", request_id: "pr-1", supplier_id: "sup-3", unit_price: "29100.00", delivery_time: "1 hafta", warranty_note: "2 yıl garanti", payment_terms: "days_60", shipping_included: true, shipping_cost: null, is_selected: false, created_at: "2026-08-11T12:00:00Z" },
];

/**
 * Siparişler — üç durumun hepsi + TALEPSİZ (doğrudan) sipariş.
 * `po-3` gecikmiş teslimat tarihi taşır (SIP'in renk TÜREVİ istemcidedir).
 */
const PURCHASE_ORDER_FIXTURES: MockPurchaseOrder[] = [
  { id: "po-1", order_no: "SP-2026-0001", request_id: "pr-4", quote_id: null, supplier_id: "sup-1", project_id: "p-1", total_amount: "220500.00", expected_delivery: "2026-08-14", status: "in_transit", note: null, created_by_user_id: "u-1", created_at: "2026-08-06T08:00:00Z" },
  { id: "po-2", order_no: "SP-2026-0002", request_id: "pr-5", quote_id: null, supplier_id: "sup-2", project_id: "p-1", total_amount: "78000.00", expected_delivery: "2026-08-04", status: "delivered", note: null, created_by_user_id: "u-1", created_at: "2026-07-29T08:00:00Z" },
  // TALEPSİZ (doğrudan) sipariş — `request_id` nullable (SA §7 S3 kararı).
  { id: "po-3", order_no: "SP-2026-0003", request_id: null, quote_id: null, supplier_id: "sup-3", project_id: "p-1", total_amount: "45600.00", expected_delivery: "2026-08-08", status: "approved", note: "Doğrudan alım.", created_by_user_id: "u-1", created_at: "2026-08-01T08:00:00Z" },
];

function supplierName(state: MockState, supplierId: string): string {
  return state.suppliers.find((s) => s.id === supplierId)?.name ?? "Bilinmeyen tedarikçi";
}

/** Kalemin toplam stok bakiyesi — SALT-OKUR (hiçbir hareket yazılmaz). */
function purchaseLineCurrentStock(state: MockState, stockItemId: string | null): string | null {
  if (!stockItemId) return null;
  const balances = stockBalancesByWarehouse(state, stockItemId);
  let total = 0;
  for (const amount of balances.values()) total += amount;
  return qty3(total);
}

function buildPurchaseRequestLine(
  state: MockState,
  line: MockPurchaseRequestLine,
): components["schemas"]["PurchaseRequestLineResponse"] {
  const item = line.stock_item_id
    ? state.stockItems.find((i) => i.id === line.stock_item_id)
    : undefined;
  const lineTotal =
    line.estimated_unit_price === null
      ? null
      : money2(Number(line.quantity) * Number(line.estimated_unit_price));
  return {
    id: line.id,
    sort_order: line.sort_order,
    stock_item_id: line.stock_item_id,
    stock_item_code: item?.code ?? null,
    free_text_name: line.free_text_name,
    free_text_unit: line.free_text_unit,
    name: item?.name ?? line.free_text_name ?? "",
    unit: item?.unit ?? line.free_text_unit ?? null,
    quantity: line.quantity,
    estimated_unit_price: line.estimated_unit_price,
    line_total: lineTotal,
    current_stock: purchaseLineCurrentStock(state, line.stock_item_id),
  };
}

/**
 * ⚠️ FİYATSIZ KALEM TOPLAMA GİRMEZ (NULL-eşik kanonu): sessizce 0 sayılsaydı
 * "tahmini toplam neden düşük" sorusu cevapsız kalırdı.
 */
function purchaseRequestEstimatedTotal(request: MockPurchaseRequest): string {
  let total = 0;
  for (const line of request.lines) {
    if (line.estimated_unit_price === null) continue;
    total += Number(line.quantity) * Number(line.estimated_unit_price);
  }
  return money2(total);
}

function buildPurchaseRequestRow(
  request: MockPurchaseRequest,
): components["schemas"]["PurchaseRequestListRow"] {
  return {
    id: request.id,
    request_no: request.request_no,
    request_date: request.request_date,
    priority: request.priority,
    project_id: request.project_id,
    site_id: request.site_id,
    section_id: request.section_id,
    needed_by: request.needed_by,
    justification: request.justification,
    status: request.status,
    quote_deadline: request.quote_deadline,
    approved_by_user_id: request.approved_by_user_id,
    approved_at: request.approved_at,
    rejected_at: request.rejected_at,
    rejection_reason: request.rejection_reason,
    created_by_user_id: request.created_by_user_id,
    created_at: request.created_at,
    estimated_total: purchaseRequestEstimatedTotal(request),
    can_delete: request.status === "draft",
    // ⚠️ SATIR KALEM TAŞIMAZ (şema kararı) — yalnız SAYISI.
    line_count: request.lines.length,
  };
}

function buildPurchaseRequestDetail(
  state: MockState,
  request: MockPurchaseRequest,
): components["schemas"]["PurchaseRequestResponse"] {
  // Detay gövdesi (`PurchaseRequestResponse`) liste satırının alanlarını
  // taşır AMA `line_count` TAŞIMAZ: kalemlerin kendisi zaten gövdededir
  // (şemada alan yoktur; fazladan basmak mock-şema senkronunu bozar).
  const { line_count: _lineCount, ...header } = buildPurchaseRequestRow(request);
  void _lineCount;
  return {
    ...header,
    lines: request.lines.map((line) => buildPurchaseRequestLine(state, line)),
  };
}

/** Talebin toplam miktarı — `total_cost`un çarpanı (yanıtta da döner). */
function requestQuantityTotal(request: MockPurchaseRequest): number {
  return request.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
}

function quoteTotalCost(quote: MockPurchaseQuote, quantityTotal: number): number {
  const base = Number(quote.unit_price) * quantityTotal;
  if (quote.shipping_included) return base;
  return base + Number(quote.shipping_cost ?? "0");
}

/**
 * `total_cost` SUNUCU türevidir ve rozet ONUN üzerinden verilir — birim fiyat
 * üzerinden DEĞİL. Beraberlikte HEPSİ rozetlenir.
 */
function buildQuoteCards(
  state: MockState,
  request: MockPurchaseRequest,
): components["schemas"]["PurchaseQuoteListResponse"] {
  const quantityTotal = requestQuantityTotal(request);
  const quotes = state.purchaseQuotes.filter((q) => q.request_id === request.id);
  const totals = quotes.map((q) => quoteTotalCost(q, quantityTotal));
  const best = totals.length > 0 ? Math.min(...totals) : null;
  return {
    items: quotes.map((quote, index) => ({
      id: quote.id,
      request_id: quote.request_id,
      supplier_id: quote.supplier_id,
      supplier_name: supplierName(state, quote.supplier_id),
      unit_price: quote.unit_price,
      delivery_time: quote.delivery_time,
      warranty_note: quote.warranty_note,
      payment_terms: quote.payment_terms,
      shipping_included: quote.shipping_included,
      shipping_cost: quote.shipping_cost,
      is_selected: quote.is_selected,
      created_at: quote.created_at,
      total_cost: money2(totals[index]),
      is_best_price: best !== null && totals[index] === best,
    })),
    total: quotes.length,
    request_quantity_total: qty3(quantityTotal),
  };
}

function buildQuoteResponse(
  state: MockState,
  quote: MockPurchaseQuote,
): components["schemas"]["PurchaseQuoteResponse"] {
  return {
    id: quote.id,
    request_id: quote.request_id,
    supplier_id: quote.supplier_id,
    supplier_name: supplierName(state, quote.supplier_id),
    unit_price: quote.unit_price,
    delivery_time: quote.delivery_time,
    warranty_note: quote.warranty_note,
    payment_terms: quote.payment_terms,
    shipping_included: quote.shipping_included,
    shipping_cost: quote.shipping_cost,
    is_selected: quote.is_selected,
    created_at: quote.created_at,
  };
}

function buildPurchaseOrderResponse(
  state: MockState,
  order: MockPurchaseOrder,
): components["schemas"]["PurchaseOrderResponse"] {
  const request = order.request_id
    ? state.purchaseRequests.find((r) => r.id === order.request_id)
    : undefined;
  return {
    id: order.id,
    order_no: order.order_no,
    request_id: order.request_id,
    request_no: request?.request_no ?? null,
    quote_id: order.quote_id,
    supplier_id: order.supplier_id,
    supplier_name: supplierName(state, order.supplier_id),
    project_id: order.project_id,
    total_amount: order.total_amount,
    expected_delivery: order.expected_delivery,
    status: order.status,
    note: order.note,
    created_by_user_id: order.created_by_user_id,
    created_at: order.created_at,
  };
}

function buildSupplierCard(
  state: MockState,
  supplier: MockSupplier,
): components["schemas"]["SupplierCard"] {
  const orders = state.purchaseOrders.filter((o) => o.supplier_id === supplier.id);
  return {
    id: supplier.id,
    name: supplier.name,
    category: supplier.category,
    tax_no: supplier.tax_no,
    phone: supplier.phone,
    payment_terms: supplier.payment_terms,
    is_active: supplier.is_active,
    created_at: supplier.created_at,
    // Siparişsiz tedarikçide `null` DEĞİL SIFIR (şema kararı).
    orders_total_this_year: money2(orders.reduce((sum, o) => sum + Number(o.total_amount), 0)),
    orders_count_this_year: orders.length,
  };
}

/** `MetricPlaceholder` ZARFI YOKTUR — `0` gerçek bir cevaptır. */
function buildPurchasingSummary(
  state: MockState,
  projectId: string | null,
): components["schemas"]["PurchasingSummaryResponse"] {
  const requests = projectId
    ? state.purchaseRequests.filter((r) => r.project_id === projectId)
    : state.purchaseRequests;
  const orders = projectId
    ? state.purchaseOrders.filter((o) => o.project_id === projectId)
    : state.purchaseOrders;
  const month = PURCHASING_TODAY.slice(0, 7);
  return {
    open_requests: requests.filter(
      (r) => r.status === "pending_approval" || r.status === "quote_wait",
    ).length,
    quote_wait_requests: requests.filter((r) => r.status === "quote_wait").length,
    pending_approval_requests: requests.filter((r) => r.status === "pending_approval").length,
    orders_this_month_total: money2(
      orders
        .filter((o) => o.created_at.slice(0, 7) === month)
        .reduce((sum, o) => sum + Number(o.total_amount), 0),
    ),
    active_orders: orders.filter((o) => o.status !== "delivered").length,
    in_transit_orders: orders.filter((o) => o.status === "in_transit").length,
    delivered_orders: orders.filter((o) => o.status === "delivered").length,
  };
}

// ---------------------------------------------------------------------------
// F-MK T5b · Makine & Ekipman (MK-1 backend, 9 `equipment` yolu)
// ---------------------------------------------------------------------------
// Tipler `schema.d.ts`ten TÜRETİLİR, elle yazılmaz (F-P5 dersi: elle yazılan
// fikstür şemadan kayınca typecheck susar).
//
// 🔒 FİKSTÜR İZOLASYONU (F-ST/F-SA dersi): ekipman kayıtlarının PROJE KAPSAMI
// YOKTUR — başarılı bir POST/PATCH `/makine` kart ızgarasını ve `/makine/
// calisma` · `/makine/yakit` ad çözümlemelerini değiştirip görsel baseline'ları
// sessizce kırardı. Bu yüzden F-MK'nın fonksiyonel spec'leri yazma uçlarını
// TETİKLEMEZ: gönderim testleri `page.route` ile BFF katmanında karşılanır
// (istek gövdesi ölçülür, sunucu durumu HİÇ değişmez). Uçlar yine de burada
// gerçekçi biçimde yaşar — canlıdaki sözleşmenin karşılığıdır.
type MockEquipment = components["schemas"]["EquipmentResponse"];
type MockWorkLog = components["schemas"]["WorkLogResponse"];
type MockFuelLog = components["schemas"]["FuelLogResponse"];

/** Ekipman fikstürlerinin dönemi — çalışma/yakıt kayıtları bu ayda yaşar. */
const EQUIPMENT_PERIOD = { year: 2026, month: 8 } as const;

/**
 * Beş ekipman = M1'in DÖRT durumunun tamamı + K12'nin iki kart biçimi.
 *
 * • `eq-1` çalışıyor, tam künye (kira + operatör ikilisi basılır)
 * • `eq-2` BAKIMDA → K12 tek geniş uyarı kutusu
 * • `eq-3` çalışıyor ama norm birimi **`lt_km`** → K3'ün EN KRİTİK yolu
 *   (yakıt sapması `no_distance_data` ile `null` gelir, ekran "—" basar)
 * • `eq-4` ARIZALI + `rate_amount: null` + `operator_id: null` → K12 uyarı
 *   kutusu ve `monthly_cost_unknown_count`ın kaynağı
 * • `eq-5` BOŞTA (K21: mockup sayaç çizmiyor, kart rozeti çiziyor)
 */
const EQUIPMENT_FIXTURES: MockEquipment[] = [
  {
    id: "eq-1", name: "Tower Crane TC-48", category: "crane", brand: "Liebherr",
    model: "154 EC-H", serial_no: "LBH-2022-8842", plate_no: null, model_year: 2022,
    ownership: "owned", purchase_amount: "3800000.00", purchase_date: "2022-04-18",
    depreciation_years: 10, supplier_id: "sup-1", financing: "bank_loan",
    market_value: "3200000.00", rate_amount: "8500.00", rate_period: "daily",
    site_id: "s-1", operator_id: "per-1", status: "working", status_note: null,
    status_expected_date: null, fuel_type: "diesel", norm_consumption: "4.20",
    norm_unit: "lt_hour", maintenance_period: "hours_500", monthly_capacity_hours: 200,
    is_company_asset: true, is_active: true, created_at: "2026-01-05T08:00:00Z",
  },
  {
    id: "eq-2", name: "Ekskavatör CAT 320", category: "machinery", brand: "Caterpillar",
    model: "320 GC", serial_no: "CAT-320-1174", plate_no: null, model_year: 2021,
    ownership: "owned", purchase_amount: "2450000.00", purchase_date: "2021-09-02",
    depreciation_years: 10, supplier_id: null, financing: "cash",
    market_value: "1950000.00", rate_amount: "6200.00", rate_period: "daily",
    site_id: "s-1", operator_id: "per-2", status: "maintenance",
    status_note: "Periyodik bakım — 500 saat servisi", status_expected_date: "2026-08-22",
    fuel_type: "diesel", norm_consumption: "5.50", norm_unit: "lt_hour",
    maintenance_period: "hours_500", monthly_capacity_hours: 200,
    is_company_asset: true, is_active: true, created_at: "2026-01-06T08:00:00Z",
  },
  {
    id: "eq-3", name: "Damperli Kamyon FMX", category: "truck", brand: "Volvo",
    model: "FMX 460", serial_no: null, plate_no: "06 DK 4412", model_year: 2020,
    ownership: "rented", purchase_amount: null, purchase_date: null,
    depreciation_years: null, supplier_id: "sup-1", financing: null,
    market_value: null, rate_amount: "4400.00", rate_period: "daily",
    site_id: "s-2", operator_id: "per-3", status: "working", status_note: null,
    status_expected_date: null, fuel_type: "diesel", norm_consumption: "0.45",
    // 🔴 K3 — `lt_km`: kilometre verisi hiçbir ekranda girilmiyor, sapma `null`.
    norm_unit: "lt_km", maintenance_period: null, monthly_capacity_hours: 0,
    is_company_asset: false, is_active: true, created_at: "2026-01-07T08:00:00Z",
  },
  {
    id: "eq-4", name: "Beton Pompası BP-36", category: "concrete", brand: "Putzmeister",
    model: null, serial_no: null, plate_no: null, model_year: null,
    ownership: "owned", purchase_amount: "1750000.00", purchase_date: "2023-03-11",
    depreciation_years: null, supplier_id: null, financing: null,
    market_value: null, rate_amount: null, rate_period: null,
    site_id: null, operator_id: null, status: "broken",
    status_note: "Hidrolik hortum patladı — parça bekleniyor",
    status_expected_date: "2026-08-19", fuel_type: null, norm_consumption: null,
    norm_unit: null, maintenance_period: null, monthly_capacity_hours: 200,
    is_company_asset: true, is_active: true, created_at: "2026-01-08T08:00:00Z",
  },
  {
    id: "eq-5", name: "Seyyar Kompresör SC-200", category: "compressor", brand: "Atlas Copco",
    model: "XAS 88", serial_no: "AC-88-5521", plate_no: null, model_year: 2019,
    ownership: "owned", purchase_amount: "320000.00", purchase_date: "2019-06-20",
    depreciation_years: 5, supplier_id: null, financing: "cash",
    market_value: "180000.00", rate_amount: "900.00", rate_period: "daily",
    site_id: null, operator_id: null, status: "idle", status_note: null,
    status_expected_date: null, fuel_type: "diesel", norm_consumption: "2.10",
    norm_unit: "lt_hour", maintenance_period: "monthly", monthly_capacity_hours: 200,
    is_company_asset: true, is_active: true, created_at: "2026-01-09T08:00:00Z",
  },
];

const WORK_LOG_FIXTURES: MockWorkLog[] = [
  {
    id: "wl-1", equipment_id: "eq-1", work_date: "2026-08-12", site_id: "s-1",
    operator_id: "per-1", record_type: "worked", start_time: "08:00:00",
    end_time: "17:00:00", hours: "9.00", note: null, created_by_id: "u-1",
    created_at: "2026-08-12T18:00:00Z",
  },
  {
    id: "wl-2", equipment_id: "eq-2", work_date: "2026-08-11", site_id: "s-1",
    operator_id: "per-2", record_type: "worked", start_time: "08:00:00",
    end_time: "16:30:00", hours: "8.50", note: null, created_by_id: "u-1",
    created_at: "2026-08-11T18:00:00Z",
  },
  // Arıza kaydı: operatör YOK, saat aralığı YOK — not basılır (M3 259-262).
  {
    id: "wl-3", equipment_id: "eq-4", work_date: "2026-08-10", site_id: null,
    operator_id: null, record_type: "breakdown", start_time: null, end_time: null,
    hours: "8.00", note: "Hidrolik arıza", created_by_id: "u-1",
    created_at: "2026-08-10T18:00:00Z",
  },
  {
    id: "wl-4", equipment_id: "eq-3", work_date: "2026-08-09", site_id: "s-2",
    operator_id: "per-3", record_type: "worked", start_time: "07:30:00",
    end_time: "18:00:00", hours: "10.50", note: null, created_by_id: "u-1",
    created_at: "2026-08-09T18:00:00Z",
  },
];

const FUEL_LOG_FIXTURES: MockFuelLog[] = [
  {
    id: "fl-1", equipment_id: "eq-1", fuel_date: "2026-08-12", site_id: "s-1",
    liters: "320.00", unit_price: "39.5000", amount: "12640.00",
    entered_by_id: "u-1", note: null, created_at: "2026-08-12T18:10:00Z",
  },
  {
    id: "fl-2", equipment_id: "eq-3", fuel_date: "2026-08-11", site_id: "s-2",
    liters: "450.00", unit_price: "39.7500", amount: "17887.50",
    entered_by_id: "u-2", note: null, created_at: "2026-08-11T18:10:00Z",
  },
  // `entered_by_id: null` ⇒ "Giren" hücresi "—" basar (uydurma ad YOK).
  {
    id: "fl-3", equipment_id: "eq-2", fuel_date: "2026-08-10", site_id: null,
    liters: "210.00", unit_price: "39.9000", amount: "8379.00",
    entered_by_id: null, note: null, created_at: "2026-08-10T18:10:00Z",
  },
];

/**
 * F-BLG T3 · `GET /equipment/document-types` — şema notu "altı sabit slot
 * (CRUD ucu YOK)": liste kullanıcıya göre DEĞİŞMEZ, bu yüzden `state`e
 * girmez ve mutasyon uçları yoktur.
 *
 * `Form - Ekipman Belgesi.dc.html`ın altı `<option>`u (103-108) GÖSTERMELİKtir;
 * gerçek seçenekler buradan gelir ve `sort_order` SUNUCU sırasıdır — form
 * kendi sıralamasını İCAT ETMEZ.
 */
const EQUIPMENT_DOCUMENT_TYPES_FIXTURE: components["schemas"]["EquipmentDocumentTypeListResponse"] =
  {
    items: [
      { id: "edt-1", code: "ruhsat", name: "Ruhsat", is_required: true, sort_order: 1 },
      { id: "edt-2", code: "sigorta", name: "Sigorta Poliçesi", is_required: true, sort_order: 2 },
      { id: "edt-3", code: "muayene", name: "Periyodik Muayene Raporu", is_required: true, sort_order: 3 },
      { id: "edt-4", code: "operator", name: "Operatör Belgesi", is_required: false, sort_order: 4 },
      { id: "edt-5", code: "kasko", name: "Kasko Poliçesi", is_required: false, sort_order: 5 },
      { id: "edt-6", code: "diger", name: "Diğer", is_required: false, sort_order: 6 },
    ],
  };

/**
 * F-BLG T3 · `GET /equipment/{equipment_id}/documents` başlangıç kayıtları.
 *
 * 🔒 FİKSTÜR İZOLASYONU: formun bağlam bandındaki sayaç (mockup 81) bu listenin
 * UZUNLUĞUDUR ve GÖRSEL kadraja girer. Kadraj `eq-1` üzerinde kurulur; YAZMA
 * akışı `eq-2`ye sürgün edilir (aşağıdaki POST orayı büyütür, `eq-1`i değil).
 */
const EQUIPMENT_DOCUMENT_FIXTURES: components["schemas"]["EquipmentDocumentResponse"][] = [
  {
    id: "edoc-1",
    equipment_id: "eq-1",
    type_id: "edt-1",
    type_code: "ruhsat",
    type_name: "Ruhsat",
    filename: "tower-crane-ruhsat.pdf",
    mime_type: "application/pdf",
    size_bytes: 184320,
    // BOR-TEMIZ (FRM-1) ile açılan üç alan. Bu kayıt DOLU dalı temsil eder.
    document_no: "TC-48-RUH-2026",
    issued_at: "2026-04-30",
    valid_until: "2027-04-30",
    note: "Yıllık yenileme takibi İK'da.",
    created_at: "2026-04-30T08:00:00Z",
  },
  {
    id: "edoc-2",
    equipment_id: "eq-1",
    type_id: "edt-3",
    type_code: "muayene",
    type_name: "Periyodik Muayene Raporu",
    filename: "tc48-muayene-2026.pdf",
    mime_type: "application/pdf",
    size_bytes: 96256,
    // Süre takibi YAPILMAYAN belge — `valid_until` NULL, boş dize DEĞİL.
    // Üç yeni alan da NULL: bu kayıt BOŞ dalı temsil eder (dolu dalı `edoc-1` tutar).
    document_no: null,
    issued_at: null,
    valid_until: null,
    note: null,
    created_at: "2026-05-12T08:00:00Z",
  },
];

/**
 * `GET /equipment/summary` — SABİT özet (MK-1 K15/K21: sunucu sayar, istemci
 * saymaz). `monthly_cost_unknown_count: 1` `eq-4`ün bilinmeyen kira bedelidir.
 */
const EQUIPMENT_SUMMARY_FIXTURE: components["schemas"]["EquipmentSummaryResponse"] = {
  working: 2,
  broken: 1,
  maintenance: 1,
  idle: 1,
  monthly_cost: "144200.00",
  monthly_cost_unknown_count: 1,
};

/**
 * `GET /equipment/work-summary` — 🔴 §0'ın KANITI: `totals` satırların
 * toplamıyla **KASITLI OLARAK TUTARSIZDIR** (satırlar 424,50 saat · 32 arıza
 * saati · ₺144.200 eder; `totals` mockup'ın kendi sabitlerini taşır). Ekran
 * SUNUCUNUNKİNİ basar, satırları TOPLAMAZ — spec §0/MK-1 K15.
 */
const WORK_SUMMARY_FIXTURE: components["schemas"]["WorkSummaryResponse"] = {
  year: EQUIPMENT_PERIOD.year,
  month: EQUIPMENT_PERIOD.month,
  rows: [
    {
      equipment_id: "eq-1", equipment_name: "Tower Crane TC-48", site_id: "s-1",
      hours: "186.00", usage_pct: "93.00", usage_reason: null,
      breakdown_hours: "0.00", cost: "62000.00",
    },
    {
      equipment_id: "eq-2", equipment_name: "Ekskavatör CAT 320", site_id: "s-1",
      hours: "142.50", usage_pct: "71.25", usage_reason: null,
      breakdown_hours: "8.00", cost: "48200.00",
    },
    // 🔴 K3 — `monthly_capacity_hours: 0` ⇒ kullanım oranı HESAPLANAMAZ.
    {
      equipment_id: "eq-3", equipment_name: "Damperli Kamyon FMX", site_id: "s-2",
      hours: "96.00", usage_pct: null, usage_reason: "no_capacity_hours",
      breakdown_hours: "0.00", cost: "34000.00",
    },
    // Kira bedeli bilinmeyen ARIZALI makine: saat 0, maliyet `null` (0 DEĞİL).
    {
      equipment_id: "eq-4", equipment_name: "Beton Pompası BP-36", site_id: null,
      hours: "0.00", usage_pct: "0.00", usage_reason: null,
      breakdown_hours: "24.00", cost: null,
    },
  ],
  totals: {
    hours: "428.00",
    breakdown_hours: "12.00",
    cost: "124800.00",
    usage_pct_avg: "69.00",
  },
  weeks: [
    { index: 1, start_date: "2026-08-01", end_date: "2026-08-02", hours: "42.00", dominant_record_type: "worked" },
    { index: 2, start_date: "2026-08-03", end_date: "2026-08-09", hours: "128.50", dominant_record_type: "worked" },
    { index: 3, start_date: "2026-08-10", end_date: "2026-08-16", hours: "96.00", dominant_record_type: "breakdown" },
    { index: 4, start_date: "2026-08-17", end_date: "2026-08-23", hours: "112.00", dominant_record_type: "worked" },
    // Kayıtsız hafta: `null` damga ⇒ nötr basılır, uydurma "çalışıyor" YOK.
    { index: 5, start_date: "2026-08-24", end_date: "2026-08-31", hours: "0.00", dominant_record_type: null },
  ],
};

/**
 * `GET /equipment/fuel-summary` — 🔴 K3'ün en kritik satırı `eq-3`tür:
 * `norm_unit: lt_km` ⇒ `deviation_pct: null` + `deviation_reason:
 * "no_distance_data"` + `consumption_status: null`. Mockup orada "%16 yüksek"
 * çiziyor; SUNUCU KAZANIR (spec §0), ekran "—" + gerekçe ipucu basar.
 */
const FUEL_SUMMARY_FIXTURE: components["schemas"]["FuelSummaryResponse"] = {
  year: EQUIPMENT_PERIOD.year,
  month: EQUIPMENT_PERIOD.month,
  total_liters: "2840.00",
  total_amount: "112800.00",
  lt_per_hour_avg: "6.60",
  avg_unit_price: "39.7183",
  abnormal_count: 1,
  rows: [
    {
      equipment_id: "eq-1", equipment_name: "Tower Crane TC-48", site_id: "s-1",
      liters: "980.00", amount: "38900.00", actual: "5.30", norm: "4.20",
      deviation_pct: "26.19", deviation_reason: null, consumption_status: "critical",
    },
    {
      equipment_id: "eq-2", equipment_name: "Ekskavatör CAT 320", site_id: "s-1",
      liters: "760.00", amount: "30200.00", actual: "5.33", norm: "5.50",
      deviation_pct: "-3.09", deviation_reason: null, consumption_status: "normal",
    },
    {
      equipment_id: "eq-3", equipment_name: "Damperli Kamyon FMX", site_id: "s-2",
      liters: "1100.00", amount: "43700.00", actual: null, norm: "0.45",
      deviation_pct: null, deviation_reason: "no_distance_data",
      consumption_status: null,
    },
  ],
};

/** Dönem SÜZGECİ — özet uçları istenen ay fikstür ayı DEĞİLSE boş özet döner. */
function isEquipmentFixturePeriod(searchParams: URLSearchParams): boolean {
  return (
    Number(searchParams.get("year")) === EQUIPMENT_PERIOD.year &&
    Number(searchParams.get("month")) === EQUIPMENT_PERIOD.month
  );
}

// --- F-HZ T3.1 · Hazine (E9) fikstürleri --------------------------------
//
// 🔴 SALT-OKUR: bu üç uç yalnız GET'tir; hiçbir e2e testi hazine durumunu
// değiştirmez → `fullyParallel` altında yarış YOKTUR (ekipman fikstürlerinin
// aynı gerekçesi).
//
// 🔴 TARİH DETERMİNİZMİ: `/hazine` ekranının tarihe dokunan HİÇBİR yeri
// yoktur — dönem başlığı `CashFlowResponse.year/month` echo'sundan,
// "N gün kaldı" `UpcomingPaymentItem.days_remaining`ten, "7 Gün" başlığı
// `UpcomingPaymentsResponse.days` echo'sundan gelir; `due_date` STRING olarak
// ayrıştırılır (`formatDayMonth`) ve grafik ekseni `daysInMonth(year, month)`
// ile `Date.UTC` üzerinden ölçeklenir. Bu alanların hepsi burada SABİTtir →
// kare makinenin takvimine bağlı DEĞİLDİR ve `page.clock` gerekmez.

const TREASURY_BANK_ACCOUNTS: components["schemas"]["BankAccountResponse"][] = [
  // E9:70-74 — IBAN'lı vadesiz hesap.
  {
    id: "ba-1",
    bank_name: "Ziraat Bank",
    account_type: "checking",
    iban: "TR12 0001 0093 0012 3456 7890",
    display_name: null,
    opening_balance: "2500000.00",
    is_active: true,
    created_at: "2026-01-05T09:00:00Z",
    updated_at: "2026-08-14T09:00:00Z",
    // 🔴 TÜRETİLMİŞ (K2): `opening_balance` DEĞİL, hareketleri içeren bakiye.
    balance: "2840500.00",
  },
  // E9:75-79 — ikinci IBAN'lı vadesiz (degrade TİPE değil SIRAYA bağlıdır).
  {
    id: "ba-2",
    bank_name: "İş Bank",
    account_type: "checking",
    iban: "TR98 0006 4000 0011 2345 6789",
    display_name: null,
    opening_balance: "900000.00",
    is_active: true,
    created_at: "2026-01-05T09:05:00Z",
    updated_at: "2026-08-14T09:00:00Z",
    balance: "1124200.00",
  },
  // E9:80-84 — 🔴 IBAN'SIZ kasa: `bankAccountIdentityLine`ın `display_name`
  // dalını canlandırır ("Merkez Kasa", E9:83). IBAN verilseydi o dal hiçbir
  // e2e turunda çalışmazdı.
  {
    id: "ba-3",
    bank_name: "Yapı Kredi",
    account_type: "cash",
    iban: null,
    display_name: "Merkez Kasa",
    opening_balance: "300000.00",
    is_active: true,
    created_at: "2026-01-05T09:10:00Z",
    updated_at: "2026-08-14T09:00:00Z",
    balance: "284800.00",
  },
  // PASİF hesap: ekran `is_active=true` süzer → kart şeridinde GÖRÜNMEZ.
  // Süzgecin fiilen uygulandığının kanıtı (süzülmeseydi dört kart olurdu).
  {
    id: "ba-4",
    bank_name: "Kapatılmış Hesap",
    account_type: "checking",
    iban: "TR33 0009 9000 0099 9999 9999",
    display_name: null,
    opening_balance: "0.00",
    is_active: false,
    created_at: "2026-01-05T09:15:00Z",
    updated_at: "2026-03-01T09:00:00Z",
    balance: "0.00",
  },
];

/**
 * `GET /treasury/cash-flow` — 🔴 seri SEYREKTİR: ayın 31 gününün YALNIZ
 * beşinde hareket vardır. Her günü doldurmak şemanın kendi notuyla çelişirdi
 * ve `scaleX`in "ayın günü" ölçeklemesi (dizinin indeksi DEĞİL) hiç sınanmazdı.
 *
 * `inflow_total` / `outflow_total` mockup'ın E9:103-104 rakamlarıdır
 * (`₺4,12M` / `₺3,84M`) ve seri toplamıyla ÖZDEŞ DEĞİLDİR — sunucu toplamı
 * ayın tamamından üretir, ekran onu basar, satırları TOPLAMAZ.
 */
const TREASURY_CASH_FLOW: components["schemas"]["CashFlowResponse"] = {
  year: 2026,
  month: 7,
  series: [
    { day: "2026-07-01", inflow: "180000.00", outflow: "240000.00" },
    { day: "2026-07-08", inflow: "960000.00", outflow: "410000.00" },
    { day: "2026-07-16", inflow: "420000.00", outflow: "1180000.00" },
    { day: "2026-07-24", inflow: "1340000.00", outflow: "760000.00" },
    { day: "2026-07-31", inflow: "1220000.00", outflow: "1250000.00" },
  ],
  inflow_total: "4120000.00",
  outflow_total: "3840000.00",
};

/**
 * `GET /treasury/upcoming-payments` — `days` ve `as_of` SABİT echo'dur.
 *
 * Satırlar ÜÇ TONU da kapsar (`upcomingPaymentTone` eşikleri):
 *   · `days_remaining ≤ 2` → danger · `3-4` → warning · `≥ 5` → success
 * ve `UpcomingSourceType`ın İKİ üyesini de taşır. Son satırın
 * `counterparty`si NULL'dır → zarif düşüş yüzeyi (satır metni + görünür
 * bildirim) kadraja girer; hepsi dolu olsaydı o dal hiç basılmazdı.
 */
const TREASURY_UPCOMING: components["schemas"]["UpcomingPaymentsResponse"] = {
  days: 7,
  as_of: "2026-07-17",
  items: [
    // ≤2 gün → danger (E9:112-115'in satırı, ton MONOTONlaştı).
    {
      source_type: "subcontractor_progress_payment",
      source_id: "sp-1",
      counterparty: "Akın İnşaat",
      document_no: "47",
      due_date: "2026-07-19",
      days_remaining: 2,
      amount: "1016800.00",
    },
    // 3-4 gün → warning.
    {
      source_type: "invoice",
      source_id: "inv-1",
      counterparty: "Yılmaz Elektrik",
      document_no: "FT-2026-0311",
      due_date: "2026-07-20",
      days_remaining: 3,
      amount: "892000.00",
    },
    // ≥5 gün → success.
    {
      source_type: "invoice",
      source_id: "inv-2",
      counterparty: "Demir Nakliyat",
      document_no: "FT-2026-0327",
      due_date: "2026-07-24",
      days_remaining: 7,
      amount: "475600.00",
    },
    // 🔴 `counterparty: null` — taslak taşeron sözleşmesinde ad boş olabilir.
    {
      source_type: "subcontractor_progress_payment",
      source_id: "sp-2",
      counterparty: null,
      document_no: "48",
      due_date: "2026-07-23",
      days_remaining: 6,
      amount: "318400.00",
    },
  ],
};

export function startMockBackend(port: number): { server: Server; close: () => Promise<void> } {
  const state = seedState();
  let milestoneSeq = 3;

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

    // F-TKV T6 — milestone id sayaci. `Date.now()` YASAK (determinizm):
    // fikstürler `ms-1`..`ms-3` kullaniyor, yeni satirlar `ms-4`ten devam eder.
    const nextMilestoneId = () => `ms-${++milestoneSeq}`;

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

    // 🔴 F-TKV T6 — `GET /projects/timeline` (P11 portföy Gantt'i).
    // SIRA KRİTİK: hemen aşağıdaki `/^\/projects\/([^/]+)$/` deseni "timeline"ı
    // proje kimliği sanıp YUTAR ve 404 döner; e2e'de bu "boş takvim" olarak
    // SESSİZCE YEŞİL geçerdi. Bu blok o desenden ÖNCE durmak zorundadır.
    //
    // Yanıt STATE'ten türer (donmuş harita DEĞİL): T5 bölüm formu milestone ve
    // bağımlılık yazar, takvim ekranı o yazmayı görebilmelidir.
    // Bölümler şantiyeler ÜZERİNDEN projeye bağlanır (şema: "santiye seviyesi
    // YOKTUR — bolumler santiyeler uzerinden toplanip dogrudan projenin altina
    // dizilir").
    if (method === "GET" && path === "/projects/timeline") {
      const siteIdsByProject = new Map<string, Set<string>>();
      for (const site of state.sites) {
        const bucket = siteIdsByProject.get(site.project_id) ?? new Set<string>();
        bucket.add(site.id);
        siteIdsByProject.set(site.project_id, bucket);
      }
      const items = state.projects.map((project) => {
        const siteIds = siteIdsByProject.get(project.id) ?? new Set<string>();
        const sections = state.sections
          .filter((sec) => siteIds.has(sec.site_id))
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((sec) => ({
            id: sec.id,
            name: sec.name,
            status: sec.status,
            start_date: sec.start_date,
            end_date: sec.end_date,
            sort_order: sec.sort_order,
            depends_on_section_id: sec.depends_on_section_id,
            milestones: sec.milestones.map((ms) => ({
              id: ms.id,
              title: ms.title,
              milestone_date: ms.milestone_date,
            })),
          }));
        return {
          id: project.id,
          code: project.code,
          name: project.name,
          status: project.status,
          start_date: project.start_date,
          end_date: project.end_date,
          contract_amount: project.contract_amount,
          sections,
        };
      });
      // `today` SUNUCU damgasidir — `page.clock` bunu ETKILEMEZ, bu yuzden
      // SABITTIR (kare determinizmi). Deger p-1'in penceresinin ortasina
      // dusuyor ki "bugun" cizgisi izgarada gorunsun.
      return send(200, { today: MOCK_TIMELINE_TODAY, items });
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
            depends_on_section_id: null,
            milestones: [],
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
    // GET /sites/{site_id}/sections — `SectionListResponse`. F-PL T5: planlama
    // ızgarasında satır açarken bölüm SEÇİLİR; ızgaranın grupları yalnız mevcut
    // satırlardan türediği için seçenekler bu uçtan gelir.
    if (method === "GET" && siteSectionsMatch) {
      const siteId = siteSectionsMatch[1];
      const site = state.sites.find((s) => s.id === siteId);
      if (!site) return send(404, { detail: "santiye yok" });
      const items = buildSectionListItems(state, siteId);
      return send(200, {
        counts: {
          planned: items.filter((s) => s.status === "planned").length,
          active: items.filter((s) => s.status === "active").length,
          completed: items.filter((s) => s.status === "completed").length,
        },
        items,
      });
    }
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
          depends_on_section_id:
            typeof body.depends_on_section_id === "string" ? body.depends_on_section_id : null,
          milestones: [],
          created_at: nowIso,
          updated_at: nowIso,
        };
        const createdMilestones = mergeMilestones([], body.milestones, nextMilestoneId);
        if ("error" in createdMilestones) return send(422, { detail: createdMilestones.error });
        section.milestones = createdMilestones;
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

        const dependsOn = pick("depends_on_section_id", (v) => (typeof v === "string" && v ? v : null));
        if (dependsOn !== null) {
          const target = state.sections.find((sec) => sec.id === dependsOn);
          if (dependsOn === sectionId) return send(422, { detail: "Bolum kendine bagimli olamaz" });
          if (!target || target.site_id !== section.site_id) {
            return send(422, { detail: "Bagimlilik ayni santiyenin bolumu olmalidir" });
          }
        }
        const mergedMilestones = mergeMilestones(section.milestones, body.milestones, nextMilestoneId);
        if ("error" in mergedMilestones) return send(422, { detail: mergedMilestones.error });

        const updated: MockSection = {
          ...section,
          depends_on_section_id: dependsOn,
          milestones: mergedMilestones,
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
      // F-POZGRUP · boş sözleşme fikstürü (bkz. EMPTY_CONTRACT_PROJECT_ID):
      // pozsuz/grupsuz sözleşme ekranı ancak böyle açılabilir.
      if (projectId === EMPTY_CONTRACT_PROJECT_ID) {
        return send(200, {
          ...EMPLOYER_CONTRACT_P1,
          project_id: EMPTY_CONTRACT_PROJECT_ID,
          contract_no: project.contract_no,
          amount: "9400000.00",
          items_total: "0.00",
          items_total_diff: "9400000.00",
          progress_payment_summary: buildProgressPaymentSummary(state, projectId),
          milestones: null,
          documents: null,
          pending_modules: [] as string[],
        });
      }
      if (projectId !== "p-1") return send(404, { detail: "bu proje icin sozlesme yok" });
      return send(200, {
        ...EMPLOYER_CONTRACT_P1,
        progress_payment_summary: buildProgressPaymentSummary(state, projectId),
        milestones: null,
        documents: null,
        pending_modules: [] as string[],
      });
    }

    // GET /projects/{project_id}/contract/items — E14 "İş Kalemleri" sekmesi
    // (F-P5 T1). Dağılım ucundan FARKLI: şantiye kolonu yok, kalem başına
    // toplam distributed/remaining var.
    const contractItemsMatch = path.match(/^\/projects\/([^/]+)\/contract\/items$/);
    if (method === "GET" && contractItemsMatch) {
      const projectId = contractItemsMatch[1];
      if (!state.projects.some((p) => p.id === projectId)) return send(404, { detail: "proje yok" });
      // F-POZGRUP · `p-4` BOŞ sözleşmedir: 200 + boş `groups` döner (eskiden
      // 404'tü, bu yüzden grupsuz sözleşme hâli mock'ta hiç üretilemiyordu).
      if (projectId !== "p-1" && projectId !== EMPTY_CONTRACT_PROJECT_ID) {
        return send(404, { detail: "bu proje icin sozlesme yok" });
      }
      return send(200, buildEmployerContractItemsResponse(state, projectId));
    }

    // F-POZGRUP · POST /projects/{project_id}/contract/groups — poz GRUBU
    // açma. Formdaki "+ Yeni Grup" akışının ilk adımı; bu uç olmadan yeni bir
    // sözleşmeye ilk poz hiçbir şekilde eklenemez.
    const contractGroupsMatch = path.match(/^\/projects\/([^/]+)\/contract\/groups$/);
    if (method === "POST" && contractGroupsMatch) {
      const projectId = contractGroupsMatch[1];
      if (!state.projects.some((p) => p.id === projectId)) return send(404, { detail: "proje yok" });
      if (projectId !== "p-1" && projectId !== EMPTY_CONTRACT_PROJECT_ID) {
        return send(404, { detail: "bu proje icin sozlesme yok" });
      }
      return withBody((body) => {
        const name = String(body.name ?? "").trim();
        if (!name) return send(422, { detail: "Grup adı zorunludur." });
        state.contractGroupSeq += 1;
        const created: MockContractGroup = {
          id: `cg-new-${state.contractGroupSeq}`,
          projectId,
          name,
          sort_order: Number(body.sort_order ?? 0),
        };
        state.contractGroups = [...state.contractGroups, created];
        return send(201, { id: created.id, name: created.name, sort_order: created.sort_order });
      });
    }

    // F-BLG T3 · POST /projects/{project_id}/contract/items — İşveren
    // sözleşmesine ELLE poz ekleme (`Form - Poz Ekle Isveren.dc.html`).
    //
    // 🔴 `group_id` ZORUNLUDUR ve VAR OLAN bir gruba işaret etmelidir; gruplar
    // kalem ucunun `groups[]`ından gelir, AYRI bir GET yoktur. Gövde içi
    // varlık referansı = 404 (ST kanonu).
    //
    // 🔴 FİKSTÜR UYARISI: bu uç `p-1`i BÜYÜTÜR (E14 kalem listesi + dağıtım
    // ızgarası + sözleşme metrikleri o kalemlerden türer). Görsel kadrajlar
    // diyaloğu YALNIZ AÇAR, KAYDETMEZ — kaydeden bir spec yazılacaksa önce
    // `page.route` ile pinlenmeli ya da ayrı bir projeye sürgün edilmelidir.
    if (method === "POST" && contractItemsMatch) {
      const projectId = contractItemsMatch[1];
      if (!state.projects.some((p) => p.id === projectId)) return send(404, { detail: "proje yok" });
      if (projectId !== "p-1" && projectId !== EMPTY_CONTRACT_PROJECT_ID) {
        return send(404, { detail: "bu proje icin sozlesme yok" });
      }
      return withBody((body) => {
        const groups = buildEmployerContractItemsResponse(state, projectId).groups;
        const group = groups.find((g) => g.id === String(body.group_id ?? ""));
        if (!group) return send(404, { detail: "Poz grubu bulunamadı." });

        const code = String(body.code ?? "").trim();
        if (!code) return send(422, { detail: "Poz numarası zorunludur." });
        // Poz No benzersizliği SÖZLEŞME içindedir (proje kapsamı).
        if (
          state.contractItems.some(
            (item) => (item.projectId ?? "p-1") === projectId && item.code === code,
          )
        ) {
          return send(409, { detail: "Bu poz numarası zaten kullanılıyor." });
        }
        // `quantity`/`unit_price` DECIMAL-STRING taşınır; sayıya çevrilip geri
        // yazılmaz (kayan nokta kaybı olmasın).
        const quantity = String(body.quantity ?? "");
        const unitPrice = String(body.unit_price ?? "");
        if (!quantity || !unitPrice) {
          return send(422, { detail: "Miktar ve birim fiyat zorunludur." });
        }

        state.contractItemSeq += 1;
        const created: MockContractItem = {
          id: `ci-new-${state.contractItemSeq}`,
          projectId,
          code,
          description: String(body.description ?? ""),
          unit: String(body.unit ?? ""),
          quantity,
          unit_price: unitPrice,
          groupName: group.name,
          groupSortOrder: group.sort_order,
          allocations: [],
        };
        state.contractItems = [...state.contractItems, created];

        const refreshed = buildEmployerContractItemsResponse(state, projectId)
          .groups.find((g) => g.id === group.id)
          ?.items.find((item) => item.id === created.id);
        if (!refreshed) return send(500, { detail: "kalem kurulamadi" });
        return send(201, refreshed);
      });
    }

    // GET /contracts — SZL sekmeli listesi (F-P5 T1). `type` ZORUNLUDUR;
    // sayfalama YOKTUR (yanıt yalnız summary+items taşır).
    if (method === "GET" && path === "/contracts") {
      const type = parsed.searchParams.get("type");
      if (type !== "employer" && type !== "subcontractor") {
        return send(422, { detail: "type parametresi zorunlu" });
      }
      return send(200, buildContractsListResponse(state, parsed.searchParams));
    }

    // GET/PUT /projects/{project_id}/contract/distribution — hakediş formu
    // pivot tablosu kaynağı (`İşveren Hakediş Oluştur.dc.html`) VE F-P5'in POZ
    // dağılımı ızgarası.
    const distributionMatch = path.match(/^\/projects\/([^/]+)\/contract\/distribution$/);
    if ((method === "GET" || method === "PUT") && distributionMatch) {
      const projectId = distributionMatch[1];
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return send(404, { detail: "proje yok" });
      if (projectId !== "p-1") return send(404, { detail: "bu proje icin poz dagilimi yok" });
      if (method === "GET") return send(200, buildContractDistributionResponse(state, projectId));

      // ⚠️ BİRLEŞTİRME (hakediş/puantaj PUT'larının TERSİ) — bkz.
      // `applyDistributionSave`.
      return withBody((body) => {
        const allocations = Array.isArray(body.allocations)
          ? (body.allocations as Array<Record<string, unknown>>)
          : [];
        const { error } = applyDistributionSave(state, allocations);
        if (error) return send(422, { detail: error });
        return send(200, buildContractDistributionResponse(state, projectId));
      });
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

    // GET /subcontractor-progress-payments — liste (proje/şantiye/dönem/durum/
    // arama + sayfalama). `site_id` (TB2/U2) SÖZLEŞME üzerinden süzer —
    // hakedişin kendi şantiye kolonu yoktur.
    if (method === "GET" && path === "/subcontractor-progress-payments") {
      const projectId = parsed.searchParams.get("project_id");
      const siteId = parsed.searchParams.get("site_id");
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
      if (siteId) {
        items = items.filter((p) => findSubcontractorContract(state, p.contract_id)?.site_id === siteId);
      }
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

    // GET /subcontractor-contracts — TB2 U1 liste ucu (hakediş açma seçim
    // adımı). ⚠️ TB3'ten beri SAYFALIDIR: `limit` (varsayılan 50, tavan 200) +
    // `offset` alır, yanıt `total`/`limit`/`offset` taşır. Sıralama
    // `contract_no`+`id` (deterministik).
    if (method === "GET" && path === "/subcontractor-contracts") {
      const projectId = parsed.searchParams.get("project_id");
      const siteId = parsed.searchParams.get("site_id");
      const status = parsed.searchParams.get("status");
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");

      let items = state.subcontractorContracts;
      if (projectId) items = items.filter((c) => c.project_id === projectId);
      if (siteId) items = items.filter((c) => c.site_id === siteId);
      if (status) items = items.filter((c) => c.status === status);
      if (q) {
        items = items.filter((c) => {
          const name = (c.subcontractor_name ?? "").toLocaleLowerCase("tr");
          const no = (c.contract_no ?? "").toLocaleLowerCase("tr");
          return name.includes(q) || no.includes(q);
        });
      }
      const sorted = [...items].sort((a, b) => {
        const byNo = (a.contract_no ?? "").localeCompare(b.contract_no ?? "", "tr");
        if (byNo !== 0) return byNo;
        return a.id.localeCompare(b.id);
      });
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      // Şema tavanı 200 — aşan istek gerçek backend'de 422 verir.
      if (limit < 1 || limit > 200) return send(422, { detail: "limit 1-200 araliginda olmali" });
      return send(200, {
        items: sorted
          .slice(offset, offset + limit)
          .map((c) => buildSubcontractorContractListItem(state, c)),
        total: sorted.length,
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

    // --- F-P5 T1 · Taşeron sözleşmesi YAZMA uçları (FSO + TSD) -------------

    // PATCH /subcontractor-contracts/{id} — TSD "Sözleşme Şartları" kaydeti.
    if (method === "PATCH" && subcontractorContractIdMatch) {
      const contract = state.subcontractorContracts.find(
        (c) => c.id === subcontractorContractIdMatch[1],
      );
      if (!contract) return send(404, { detail: "sozlesme yok" });
      return withBody((body) => {
        for (const [key, value] of Object.entries(body)) {
          if (value === undefined) continue;
          if (key === "subcontractor_id" && typeof value === "string") {
            contract.subcontractor_name =
              state.subcontractors.find((s) => s.id === value)?.name ?? null;
          }
          Object.assign(contract, { [key]: value });
        }
        return send(200, buildSubcontractorContractDetailResponse(contract));
      });
    }

    // POST /projects/{project_id}/subcontractor-contracts — FSO oluştur/taslak.
    const createSubcontractorContractMatch = path.match(
      /^\/projects\/([^/]+)\/subcontractor-contracts$/,
    );
    if (method === "POST" && createSubcontractorContractMatch) {
      const projectId = createSubcontractorContractMatch[1];
      if (!state.projects.some((p) => p.id === projectId)) return send(404, { detail: "proje yok" });
      return withBody((body) => {
        state.subcontractorContractSeq += 1;
        const seq = state.subcontractorContractSeq;
        const subcontractorId = (body.subcontractor_id as string | null) ?? null;
        const rawItems = Array.isArray(body.items)
          ? (body.items as Array<Record<string, unknown>>)
          : [];
        const created: MockSubcontractorContract = {
          id: `sc-new-${seq}`,
          project_id: projectId,
          site_id: (body.site_id as string | null) ?? null,
          subcontractor_id: subcontractorId,
          subcontractor_name: subcontractorId
            ? (state.subcontractors.find((s) => s.id === subcontractorId)?.name ?? null)
            : null,
          work_category: (body.work_category as string | null) ?? null,
          contract_no: (body.contract_no as string | null) ?? null,
          signature_date: (body.signature_date as string | null) ?? null,
          is_notarized: Boolean(body.is_notarized),
          start_date: (body.start_date as string | null) ?? null,
          end_date: (body.end_date as string | null) ?? null,
          late_penalty_daily: (body.late_penalty_daily as string | null) ?? null,
          advance_pct: String(body.advance_pct ?? "0"),
          retainage_pct: String(body.retainage_pct ?? "0"),
          vat_pct: String(body.vat_pct ?? "20"),
          payment_period:
            (body.payment_period as MockSubcontractorContract["payment_period"]) ?? "monthly",
          payment_term_days: Number(body.payment_term_days ?? 30),
          materials_by_contractor: Boolean(body.materials_by_contractor),
          subcontractor_files_own_sgk: Boolean(body.subcontractor_files_own_sgk),
          vat_withholding: Boolean(body.vat_withholding),
          status: (body.status as MockSubcontractorContract["status"]) ?? "active",
          is_draft: Boolean(body.is_draft),
          items: rawItems.map((item, index) => ({
            id: `sci-new-${seq}-${index + 1}`,
            code: String(item.code ?? ""),
            description: String(item.description ?? ""),
            unit: String(item.unit ?? ""),
            contractUnitPrice: item.unit_price === null || item.unit_price === undefined
              ? null
              : String(item.unit_price),
            contractQuantity: String(item.quantity ?? "0"),
            groupName: null,
          })),
        };
        state.subcontractorContracts = [...state.subcontractorContracts, created];
        return send(201, buildSubcontractorContractDetailResponse(created));
      });
    }

    // POST /subcontractor-contracts/{id}/items/load-from-employer — işveren
    // sözleşmesinden poz çekme. Zaten var olan kod ATLANIR (skipped).
    const loadFromEmployerMatch = path.match(
      /^\/subcontractor-contracts\/([^/]+)\/items\/load-from-employer$/,
    );
    if (method === "POST" && loadFromEmployerMatch) {
      const contract = state.subcontractorContracts.find((c) => c.id === loadFromEmployerMatch[1]);
      if (!contract) return send(404, { detail: "sozlesme yok" });
      let created = 0;
      let skipped = 0;
      for (const item of state.contractItems) {
        if (contract.items.some((i) => i.code === item.code)) {
          skipped += 1;
          continue;
        }
        created += 1;
        contract.items = [
          ...contract.items,
          {
            id: `sci-loaded-${contract.id}-${item.id}`,
            code: item.code,
            description: item.description,
            unit: item.unit,
            // İşveren biriminden gelen kalemin TAŞERON birim fiyatı YOKTUR.
            contractUnitPrice: null,
            contractQuantity: item.quantity,
            groupName: item.groupName,
          },
        ];
      }
      return send(200, { created_count: created, skipped_count: skipped });
    }

    // POST /subcontractor-contracts/{id}/items — elle poz satırı ekleme.
    const createSubcontractItemMatch = path.match(/^\/subcontractor-contracts\/([^/]+)\/items$/);
    if (method === "POST" && createSubcontractItemMatch) {
      const contract = state.subcontractorContracts.find(
        (c) => c.id === createSubcontractItemMatch[1],
      );
      if (!contract) return send(404, { detail: "sozlesme yok" });
      return withBody((body) => {
        const created = {
          id: `sci-manual-${contract.id}-${contract.items.length + 1}`,
          code: String(body.code ?? ""),
          description: String(body.description ?? ""),
          unit: String(body.unit ?? ""),
          contractUnitPrice:
            body.unit_price === null || body.unit_price === undefined
              ? null
              : String(body.unit_price),
          contractQuantity: String(body.quantity ?? "0"),
          groupName: null,
        };
        contract.items = [...contract.items, created];
        const detail = buildSubcontractorContractDetailResponse(contract);
        return send(201, detail.items[detail.items.length - 1]);
      });
    }

    // PATCH/DELETE /subcontractor-contracts/items/{item_id} — TSD'de tek
    // yazılabilir alan Taşeron B.F. buradan gider; uç SÖZLEŞME kimliğini
    // TAŞIMAZ, kalem kimliğinden sözleşme bulunur.
    const subcontractItemMatch = path.match(/^\/subcontractor-contracts\/items\/([^/]+)$/);
    if ((method === "PATCH" || method === "DELETE") && subcontractItemMatch) {
      const itemId = subcontractItemMatch[1];
      const contract = state.subcontractorContracts.find((c) =>
        c.items.some((i) => i.id === itemId),
      );
      if (!contract) return send(404, { detail: "kalem yok" });

      if (method === "DELETE") {
        contract.items = contract.items.filter((i) => i.id !== itemId);
        return send(204);
      }
      return withBody((body) => {
        const item = contract.items.find((i) => i.id === itemId);
        if (!item) return send(404, { detail: "kalem yok" });
        if (body.code !== undefined && body.code !== null) item.code = String(body.code);
        if (body.description !== undefined && body.description !== null) {
          item.description = String(body.description);
        }
        if (body.unit !== undefined && body.unit !== null) item.unit = String(body.unit);
        if (body.quantity !== undefined && body.quantity !== null) {
          item.contractQuantity = String(body.quantity);
        }
        if (body.unit_price !== undefined) {
          item.contractUnitPrice = body.unit_price === null ? null : String(body.unit_price);
        }
        const detail = buildSubcontractorContractDetailResponse(contract);
        return send(200, detail.items.find((i) => i.id === itemId));
      });
    }

    // --- F-SD T1 · Şantiye Günlüğü uçları ---------------------------------
    // Taslak-DIŞI kurallar burada da geçerlidir (gerçek backend gibi):
    // `submitted` kayda PATCH/PUT lines 409 döner, aynı güne ikinci POST 409
    // döner. Aksi halde e2e "yeşil" olur ama canlıda akış kırılır.

    const diaryPeriod = (): { year: number | null; month: number | null } => ({
      year: parsed.searchParams.get("year") !== null ? Number(parsed.searchParams.get("year")) : null,
      month: parsed.searchParams.get("month") !== null ? Number(parsed.searchParams.get("month")) : null,
    });

    // GET /sites/{site_id}/diary/summary — poz bazlı aylık birikim
    // (tekil `/sites/{id}/diary` rotasından ÖNCE kontrol edilir).
    const diarySummaryMatch = path.match(/^\/sites\/([^/]+)\/diary\/summary$/);
    if (method === "GET" && diarySummaryMatch) {
      const site = state.sites.find((s) => s.id === diarySummaryMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      const { year, month } = diaryPeriod();
      return send(200, buildDiarySummary(state, site.id, year, month));
    }

    // GET /sites/{site_id}/plan/day-summary — GK'nin gömülü planlama bloğu
    // (SALT-OKUNUR). `start` ZORUNLU; eksikse gerçek backend 422 döner.
    const planDaySummaryMatch = path.match(/^\/sites\/([^/]+)\/plan\/day-summary$/);
    if (method === "GET" && planDaySummaryMatch) {
      const site = state.sites.find((s) => s.id === planDaySummaryMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      const start = parsed.searchParams.get("start");
      if (!start) return send(422, { detail: "start zorunlu" });
      const daysParam = parsed.searchParams.get("days");
      const days = daysParam !== null ? Number(daysParam) : 5;
      return send(200, buildPlanDaySummaryRange(state, site.id, start, days));
    }

    // --- F-PL T1 · Planlama ekranının beş ucu -----------------------------
    // DEĞİŞTİRME semantiği gerçekten uygulanır (gerçek backend gibi): aksi
    // hâlde e2e "yeşil" olur ama canlıda silinmesi gereken satır kalır.
    const planWeekStart = (): string | null => parsed.searchParams.get("week_start");
    const planSiteOf = (id: string): MockSite | undefined => state.sites.find((s) => s.id === id);
    const nextPlanId = (prefix: string): string => {
      state.planSeq += 1;
      return `${prefix}-new-${state.planSeq}`;
    };

    // GET /sites/{site_id}/plan — haftalık ızgara. `week_start` ZORUNLU.
    const planWeekMatch = path.match(/^\/sites\/([^/]+)\/plan$/);
    if (method === "GET" && planWeekMatch) {
      const site = planSiteOf(planWeekMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      const weekStart = planWeekStart();
      if (!weekStart) return send(422, { detail: "week_start zorunlu" });
      return send(200, buildSitePlanWeek(state, site.id, weekStart));
    }

    // PUT /sites/{site_id}/plan/rows — ŞANTİYE kapsamlı tam değiştirme.
    // `week_start` YOKTUR. Gövdede geçmeyen satır silinir, hücreleri CASCADE
    // ile gider; `id` taşıyan satır kimliğini (ve hücrelerini) KORUR.
    const planRowsMatch = path.match(/^\/sites\/([^/]+)\/plan\/rows$/);
    if (method === "PUT" && planRowsMatch) {
      const site = planSiteOf(planRowsMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      return withBody((body) => {
        const input = Array.isArray(body.rows) ? (body.rows as Record<string, unknown>[]) : [];
        const kept: MockPlanRow[] = input.map((raw, index) => {
          const existingId = typeof raw.id === "string" ? raw.id : null;
          const existing = existingId
            ? state.planRows.find((r) => r.id === existingId && r.site_id === site.id)
            : undefined;
          return {
            id: existing?.id ?? nextPlanId("pr"),
            site_id: site.id,
            kind: raw.kind === "equipment" ? "equipment" : "crew",
            section_id: typeof raw.section_id === "string" ? raw.section_id : null,
            label: String(raw.label ?? ""),
            planned_worker_count:
              typeof raw.planned_worker_count === "number" ? raw.planned_worker_count : null,
            sort_order: typeof raw.sort_order === "number" ? raw.sort_order : index,
          };
        });
        const keptIds = new Set(kept.map((r) => r.id));
        state.planRows = [
          ...state.planRows.filter((r) => r.site_id !== site.id),
          ...kept,
        ];
        // CASCADE: silinen satırın hücreleri de gider.
        state.planCells = state.planCells.filter(
          (c) => c.site_id !== site.id || keptIds.has(c.row_id),
        );
        return send(200, {
          rows: kept.map((r) => ({
            id: r.id,
            kind: r.kind,
            section_id: r.section_id,
            label: r.label,
            planned_worker_count: r.planned_worker_count,
            sort_order: r.sort_order,
          })),
        });
      });
    }

    // PUT /sites/{site_id}/plan/cells — HAFTA + şantiye kapsamlı değiştirme.
    // Boş metinli hücre YAZILMAZ (hücre yokluğu = plan yok) → silme yolu budur.
    const planCellsMatch = path.match(/^\/sites\/([^/]+)\/plan\/cells$/);
    if (method === "PUT" && planCellsMatch) {
      const site = planSiteOf(planCellsMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      const weekStart = planWeekStart();
      if (!weekStart) return send(422, { detail: "week_start zorunlu" });
      return withBody((body) => {
        const weekDates = new Set(
          Array.from({ length: 7 }, (_, index) => addDaysIso(weekStart, index)),
        );
        const input = Array.isArray(body.cells) ? (body.cells as Record<string, unknown>[]) : [];
        const next: MockPlanCell[] = [];
        for (const raw of input) {
          const planDate = String(raw.plan_date ?? "");
          if (!weekDates.has(planDate)) {
            return send(422, { detail: "hucre istenen haftanin disinda" });
          }
          const text = String(raw.text ?? "").trim();
          if (text === "") continue;
          next.push({
            site_id: site.id,
            row_id: String(raw.row_id ?? ""),
            plan_date: planDate,
            text,
            tag: typeof raw.tag === "string" ? raw.tag : null,
          });
        }
        state.planCells = [
          ...state.planCells.filter((c) => c.site_id !== site.id || !weekDates.has(c.plan_date)),
          ...next,
        ];
        return send(200, buildSitePlanWeek(state, site.id, weekStart));
      });
    }

    // PUT /sites/{site_id}/plan/goals — HAFTA + şantiye kapsamlı değiştirme.
    const planGoalsMatch = path.match(/^\/sites\/([^/]+)\/plan\/goals$/);
    if (method === "PUT" && planGoalsMatch) {
      const site = planSiteOf(planGoalsMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      const weekStart = planWeekStart();
      if (!weekStart) return send(422, { detail: "week_start zorunlu" });
      return withBody((body) => {
        const input = Array.isArray(body.goals) ? (body.goals as Record<string, unknown>[]) : [];
        const kept: MockPlanGoal[] = input.map((raw, index) => {
          const existingId = typeof raw.id === "string" ? raw.id : null;
          const existing = existingId
            ? state.planGoals.find(
                (g) => g.id === existingId && g.site_id === site.id && g.week_start === weekStart,
              )
            : undefined;
          return {
            id: existing?.id ?? nextPlanId("pg"),
            site_id: site.id,
            week_start: weekStart,
            title: String(raw.title ?? ""),
            note: typeof raw.note === "string" ? raw.note : null,
            is_done: raw.is_done === true,
            // `is_done` ile `status` AYRI alanlardır; biri diğerinden TÜRETİLMEZ.
            status: (typeof raw.status === "string"
              ? raw.status
              : "waiting") as MockPlanGoal["status"],
            sort_order: typeof raw.sort_order === "number" ? raw.sort_order : index,
          };
        });
        state.planGoals = [
          ...state.planGoals.filter((g) => g.site_id !== site.id || g.week_start !== weekStart),
          ...kept,
        ];
        return send(200, buildSitePlanWeek(state, site.id, weekStart));
      });
    }

    // PUT /sites/{site_id}/plan/sprint — ŞANTİYE kapsamlı, `week_start` YOK.
    // Boş/null ad aktif sprinti KAPATIR (kayıt silinmez, `is_active` düşer) ve
    // yanıt `null` olur.
    const planSprintMatch = path.match(/^\/sites\/([^/]+)\/plan\/sprint$/);
    if (method === "PUT" && planSprintMatch) {
      const site = planSiteOf(planSprintMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      return withBody((body) => {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        state.planSprints = state.planSprints.map((s) =>
          s.site_id === site.id ? { ...s, is_active: false } : s,
        );
        if (name === "") return send(200, null);
        const reusable = state.planSprints.find((s) => s.site_id === site.id && s.name === name);
        if (reusable) {
          state.planSprints = state.planSprints.map((s) =>
            s.id === reusable.id ? { ...s, is_active: true } : s,
          );
          return send(200, { id: reusable.id, name: reusable.name });
        }
        const created: MockPlanSprint = {
          id: nextPlanId("ps"),
          site_id: site.id,
          name,
          is_active: true,
        };
        state.planSprints = [...state.planSprints, created];
        return send(200, { id: created.id, name: created.name });
      });
    }

    // --- F-PT T4 · Personel formunun "Bağlı Taşeron" seçicisi ---------------
    // GET /subcontractors — mockup'ın sabit taşeron adları YERİNE gerçek uç.
    // Yanıtta sayfalama YOKTUR (`SubcontractorListResponse` yalnız `items`).
    // F-P5 T1: liste artık DURUMDAN gelir (oluşturma/güncelleme uçları geldi)
    // ve `q` arama parametresini uygular. Sayfalama YOKTUR.
    if (method === "GET" && path === "/subcontractors") {
      const activeOnly = parsed.searchParams.get("active_only") !== "false";
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      let items = state.subcontractors;
      if (activeOnly) items = items.filter((i) => i.is_active);
      if (q) items = items.filter((i) => i.name.toLocaleLowerCase("tr").includes(q));
      return send(200, { items });
    }

    // POST /subcontractors — TL/FSO'nun paylaşılan "+ Taşeron Ekle" modalı.
    if (method === "POST" && path === "/subcontractors") {
      return withBody((body) => {
        const name = String(body.name ?? "").trim();
        if (name.length === 0) return send(422, { detail: "Taşeron adı zorunlu." });
        state.subcontractorSeq += 1;
        const created: MockSubcontractor = {
          id: `sub-new-${state.subcontractorSeq}`,
          name,
          tax_number: (body.tax_number as string | null) ?? null,
          contact_person: (body.contact_person as string | null) ?? null,
          phone: (body.phone as string | null) ?? null,
          email: (body.email as string | null) ?? null,
          category: (body.category as string | null) ?? null,
          is_active: body.is_active === undefined ? true : Boolean(body.is_active),
        };
        state.subcontractors = [...state.subcontractors, created];
        return send(201, created);
      });
    }

    // PATCH /subcontractors/{id} — kısmi güncelleme (null alan TEMİZLER).
    const subcontractorIdMatch = path.match(/^\/subcontractors\/([^/]+)$/);
    if (method === "PATCH" && subcontractorIdMatch) {
      const subcontractor = state.subcontractors.find((s) => s.id === subcontractorIdMatch[1]);
      if (!subcontractor) return send(404, { detail: "taseron yok" });
      return withBody((body) => {
        for (const [key, value] of Object.entries(body)) {
          if (value === undefined) continue;
          Object.assign(subcontractor, { [key]: value });
        }
        return send(200, subcontractor);
      });
    }

    // --- F-PT T1 · Puantaj uçları ------------------------------------------
    // GET/POST /personnel — matris satırlarını besleyen personel kartları.
    if (method === "GET" && path === "/personnel") {
      const search = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      const source = parsed.searchParams.get("source");
      const subcontractorId = parsed.searchParams.get("subcontractor_id");
      const isActiveParam = parsed.searchParams.get("is_active");
      // F-İK T2 — atanan proje süzgeci SUNUCUDA uygulanır (İK-1 `project_id`).
      const projectId = parsed.searchParams.get("project_id");
      const isDraftParam = parsed.searchParams.get("is_draft");
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");

      let rows = state.personnel;
      if (search) {
        rows = rows.filter(
          (p) =>
            p.full_name.toLocaleLowerCase("tr").includes(search) ||
            (p.trade ?? "").toLocaleLowerCase("tr").includes(search),
        );
      }
      if (source) rows = rows.filter((p) => p.source === source);
      if (subcontractorId) rows = rows.filter((p) => p.subcontractor_id === subcontractorId);
      if (isActiveParam !== null) rows = rows.filter((p) => p.is_active === (isActiveParam === "true"));
      if (projectId) rows = rows.filter((p) => p.assigned_project_id === projectId);
      if (isDraftParam !== null) rows = rows.filter((p) => p.is_draft === (isDraftParam === "true"));

      // `total` SAYFALAMA TAVANIDIR — süzülmüş kümenin tamamı, `items.length` DEĞİL.
      return send(200, {
        items: rows.slice(offset, offset + limit),
        total: rows.length,
        limit,
        offset,
      });
    }
    if (method === "POST" && path === "/personnel") {
      return withBody((body) => {
        const fullName = String(body.full_name ?? "").trim();
        if (!fullName) return send(422, { detail: "ad soyad zorunlu" });
        const source = body.source;
        if (source !== "company" && source !== "subcontractor" && source !== "general") {
          return send(422, { detail: "kaynak zorunlu" });
        }

        // F-İK T4 · TCKN iki AYRI ret yolu (spec K3) — istemci bu ikisini
        // KARIŞTIRMAMALI, bu yüzden mock ikisini de üretebilmeli:
        //   • biçimsel geçersizlik → 422
        //   • aynı TC'li personel zaten var → 409
        // İkisi de FİKSTÜRLERE dokunmadan kurulabilir: testler kendi
        // oluşturdukları kayıtla çakışma üretir (fikstürlerde `tc_no` boştur).
        const tcNo = typeof body.tc_no === "string" && body.tc_no ? body.tc_no : null;
        if (tcNo !== null && !/^\d{11}$/.test(tcNo)) {
          return send(422, { detail: "TC kimlik numarası 11 haneli olmalıdır" });
        }
        if (tcNo !== null && state.personnel.some((p) => p.tc_no === tcNo)) {
          return send(409, { detail: "Bu TC kimlik numarasıyla kayıtlı personel var" });
        }

        state.personnelSeq += 1;
        const created: MockPersonnel = {
          ...EMPTY_HR_FIELDS,
          id: `per-new-${state.personnelSeq}`,
          full_name: fullName,
          trade: typeof body.trade === "string" && body.trade ? body.trade : null,
          source,
          subcontractor_id:
            typeof body.subcontractor_id === "string" ? body.subcontractor_id : null,
          user_id: typeof body.user_id === "string" ? body.user_id : null,
          is_active: body.is_active !== false,
          // İK-1 alanları gövdeden AYNEN alınır (gelmeyen alan null kalır);
          // `is_draft` sunucudaki gibi gövdenin belirlediği durumdur.
          ...hrFieldsFromBody(body),
          is_draft: body.is_draft === true,
        };
        state.personnel = [...state.personnel, created];
        return send(201, created);
      });
    }

    // F-İK T2 · GET /hr/documents/summary — uyarı bandının TEK kaynağı.
    // ⚠️ İlk path segmenti "personnel" DEĞİL "hr"dir (BFF izin listesinde ayrı
    // kök). Sayaçlar BELGE sayısıdır; ekran bunlardan "N personel" TÜRETMEZ.
    if (method === "GET" && path === "/hr/documents/summary") {
      return send(200, HR_DOCUMENTS_SUMMARY_FIXTURE);
    }

    // F-İK T5 · GET /personnel/{id}/documents — Personel Detay "Belgeler"
    // kartı. Bu kökün adı "personnel"dır (özet ucunun aksine "hr" DEĞİL).
    // Uç SAYFALAMASIZDIR: düz dizi döner, zarf YOKTUR. Kaydı olmayan personel
    // BOŞ dizi alır (404 DEĞİL) — boş-durum yolu bu yüzden kanıtlanabilir.
    const personnelDocumentsMatch = path.match(/^\/personnel\/([^/]+)\/documents$/);
    if (method === "GET" && personnelDocumentsMatch) {
      return send(200, state.personnelDocuments[personnelDocumentsMatch[1]] ?? []);
    }

    // F-BLG T3 · POST /personnel/{personnel_id}/documents — belge TAKİP kaydı.
    //
    // 🔴 Uç **JSON** alır, DOSYA ALMAZ (`PersonnelDocumentCreate`): dosya iki
    // adımlı akışın BİRİNCİ adımında `POST /documents` ile arşive gider ve
    // künyesi buraya `document_id` olarak bağlanır. Gövdede `file` YOKTUR;
    // multipart gelirse `JSON.parse` patlar — o yüzden bilerek `withBody`.
    //
    // 🔴 `type_id` XOR `free_label` — TAM BİRİ dolu olmalı (şema
    // `model_validator`). İkisi de dolu YA DA ikisi de boş gövde 422 alır;
    // gerçek sunucunun kuralı budur ve istemcinin de doğruladığı kapıdır.
    if (method === "POST" && personnelDocumentsMatch) {
      const personnelId = personnelDocumentsMatch[1];
      const personnel = state.personnel.find((p) => p.id === personnelId);
      if (!personnel) return send(404, { detail: "Personel bulunamadı." });
      return withBody((body) => {
        const typeId = body.type_id === undefined || body.type_id === null
          ? null
          : String(body.type_id);
        const freeLabel = body.free_label === undefined || body.free_label === null
          ? null
          : String(body.free_label);
        if ((typeId === null) === (freeLabel === null)) {
          return send(422, {
            detail: "Belge tipi ile serbest etiketten TAM BİRİ verilmelidir.",
          });
        }
        const documentId = body.document_id === undefined || body.document_id === null
          ? null
          : String(body.document_id);
        if (documentId !== null && !state.documents.some((d) => d.id === documentId)) {
          // Gövde içi varlık referansı = 404 (ST kanonu).
          return send(404, { detail: "Belge bulunamadı." });
        }
        // `type_name`/`is_mandatory`/`validity_months` SUNUCU türevidir —
        // istemci bunları göndermez, gövdeden okunmaz.
        const catalog = HR_DOCUMENTS_SUMMARY_FIXTURE.by_type.find((t) => t.type_id === typeId);
        if (typeId !== null && !catalog) return send(404, { detail: "Belge tipi bulunamadı." });

        state.personnelDocumentSeq += 1;
        const created: components["schemas"]["PersonnelDocumentResponse"] = {
          id: `pdoc-new-${state.personnelDocumentSeq}`,
          personnel_id: personnelId,
          type_id: typeId,
          type_name: catalog?.type_name ?? null,
          is_mandatory: catalog?.is_mandatory ?? null,
          validity_months: catalog?.validity_months ?? null,
          free_label: freeLabel,
          document_id: documentId,
          issued_at: body.issued_at === undefined || body.issued_at === null
            ? null
            : String(body.issued_at),
          valid_until: body.valid_until === undefined || body.valid_until === null
            ? null
            : String(body.valid_until),
          note: body.note === undefined || body.note === null ? null : String(body.note),
          // `status`/`days_left` SUNUCU damgasıdır; istemci eşik hesaplamaz.
          status: "valid",
          days_left: null,
          created_at: "2026-08-15T09:00:00Z",
          updated_at: "2026-08-15T09:00:00Z",
        };
        state.personnelDocuments = {
          ...state.personnelDocuments,
          [personnelId]: [...(state.personnelDocuments[personnelId] ?? []), created],
        };
        return send(201, created);
      });
    }

    // GET/PATCH /personnel/{personnel_id} — F-PT2 T1 · Personel Detay ekranı
    // + "Düzenle" kipinin tekil kaynağı/güncelleme ucu. `SubcontractorResponse`
    // PATCH deseninin (yukarısı) AYNISI: gövdede GELEN alanlar `Object.assign`
    // ile birleştirilir, gelmeyenler mevcut kayıttan aynen kalır (kısmi PATCH).
    const personnelIdMatch = path.match(/^\/personnel\/([^/]+)$/);
    if (method === "GET" && personnelIdMatch) {
      const person = state.personnel.find((p) => p.id === personnelIdMatch[1]);
      if (!person) return send(404, { detail: "personel yok" });
      return send(200, person);
    }
    if (method === "PATCH" && personnelIdMatch) {
      const person = state.personnel.find((p) => p.id === personnelIdMatch[1]);
      if (!person) return send(404, { detail: "personel yok" });
      return withBody((body) => {
        // POST ile AYNI iki ret yolu (spec K3): biçim 422, çakışma 409.
        const tcNo = typeof body.tc_no === "string" && body.tc_no ? body.tc_no : null;
        if (tcNo !== null && !/^\d{11}$/.test(tcNo)) {
          return send(422, { detail: "TC kimlik numarası 11 haneli olmalıdır" });
        }
        if (tcNo !== null && state.personnel.some((p) => p.id !== person.id && p.tc_no === tcNo)) {
          return send(409, { detail: "Bu TC kimlik numarasıyla kayıtlı personel var" });
        }
        for (const [key, value] of Object.entries(body)) {
          if (value === undefined) continue;
          Object.assign(person, { [key]: value });
        }
        return send(200, person);
      });
    }

    // GET/PUT /sites/{site_id}/timesheet — ay matrisi.
    // `year`/`month` ZORUNLU; eksikse gerçek backend 422 döner.
    const timesheetMatch = path.match(/^\/sites\/([^/]+)\/timesheet$/);
    const timesheetExportMatch = path.match(/^\/sites\/([^/]+)\/timesheet\/export\.xlsx$/);
    const timesheetPeriod = (): { year: number; month: number } | null => {
      const year = parsed.searchParams.get("year");
      const month = parsed.searchParams.get("month");
      if (!year || !month) return null;
      return { year: Number(year), month: Number(month) };
    };
    /** Başka şantiyenin bölümü boş matris DEĞİL 404 alır (gerçek backend kuralı). */
    const visibleSection = (siteId: string): { ok: true; id: string | null } | { ok: false } => {
      const sectionId = parsed.searchParams.get("section_id");
      if (!sectionId) return { ok: true, id: null };
      const section = state.sections.find((s) => s.id === sectionId && s.site_id === siteId);
      return section ? { ok: true, id: section.id } : { ok: false };
    };

    if (method === "GET" && (timesheetMatch || timesheetExportMatch)) {
      const siteId = (timesheetMatch ?? timesheetExportMatch)![1];
      const site = state.sites.find((s) => s.id === siteId);
      if (!site) return send(404, { detail: "santiye yok" });
      const period = timesheetPeriod();
      if (!period) return send(422, { detail: "year/month zorunlu" });
      const section = visibleSection(site.id);
      if (!section.ok) return send(404, { detail: "bolum yok" });

      // Excel çıktısı OKUMA ucudur ve AYNI kapsam kurallarını izler; yalnız
      // gövde ikilidir (BFF içerik tipinden ikili/JSON kararı verir).
      if (timesheetExportMatch) {
        res.writeHead(200, {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": `attachment; filename="puantaj-${site.code}-${period.year}-${String(period.month).padStart(2, "0")}.xlsx"`,
        });
        res.end(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
        return;
      }
      return send(200, buildTimesheetMatrix(state, site, period.year, period.month, section.id));
    }

    // PUT /sites/{site_id}/timesheet — DÖNEM + ŞANTİYE kapsamlı DEĞİŞTİRME.
    // ⚠️ Kapsam kuralı MOCK'ta da uygulanır: gelen `cells` o dönem+şantiyenin
    // TAM kümesi sayılır, gövdede geçmeyen hücre SİLİNİR. Başka ayın ya da
    // başka şantiyenin hücrelerine DOKUNULMAZ. Aksi hâlde e2e "yeşil" olur
    // ama canlıda bölüm filtresiyle kaydeden kullanıcı diğer bölümlerin ayını
    // siler — bu dilimin en kritik tuzağı tam olarak budur.
    // Yanıt GÜNCEL TAM matristir (bölüm süzgeci UYGULANMAZ).
    if (method === "PUT" && timesheetMatch) {
      const site = state.sites.find((s) => s.id === timesheetMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      const period = timesheetPeriod();
      if (!period) return send(422, { detail: "year/month zorunlu" });
      return withBody((body) => {
        const input = Array.isArray(body.cells) ? (body.cells as Record<string, unknown>[]) : [];
        const next: MockTimesheetCell[] = [];
        for (const raw of input) {
          const workDate = String(raw.work_date ?? "");
          if (!cellInPeriod({ work_date: workDate } as MockTimesheetCell, period.year, period.month)) {
            return send(422, { detail: "hucre istenen donemin disinda" });
          }
          // KİŞİ-GÜN ÇAKIŞMASI (409): gerçek backend bir personeli aynı güne
          // İKİ şantiyede puantajlamaya izin vermez. Kural DAR tutulur —
          // yalnız BAŞKA şantiyedeki kayda bakılır, aynı şantiyenin kendi
          // hücresi (değiştirme) çakışma değildir.
          const personnelId = String(raw.personnel_id ?? "");
          const conflict = state.timesheetCells.find(
            (c) =>
              c.site_id !== site.id && c.personnel_id === personnelId && c.work_date === workDate,
          );
          if (conflict) {
            const person = state.personnel.find((p) => p.id === personnelId);
            const other = state.sites.find((s) => s.id === conflict.site_id);
            return send(409, {
              detail: `${person?.full_name ?? personnelId} ${workDate} gunu ${other?.name ?? conflict.site_id} santiyesinde kayitli.`,
            });
          }
          const overtime = raw.overtime_hours;
          next.push({
            site_id: site.id,
            personnel_id: personnelId,
            work_date: workDate,
            code: raw.code as MockTimesheetCode,
            overtime_hours:
              overtime === undefined || overtime === null ? null : Number(overtime).toFixed(2),
            section_id: typeof raw.section_id === "string" ? raw.section_id : null,
          });
        }
        state.timesheetCells = [
          ...state.timesheetCells.filter(
            (c) => c.site_id !== site.id || !cellInPeriod(c, period.year, period.month),
          ),
          ...next,
        ];
        return send(200, buildTimesheetMatrix(state, site, period.year, period.month, null));
      });
    }

    // GET/POST /sites/{site_id}/diary — liste + kayıt açma.
    const siteDiaryMatch = path.match(/^\/sites\/([^/]+)\/diary$/);
    if (method === "GET" && siteDiaryMatch) {
      const site = state.sites.find((s) => s.id === siteDiaryMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      const { year, month } = diaryPeriod();
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const filtered = state.diaryEntries
        .filter((e) => e.site_id === site.id && diaryEntryInPeriod(e, year, month))
        .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || a.id.localeCompare(b.id));
      return send(200, {
        items: filtered.slice(offset, offset + limit).map(buildDiaryEntryListItem),
        total: filtered.length,
        limit,
        offset,
      });
    }
    if (method === "POST" && siteDiaryMatch) {
      const site = state.sites.find((s) => s.id === siteDiaryMatch[1]);
      if (!site) return send(404, { detail: "santiye yok" });
      return withBody((body) => {
        const entryDate = String(body.entry_date ?? "");
        if (!entryDate) return send(422, { detail: "entry_date zorunlu" });
        // Günde TEK kayıt: aynı güne ikinci POST 409 (spec §2).
        const clash = state.diaryEntries.find(
          (e) => e.site_id === site.id && e.entry_date === entryDate,
        );
        if (clash) {
          return send(409, { detail: "Bu güne ait günlük kayıt zaten var." });
        }
        const id = `d-${state.diaryEntries.length + 1}`;
        const now = new Date().toISOString();
        const entry: MockDiaryEntry = {
          id,
          site_id: site.id,
          project_id: site.project_id,
          entry_date: entryDate,
          section_id: (body.section_id as string | null | undefined) ?? null,
          weather: (body.weather as string | null | undefined) ?? null,
          temperature_c: body.temperature_c !== undefined && body.temperature_c !== null
            ? String(body.temperature_c)
            : null,
          work_done: body.work_done !== undefined && body.work_done !== null ? String(body.work_done) : null,
          chief_note: body.chief_note !== undefined && body.chief_note !== null ? String(body.chief_note) : null,
          safety_meeting_held: Boolean(body.safety_meeting_held),
          ppe_checked: Boolean(body.ppe_checked),
          has_incident: Boolean(body.has_incident),
          incident_note:
            body.incident_note !== undefined && body.incident_note !== null
              ? String(body.incident_note)
              : null,
          // Kayıt HER ZAMAN taslak doğar; satır iskeleti BOQ'dan otomatik gelir.
          status: "draft",
          submitted_at: null,
          created_by: "u-1",
          created_at: now,
          updated_at: now,
          lines: buildDiaryLineSkeleton(id),
          worker_counts: [],
        };
        state.diaryEntries.push(entry);
        return send(201, buildDiaryEntryDetail(state, entry));
      });
    }

    // POST /diary/{entry_id}/submit — taslağı gönderir (özete SOKAR).
    const diarySubmitMatch = path.match(/^\/diary\/([^/]+)\/submit$/);
    if (method === "POST" && diarySubmitMatch) {
      const entry = state.diaryEntries.find((e) => e.id === diarySubmitMatch[1]);
      if (!entry) return send(404, { detail: "gunluk kayit yok" });
      if (entry.status !== "draft") return send(409, { detail: "Yalnızca taslak kayıt gönderilebilir." });
      entry.status = "submitted";
      entry.submitted_at = new Date().toISOString();
      entry.updated_at = entry.submitted_at;
      return send(200, buildDiaryEntryDetail(state, entry));
    }

    // POST /diary/{entry_id}/reopen — gönderilmiş kaydı yeniden taslağa alır.
    const diaryReopenMatch = path.match(/^\/diary\/([^/]+)\/reopen$/);
    if (method === "POST" && diaryReopenMatch) {
      const entry = state.diaryEntries.find((e) => e.id === diaryReopenMatch[1]);
      if (!entry) return send(404, { detail: "gunluk kayit yok" });
      if (entry.status !== "submitted") {
        return send(409, { detail: "Yalnızca gönderilmiş kayıt yeniden açılabilir." });
      }
      entry.status = "draft";
      entry.submitted_at = null;
      entry.updated_at = new Date().toISOString();
      return send(200, buildDiaryEntryDetail(state, entry));
    }

    // PUT /diary/{entry_id}/lines — DEĞİŞTİRME semantiği: gövdede geçmeyen
    // poz sıfırlanır. Yalnız TASLAK kayıtta.
    const diaryLinesMatch = path.match(/^\/diary\/([^/]+)\/lines$/);
    if (method === "PUT" && diaryLinesMatch) {
      const entry = state.diaryEntries.find((e) => e.id === diaryLinesMatch[1]);
      if (!entry) return send(404, { detail: "gunluk kayit yok" });
      if (entry.status !== "draft") {
        return send(409, { detail: "Gönderilmiş kayıtta satır düzenlenemez." });
      }
      return withBody((body) => {
        const rawLines = Array.isArray(body.lines) ? (body.lines as Array<Record<string, unknown>>) : [];
        const quantities: Record<string, number> = {};
        for (const line of rawLines) {
          const itemId = String(line.boq_item_id ?? "");
          if (!ALL_BOQ_ITEMS.some((item) => item.id === itemId)) {
            return send(422, { detail: "bilinmeyen boq kalemi" });
          }
          quantities[itemId] = Number(line.quantity ?? 0);
        }
        entry.lines = buildDiaryLineSkeleton(entry.id, quantities);
        entry.updated_at = new Date().toISOString();
        return send(200, buildDiaryEntryDetail(state, entry));
      });
    }

    // GET/PATCH /diary/{entry_id} — tekil rota (alt-yol regex'lerinden SONRA).
    const diaryEntryIdMatch = path.match(/^\/diary\/([^/]+)$/);
    if (method === "GET" && diaryEntryIdMatch) {
      const entry = state.diaryEntries.find((e) => e.id === diaryEntryIdMatch[1]);
      if (!entry) return send(404, { detail: "gunluk kayit yok" });
      return send(200, buildDiaryEntryDetail(state, entry));
    }
    if (method === "PATCH" && diaryEntryIdMatch) {
      const entry = state.diaryEntries.find((e) => e.id === diaryEntryIdMatch[1]);
      if (!entry) return send(404, { detail: "gunluk kayit yok" });
      if (entry.status !== "draft") {
        return send(409, { detail: "Gönderilmiş kayıt düzenlenemez." });
      }
      return withBody((body) => {
        if (body.entry_date !== undefined && body.entry_date !== null) {
          const nextDate = String(body.entry_date);
          const clash = state.diaryEntries.find(
            (e) => e.id !== entry.id && e.site_id === entry.site_id && e.entry_date === nextDate,
          );
          if (clash) return send(409, { detail: "Bu güne ait günlük kayıt zaten var." });
          entry.entry_date = nextDate;
        }
        if (body.section_id !== undefined) entry.section_id = (body.section_id as string | null) ?? null;
        if (body.weather !== undefined) entry.weather = (body.weather as string | null) ?? null;
        if (body.temperature_c !== undefined) {
          entry.temperature_c = body.temperature_c === null ? null : String(body.temperature_c);
        }
        if (body.work_done !== undefined) entry.work_done = (body.work_done as string | null) ?? null;
        if (body.chief_note !== undefined) entry.chief_note = (body.chief_note as string | null) ?? null;
        if (body.safety_meeting_held !== undefined) {
          entry.safety_meeting_held = Boolean(body.safety_meeting_held);
        }
        if (body.ppe_checked !== undefined) entry.ppe_checked = Boolean(body.ppe_checked);
        if (body.has_incident !== undefined) entry.has_incident = Boolean(body.has_incident);
        if (body.incident_note !== undefined) {
          entry.incident_note = (body.incident_note as string | null) ?? null;
        }
        // `worker_counts` DEĞİŞTİRME semantiği: gönderilmeyen (meslek, kaynak)
        // çifti SİLİNİR.
        if (body.worker_counts !== undefined && body.worker_counts !== null) {
          const raw = Array.isArray(body.worker_counts)
            ? (body.worker_counts as Array<Record<string, unknown>>)
            : [];
          entry.worker_counts = raw.map((w, index) => ({
            id: `${entry.id}-w-${index + 1}`,
            trade: String(w.trade ?? ""),
            source: (w.source as MockDiaryWorkerCount["source"]) ?? "company",
            count: Number(w.count ?? 0),
          }));
        }
        entry.updated_at = new Date().toISOString();
        return send(200, buildDiaryEntryDetail(state, entry));
      });
    }

    // GET /projects/{project_id}/progress-payments/diary-suggestion —
    // işveren hakediş formunun "Günlükten Doldur" önerisi.
    const employerSuggestionMatch = path.match(
      /^\/projects\/([^/]+)\/progress-payments\/diary-suggestion$/,
    );
    if (method === "GET" && employerSuggestionMatch) {
      const project = state.projects.find((p) => p.id === employerSuggestionMatch[1]);
      if (!project) return send(404, { detail: "proje yok" });
      const { year, month } = diaryPeriod();
      const entries = state.diaryEntries.filter(
        (e) => e.project_id === project.id && e.status === "submitted" && diaryEntryInPeriod(e, year, month),
      );
      const { rows, skipped } = buildDiarySuggestionRows(entries, "employerItemId", null);
      const lines = [...rows.entries()].map(([key, value]) => ({
        contract_item_id: key.split("|")[0],
        site_id: value.siteId,
        quantity: qty3(value.quantity),
        // Katsayı bir GÜNLÜK verisi değildir — hakedişin default'u uygulanır.
        coefficient: null,
      }));
      return send(200, {
        year,
        month,
        skipped_unbridged_count: skipped,
        reason: lines.length === 0 ? "Seçilen dönemde köprülenmiş günlük kaydı bulunamadı." : null,
        project_id: project.id,
        lines,
      });
    }

    // GET /subcontractor-contracts/{contract_id}/progress-payments/diary-suggestion —
    // taşeron hakediş formunun önerisi. Sözleşme proje geneliyse (site_id
    // null) öneri kapsam DIŞIDIR ve `reason` bunu açıkça söyler.
    const subcontractorSuggestionMatch = path.match(
      /^\/subcontractor-contracts\/([^/]+)\/progress-payments\/diary-suggestion$/,
    );
    if (method === "GET" && subcontractorSuggestionMatch) {
      const contract = state.subcontractorContracts.find((c) => c.id === subcontractorSuggestionMatch[1]);
      if (!contract) return send(404, { detail: "sozlesme yok" });
      const { year, month } = diaryPeriod();
      if (contract.site_id === null) {
        return send(200, {
          year,
          month,
          skipped_unbridged_count: 0,
          reason: "Proje geneli sözleşmede günlükten doldurma desteklenmiyor.",
          contract_id: contract.id,
          site_id: null,
          lines: [],
        });
      }
      const entries = state.diaryEntries.filter(
        (e) => e.site_id === contract.site_id && e.status === "submitted" && diaryEntryInPeriod(e, year, month),
      );
      const { rows, skipped } = buildDiarySuggestionRows(
        entries,
        "subcontractorItemId",
        contract.items.map((i) => i.id),
      );
      const lines = [...rows.entries()].map(([key, value], index) => ({
        contract_item_id: key.split("|")[0],
        quantity: qty3(value.quantity),
        coefficient: null,
        sort_order: index,
      }));
      return send(200, {
        year,
        month,
        skipped_unbridged_count: skipped,
        reason: lines.length === 0 ? "Seçilen dönemde köprülenmiş günlük kaydı bulunamadı." : null,
        contract_id: contract.id,
        site_id: contract.site_id,
        lines,
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

    // --- F-BC T1 · Belge Arşivi uçları -------------------------------------
    // KAPSAM KURALI (gerçek backend semantiği): `site_id` bir SÜZGEÇTİR ve
    // GEÇMEMEK "hepsi" DEĞİL "yalnız proje düzeyi (IS NULL)" demektir.
    const documentFoldersMatch = path.match(/^\/projects\/([^/]+)\/document-folders$/);
    if (method === "GET" && documentFoldersMatch) {
      const projectId = documentFoldersMatch[1];
      if (!state.projects.some((p) => p.id === projectId)) {
        return send(404, { detail: "proje yok" });
      }
      const siteId = parsed.searchParams.get("site_id");
      const folders = state.documentFolders.filter(
        (f) => f.project_id === projectId && f.site_id === (siteId ?? null),
      );
      return send(200, { folders });
    }
    if (method === "POST" && documentFoldersMatch) {
      const projectId = documentFoldersMatch[1];
      if (!state.projects.some((p) => p.id === projectId)) {
        return send(404, { detail: "proje yok" });
      }
      return withBody((body) => {
        const name = String(body.name ?? "").trim();
        if (!name) return send(422, { detail: "Klasör adı zorunlu." });
        // `project_id` GÖVDEDE değil YOLDA taşınır (backend sözleşmesi).
        const siteId = typeof body.site_id === "string" ? body.site_id : null;
        const parentId = typeof body.parent_id === "string" ? body.parent_id : null;
        const clash = state.documentFolders.find(
          (f) =>
            f.project_id === projectId &&
            f.site_id === siteId &&
            f.parent_id === parentId &&
            f.name.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr"),
        );
        if (clash) return send(409, { detail: "Bu adda bir klasör zaten var." });

        state.documentSeq += 1;
        const folder: MockDocumentFolder = {
          id: `df-new-${state.documentSeq}`,
          project_id: projectId,
          site_id: siteId,
          parent_id: parentId,
          name,
          created_at: "2026-08-09T09:00:00Z",
        };
        state.documentFolders = [...state.documentFolders, folder];
        return send(201, folder);
      });
    }

    // PATCH/DELETE /document-folders/{id} — bu dilimde EKRANA BAĞLANMAZ
    // (spec §4), ama BFF kökü tanımlı olduğu için uç burada da yaşar.
    const documentFolderIdMatch = path.match(/^\/document-folders\/([^/]+)$/);
    if (documentFolderIdMatch && (method === "PATCH" || method === "DELETE")) {
      const folderId = documentFolderIdMatch[1];
      const folder = state.documentFolders.find((f) => f.id === folderId);
      if (!folder) return send(404, { detail: "klasör yok" });
      if (method === "DELETE") {
        if (state.documents.some((d) => d.folder_id === folderId)) {
          return send(409, { detail: "Dolu klasör silinemez." });
        }
        state.documentFolders = state.documentFolders.filter((f) => f.id !== folderId);
        return send(204);
      }
      return withBody((body) => {
        const name = String(body.name ?? "").trim();
        if (!name) return send(422, { detail: "Klasör adı zorunlu." });
        folder.name = name;
        return send(200, folder);
      });
    }

    // GET /documents — `project_id` ZORUNLU; `site_id`/`folder_id`/`q` süzgeç.
    if (method === "GET" && path === "/documents") {
      const projectId = parsed.searchParams.get("project_id");
      if (!projectId) return send(422, { detail: "project_id zorunlu" });
      const siteId = parsed.searchParams.get("site_id");
      const folderId = parsed.searchParams.get("folder_id");
      const search = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      const limitParam = parsed.searchParams.get("limit");

      let rows = state.documents.filter(
        (d) => d.project_id === projectId && d.site_id === (siteId ?? null),
      );
      if (folderId) rows = rows.filter((d) => d.folder_id === folderId);
      if (search) {
        rows = rows.filter(
          (d) =>
            d.filename.toLocaleLowerCase("tr").includes(search) ||
            (d.description ?? "").toLocaleLowerCase("tr").includes(search),
        );
      }
      if (limitParam) rows = rows.slice(0, Number(limitParam));
      // TOPLAM SAYI ALANI YOK — sayfalama yok (şema gereği).
      return send(200, { documents: rows.map(buildDocumentRead) });
    }

    // POST /documents — MULTIPART. Gövde JSON'a çevrilmişse ayrıştırma
    // başarısız olur ve bu uç 422 döner; yani BFF'in ham geçirme davranışının
    // uçtan uca kapısıdır.
    if (method === "POST" && path === "/documents") {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        const parsedBody = parseMultipart(
          Buffer.concat(chunks),
          req.headers["content-type"] ?? "",
        );
        if (!parsedBody?.file) {
          return send(422, { detail: "Dosya alanı okunamadı." });
        }
        const projectId = parsedBody.fields.project_id;
        if (!projectId || !state.projects.some((p) => p.id === projectId)) {
          return send(404, { detail: "proje yok" });
        }
        if (parsedBody.file.size > DOCUMENT_MAX_BYTES) {
          return send(413, { detail: "Dosya boyutu sınırı aşıldı." });
        }
        const extension = documentExtension(parsedBody.file.filename);
        if (!DOCUMENT_ALLOWED_EXTENSIONS.includes(extension)) {
          return send(422, { detail: "Bu dosya türü kabul edilmiyor." });
        }

        state.documentSeq += 1;
        const created: MockDocument = {
          id: `doc-new-${state.documentSeq}`,
          folder_id: parsedBody.fields.folder_id ?? null,
          project_id: projectId,
          site_id: parsedBody.fields.site_id ?? null,
          filename: parsedBody.file.filename,
          mime_type: parsedBody.file.mimeType,
          size_bytes: parsedBody.file.size,
          description: parsedBody.fields.description ?? null,
          uploaded_by_name: ME.full_name,
          created_at: "2026-08-09T09:05:00Z",
          content: DOC_CONTENT,
        };
        state.documents = [...state.documents, created];
        return send(201, buildDocumentRead(created));
      });
      return;
    }

    // GET /documents/{id}/download — İKİLİ gövde + Content-Disposition.
    const documentDownloadMatch = path.match(/^\/documents\/([^/]+)\/download$/);
    if (method === "GET" && documentDownloadMatch) {
      const doc = state.documents.find((d) => d.id === documentDownloadMatch[1]);
      if (!doc) return send(404, { detail: "Belge bulunamadı." });
      res.writeHead(200, {
        "content-type": doc.mime_type,
        // Türkçe karakterli ad: gerçek backend gibi ASCII `filename` verilir.
        "content-disposition": `attachment; filename="${doc.filename.replace(/[^\w.\-() ]/g, "_")}"`,
      });
      res.end(Buffer.from(doc.content));
      return;
    }

    // PATCH/DELETE /documents/{id} — ekrana BAĞLANMAZ (spec §4); e2e temizliği
    // ve ileride açılacak yüzey için uçlar burada da yaşar.
    const documentIdMatch = path.match(/^\/documents\/([^/]+)$/);
    if (documentIdMatch && (method === "PATCH" || method === "DELETE")) {
      const documentId = documentIdMatch[1];
      const doc = state.documents.find((d) => d.id === documentId);
      if (!doc) return send(404, { detail: "Belge bulunamadı." });
      if (method === "DELETE") {
        state.documents = state.documents.filter((d) => d.id !== documentId);
        return send(204);
      }
      return withBody((body) => {
        // `exclude_unset` semantiği: GÖNDERİLMEYEN alana DOKUNULMAZ.
        if (body.filename !== undefined) doc.filename = String(body.filename);
        if (body.description !== undefined) {
          doc.description = body.description === null ? null : String(body.description);
        }
        if (body.folder_id !== undefined) {
          doc.folder_id = body.folder_id === null ? null : String(body.folder_id);
        }
        return send(200, buildDocumentRead(doc));
      });
    }

    // --- F-P8 T1 · Satış uçları --------------------------------------------
    //
    // ⚠️ `activate` / `transfer-deed` / `cancel` / `pay` uçlarının mock
    // karşılığı BİLEREK YOKTUR: satış detay ekranı basılmadığı için (spec §2 /
    // K3) hiçbir e2e onları çağırmaz. Buraya karşılık eklemek, olmayan bir
    // ekranı ima eder.

    // GET /customers — `q` AD/TCKN/VKN üzerinde kısmi arar. SAYFASIZ.
    if (method === "GET" && path === "/customers") {
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      const items = q
        ? state.customers.filter(
            (c) =>
              c.name.toLocaleLowerCase("tr").includes(q) ||
              (c.national_id ?? "").includes(q) ||
              (c.tax_number ?? "").includes(q),
          )
        : state.customers;
      return send(200, { items });
    }

    if (method === "POST" && path === "/customers") {
      return withBody((body) => {
        const name = String(body.name ?? "").trim();
        const customerType = String(body.customer_type ?? "");
        if (!name) return send(422, { detail: "Müşteri adı zorunludur." });
        if (customerType !== "person" && customerType !== "company") {
          return send(422, { detail: "Müşteri tipi geçersiz." });
        }
        state.saleSeq += 1;
        const customer: MockCustomer = {
          id: `cus-new-${state.saleSeq}`,
          customer_type: customerType,
          name,
          national_id: typeof body.national_id === "string" ? body.national_id : null,
          tax_number: typeof body.tax_number === "string" ? body.tax_number : null,
          phone: typeof body.phone === "string" ? body.phone : null,
          email: typeof body.email === "string" ? body.email : null,
          address: typeof body.address === "string" ? body.address : null,
        };
        state.customers = [...state.customers, customer];
        return send(201, customer);
      });
    }

    const customerIdMatch = path.match(/^\/customers\/([^/]+)$/);
    if (method === "GET" && customerIdMatch) {
      const customer = state.customers.find((c) => c.id === customerIdMatch[1]);
      if (!customer) return send(404, { detail: "Müşteri bulunamadı." });
      return send(200, customer);
    }

    // GET /projects/{project_id}/units — DS ünite seçicisinin kaynağı.
    const projectUnitsMatch = path.match(/^\/projects\/([^/]+)\/units$/);
    if (method === "GET" && projectUnitsMatch) {
      const projectId = projectUnitsMatch[1];
      if (!state.projects.some((p) => p.id === projectId)) {
        return send(404, { detail: "Proje bulunamadı." });
      }
      return send(200, buildUnitListResponse(state, projectId));
    }

    // GET /projects/{project_id}/sales — SÜZGEÇSİZ + SAYFASIZ (openapi).
    const projectSalesMatch = path.match(/^\/projects\/([^/]+)\/sales$/);
    if (method === "GET" && projectSalesMatch) {
      const projectId = projectSalesMatch[1];
      if (!state.projects.some((p) => p.id === projectId)) {
        return send(404, { detail: "Proje bulunamadı." });
      }
      return send(200, buildUnitSaleListResponse(state, projectId));
    }

    if (method === "POST" && projectSalesMatch) {
      const projectId = projectSalesMatch[1];
      return withBody((body) => {
        if (!state.projects.some((p) => p.id === projectId)) {
          return send(404, { detail: "Proje bulunamadı." });
        }
        const unit = state.units.find(
          (u) => u.id === String(body.unit_id ?? "") && u.project_id === projectId,
        );
        if (!unit) return send(404, { detail: "Ünite bulunamadı." });
        // P8 kapısı: arsa sahibi ünitesi satılamaz.
        if (unit.owner_side === "landowner") {
          return send(422, { detail: "Arsa sahibi payındaki ünite satılamaz." });
        }
        // P8 kapısı: bir ünitenin AYNI ANDA tek açık satışı olabilir.
        if (state.unitSales.some((s) => s.unit_id === unit.id && s.status !== "cancelled")) {
          return send(409, { detail: "Bu ünitenin açık bir satış kaydı zaten var." });
        }
        if (!state.customers.some((c) => c.id === String(body.customer_id ?? ""))) {
          return send(404, { detail: "Müşteri bulunamadı." });
        }
        const saleType = String(body.sale_type ?? "");
        if (!["sale", "reservation", "pre_contract"].includes(saleType)) {
          return send(422, { detail: "Satış tipi geçersiz." });
        }
        if (body.sale_price === undefined || body.sale_price === null) {
          return send(422, { detail: "Satış bedeli zorunludur." });
        }

        state.saleSeq += 1;
        const optionalMoney = (key: string): string | null =>
          body[key] === undefined || body[key] === null ? null : money2(Number(body[key]));
        const optionalText = (key: string): string | null =>
          typeof body[key] === "string" ? (body[key] as string) : null;

        const sale: MockUnitSale = {
          id: `sl-new-${state.saleSeq}`,
          project_id: projectId,
          unit_id: unit.id,
          customer_id: String(body.customer_id),
          sale_type: saleType as MockUnitSale["sale_type"],
          // Rezervasyon tipi `reservation` durumunda başlar; diğerleri `active`.
          status: saleType === "reservation" ? "reservation" : "active",
          list_price_snapshot: unit.list_price,
          discount_amount: optionalMoney("discount_amount"),
          sale_price: money2(Number(body.sale_price)),
          vat_pct: optionalMoney("vat_pct"),
          advisor_user_id: optionalText("advisor_user_id"),
          reservation_deposit: optionalMoney("reservation_deposit"),
          reservation_due_date: optionalText("reservation_due_date"),
          deed_condition: (optionalText("deed_condition") ??
            null) as MockUnitSale["deed_condition"],
          planned_deed_date: optionalText("planned_deed_date"),
          delivery_date: optionalText("delivery_date"),
          has_condominium_easement: Boolean(body.has_condominium_easement),
          has_mortgage: Boolean(body.has_mortgage),
          late_fee_monthly_pct: optionalMoney("late_fee_monthly_pct"),
          payment_plan_type: (optionalText("payment_plan_type") ??
            null) as MockUnitSale["payment_plan_type"],
          down_payment: optionalMoney("down_payment"),
          installment_count:
            body.installment_count === undefined || body.installment_count === null
              ? null
              : Number(body.installment_count),
          first_installment_date: optionalText("first_installment_date"),
          term_interest_pct: optionalMoney("term_interest_pct"),
        };
        state.unitSales = [...state.unitSales, sale];
        syncUnitSalesStatus(state, unit.id);
        return send(201, buildUnitSaleResponse(state, sale));
      });
    }

    const projectSalesSummaryMatch = path.match(/^\/projects\/([^/]+)\/sales\/summary$/);
    if (method === "GET" && projectSalesSummaryMatch) {
      const projectId = projectSalesSummaryMatch[1];
      if (!state.projects.some((p) => p.id === projectId)) {
        return send(404, { detail: "Proje bulunamadı." });
      }
      return send(200, buildSalesSummaryResponse(state, projectId));
    }

    const saleIdMatch = path.match(/^\/sales\/([^/]+)$/);
    if (method === "GET" && saleIdMatch) {
      const sale = state.unitSales.find((s) => s.id === saleIdMatch[1]);
      if (!sale) return send(404, { detail: "Satış bulunamadı." });
      return send(200, buildUnitSaleResponse(state, sale));
    }

    // POST /sales/{sale_id}/generate-plan — GÖVDESİZ. Plan satışın kendi
    // alanlarından üretilir; kuruş dengelemesi SON taksitte, Σ = sale_price.
    const generatePlanMatch = path.match(/^\/sales\/([^/]+)\/generate-plan$/);
    if (method === "POST" && generatePlanMatch) {
      const sale = state.unitSales.find((s) => s.id === generatePlanMatch[1]);
      if (!sale) return send(404, { detail: "Satış bulunamadı." });
      if (sale.payment_plan_type === null) {
        return send(422, { detail: "Ödeme planı tipi seçilmeden plan üretilemez." });
      }
      const rows = generateSalePlan(state, sale);
      state.saleInstallments = [
        ...state.saleInstallments.filter((i) => i.sale_id !== sale.id),
        ...rows,
      ];
      return send(200, buildSalePlanResponse(state, sale));
    }

    const saleInstallmentsMatch = path.match(/^\/sales\/([^/]+)\/installments$/);
    if (method === "GET" && saleInstallmentsMatch) {
      const sale = state.unitSales.find((s) => s.id === saleInstallmentsMatch[1]);
      if (!sale) return send(404, { detail: "Satış bulunamadı." });
      return send(200, buildSalePlanResponse(state, sale));
    }

    // 🛑 PUT = DEĞİŞTİRME (spec K5): gövde TAM planı taşır, gövdede geçmeyen
    // taksit SİLİNİR. Σ = `sale_price` kuralı SUNUCUDA zorlanır.
    if (method === "PUT" && saleInstallmentsMatch) {
      const saleId = saleInstallmentsMatch[1];
      return withBody((body) => {
        const sale = state.unitSales.find((s) => s.id === saleId);
        if (!sale) return send(404, { detail: "Satış bulunamadı." });
        const items = Array.isArray(body.items)
          ? (body.items as Array<Record<string, unknown>>)
          : [];
        if (items.length === 0) {
          return send(422, { detail: "Ödeme planı en az bir taksit içermelidir." });
        }
        const total = items.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
        if (money2(total) !== money2(Number(sale.sale_price))) {
          return send(422, {
            detail: "Ödeme planı toplamı satış bedeline eşit olmalıdır.",
          });
        }
        const previous = saleInstallmentsOf(state, saleId);
        const replaced: MockSaleInstallment[] = items.map((item, index) => {
          // Ödenmiş tutar KORUNUR (sıra numarasıyla eşleşen eski satırdan).
          const old = previous.find((p) => p.sequence_no === Number(item.sequence_no));
          state.saleSeq += 1;
          return {
            id: old?.id ?? `si-new-${state.saleSeq}`,
            sale_id: saleId,
            sequence_no: Number(item.sequence_no ?? index + 1),
            label: String(item.label ?? ""),
            due_date: String(item.due_date ?? SALES_TODAY),
            amount: money2(Number(item.amount ?? 0)),
            payment_method: (item.payment_method ??
              null) as MockSaleInstallment["payment_method"],
            paid_amount: old?.paid_amount ?? "0.00",
            paid_at: old?.paid_at ?? null,
          };
        });
        state.saleInstallments = [
          ...state.saleInstallments.filter((i) => i.sale_id !== saleId),
          ...replaced,
        ];
        return send(200, buildSalePlanResponse(state, sale));
      });
    }

    // --- F-ST T1 · Stok & Depo uçları --------------------------------------
    // DURUM KODU KANONU (backend spec §4b): gövde içi VARLIK referansı = 404,
    // biçim/kural ihlali = 422. Aşağıdaki dallar bu ayrımı BİREBİR uygular —
    // ekranın Türkçe hata basımının e2e kapısıdır.

    // GET /warehouses — yalnız sayfalama; `site_id` SÜZGECİ YOKTUR.
    if (method === "GET" && path === "/warehouses") {
      const limit = Number(parsed.searchParams.get("limit") ?? 50);
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? 0);
      const rows = state.warehouses.slice(offset, offset + limit);
      return send(200, { items: rows, total: state.warehouses.length, limit, offset });
    }
    if (method === "POST" && path === "/warehouses") {
      return withBody((body) => {
        const name = String(body.name ?? "").trim();
        if (!name) return send(422, { detail: "Depo adı zorunlu." });
        // §4b: gövde içi VARLIK referansı 404'tür (eskiden 422'ydi).
        const siteId = typeof body.site_id === "string" ? body.site_id : null;
        if (siteId !== null && !state.sites.some((s) => s.id === siteId)) {
          return send(404, { detail: "Şantiye bulunamadı." });
        }
        state.stockSeq += 1;
        const warehouse: MockWarehouse = {
          id: `wh-new-${state.stockSeq}`,
          name,
          site_id: siteId,
          created_at: "2026-08-12T09:00:00Z",
        };
        state.warehouses = [...state.warehouses, warehouse];
        return send(201, warehouse);
      });
    }
    // PATCH/DELETE /warehouses/{id} — EKRANA BAĞLANMAZ (spec §1: mockup'ta
    // düğme yok); uç yine de yaşar, BFF kökü tanımlı.
    const warehouseIdMatch = path.match(/^\/warehouses\/([^/]+)$/);
    if (warehouseIdMatch && (method === "PATCH" || method === "DELETE")) {
      const warehouse = state.warehouses.find((w) => w.id === warehouseIdMatch[1]);
      if (!warehouse) return send(404, { detail: "Depo bulunamadı." });
      if (method === "DELETE") {
        const used = state.stockEntries.some(
          (e) => e.warehouse_id === warehouse.id || e.source_warehouse_id === warehouse.id,
        );
        if (used) return send(409, { detail: "Hareketi olan depo silinemez." });
        state.warehouses = state.warehouses.filter((w) => w.id !== warehouse.id);
        return send(204);
      }
      return withBody((body) => {
        const name = String(body.name ?? "").trim();
        if (!name) return send(422, { detail: "Depo adı zorunlu." });
        // `site_id` GÖVDEDE gelse bile YOK SAYILIR (IDOR yüzeyi, spec §7).
        warehouse.name = name;
        return send(200, warehouse);
      });
    }

    // GET /stock/items — künye listesi (BAKİYE/DURUM TAŞIMAZ).
    if (method === "GET" && path === "/stock/items") {
      const limit = Number(parsed.searchParams.get("limit") ?? 50);
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? 0);
      const category = parsed.searchParams.get("category");
      const search = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      const isActive = parsed.searchParams.get("is_active");

      let rows = state.stockItems;
      if (category) rows = rows.filter((i) => i.category === category);
      if (isActive !== null) rows = rows.filter((i) => i.is_active === (isActive === "true"));
      if (search) {
        rows = rows.filter(
          (i) =>
            i.name.toLocaleLowerCase("tr").includes(search) ||
            i.code.toLocaleLowerCase("tr").includes(search),
        );
      }
      return send(200, { items: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
    }
    if (method === "POST" && path === "/stock/items") {
      return withBody((body) => {
        const code = String(body.code ?? "").trim();
        const name = String(body.name ?? "").trim();
        const unit = String(body.unit ?? "").trim();
        if (!code || !name || !unit) return send(422, { detail: "Kod, ad ve birim zorunlu." });
        if (state.stockItems.some((i) => i.code.toLocaleLowerCase("tr") === code.toLocaleLowerCase("tr"))) {
          return send(409, { detail: "Bu kodda bir malzeme zaten var." });
        }
        state.stockSeq += 1;
        const item: MockStockItem = {
          id: `it-new-${state.stockSeq}`,
          code,
          name,
          category: String(body.category ?? "structural") as MockStockItem["category"],
          unit,
          min_stock: body.min_stock === undefined || body.min_stock === null ? null : qty3(Number(body.min_stock)),
          is_active: body.is_active === undefined ? true : Boolean(body.is_active),
          created_at: "2026-08-12T09:05:00Z",
        };
        state.stockItems = [...state.stockItems, item];
        return send(201, item);
      });
    }
    // PATCH /stock/items/{id} — EKRANA BAĞLANMAZ (spec §1); `exclude_unset`
    // semantiği: `min_stock: null` eşiği SİLER, hiç göndermemek DOKUNMAZ.
    const stockItemIdMatch = path.match(/^\/stock\/items\/([^/]+)$/);
    if (method === "PATCH" && stockItemIdMatch) {
      const item = state.stockItems.find((i) => i.id === stockItemIdMatch[1]);
      if (!item) return send(404, { detail: "Malzeme bulunamadı." });
      return withBody((body) => {
        if (body.code !== undefined) item.code = String(body.code);
        if (body.name !== undefined) item.name = String(body.name);
        if (body.category !== undefined) item.category = String(body.category) as MockStockItem["category"];
        if (body.unit !== undefined) item.unit = String(body.unit);
        if (body.min_stock !== undefined) {
          item.min_stock = body.min_stock === null ? null : qty3(Number(body.min_stock));
        }
        if (body.is_active !== undefined) item.is_active = Boolean(body.is_active);
        return send(200, item);
      });
    }

    // GET /stock/summary — E3 katalog tablosu + KPI şeridi. Bakiye ve durum
    // BURADA türetilir; istemci onları yeniden HESAPLAMAZ.
    if (method === "GET" && path === "/stock/summary") {
      const limit = Number(parsed.searchParams.get("limit") ?? 50);
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? 0);
      const status = parsed.searchParams.get("status");
      const category = parsed.searchParams.get("category");
      const search = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");

      let rows = state.stockItems.map((item) => buildStockSummaryRow(state, item));
      if (category) rows = rows.filter((r) => r.category === category);
      if (search) {
        rows = rows.filter(
          (r) =>
            r.name.toLocaleLowerCase("tr").includes(search) ||
            r.code.toLocaleLowerCase("tr").includes(search),
        );
      }
      if (status) rows = rows.filter((r) => r.status === status);
      // KPI'lar SÜZÜLEN kümenin özetidir, sayfanın değil (backend kararı).
      return send(200, {
        items: rows.slice(offset, offset + limit),
        total: rows.length,
        limit,
        offset,
        kpis: { ...buildStockKpis(rows), pending_orders: STOCK_PENDING_ORDERS },
      });
    }

    // GET/POST /stock/entries
    if (method === "GET" && path === "/stock/entries") {
      const limit = Number(parsed.searchParams.get("limit") ?? 50);
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? 0);
      const entryType = parsed.searchParams.get("entry_type");
      const warehouseId = parsed.searchParams.get("warehouse_id");
      const dateFrom = parsed.searchParams.get("date_from");
      const dateTo = parsed.searchParams.get("date_to");

      let rows = state.stockEntries;
      if (entryType) rows = rows.filter((e) => e.entry_type === entryType);
      if (warehouseId) {
        rows = rows.filter(
          (e) => e.warehouse_id === warehouseId || e.source_warehouse_id === warehouseId,
        );
      }
      if (dateFrom) rows = rows.filter((e) => e.entry_date >= dateFrom);
      if (dateTo) rows = rows.filter((e) => e.entry_date <= dateTo);
      return send(200, { items: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
    }
    if (method === "POST" && path === "/stock/entries") {
      return withBody((body) => {
        const entryType = String(body.entry_type ?? "");
        const lines = Array.isArray(body.lines) ? (body.lines as Array<Record<string, unknown>>) : [];
        if (lines.length === 0) return send(422, { detail: "En az bir kalem satırı gerekli." });

        // §4b — VARLIK referansları 404.
        const warehouseId = String(body.warehouse_id ?? "");
        if (!state.warehouses.some((w) => w.id === warehouseId)) {
          return send(404, { detail: "Depo bulunamadı." });
        }
        const sourceWarehouseId =
          typeof body.source_warehouse_id === "string" ? body.source_warehouse_id : null;
        if (sourceWarehouseId !== null && !state.warehouses.some((w) => w.id === sourceWarehouseId)) {
          return send(404, { detail: "Kaynak depo bulunamadı." });
        }
        const receivedBy = typeof body.received_by_user_id === "string" ? body.received_by_user_id : null;
        if (receivedBy !== null && !state.users.some((u) => u.id === receivedBy)) {
          return send(404, { detail: "Teslim alan kullanıcı bulunamadı." });
        }
        for (const line of lines) {
          if (!state.stockItems.some((i) => i.id === String(line.item_id ?? ""))) {
            return send(404, { detail: "Malzeme bulunamadı." });
          }
        }

        // §4b — biçim/kural ihlalleri 422.
        if (entryType === "transfer") {
          if (!sourceWarehouseId) return send(422, { detail: "Transferde kaynak depo zorunludur." });
          if (sourceWarehouseId === warehouseId) {
            return send(422, { detail: "Kaynak ve hedef depo aynı olamaz." });
          }
        } else if (sourceWarehouseId) {
          return send(422, { detail: "Bu hareket tipinde kaynak depo verilemez." });
        }
        for (const line of lines) {
          const quantity = Number(line.quantity);
          if (!Number.isFinite(quantity) || quantity === 0) {
            return send(422, { detail: "Miktar sıfır olamaz." });
          }
          if (entryType !== "adjustment" && quantity < 0) {
            return send(422, { detail: "Miktar negatif olamaz." });
          }
        }

        state.stockSeq += 1;
        const entry: MockStockEntry = {
          id: `se-new-${state.stockSeq}`,
          entry_type: entryType as MockStockEntry["entry_type"],
          entry_date: String(body.entry_date ?? "2026-08-12"),
          warehouse_id: warehouseId,
          source_warehouse_id: sourceWarehouseId,
          supplier_name: typeof body.supplier_name === "string" ? body.supplier_name : null,
          delivery_note_no: typeof body.delivery_note_no === "string" ? body.delivery_note_no : null,
          received_by_user_id: receivedBy,
          note: typeof body.note === "string" ? body.note : null,
          created_at: "2026-08-12T09:10:00Z",
          lines: lines.map((line, index) => ({
            id: `sel-new-${state.stockSeq}-${index}`,
            item_id: String(line.item_id),
            quantity: qty3(Number(line.quantity)),
            unit_price:
              line.unit_price === undefined || line.unit_price === null
                ? null
                : money2(Number(line.unit_price)),
            quality: (line.quality ?? "ok") as MockStockEntryLine["quality"],
          })),
        };
        state.stockEntries = [...state.stockEntries, entry];
        return send(201, entry);
      });
    }

    // GET /sites/{site_id}/stock — ŞS tablosu. Bakiye YALNIZ o şantiyenin
    // depolarını kapsar; merkez depo (site_id NULL) hiçbir şantiyeye girmez.
    const siteStockMatch = path.match(/^\/sites\/([^/]+)\/stock$/);
    if (method === "GET" && siteStockMatch) {
      const siteId = siteStockMatch[1];
      if (!state.sites.some((s) => s.id === siteId)) return send(404, { detail: "Şantiye bulunamadı." });
      const limit = Number(parsed.searchParams.get("limit") ?? 50);
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? 0);
      const siteWarehouseIds = new Set(
        state.warehouses.filter((w) => w.site_id === siteId).map((w) => w.id),
      );

      const rows = state.stockItems
        .map((item) => {
          const balances = stockBalancesByWarehouse(state, item.id);
          let balance = 0;
          for (const [warehouseId, value] of balances) {
            if (siteWarehouseIds.has(warehouseId)) balance += value;
          }
          return {
            id: item.id,
            code: item.code,
            name: item.name,
            category: item.category,
            unit: item.unit,
            min_stock: item.min_stock,
            balance: qty3(balance),
            status: stockStatusOf(balance, item.min_stock),
            // "Aylık İhtiyaç" ve "Bölüm" sütunlarının GİRİŞ YÜZEYİ YOKTUR —
            // değer uydurulmaz, yer tutucu zarfları taşınır (spec §1).
            monthly_need: SITE_STOCK_PENDING_NEED,
            section: SITE_STOCK_PENDING_SECTION,
          };
        })
        .filter((row) => Number(row.balance) !== 0);

      const priced = rows.filter((row) => stockLastUnitPrice(state, row.id) !== null);
      const totalValue = priced.reduce(
        (sum, row) => sum + Number(row.balance) * Number(stockLastUnitPrice(state, row.id)),
        0,
      );
      return send(200, {
        items: rows.slice(offset, offset + limit),
        total: rows.length,
        limit,
        offset,
        kpis: {
          total_value: money2(totalValue),
          critical_count: rows.filter((r) => r.status === "critical").length,
          low_count: rows.filter((r) => r.status === "low").length,
          total_items: rows.length,
          items_without_price: rows.length - priced.length,
        },
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

    // --- F-SA T1 · Satınalma uçları ----------------------------------------
    //
    // ⚠️ `approve` / `reject` uçlarının mock karşılığı BİLEREK YOKTUR: onay
    // ekranı bu dilimde basılmaz (spec K6 — "Onay Kutusu" ayrı dilim) ve
    // hiçbir e2e onları çağırmaz. Karşılık eklemek olmayan bir ekranı ima
    // eder (F-P8'in `activate`/`cancel` emsali).

    if (method === "GET" && path === "/suppliers") {
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      const category = parsed.searchParams.get("category");
      const isActive = parsed.searchParams.get("is_active");
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      let rows = state.suppliers;
      if (q) rows = rows.filter((s) => s.name.toLocaleLowerCase("tr").includes(q));
      if (category) rows = rows.filter((s) => s.category === category);
      if (isActive !== null) rows = rows.filter((s) => s.is_active === (isActive === "true"));
      const supplierList: components["schemas"]["SupplierListResponse"] = {
        items: rows.slice(offset, offset + limit).map((s) => buildSupplierCard(state, s)),
        total: rows.length,
        limit,
        offset,
      };
      return send(200, supplierList);
    }

    if (method === "POST" && path === "/suppliers") {
      return withBody((body) => {
        const name = String(body.name ?? "").trim();
        if (!name) return send(422, { detail: "Tedarikçi adı zorunludur." });
        state.purchasingSeq += 1;
        const supplier: MockSupplier = {
          id: `sup-new-${state.purchasingSeq}`,
          name,
          category: typeof body.category === "string" ? body.category : null,
          tax_no: typeof body.tax_no === "string" ? body.tax_no : null,
          phone: typeof body.phone === "string" ? body.phone : null,
          payment_terms: (body.payment_terms ?? "days_30") as MockPaymentTerms,
          is_active: body.is_active === undefined ? true : Boolean(body.is_active),
          created_at: `${PURCHASING_TODAY}T09:00:00Z`,
        };
        state.suppliers = [...state.suppliers, supplier];
        return send(201, supplier);
      });
    }

    const supplierIdMatch = path.match(/^\/suppliers\/([^/]+)$/);
    if (method === "GET" && supplierIdMatch) {
      const supplier = state.suppliers.find((s) => s.id === supplierIdMatch[1]);
      if (!supplier) return send(404, { detail: "Tedarikçi bulunamadı." });
      return send(200, buildSupplierCard(state, supplier));
    }
    if (method === "PATCH" && supplierIdMatch) {
      const supplier = state.suppliers.find((s) => s.id === supplierIdMatch[1]);
      if (!supplier) return send(404, { detail: "Tedarikçi bulunamadı." });
      return withBody((body) => {
        if (body.name !== undefined) supplier.name = String(body.name);
        if (body.category !== undefined) {
          supplier.category = body.category === null ? null : String(body.category);
        }
        if (body.tax_no !== undefined) {
          supplier.tax_no = body.tax_no === null ? null : String(body.tax_no);
        }
        if (body.phone !== undefined) {
          supplier.phone = body.phone === null ? null : String(body.phone);
        }
        if (body.payment_terms !== undefined) {
          supplier.payment_terms = body.payment_terms as MockPaymentTerms;
        }
        if (body.is_active !== undefined) supplier.is_active = Boolean(body.is_active);
        return send(200, supplier);
      });
    }

    if (method === "GET" && path === "/purchase-requests") {
      const status = parsed.searchParams.get("status");
      const projectId = parsed.searchParams.get("project_id");
      const priority = parsed.searchParams.get("priority");
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      let rows = state.purchaseRequests;
      if (status) rows = rows.filter((r) => r.status === status);
      if (projectId) rows = rows.filter((r) => r.project_id === projectId);
      if (priority) rows = rows.filter((r) => r.priority === priority);
      if (q) {
        rows = rows.filter(
          (r) =>
            r.request_no.toLocaleLowerCase("tr").includes(q) ||
            (r.justification ?? "").toLocaleLowerCase("tr").includes(q),
        );
      }
      const requestList: components["schemas"]["PurchaseRequestListResponse"] = {
        items: rows.slice(offset, offset + limit).map(buildPurchaseRequestRow),
        total: rows.length,
        limit,
        offset,
      };
      return send(200, requestList);
    }

    if (method === "POST" && path === "/purchase-requests") {
      return withBody((body) => {
        const projectId = String(body.project_id ?? "");
        if (!state.projects.some((p) => p.id === projectId)) {
          return send(404, { detail: "Proje bulunamadı." });
        }
        state.purchasingSeq += 1;
        const seq = state.purchasingSeq;
        const rawLines = Array.isArray(body.lines)
          ? (body.lines as Array<Record<string, unknown>>)
          : [];
        const request: MockPurchaseRequest = {
          id: `pr-new-${seq}`,
          // Numarayı SUNUCU üretir — istemci gövdede göndermez.
          request_no: `SAT-2026-${String(100 + seq).padStart(4, "0")}`,
          request_date: typeof body.request_date === "string" ? body.request_date : PURCHASING_TODAY,
          priority: (body.priority ?? "normal") as MockPurchaseRequest["priority"],
          project_id: projectId,
          site_id: typeof body.site_id === "string" ? body.site_id : null,
          section_id: typeof body.section_id === "string" ? body.section_id : null,
          needed_by: typeof body.needed_by === "string" ? body.needed_by : null,
          justification: typeof body.justification === "string" ? body.justification : null,
          status: "draft",
          quote_deadline: typeof body.quote_deadline === "string" ? body.quote_deadline : null,
          approved_by_user_id: null,
          approved_at: null,
          rejected_at: null,
          rejection_reason: null,
          created_by_user_id: "u-1",
          created_at: `${PURCHASING_TODAY}T09:00:00Z`,
          lines: rawLines.map((line, index) => ({
            id: `prl-new-${seq}-${index}`,
            // `sort_order`u SUNUCU dizinin indeksinden üretir.
            sort_order: index,
            stock_item_id: typeof line.stock_item_id === "string" ? line.stock_item_id : null,
            free_text_name: typeof line.free_text_name === "string" ? line.free_text_name : null,
            free_text_unit: typeof line.free_text_unit === "string" ? line.free_text_unit : null,
            quantity: String(line.quantity ?? "0"),
            estimated_unit_price:
              line.estimated_unit_price === undefined || line.estimated_unit_price === null
                ? null
                : String(line.estimated_unit_price),
          })),
        };
        state.purchaseRequests = [...state.purchaseRequests, request];
        return send(201, buildPurchaseRequestDetail(state, request));
      });
    }

    const requestIdMatch = path.match(/^\/purchase-requests\/([^/]+)$/);
    if (requestIdMatch) {
      const request = state.purchaseRequests.find((r) => r.id === requestIdMatch[1]);
      if (!request) return send(404, { detail: "Talep bulunamadı." });
      if (method === "GET") return send(200, buildPurchaseRequestDetail(state, request));
      if (method === "PATCH") {
        return withBody((body) => {
          if (request.status !== "draft") {
            return send(409, { detail: "Yalnızca taslak talepler düzenlenebilir." });
          }
          if (body.priority !== undefined) {
            request.priority = body.priority as MockPurchaseRequest["priority"];
          }
          if (body.needed_by !== undefined) {
            request.needed_by = body.needed_by === null ? null : String(body.needed_by);
          }
          if (body.justification !== undefined) {
            request.justification = body.justification === null ? null : String(body.justification);
          }
          if (body.quote_deadline !== undefined) {
            request.quote_deadline =
              body.quote_deadline === null ? null : String(body.quote_deadline);
          }
          // `lines` KISMİ DEĞİL TAM DEĞİŞTİRMEDİR (sunucu sözleşmesi).
          if (Array.isArray(body.lines)) {
            const rawLines = body.lines as Array<Record<string, unknown>>;
            request.lines = rawLines.map((line, index) => ({
              id: `prl-${request.id}-${index}`,
              sort_order: index,
              stock_item_id: typeof line.stock_item_id === "string" ? line.stock_item_id : null,
              free_text_name: typeof line.free_text_name === "string" ? line.free_text_name : null,
              free_text_unit: typeof line.free_text_unit === "string" ? line.free_text_unit : null,
              quantity: String(line.quantity ?? "0"),
              estimated_unit_price:
                line.estimated_unit_price === undefined || line.estimated_unit_price === null
                  ? null
                  : String(line.estimated_unit_price),
            }));
          }
          return send(200, buildPurchaseRequestDetail(state, request));
        });
      }
      if (method === "DELETE") {
        if (request.status !== "draft") {
          return send(409, { detail: "Yalnızca taslak talep silinebilir." });
        }
        state.purchaseRequests = state.purchaseRequests.filter((r) => r.id !== request.id);
        return send(204);
      }
    }

    const requestSubmitMatch = path.match(/^\/purchase-requests\/([^/]+)\/submit$/);
    if (method === "POST" && requestSubmitMatch) {
      const request = state.purchaseRequests.find((r) => r.id === requestSubmitMatch[1]);
      if (!request) return send(404, { detail: "Talep bulunamadı." });
      if (request.status !== "draft") {
        return send(409, { detail: "Yalnızca taslak talep onaya gönderilebilir." });
      }
      request.status = "pending_approval";
      return send(200, buildPurchaseRequestDetail(state, request));
    }

    // ⚠️ SIRA ÖNEMLİ: `export.xlsx` teklif kimliği desenine de uyar, ondan
    // ÖNCE eşleşmeli. Uç ikili döner (JSON değil).
    const quotesExportMatch = path.match(/^\/purchase-requests\/([^/]+)\/quotes\/export\.xlsx$/);
    if (method === "GET" && quotesExportMatch) {
      if (!state.purchaseRequests.some((r) => r.id === quotesExportMatch[1])) {
        return send(404, { detail: "Talep bulunamadı." });
      }
      res.writeHead(200, {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="teklif-karsilastirma.xlsx"',
      });
      res.end(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
      return;
    }

    const requestQuotesMatch = path.match(/^\/purchase-requests\/([^/]+)\/quotes$/);
    if (requestQuotesMatch) {
      const request = state.purchaseRequests.find((r) => r.id === requestQuotesMatch[1]);
      if (!request) return send(404, { detail: "Talep bulunamadı." });
      if (method === "GET") return send(200, buildQuoteCards(state, request));
      if (method === "POST") {
        return withBody((body) => {
          const supplierId = String(body.supplier_id ?? "");
          if (!state.suppliers.some((s) => s.id === supplierId)) {
            return send(404, { detail: "Tedarikçi bulunamadı." });
          }
          const deliveryTime = String(body.delivery_time ?? "").trim();
          if (!deliveryTime) return send(422, { detail: "Teslim süresi zorunludur." });
          state.purchasingSeq += 1;
          const quote: MockPurchaseQuote = {
            id: `q-new-${state.purchasingSeq}`,
            request_id: request.id,
            supplier_id: supplierId,
            unit_price: String(body.unit_price ?? "0"),
            delivery_time: deliveryTime,
            warranty_note: typeof body.warranty_note === "string" ? body.warranty_note : null,
            payment_terms: (body.payment_terms ?? "days_30") as MockPaymentTerms,
            shipping_included: Boolean(body.shipping_included),
            shipping_cost:
              body.shipping_cost === undefined || body.shipping_cost === null
                ? null
                : String(body.shipping_cost),
            is_selected: false,
            created_at: `${PURCHASING_TODAY}T09:00:00Z`,
          };
          state.purchaseQuotes = [...state.purchaseQuotes, quote];
          return send(201, buildQuoteResponse(state, quote));
        });
      }
    }

    const selectAndOrderMatch = path.match(
      /^\/purchase-requests\/([^/]+)\/quotes\/([^/]+)\/select-and-order$/,
    );
    if (method === "POST" && selectAndOrderMatch) {
      const request = state.purchaseRequests.find((r) => r.id === selectAndOrderMatch[1]);
      const quote = state.purchaseQuotes.find(
        (q) => q.id === selectAndOrderMatch[2] && q.request_id === selectAndOrderMatch[1],
      );
      if (!request || !quote) return send(404, { detail: "Teklif bulunamadı." });
      if (request.status === "ordered" || request.status === "delivered") {
        return send(409, { detail: "Bu talep için sipariş zaten oluşturulmuş." });
      }
      // TEK çağrı İKİ iş yapar: teklif seçilir + sipariş doğar, talep `ordered`.
      quote.is_selected = true;
      request.status = "ordered";
      state.purchasingSeq += 1;
      const order: MockPurchaseOrder = {
        id: `po-new-${state.purchasingSeq}`,
        order_no: `SP-2026-${String(100 + state.purchasingSeq).padStart(4, "0")}`,
        request_id: request.id,
        quote_id: quote.id,
        supplier_id: quote.supplier_id,
        project_id: request.project_id,
        total_amount: money2(quoteTotalCost(quote, requestQuantityTotal(request))),
        expected_delivery: request.needed_by,
        status: "approved",
        note: null,
        created_by_user_id: "u-1",
        created_at: `${PURCHASING_TODAY}T09:00:00Z`,
      };
      state.purchaseOrders = [...state.purchaseOrders, order];
      return send(201, buildPurchaseOrderResponse(state, order));
    }

    const quoteIdMatch = path.match(/^\/purchase-requests\/([^/]+)\/quotes\/([^/]+)$/);
    if (quoteIdMatch && (method === "PATCH" || method === "DELETE")) {
      const quote = state.purchaseQuotes.find(
        (q) => q.id === quoteIdMatch[2] && q.request_id === quoteIdMatch[1],
      );
      if (!quote) return send(404, { detail: "Teklif bulunamadı." });
      if (method === "DELETE") {
        if (quote.is_selected) {
          return send(409, { detail: "Siparişe bağlanmış teklif silinemez." });
        }
        state.purchaseQuotes = state.purchaseQuotes.filter((q) => q.id !== quote.id);
        return send(204);
      }
      return withBody((body) => {
        if (body.unit_price !== undefined) quote.unit_price = String(body.unit_price);
        if (body.delivery_time !== undefined) quote.delivery_time = String(body.delivery_time);
        if (body.warranty_note !== undefined) {
          quote.warranty_note = body.warranty_note === null ? null : String(body.warranty_note);
        }
        if (body.payment_terms !== undefined) {
          quote.payment_terms = body.payment_terms as MockPaymentTerms;
        }
        if (body.shipping_included !== undefined) {
          quote.shipping_included = Boolean(body.shipping_included);
        }
        if (body.shipping_cost !== undefined) {
          quote.shipping_cost = body.shipping_cost === null ? null : String(body.shipping_cost);
        }
        return send(200, buildQuoteResponse(state, quote));
      });
    }

    if (method === "GET" && path === "/purchase-orders") {
      const status = parsed.searchParams.get("status");
      const projectId = parsed.searchParams.get("project_id");
      const supplierId = parsed.searchParams.get("supplier_id");
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      let rows = state.purchaseOrders;
      if (status) rows = rows.filter((o) => o.status === status);
      if (projectId) rows = rows.filter((o) => o.project_id === projectId);
      if (supplierId) rows = rows.filter((o) => o.supplier_id === supplierId);
      if (q) {
        rows = rows.filter(
          (o) =>
            o.order_no.toLocaleLowerCase("tr").includes(q) ||
            supplierName(state, o.supplier_id).toLocaleLowerCase("tr").includes(q),
        );
      }
      const orderList: components["schemas"]["PurchaseOrderListResponse"] = {
        items: rows.slice(offset, offset + limit).map((o) => buildPurchaseOrderResponse(state, o)),
        total: rows.length,
        limit,
        offset,
      };
      return send(200, orderList);
    }

    if (method === "POST" && path === "/purchase-orders") {
      return withBody((body) => {
        const projectId = String(body.project_id ?? "");
        const supplierId = String(body.supplier_id ?? "");
        if (!state.projects.some((p) => p.id === projectId)) {
          return send(404, { detail: "Proje bulunamadı." });
        }
        if (!state.suppliers.some((s) => s.id === supplierId)) {
          return send(404, { detail: "Tedarikçi bulunamadı." });
        }
        state.purchasingSeq += 1;
        const order: MockPurchaseOrder = {
          id: `po-new-${state.purchasingSeq}`,
          order_no: `SP-2026-${String(200 + state.purchasingSeq).padStart(4, "0")}`,
          // Doğrudan sipariş TALEPSİZDİR — gövde `request_id` KABUL ETMEZ.
          request_id: null,
          quote_id: null,
          supplier_id: supplierId,
          project_id: projectId,
          total_amount: String(body.total_amount ?? "0"),
          expected_delivery:
            typeof body.expected_delivery === "string" ? body.expected_delivery : null,
          status: "approved",
          note: typeof body.note === "string" ? body.note : null,
          created_by_user_id: "u-1",
          created_at: `${PURCHASING_TODAY}T09:00:00Z`,
        };
        state.purchaseOrders = [...state.purchaseOrders, order];
        return send(201, buildPurchaseOrderResponse(state, order));
      });
    }

    const orderIdMatch = path.match(/^\/purchase-orders\/([^/]+)$/);
    if (orderIdMatch) {
      const order = state.purchaseOrders.find((o) => o.id === orderIdMatch[1]);
      if (!order) return send(404, { detail: "Sipariş bulunamadı." });
      if (method === "GET") return send(200, buildPurchaseOrderResponse(state, order));
      if (method === "PATCH") {
        return withBody((body) => {
          if (body.status !== undefined) {
            order.status = body.status as MockPurchaseOrder["status"];
          }
          if (body.expected_delivery !== undefined) {
            order.expected_delivery =
              body.expected_delivery === null ? null : String(body.expected_delivery);
          }
          if (body.note !== undefined) {
            order.note = body.note === null ? null : String(body.note);
          }
          return send(200, buildPurchaseOrderResponse(state, order));
        });
      }
    }

    if (method === "GET" && path === "/purchasing/summary") {
      return send(200, buildPurchasingSummary(state, parsed.searchParams.get("project_id")));
    }

    // --- F-MK T5b · Makine & Ekipman uçları (MK-1, 9 yol) ------------------
    // ⚠️ SIRA ÖNEMLİ: sabit alt yollar (`/summary`, `/work-*`, `/fuel-*`)
    // `/equipment/{equipment_id}` desenine de uyar — önce onlar eşleşmeli.

    if (method === "GET" && path === "/equipment/summary") {
      return send(200, EQUIPMENT_SUMMARY_FIXTURE);
    }

    // F-BLG T3 · GET /equipment/document-types — altı SABİT slot (CRUD ucu
    // YOK). ⚠️ Bu satır `/equipment/{equipment_id}` deseninden ÖNCE gelmek
    // ZORUNDADIR, yoksa "document-types" bir ekipman kimliği sanılır ve 404
    // döner (yukarıdaki SIRA uyarısının aynısı).
    if (method === "GET" && path === "/equipment/document-types") {
      return send(200, EQUIPMENT_DOCUMENT_TYPES_FIXTURE);
    }

    const equipmentDocumentsMatch = path.match(/^\/equipment\/([^/]+)\/documents$/);
    if (equipmentDocumentsMatch) {
      const equipmentId = equipmentDocumentsMatch[1];
      if (!state.equipment.some((item) => item.id === equipmentId)) {
        return send(404, { detail: "Ekipman bulunamadı." });
      }

      // GET — form yalnız bağlam bandının SAYACI için okur (mockup 81).
      if (method === "GET") {
        return send(200, {
          items: state.equipmentDocuments.filter((doc) => doc.equipment_id === equipmentId),
        });
      }

      // POST — MULTIPART. Gövde JSON'a çevrilmişse ayrıştırma başarısız olur
      // ve 422 döner; yani BFF'in ham geçirme davranışının uçtan uca kapısıdır
      // (`POST /documents` ile aynı gerekçe).
      if (method === "POST") {
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          const parsedBody = parseMultipart(
            Buffer.concat(chunks),
            req.headers["content-type"] ?? "",
          );
          if (!parsedBody?.file) return send(422, { detail: "Dosya alanı okunamadı." });

          const typeId = parsedBody.fields.type_id;
          const type = EQUIPMENT_DOCUMENT_TYPES_FIXTURE.items.find((t) => t.id === typeId);
          if (!type) return send(422, { detail: "Belge türü seçilmedi." });
          if (parsedBody.file.size > DOCUMENT_MAX_BYTES) {
            return send(413, { detail: "Dosya boyutu sınırı aşıldı." });
          }
          const extension = documentExtension(parsedBody.file.filename);
          if (!DOCUMENT_ALLOWED_EXTENSIONS.includes(extension)) {
            return send(422, { detail: "Bu dosya türü kabul edilmiyor." });
          }

          state.equipmentDocumentSeq += 1;
          const created: components["schemas"]["EquipmentDocumentResponse"] = {
            id: `edoc-new-${state.equipmentDocumentSeq}`,
            equipment_id: equipmentId,
            type_id: type.id,
            type_code: type.code,
            type_name: type.name,
            filename: parsedBody.file.filename,
            mime_type: parsedBody.file.mimeType,
            size_bytes: parsedBody.file.size,
            // Alan GEÇİLMEDİYSE süre takibi YAPILMAZ — boş dize DEĞİL, NULL.
            // BOR-TEMIZ (FRM-1) üç alanı create'e açtı; sunucu gibi burada da
            // "geçilmedi" ile "boş dize" AYNI sonuca (NULL) düşer.
            document_no: parsedBody.fields.document_no || null,
            issued_at: parsedBody.fields.issued_at || null,
            valid_until: parsedBody.fields.valid_until || null,
            note: parsedBody.fields.note || null,
            created_at: "2026-08-15T09:00:00Z",
          };
          state.equipmentDocuments = [...state.equipmentDocuments, created];
          return send(201, created);
        });
        return;
      }
    }

    // Özet SABİTTİR (rozet/oran SUNUCU damgasıdır) ama YALNIZ fikstür ayında
    // doludur — başka bir aya gezinmek boş dönemi kanıtlar, veri "taşınmaz".
    if (method === "GET" && path === "/equipment/work-summary") {
      const year = Number(parsed.searchParams.get("year"));
      const month = Number(parsed.searchParams.get("month"));
      if (!isEquipmentFixturePeriod(parsed.searchParams)) {
        return send(200, {
          year, month, rows: [], weeks: [],
          totals: { hours: "0.00", breakdown_hours: "0.00", cost: "0.00", usage_pct_avg: null },
        });
      }
      const siteId = parsed.searchParams.get("site_id");
      if (!siteId) return send(200, WORK_SUMMARY_FIXTURE);
      // Şantiye süzgeci SUNUCUDA uygulanır; `totals` yine SUNUCUNUNDUR
      // (süzülmüş satırlardan yeniden toplanır — §0 tutarsızlığı yalnız
      // süzgeçsiz görünümün mockup sabitidir).
      const rows = WORK_SUMMARY_FIXTURE.rows.filter((row) => row.site_id === siteId);
      const sum = (pick: (row: (typeof rows)[number]) => string | null) =>
        rows.reduce((total, row) => total + Number(pick(row) ?? 0), 0).toFixed(2);
      return send(200, {
        ...WORK_SUMMARY_FIXTURE,
        rows,
        totals: {
          hours: sum((row) => row.hours),
          breakdown_hours: sum((row) => row.breakdown_hours),
          cost: sum((row) => row.cost),
          usage_pct_avg: null,
        },
      });
    }

    if (method === "GET" && path === "/equipment/fuel-summary") {
      const year = Number(parsed.searchParams.get("year"));
      const month = Number(parsed.searchParams.get("month"));
      if (!isEquipmentFixturePeriod(parsed.searchParams)) {
        return send(200, {
          year, month, total_liters: "0.00", total_amount: "0.00",
          lt_per_hour_avg: null, avg_unit_price: null, abnormal_count: 0, rows: [],
        });
      }
      return send(200, FUEL_SUMMARY_FIXTURE);
    }

    if (method === "GET" && path === "/equipment/work-logs") {
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const equipmentId = parsed.searchParams.get("equipment_id");
      const siteId = parsed.searchParams.get("site_id");
      const dateFrom = parsed.searchParams.get("date_from");
      const dateTo = parsed.searchParams.get("date_to");
      const recordType = parsed.searchParams.get("record_type");

      // Sunucu `work_date DESC` sıralar — "Son Kayıtlar" bu sıraya güvenir.
      let rows = [...state.workLogs].sort((a, b) => b.work_date.localeCompare(a.work_date));
      if (equipmentId) rows = rows.filter((log) => log.equipment_id === equipmentId);
      if (siteId) rows = rows.filter((log) => log.site_id === siteId);
      if (dateFrom) rows = rows.filter((log) => log.work_date >= dateFrom);
      if (dateTo) rows = rows.filter((log) => log.work_date <= dateTo);
      if (recordType) rows = rows.filter((log) => log.record_type === recordType);
      return send(200, { items: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
    }

    if (method === "GET" && path === "/equipment/fuel-logs") {
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const equipmentId = parsed.searchParams.get("equipment_id");
      const siteId = parsed.searchParams.get("site_id");
      const dateFrom = parsed.searchParams.get("date_from");
      const dateTo = parsed.searchParams.get("date_to");

      let rows = [...state.fuelLogs].sort((a, b) => b.fuel_date.localeCompare(a.fuel_date));
      if (equipmentId) rows = rows.filter((log) => log.equipment_id === equipmentId);
      if (siteId) rows = rows.filter((log) => log.site_id === siteId);
      if (dateFrom) rows = rows.filter((log) => log.fuel_date >= dateFrom);
      if (dateTo) rows = rows.filter((log) => log.fuel_date <= dateTo);
      return send(200, { items: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
    }

    if (method === "GET" && path === "/equipment") {
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const status = parsed.searchParams.get("status");
      const category = parsed.searchParams.get("category");
      const siteId = parsed.searchParams.get("site_id");
      const ownership = parsed.searchParams.get("ownership");
      const isActive = parsed.searchParams.get("is_active");
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");

      let rows = state.equipment;
      if (status) rows = rows.filter((item) => item.status === status);
      if (category) rows = rows.filter((item) => item.category === category);
      if (siteId) rows = rows.filter((item) => item.site_id === siteId);
      if (ownership) rows = rows.filter((item) => item.ownership === ownership);
      if (isActive !== null) rows = rows.filter((item) => item.is_active === (isActive === "true"));
      if (q) {
        rows = rows.filter(
          (item) =>
            item.name.toLocaleLowerCase("tr").includes(q) ||
            (item.brand ?? "").toLocaleLowerCase("tr").includes(q),
        );
      }
      // `total` SÜZÜLMÜŞ kümenin tamamıdır, sayfanın DEĞİL (TB3 kanonu).
      return send(200, { items: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
    }

    if (method === "POST" && path === "/equipment") {
      return withBody((body) => {
        const name = String(body.name ?? "").trim();
        if (!name) return send(422, { detail: "Ekipman adı zorunludur." });
        const ownership = String(body.ownership ?? "owned");
        // MK-1 K2 — koşullu zorunluluk SUNUCUDADIR (form ayrıca istemcide de
        // doğrular; iki savunma da kendi yerinde durur).
        if (ownership === "owned" && (body.purchase_amount ?? null) === null) {
          return send(422, { detail: "Kendi malımız ekipmanda alış bedeli zorunludur." });
        }
        state.equipmentSeq += 1;
        const created: MockEquipment = {
          ...EQUIPMENT_FIXTURES[0],
          ...(body as Partial<MockEquipment>),
          id: `eq-new-${state.equipmentSeq}`,
          name,
          created_at: "2026-08-14T09:00:00Z",
        };
        state.equipment = [...state.equipment, created];
        return send(201, created);
      });
    }

    const equipmentIdMatch = path.match(/^\/equipment\/([^/]+)$/);
    if (equipmentIdMatch) {
      const equipment = state.equipment.find((item) => item.id === equipmentIdMatch[1]);
      if (!equipment) return send(404, { detail: "Ekipman bulunamadı." });
      if (method === "GET") return send(200, equipment);
      if (method === "PATCH") {
        return withBody((body) => {
          // 🔴 K5'in sunucu yanı: GÖNDERİLMEYEN anahtar mevcut değeri KORUR
          // (`model_fields_set`). Bu yüzden `undefined` atlanır, `null` yazılır.
          for (const [key, value] of Object.entries(body)) {
            if (value === undefined) continue;
            Object.assign(equipment, { [key]: value });
          }
          return send(200, equipment);
        });
      }
    }

    // --- F-HZ T3.1 · Hazine uçları (HZ-1, 3 yol) -------------------------
    // SALT-OKUR: üçü de GET'tir, `state`e DOKUNMAZLAR.

    if (method === "GET" && path === "/bank-accounts") {
      // Kırpma korkuluğu: tavan aşımı 422'dir (kırpma DEĞİL) — gerçek
      // sunucunun `maximum: 200` doğrulaması.
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const isActive = parsed.searchParams.get("is_active");

      let rows = TREASURY_BANK_ACCOUNTS;
      if (isActive !== null) rows = rows.filter((row) => row.is_active === (isActive === "true"));
      // `total` SÜZÜLMÜŞ kümenin tamamıdır, sayfanın DEĞİL (TB3 kanonu).
      return send(200, {
        items: rows.slice(offset, offset + limit),
        total: rows.length,
        limit,
        offset,
      });
    }

    if (method === "GET" && path === "/treasury/cash-flow") {
      // `year`/`month` GÖNDERİLMEZSE sunucu KENDİ dönemini seçer ve echo eder;
      // fikstür o echo'yu SABİT verir (tarih determinizmi). Açıkça istenen
      // BAŞKA bir dönem boş döner — veri "taşınmaz".
      const year = parsed.searchParams.get("year");
      const month = parsed.searchParams.get("month");
      const isFixturePeriod =
        (year === null && month === null) ||
        (Number(year) === TREASURY_CASH_FLOW.year && Number(month) === TREASURY_CASH_FLOW.month);
      if (!isFixturePeriod) {
        return send(200, {
          year: Number(year),
          month: Number(month),
          series: [],
          // Toplamlar `0`dır, NULL DEĞİL (şema notu).
          inflow_total: "0.00",
          outflow_total: "0.00",
        });
      }
      return send(200, TREASURY_CASH_FLOW);
    }

    if (method === "GET" && path === "/treasury/upcoming-payments") {
      // `days` echo'su SABİTtir: ekran başlığı ("Yaklaşan Ödemeler (7 Gün)")
      // bunu basar, sayıyı kendi yazmaz.
      const days = Number(parsed.searchParams.get("days") ?? String(TREASURY_UPCOMING.days));
      if (days > 90) return send(422, { detail: "days en fazla 90 olabilir." });
      return send(200, TREASURY_UPCOMING);
    }

    // --- F-FAT2 T2 · Fatura uçları (FAT-1, 12 yol) -----------------------
    // Fikstürler ve yardımcılar dosyanın SONUNDADIR (bkz. `INVOICE_FIXTURES`).

    if (method === "GET" && path === "/invoices") {
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      // Tavan aşımı 422'dir (kırpma DEĞİL) — gerçek sunucunun `maximum: 200`ü.
      if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = Number(parsed.searchParams.get("offset") ?? "0");
      const direction = parsed.searchParams.get("direction");
      const status = parsed.searchParams.get("status");
      const dateFrom = parsed.searchParams.get("date_from");
      const dateTo = parsed.searchParams.get("date_to");
      const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");

      let rows = invoiceState.invoices;
      if (direction) rows = rows.filter((row) => row.direction === direction);
      if (status) rows = rows.filter((row) => row.status === status);
      if (dateFrom) rows = rows.filter((row) => row.issue_date >= dateFrom);
      if (dateTo) rows = rows.filter((row) => row.issue_date <= dateTo);
      if (q) {
        rows = rows.filter(
          (row) =>
            row.invoice_no.toLocaleLowerCase("tr").includes(q) ||
            row.party_name.toLocaleLowerCase("tr").includes(q),
        );
      }
      // `total` SÜZÜLMÜŞ kümenin tamamıdır, sayfanın DEĞİL (TB3 kanonu).
      return send(200, {
        items: rows.slice(offset, offset + limit).map(invoiceHeader),
        total: rows.length,
        limit,
        offset,
      });
    }

    if (method === "GET" && path === "/invoices/summary") {
      return send(200, INVOICE_SUMMARY);
    }

    if (method === "POST" && path === "/invoices") {
      return withBody((body) => {
        const lines = Array.isArray(body.lines) ? (body.lines as Record<string, unknown>[]) : [];
        // 🔴 Hesaplanmış alan gövdeden GELEMEZ (gerçek sunucu 422 verir).
        for (const line of lines) {
          if ("line_total" in line || "sort_order" in line) {
            return send(422, { detail: "`line_total`/`sort_order` gövdeden gönderilemez." });
          }
        }
        if ("status" in body) return send(422, { detail: "`status` gövdeden gönderilemez." });
        const partyName = String(body.party_name ?? "").trim();
        if (!partyName) return send(422, { detail: "Alıcı adı zorunludur." });

        invoiceState.seq += 1;
        const created = buildMockInvoice(invoiceState.seq, body, lines);
        invoiceState.invoices = [created, ...invoiceState.invoices];
        return send(201, created);
      });
    }

    const invoicePaymentsMatch = path.match(/^\/invoices\/([^/]+)\/payments$/);
    if (invoicePaymentsMatch) {
      const invoice = invoiceState.invoices.find((row) => row.id === invoicePaymentsMatch[1]);
      if (!invoice) return send(404, { detail: "Fatura bulunamadı." });
      const rows = invoiceState.payments.filter((row) => row.invoice_id === invoice.id);
      // 🔴 K5: iki toplam TÜM satırlardan gelir, sayfadan DEĞİL.
      const paidTotal = rows.reduce((sum, row) => sum + Number(row.amount), 0);
      if (method === "GET") {
        const limit = Number(parsed.searchParams.get("limit") ?? "50");
        if (limit > 200) return send(422, { detail: "limit en fazla 200 olabilir." });
        return send(200, {
          items: rows.slice(0, limit),
          total: rows.length,
          limit,
          offset: 0,
          paid_total: paidTotal.toFixed(2),
          remaining: (Number(invoice.total) - paidTotal).toFixed(2),
        });
      }
      if (method === "POST") {
        return withBody((body) => {
          const amount = Number(body.amount);
          if (!Number.isFinite(amount) || amount <= 0) {
            return send(422, { detail: "Tutar sıfırdan büyük olmalıdır." });
          }
          // 🔴 K6: Σ + yeni > total → 422, tolerans YOK.
          if (paidTotal + amount > Number(invoice.total) + 1e-9) {
            return send(422, { detail: "Tahsilat toplamı fatura tutarını aşamaz." });
          }
          invoiceState.seq += 1;
          const created = {
            id: `pay-new-${invoiceState.seq}`,
            invoice_id: invoice.id,
            bank_account_id: String(body.bank_account_id ?? ""),
            method: (body.method as MockPayment["method"] | undefined) ?? "transfer",
            amount: amount.toFixed(2),
            paid_on: String(body.paid_on ?? "2026-07-25"),
            note: (body.note as string | undefined) ?? null,
            created_by_id: ME.id,
            created_at: "2026-07-25T09:00:00Z",
            updated_at: "2026-07-25T09:00:00Z",
          };
          invoiceState.payments = [...invoiceState.payments, created];
          // 🔴 K5: durum Σ'dan TÜREYEREK damgalanır.
          if (
            invoice.direction === "outgoing" &&
            invoice.status === "sent" &&
            paidTotal + amount >= Number(invoice.total)
          ) {
            invoice.status = "collected";
          }
          return send(201, created);
        });
      }
    }

    const invoiceActionMatch = path.match(
      /^\/invoices\/([^/]+)\/(approve|dispute|send|mark-collected)$/,
    );
    if (method === "POST" && invoiceActionMatch) {
      const invoice = invoiceState.invoices.find((row) => row.id === invoiceActionMatch[1]);
      if (!invoice) return send(404, { detail: "Fatura bulunamadı." });
      const action = invoiceActionMatch[2];
      const outgoing = invoice.direction === "outgoing";
      // Yön dışı geçiş 409'dur (matrisin sahibi sunucudur).
      if ((action === "approve" || action === "dispute") && outgoing) {
        return send(409, { detail: "Bu işlem yalnız gelen faturada yapılabilir." });
      }
      if ((action === "send" || action === "mark-collected") && !outgoing) {
        return send(409, { detail: "Bu işlem yalnız giden faturada yapılabilir." });
      }
      // 🔴 K6: kalemsiz fatura gönderilemez/onaylanamaz (422).
      if ((action === "send" || action === "approve") && invoice.lines.length === 0) {
        return send(422, { detail: "Kalemsiz fatura gönderilemez." });
      }
      const expected: Record<string, string> = {
        send: "draft",
        "mark-collected": "sent",
        approve: "pending",
        dispute: "pending",
      };
      if (invoice.status !== expected[action]) {
        return send(409, { detail: "Faturanın durumu bu işleme uygun değil." });
      }
      const next: Record<string, string> = {
        send: "sent",
        "mark-collected": "collected",
        approve: "approved",
        dispute: "disputed",
      };
      invoice.status = (next[action] as MockInvoice["status"] | undefined) ?? invoice.status;
      return send(200, invoice);
    }

    const invoiceIdMatch = path.match(/^\/invoices\/([^/]+)$/);
    if (invoiceIdMatch) {
      const invoice = invoiceState.invoices.find((row) => row.id === invoiceIdMatch[1]);
      if (!invoice) return send(404, { detail: "Fatura bulunamadı." });
      if (method === "GET") return send(200, invoice);
    }

    const invoicePaymentIdMatch = path.match(/^\/payments\/([^/]+)$/);
    if (method === "DELETE" && invoicePaymentIdMatch) {
      const payment = invoiceState.payments.find((row) => row.id === invoicePaymentIdMatch[1]);
      if (!payment) return send(404, { detail: "Ödeme bulunamadı." });
      invoiceState.payments = invoiceState.payments.filter((row) => row.id !== payment.id);
      return send(204);
    }

    // FGE:104-143 eşleştirme kartının GERÇEK kaynağı (MK-2).
    const rentalInvoiceMatch = path.match(/^\/equipment\/rental-invoices\/([^/]+)$/);
    if (method === "GET" && rentalInvoiceMatch) {
      if (rentalInvoiceMatch[1] !== RENTAL_MATCH_FIXTURE.id) {
        return send(404, { detail: "Kira faturası bulunamadı." });
      }
      return send(200, RENTAL_MATCH_FIXTURE);
    }

    // --- F-MU1 T5 · Muhasebe uçları (MU-1, 15 yol) ----------------------
    // Fikstürler ve yardımcılar dosyanın SONUNDADIR (bkz. `ACCOUNTING_CHART_SEEDS`).

    /** Ortak `limit` korkuluğu: tavan 200, aşım **422** (kırpma DEĞİL). */
    const accountingLimit = (): number | null => {
      const limit = Number(parsed.searchParams.get("limit") ?? "50");
      return limit > 200 ? null : limit;
    };
    const accountingOffset = () => Number(parsed.searchParams.get("offset") ?? "0");

    if (path === "/chart-of-accounts") {
      if (method === "GET") {
        const limit = accountingLimit();
        if (limit === null) return send(422, { detail: "limit en fazla 200 olabilir." });
        const offset = accountingOffset();
        const q = (parsed.searchParams.get("q") ?? "").trim().toLocaleLowerCase("tr");
        const accountType = parsed.searchParams.get("account_type");
        const isActive = parsed.searchParams.get("is_active");

        // 🔒 Yaratılan hesaplar SÜZGEÇSİZ listede GÖRÜNMEZ (bkz.
        // `hiddenAccountIds` notu); `q` ile ARANDIĞINDA bulunurlar.
        let rows = accountingState.accounts.filter(
          (row) => q.length > 0 || !accountingState.hiddenAccountIds.has(row.id),
        );
        if (q.length > 0) {
          // HP:47 — arama KOD ve AD üzerinde çalışır.
          rows = rows.filter(
            (row) =>
              row.code.toLocaleLowerCase("tr").includes(q) ||
              row.name.toLocaleLowerCase("tr").includes(q),
          );
        }
        if (accountType) rows = rows.filter((row) => row.account_type === accountType);
        if (isActive !== null) rows = rows.filter((row) => row.is_active === (isActive === "true"));

        const body: components["schemas"]["ChartAccountListResponse"] = {
          // `code ASC` — sunucunun sırası (istemci yeniden sıralamaz).
          items: [...rows].sort((a, b) => a.code.localeCompare(b.code, "en")).slice(offset, offset + limit),
          // `total` SÜZÜLMÜŞ kümenin tamamıdır, sayfanın DEĞİL (TB3 kanonu).
          total: rows.length,
          limit,
          offset,
        };
        return send(200, body);
      }
      if (method === "POST") {
        return withBody((rawBody) => {
          // 🔴 Türev alan gövdeden GELEMEZ (`extra="forbid"` → 422).
          for (const derived of ["balance", "class_code", "level"]) {
            if (derived in rawBody) return send(422, { detail: `\`${derived}\` gövdeden gönderilemez.` });
          }
          const code = String(rawBody.code ?? "").trim();
          if (!ACCOUNTING_CODE_PATTERN.test(code)) {
            return send(422, { detail: "Hesap kodu 10 · 100 ya da 100.01 biçiminde olmalıdır." });
          }
          const name = String(rawBody.name ?? "").trim();
          if (name.length === 0) return send(422, { detail: "Hesap adı zorunludur." });
          if (accountingState.accounts.some((row) => row.code === code)) {
            return send(409, { detail: "Bu hesap kodu zaten kullanılıyor." });
          }
          accountingState.seq += 1;
          const created: components["schemas"]["ChartAccountResponse"] = {
            id: `coa-new-${accountingState.seq}`,
            code,
            name,
            account_type: (rawBody.account_type as MockChartAccountType | undefined) ?? "asset",
            is_active: rawBody.is_active === undefined ? true : rawBody.is_active === true,
            // MT-1/KK-1: sunucu varsayılanı `false`; gövde verirse ona uyulur.
            is_contra: rawBody.is_contra === true,
            created_at: ACCOUNTING_STAMP,
            updated_at: ACCOUNTING_STAMP,
            // 🔴 Üçü de SUNUCU türevidir; gövdeden değil KODDAN gelir.
            balance: "0.00",
            class_code: code[0],
            level: chartAccountLevel(code),
          };
          accountingState.accounts = [...accountingState.accounts, created];
          accountingState.hiddenAccountIds.add(created.id);
          return send(201, created);
        });
      }
    }

    const chartAccountMatch = path.match(/^\/chart-of-accounts\/([^/]+)$/);
    if (chartAccountMatch) {
      const account = accountingState.accounts.find((row) => row.id === chartAccountMatch[1]);
      if (account === undefined) return send(404, { detail: "Hesap bulunamadı." });
      if (method === "GET") return send(200, account);
      if (method === "PATCH") {
        return withBody((rawBody) => {
          for (const derived of ["balance", "class_code", "level"]) {
            if (derived in rawBody) return send(422, { detail: `\`${derived}\` gövdeden gönderilemez.` });
          }
          if (typeof rawBody.code === "string") {
            const code = rawBody.code.trim();
            if (!ACCOUNTING_CODE_PATTERN.test(code)) {
              return send(422, { detail: "Hesap kodu biçimi geçersiz." });
            }
            // 🔴 `guards.ACCOUNT_CODE_LOCKED`: satırı olan hesabın kodu kilitlidir.
            if (code !== account.code && accountingHasLines(account.id)) {
              return send(409, { detail: "Bu hesaba bağlı yevmiye kayıtları var; kod değiştirilemez." });
            }
            account.code = code;
            account.class_code = code[0];
            account.level = chartAccountLevel(code);
          }
          if (typeof rawBody.name === "string") account.name = rawBody.name.trim();
          if (typeof rawBody.account_type === "string") {
            account.account_type = rawBody.account_type as MockChartAccountType;
          }
          if (typeof rawBody.is_active === "boolean") account.is_active = rawBody.is_active;
          return send(200, account);
        });
      }
      if (method === "DELETE") {
        if (accountingHasLines(account.id)) {
          return send(409, { detail: "Bu hesaba bağlı yevmiye kayıtları var; hesap silinemez." });
        }
        accountingState.accounts = accountingState.accounts.filter((row) => row.id !== account.id);
        return send(204);
      }
    }

    if (method === "GET" && path === "/journal-entries/summary") {
      const year = Number(parsed.searchParams.get("year"));
      const month = Number(parsed.searchParams.get("month"));
      if (year === ACCOUNTING_PERIOD.year && month === ACCOUNTING_PERIOD.month) {
        return send(200, ACCOUNTING_SUMMARY);
      }
      // 🔴 Boş ay `0` döner, BOŞ değil (`COALESCE` kanonu, R12).
      const empty: components["schemas"]["JournalSummaryResponse"] = {
        year, month, total_debit: "0.00", total_credit: "0.00", net_balance: "0.00",
      };
      return send(200, empty);
    }

    if (path === "/journal-entries") {
      if (method === "GET") {
        const limit = accountingLimit();
        if (limit === null) return send(422, { detail: "limit en fazla 200 olabilir." });
        const offset = accountingOffset();
        const status = parsed.searchParams.get("status");
        const year = parsed.searchParams.get("year");
        const month = parsed.searchParams.get("month");

        let rows = accountingState.entries;
        if (status) rows = rows.filter((row) => row.status === status);
        if (year) rows = rows.filter((row) => row.period_year === Number(year));
        if (month) rows = rows.filter((row) => row.period_month === Number(month));
        // Sunucu sırası: tarih DESC (en yeni fiş üstte).
        const sorted = [...rows].sort((a, b) => b.entry_date.localeCompare(a.entry_date));

        const body: components["schemas"]["JournalEntryListResponse"] = {
          items: sorted.slice(offset, offset + limit).map(journalEntryHeader),
          total: rows.length,
          limit,
          offset,
        };
        return send(200, body);
      }
      if (method === "POST") {
        return withBody((rawBody) => {
          // 🔴 Damga/türev alanlar gövdeden GELEMEZ (`extra="forbid"` → 422).
          for (const derived of ["status", "total_debit", "total_credit", "period_year", "period_month", "reversal_of_id"]) {
            if (derived in rawBody) return send(422, { detail: `\`${derived}\` gövdeden gönderilemez.` });
          }
          const entryDate = String(rawBody.entry_date ?? "");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
            return send(422, { detail: "Tarih zorunludur." });
          }
          const description = String(rawBody.description ?? "").trim();
          if (description.length === 0) return send(422, { detail: "Açıklama zorunludur." });

          accountingState.seq += 1;
          const [year, month] = entryDate.split("-");
          const created: components["schemas"]["JournalEntryDetailResponse"] = {
            id: `je-new-${accountingState.seq}`,
            entry_date: entryDate,
            period_year: Number(year),
            period_month: Number(month),
            description,
            detail_note: (rawBody.detail_note as string | null | undefined) ?? null,
            // 🔴 Fiş `draft` DOĞAR (K2); `status` gövdeden GELMEZ.
            status: "draft",
            total_debit: "0.00",
            total_credit: "0.00",
            reversal_of_id: null,
            created_by_id: ME.id,
            created_at: ACCOUNTING_STAMP,
            updated_at: ACCOUNTING_STAMP,
            lines: [],
          };
          const rawLines = Array.isArray(rawBody.lines) ? (rawBody.lines as Record<string, unknown>[]) : [];
          const failure = applyJournalLines(created, rawLines);
          if (failure.detail !== undefined) return send(422, { detail: failure.detail });
          accountingState.entries = [created, ...accountingState.entries];
          return send(201, created);
        });
      }
    }

    const journalLinesMatch = path.match(/^\/journal-entries\/([^/]+)\/lines$/);
    if (method === "PUT" && journalLinesMatch) {
      const entry = accountingState.entries.find((row) => row.id === journalLinesMatch[1]);
      if (entry === undefined) return send(404, { detail: "Fiş bulunamadı." });
      // 🔴 K2: satır yazımı YALNIZ `draft`ta serbesttir.
      if (entry.status !== "draft") {
        return send(409, { detail: "Yalnızca taslak fişin satırları değiştirilebilir." });
      }
      return withBody((rawBody) => {
        const rawLines = Array.isArray(rawBody.lines) ? (rawBody.lines as Record<string, unknown>[]) : [];
        const failure = applyJournalLines(entry, rawLines);
        if (failure.detail !== undefined) return send(422, { detail: failure.detail });
        return send(200, entry);
      });
    }

    const journalActionMatch = path.match(/^\/journal-entries\/([^/]+)\/(post|reverse)$/);
    if (method === "POST" && journalActionMatch) {
      const entry = accountingState.entries.find((row) => row.id === journalActionMatch[1]);
      if (entry === undefined) return send(404, { detail: "Fiş bulunamadı." });
      if (journalActionMatch[2] === "post") {
        if (entry.status !== "draft") {
          return send(409, { detail: "Yalnızca taslak fiş kayıtlaştırılabilir." });
        }
        if (entry.lines.length < 2) return send(422, { detail: "Fişte en az iki satır olmalıdır." });
        entry.status = "posted";
        return send(200, entry);
      }
      // 🔴 Storno YENİ BİR FİŞtir: orijinal `reversed` damgalanır, ters
      // bacaklı kopya `posted` doğar ve `reversal_of_id` ile geri gösterir.
      if (entry.status !== "posted") {
        return send(409, { detail: "Yalnızca kayıtlaştırılmış fiş terslenebilir." });
      }
      entry.status = "reversed";
      accountingState.seq += 1;
      const storno: components["schemas"]["JournalEntryDetailResponse"] = {
        ...entry,
        id: `je-storno-${accountingState.seq}`,
        status: "posted",
        description: `Storno: ${entry.description}`,
        reversal_of_id: entry.id,
        total_debit: entry.total_credit,
        total_credit: entry.total_debit,
        lines: entry.lines.map((line, index) => ({
          ...line,
          id: `je-storno-${accountingState.seq}-l${index}`,
          debit: line.credit,
          credit: line.debit,
        })),
      };
      accountingState.entries = [storno, ...accountingState.entries];
      return send(200, storno);
    }

    const journalEntryMatch = path.match(/^\/journal-entries\/([^/]+)$/);
    if (journalEntryMatch) {
      const entry = accountingState.entries.find((row) => row.id === journalEntryMatch[1]);
      if (entry === undefined) return send(404, { detail: "Fiş bulunamadı." });
      if (method === "GET") return send(200, entry);
      if (method === "PATCH") {
        if (entry.status !== "draft") {
          return send(409, { detail: "Yalnızca taslak fiş düzenlenebilir." });
        }
        return withBody((rawBody) => {
          for (const derived of ["status", "total_debit", "total_credit", "lines"]) {
            if (derived in rawBody) return send(422, { detail: `\`${derived}\` gövdeden gönderilemez.` });
          }
          if (typeof rawBody.entry_date === "string") {
            entry.entry_date = rawBody.entry_date;
            const [year, month] = rawBody.entry_date.split("-");
            entry.period_year = Number(year);
            entry.period_month = Number(month);
          }
          if (typeof rawBody.description === "string") entry.description = rawBody.description.trim();
          // 🔴 `detail_note` İSTİSNA: açıkça `null` göndermek GERÇEK temizlemedir.
          if ("detail_note" in rawBody) {
            entry.detail_note = (rawBody.detail_note as string | null) ?? null;
          }
          return send(200, entry);
        });
      }
      if (method === "DELETE") {
        if (entry.status !== "draft") {
          return send(409, { detail: "Yalnızca taslak fiş silinebilir." });
        }
        accountingState.entries = accountingState.entries.filter((row) => row.id !== entry.id);
        return send(204);
      }
    }

    if (method === "GET" && path === "/journal") {
      const limit = accountingLimit();
      if (limit === null) return send(422, { detail: "limit en fazla 200 olabilir." });
      const offset = accountingOffset();
      const year = Number(parsed.searchParams.get("year"));
      const month = Number(parsed.searchParams.get("month"));
      const accountId = parsed.searchParams.get("account_id");
      const status = parsed.searchParams.get("status");

      // 🔴 Defter fikstürü YALNIZ Temmuz 2026'dadır; başka ay BOŞ döner —
      // yazma akışlarının koştuğu ay (Haziran) böylece T6'nın kadrajına
      // YAPISAL olarak giremez.
      const inPeriod = year === ACCOUNTING_PERIOD.year && month === ACCOUNTING_PERIOD.month;
      let rows = inPeriod ? [...ACCOUNTING_LEDGER_ROWS] : [];
      if (accountId) rows = rows.filter((row) => row.account_id === accountId);
      if (status) rows = rows.filter((row) => row.entry_status === status);

      const body: components["schemas"]["LedgerResponse"] = {
        items: rows.slice(offset, offset + limit),
        total: rows.length,
        limit,
        offset,
        // Süzgeç daraltılınca devir de anlamsızlaşırdı; boş pencerede `0.00`.
        carried_balance: rows.length > 0 ? ACCOUNTING_CARRIED_BALANCE : "0.00",
      };
      return send(200, body);
    }

    // --- F-MU2 · MU-2 salt-okur uçları ------------------------------------
    // 🔴 Fikstürler DONMUŞ HARİTALARDIR (dosyanın sonunda), `accountingState`ten
    // TÜRETİLMEZ. Gerekçe: yazma akışları HAZİRAN'da koşar (mutasyon adası) ve
    // KDV ekranının VARSAYILAN dönemi de Haziran'dır (beyanname önceki ayın
    // beyanıdır). Türetilseydi bir fiş oluşturma testi, KDV karesini
    // `fullyParallel` altında sessizce oynatırdı. Bekçisi
    // `accounting-reports.spec.ts`tedir.
    if (method === "GET" && path === "/trial-balance") {
      const year = Number(parsed.searchParams.get("year"));
      const month = Number(parsed.searchParams.get("month"));
      return send(200, trialBalanceFixture(year, month));
    }

    if (method === "GET" && path === "/vat-return") {
      const year = Number(parsed.searchParams.get("year"));
      const month = Number(parsed.searchParams.get("month"));
      return send(200, vatReturnFixture(year, month));
    }

    // --- F-MT · MT-1 mali tablo uçları ------------------------------------
    // 🔴 Fikstürler yine DONMUŞ HARİTALARDIR (dosyanın sonunda) ve
    // `accountingState`ten TÜRETİLMEZ — gerekçe yukarıdakiyle aynı.
    if (method === "GET" && path === "/balance-sheet") {
      // 🔴 NOKTA-ZAMAN: tek bir ISO gün (`year`+`month` DEĞİL).
      return send(200, balanceSheetFixture(parsed.searchParams.get("as_of") ?? ""));
    }

    if (method === "GET" && path === "/cash-flow-statement") {
      const year = Number(parsed.searchParams.get("year"));
      const month = Number(parsed.searchParams.get("month"));
      return send(200, cashFlowStatementFixture(year, month));
    }

    // --- F-IZN T6 · İzin yönetimi (YEDİ uç) --------------------------------
    // BFF izin listesindeki üç kök burada karşılanır (`leave-types` ·
    // `leave-requests` · `leave-balances`); özet ucu mevcut `hr` kökündendir.

    if (method === "GET" && path === "/leave-types") {
      // Uç YALNIZ AKTİF tipleri, `sort_order` sırasında döner.
      const body: MockLeaveType[] = [...LEAVE_TYPE_FIXTURES].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      return send(200, body);
    }

    if (method === "GET" && path === "/hr/leaves/summary") {
      const rawYear = parsed.searchParams.get("year");
      const year = rawYear === null ? LEAVE_YEAR : Number(rawYear);
      // 🔴 Yıl YALNIZ bakiye eksenini kaydırır; KPI'lar BUGÜNE bağlıdır ve
      // yıla göre değişmez (şema notu). Fikstür yılı dışındaki yıl BOŞ bakiye
      // döner — bakiye tablosunun boş durumu böylece gerçekten ölçülebilir.
      const balances: MockLeaveBalance[] =
        year === LEAVE_YEAR ? LEAVE_BALANCE_FIXTURES.map((balance) => ({ ...balance })) : [];
      const body: components["schemas"]["HrLeavesSummaryResponse"] = {
        year,
        ...HR_LEAVES_SUMMARY_KPIS,
        balances,
      };
      return send(200, body);
    }

    const leaveBalanceMatch = path.match(/^\/leave-balances\/([^/]+)\/(\d+)$/);
    if (leaveBalanceMatch && (method === "GET" || method === "PUT")) {
      const personnelId = leaveBalanceMatch[1];
      const year = Number(leaveBalanceMatch[2]);
      const personnel = state.personnel.find((person) => person.id === personnelId);
      if (personnel === undefined) return send(404, { detail: "Personel bulunamadı." });
      const fixture = leaveBalanceFixture(personnelId);
      // 🔴 Bakiye SATIRI olmayan personel de 200 alır (devreden 0) — satır
      // yalnız MANUEL devreden içindir, yokluğu veri eksikliği DEĞİLDİR.
      const current: MockLeaveBalance = fixture
        ? { ...fixture, year }
        : {
            personnel_id: personnelId,
            personnel_name: personnel.full_name,
            year,
            hire_date: null,
            seniority_years: null,
            seniority_months: null,
            annual_entitlement: null,
            carried_over: "0.00",
            used: 0,
            remaining: null,
            usage_pct: null,
          };
      if (method === "GET") return send(200, current);
      return withBody((body) => {
        // 🔴 YALNIZ `carried_over` yazılabilir; türev alan gönderilirse 422
        // (sessizce yutulsaydı istemci hakkı değiştirdiğini sanırdı).
        const forbidden = Object.keys(body).filter((key) => key !== "carried_over");
        if (forbidden.length > 0) {
          return send(422, { detail: `Türev alan yazılamaz: ${forbidden.join(", ")}` });
        }
        const carriedOver = Number(body.carried_over);
        if (!Number.isFinite(carriedOver) || carriedOver < 0) {
          return send(422, { detail: "Devreden gün negatif olamaz." });
        }
        // UPSERT: aynı istek iki kez ikinci satır AÇMAZ. Fikstür DONDURULMUŞ
        // olduğu için yanıt türetilir, paylaşılan durum KİRLENMEZ (yazma
        // akışının bakiye tablosunun kadrajını oynatmaması bilinçlidir).
        return send(200, { ...current, carried_over: carriedOver.toFixed(2) });
      });
    }

    if (method === "GET" && path === "/leave-requests") {
      const rawLimit = parsed.searchParams.get("limit");
      const limit = rawLimit === null ? LEAVE_LIMIT_DEFAULT : Number(rawLimit);
      // TB3 korkuluğu: tavanı aşan istek SESSİZCE KIRPILMAZ, 422 olur.
      if (!Number.isInteger(limit) || limit < 1 || limit > LEAVE_LIMIT_MAX) {
        return send(422, { detail: `limit 1 ile ${LEAVE_LIMIT_MAX} arasında olmalıdır.` });
      }
      const offset = Number(parsed.searchParams.get("offset") ?? 0);
      const status = parsed.searchParams.get("status");
      const personnelId = parsed.searchParams.get("personnel_id");
      const projectId = parsed.searchParams.get("project_id");

      let rows = [...leaveState.requests];
      if (status) rows = rows.filter((row) => row.status === status);
      if (personnelId) rows = rows.filter((row) => row.personnel_id === personnelId);
      if (projectId) {
        // Talebin KENDİ proje kolonu yoktur — süzgeç PERSONELİN projesinden geçer.
        rows = rows.filter(
          (row) =>
            state.personnel.find((person) => person.id === row.personnel_id)
              ?.assigned_project_id === projectId,
        );
      }
      // Sıralama sunucudakiyle aynı: en yeni önce, eşitlikte `id`.
      rows.sort((a, b) =>
        a.created_at === b.created_at
          ? a.id.localeCompare(b.id)
          : b.created_at.localeCompare(a.created_at),
      );

      const body: components["schemas"]["LeaveRequestListResponse"] = {
        items: rows.slice(offset, offset + limit),
        // 🔴 `total` SAYFADAN BAĞIMSIZ sayaçtır (sunucu ayrı `count` sorgusu
        // atar). Sayfa penceresi daraltılınca `items.length`ten AYRIŞIR — K5'in
        // başlık sayısının satır sayısı OLMADIĞININ kanıtı budur.
        total: rows.length,
        limit,
        offset,
      };
      return send(200, body);
    }

    if (method === "POST" && path === "/leave-requests") {
      return withBody((body) => {
        // Şema `extra="forbid"`: `days`/`status` gönderilirse 422.
        const allowed = new Set([
          "personnel_id",
          "leave_type_id",
          "start_date",
          "end_date",
          "note",
          "document_id",
        ]);
        const extras = Object.keys(body).filter((key) => !allowed.has(key));
        if (extras.length > 0) {
          return send(422, { detail: `Bilinmeyen alan: ${extras.join(", ")}` });
        }
        const personnel = state.personnel.find((person) => person.id === body.personnel_id);
        if (personnel === undefined) return send(404, { detail: "Personel bulunamadı." });
        const type = leaveTypeFixture(String(body.leave_type_id ?? ""));
        if (type === undefined) return send(404, { detail: "İzin tipi bulunamadı." });
        const startDate = String(body.start_date ?? "");
        const endDate = String(body.end_date ?? "");
        const days = leaveDayCount(startDate, endDate);
        if (days === null) return send(422, { detail: "Bitiş tarihi başlangıçtan önce olamaz." });
        const documentId =
          body.document_id === undefined || body.document_id === null
            ? null
            : String(body.document_id);
        // Gövde içi varlık referansı = 404 (BC görünürlük korkuluğu / ST kanonu).
        if (documentId !== null && !state.documents.some((doc) => doc.id === documentId)) {
          return send(404, { detail: "Belge bulunamadı." });
        }
        leaveState.seq += 1;
        const stamp = new Date().toISOString();
        const created: MockLeaveRequest = {
          // 🔒 `lv-new-` öneki `pinLeaveRequests` süzgecinin DIŞINDADIR:
          // yaratma akışı görsel kadrajı kirletmez.
          id: `lv-new-${leaveState.seq}`,
          personnel_id: personnel.id,
          personnel_name: personnel.full_name,
          personnel_trade: personnel.trade,
          leave_type_id: type.id,
          leave_type_name: type.name,
          leave_type_color: type.color,
          deducts_from_annual: type.deducts_from_annual,
          start_date: startDate,
          end_date: endDate,
          // `days` SUNUCU hesabıdır; `status` HER ZAMAN `pending` başlar.
          days,
          note: body.note === undefined || body.note === null ? null : String(body.note),
          document_id: documentId,
          status: "pending",
          decided_by: null,
          decided_at: null,
          reject_reason: null,
          created_at: stamp,
          updated_at: stamp,
        };
        leaveState.requests = [...leaveState.requests, created];
        return send(201, created);
      });
    }

    const leaveDecisionMatch = path.match(/^\/leave-requests\/([^/]+)\/(approve|reject)$/);
    if (method === "POST" && leaveDecisionMatch) {
      const request = leaveState.requests.find((row) => row.id === leaveDecisionMatch[1]);
      if (request === undefined) return send(404, { detail: "İzin talebi bulunamadı." });
      const isApprove = leaveDecisionMatch[2] === "approve";
      return withBody((body) => {
        if (request.status !== "pending") {
          return send(409, { detail: "Karara bağlanmış talep yeniden karara bağlanamaz." });
        }
        const stamp = new Date().toISOString();

        if (!isApprove) {
          // 🔴 `reason` ZORUNLU — `strip()` sonrası boş 422. Ekranın kapısı da
          // `trim()` üzerinden kuruludur; ikisi AYNI normalizasyonu kullanır.
          const reason = typeof body.reason === "string" ? body.reason.trim() : "";
          if (reason.length === 0) return send(422, { detail: "Red gerekçesi zorunludur." });
          // 🔴 RED HER ZAMAN SERBEST: hak aşımı/çakışma reddi ENGELLEMEZ.
          request.status = "rejected";
          request.reject_reason = reason;
          request.decided_by = ME.full_name;
          request.decided_at = stamp;
          request.updated_at = stamp;
          return send(200, request);
        }

        // 🔴 Onay GÖVDESİZDİR: alan taşıyan gövde 422 (karar alanları SUNUCU
        // damgasıdır). Sahte backend bu kuralı yalanlamaz.
        if (Object.keys(body).length > 0) {
          return send(422, { detail: "Onay ucu gövde kabul etmez." });
        }
        // Çakışan ONAYLI izin → 409 (K3).
        const overlaps = leaveState.requests.some(
          (row) =>
            row.id !== request.id &&
            row.personnel_id === request.personnel_id &&
            row.status === "approved" &&
            row.start_date <= request.end_date &&
            row.end_date >= request.start_date,
        );
        if (overlaps) return send(409, { detail: "Aynı tarihlerde onaylı izin var." });
        if (request.deducts_from_annual) {
          const remaining = leaveBalanceFixture(request.personnel_id)?.remaining;
          // 🔴 FAIL-CLOSED: kalan hak HESAPLANAMIYORSA onay verilmez.
          if (remaining === undefined || remaining === null) {
            return send(409, {
              detail: "Kalan izin hakkı hesaplanamıyor — talep onaylanamaz.",
            });
          }
          // Sınır günü SERBESTtir: kapı `>` ile kuruludur, `>=` DEĞİL.
          if (request.days > Number(remaining)) {
            return send(409, { detail: "Talep yıllık izin hakkını aşıyor." });
          }
        }
        request.status = "approved";
        request.decided_by = ME.full_name;
        request.decided_at = stamp;
        request.updated_at = stamp;
        return send(200, request);
      });
    }

    const leaveRequestMatch = path.match(/^\/leave-requests\/([^/]+)$/);
    if (leaveRequestMatch && (method === "GET" || method === "PATCH" || method === "DELETE")) {
      const request = leaveState.requests.find((row) => row.id === leaveRequestMatch[1]);
      if (request === undefined) return send(404, { detail: "İzin talebi bulunamadı." });
      if (method === "GET") return send(200, request);
      if (method === "DELETE") {
        if (request.status !== "pending") {
          return send(409, { detail: "Yalnızca bekleyen talep silinebilir." });
        }
        leaveState.requests = leaveState.requests.filter((row) => row.id !== request.id);
        return send(204);
      }
      return withBody((body) => {
        // YALNIZ `pending` kayıt düzenlenebilir; karara bağlanmış → 409.
        if (request.status !== "pending") {
          return send(409, { detail: "Karara bağlanmış talep düzenlenemez." });
        }
        const startDate = body.start_date === undefined || body.start_date === null
          ? request.start_date
          : String(body.start_date);
        const endDate = body.end_date === undefined || body.end_date === null
          ? request.end_date
          : String(body.end_date);
        // Tarih değişirse `days` YENİDEN sunucu hesabıdır.
        const days = leaveDayCount(startDate, endDate);
        if (days === null) return send(422, { detail: "Bitiş tarihi başlangıçtan önce olamaz." });
        if (body.leave_type_id !== undefined && body.leave_type_id !== null) {
          const type = leaveTypeFixture(String(body.leave_type_id));
          if (type === undefined) return send(404, { detail: "İzin tipi bulunamadı." });
          request.leave_type_id = type.id;
          request.leave_type_name = type.name;
          request.leave_type_color = type.color;
          request.deducts_from_annual = type.deducts_from_annual;
        }
        if (body.document_id !== undefined) {
          const documentId = body.document_id === null ? null : String(body.document_id);
          if (documentId !== null && !state.documents.some((doc) => doc.id === documentId)) {
            return send(404, { detail: "Belge bulunamadı." });
          }
          request.document_id = documentId;
        }
        if (body.note !== undefined) {
          request.note = body.note === null ? null : String(body.note);
        }
        request.start_date = startDate;
        request.end_date = endDate;
        request.days = days;
        request.updated_at = new Date().toISOString();
        return send(200, request);
      });
    }

    // --- F-BOR T6 · Bordro (İK-3) — ON ÜÇ uç ------------------------------
    // 🔴 Yanıtların HEPSİ `payrollState`ten TÜRER (`buildPayrollX(...)`);
    // donmuş yanıt haritası YOKTUR. Gerekçe fikstür bloğunun başında.
    // 🔴 Sıra ÖNEMLİ: alt yollar (`/approve`, `/pay`, …) genel `{id}`
    // kalıbından ÖNCE eşleşmelidir, yoksa `pp-2026-07/approve` bir dönem
    // KİMLİĞİ sanılır ve 404 döner.

    if (path === "/payroll/rates" && method === "GET") {
      // Sayfalama YOKTUR (şema kararı): tablo yılda birkaç satır büyür.
      return send(200, { items: payrollState.rates, total: payrollState.rates.length });
    }

    const payrollRateMatch = path.match(/^\/payroll\/rates\/(\d+)\/([^/]+)$/);
    if (payrollRateMatch && method === "PUT") {
      const rateYear = Number(payrollRateMatch[1]);
      const rateSource = payrollRateMatch[2] as MockPayrollWorkerSource;
      return withBody((body) => {
        // 🔴 PARA KORKULUĞU: o yılda onaylanmış/ödenmiş dönem varsa oran
        // DEĞİŞMEZ — geçmiş bir dönemin raporlanmış maliyeti ve SGK bildirimi
        // geriye dönük oynardı. Kapı YILA kapanır (yeni tip açmak da aynı
        // sonucu doğururdu).
        const isYearLocked = payrollState.periods.some(
          (period) =>
            period.year === rateYear &&
            (period.status === "approved" || period.status === "paid"),
        );
        if (isYearLocked) {
          return send(409, {
            detail: `${rateYear} yılında onaylanmış dönem var; oran seti değiştirilemez.`,
          });
        }

        const requiredRateKeys = [
          "sgk_employee_pct",
          "unemployment_employee_pct",
          "income_tax_pct",
          "stamp_tax_pct",
          "sgk_employer_pct",
          "unemployment_employer_pct",
          "short_work_pct",
        ] as const;
        // Gövde TAM SETTİR: yedi oranın hepsi zorunlu, kısmi yama yok.
        const missingRateKeys = requiredRateKeys.filter(
          (key) => body[key] === undefined || body[key] === null,
        );
        if (missingRateKeys.length > 0) {
          return send(422, { detail: `Eksik oran alanı: ${missingRateKeys.join(", ")}` });
        }

        const nextRate: MockPayrollRate = {
          id: `pr-${rateYear}-${rateSource}`,
          year: rateYear,
          personnel_source: rateSource,
          sgk_employee_pct: String(body.sgk_employee_pct),
          unemployment_employee_pct: String(body.unemployment_employee_pct),
          income_tax_pct: String(body.income_tax_pct),
          stamp_tax_pct: String(body.stamp_tax_pct),
          sgk_employer_pct: String(body.sgk_employer_pct),
          unemployment_employer_pct: String(body.unemployment_employer_pct),
          short_work_pct: String(body.short_work_pct),
          is_active: body.is_active === undefined ? true : Boolean(body.is_active),
        };
        payrollState.rates = [
          ...payrollState.rates.filter(
            (rate) => !(rate.year === rateYear && rate.personnel_source === rateSource),
          ),
          nextRate,
        ];
        return send(200, nextRate);
      });
    }

    if (path === "/payroll/periods" && method === "GET") {
      const rawPayrollLimit = Number(parsed.searchParams.get("limit") ?? PAYROLL_LIMIT_DEFAULT);
      const rawPayrollOffset = Number(parsed.searchParams.get("offset") ?? 0);
      const payrollLimit = Number.isFinite(rawPayrollLimit)
        ? Math.min(Math.max(rawPayrollLimit, 1), PAYROLL_LIMIT_MAX)
        : PAYROLL_LIMIT_DEFAULT;
      const payrollOffset = Number.isFinite(rawPayrollOffset) ? Math.max(rawPayrollOffset, 0) : 0;
      // 🔴 Uç `year` parametresi ALMAZ (K6) — gönderilse bile YOK SAYILIR.
      // Yıl süzgeci istemcidedir; uydurma parametre buradan da kanıtlanır.
      return send(200, {
        items: payrollState.periods
          .slice(payrollOffset, payrollOffset + payrollLimit)
          .map((period) => buildPayrollPeriodListRow(payrollState, period)),
        total: payrollState.periods.length,
        limit: payrollLimit,
        offset: payrollOffset,
      });
    }

    if (path === "/payroll/periods" && method === "POST") {
      return withBody((body) => {
        const newYear = Number(body.year);
        const newMonth = Number(body.month);
        if (
          !Number.isInteger(newYear) ||
          !Number.isInteger(newMonth) ||
          newMonth < 1 ||
          newMonth > 12
        ) {
          return send(422, { detail: "Geçersiz dönem (yıl/ay)." });
        }
        if (findPayrollPeriod(payrollPeriodId(newYear, newMonth)) !== undefined) {
          return send(409, { detail: "Bu dönem zaten açılmış." });
        }
        // 🔴 `status` gövdeden ALINMAZ: yeni dönem HER ZAMAN `draft`tır (şema
        // kararı) — aksi hâlde istemci bir ayı doğrudan `paid` açıp onay
        // zincirini atlardı.
        const createdPeriod: MockPayrollPeriod = {
          ...buildPayrollPeriod({
            year: newYear,
            month: newMonth,
            status: "draft",
            isSgkSubmitted: false,
          }),
          payment_due_date:
            body.payment_due_date === undefined || body.payment_due_date === null
              ? null
              : String(body.payment_due_date),
        };
        payrollState.periods = [...payrollState.periods, createdPeriod];
        return send(201, buildPayrollPeriodDetail(payrollState, createdPeriod));
      });
    }

    const payrollComputeMatch = path.match(/^\/payroll\/periods\/([^/]+)\/compute$/);
    if (payrollComputeMatch && method === "POST") {
      const period = findPayrollPeriod(payrollComputeMatch[1]);
      if (period === undefined) return send(404, { detail: "Dönem bulunamadı." });
      // Satırlar tohumda zaten açıktır; yeniden hesap ELLE DÜZELTİLMİŞ (S6) ve
      // ONAYLI/ÖDENMİŞ (S5) satırları KORUR ve bunu sayaçla söyler.
      let computeUpdated = 0;
      let computeSkippedOverridden = 0;
      let computeSkippedApproved = 0;
      for (const line of period.lines) {
        if (line.isOverridden) computeSkippedOverridden += 1;
        else if (line.approval !== "pending") computeSkippedApproved += 1;
        else computeUpdated += 1;
      }
      return send(200, {
        created: 0,
        updated: computeUpdated,
        skipped_overridden: computeSkippedOverridden,
        skipped_approved: computeSkippedApproved,
      });
    }

    const payrollApproveMatch = path.match(/^\/payroll\/periods\/([^/]+)\/approve$/);
    if (payrollApproveMatch && method === "POST") {
      const period = findPayrollPeriod(payrollApproveMatch[1]);
      if (period === undefined) return send(404, { detail: "Dönem bulunamadı." });
      const nextStatus = PAYROLL_NEXT_STATUS[period.status];
      // Zincir TEK ADIM ilerler ve `approved`/`paid`ten ileri gitmez (S8).
      if (nextStatus === null) return send(409, { detail: "Dönem bu durumdan onaylanamaz." });

      let approvedCount = 0;
      let approveSkippedUncomputed = 0;
      let approveSkippedExcluded = 0;
      let approveSkippedAlready = 0;
      for (const line of period.lines) {
        const status = payrollLineStatus(line, payrollLineAmounts(payrollState, period, line));
        if (status === "excluded") approveSkippedExcluded += 1;
        else if (status === "uncomputed") approveSkippedUncomputed += 1;
        else if (status !== "pending") approveSkippedAlready += 1;
        else {
          line.approval = "approved";
          approvedCount += 1;
        }
      }
      period.status = nextStatus;
      period.approved_at = new Date().toISOString();
      return send(200, {
        period_status: period.status,
        approved: approvedCount,
        skipped_uncomputed: approveSkippedUncomputed,
        skipped_excluded: approveSkippedExcluded,
        skipped_already_approved: approveSkippedAlready,
      });
    }

    const payrollPayMatch = path.match(/^\/payroll\/periods\/([^/]+)\/pay$/);
    if (payrollPayMatch && method === "POST") {
      const period = findPayrollPeriod(payrollPayMatch[1]);
      if (period === undefined) return send(404, { detail: "Dönem bulunamadı." });
      // 🔴 İDEMPOTENT DEĞİL: ikinci çağrı 409'dur (ikinci ödeme). İK-3 dersi
      // burada YAŞAR — kilit olmasaydı iki eşzamanlı istek bordroyu İKİ KEZ
      // öderdi; ekran da bu yüzden düğmeyi gönderim boyunca kilitler (K7).
      if (period.status !== "approved") {
        return send(409, { detail: "Dönem onaylanmadan ödenemez." });
      }

      let paidCount = 0;
      let paidNetTotal = 0;
      let paySkippedUnapproved = 0;
      let paySkippedUncomputed = 0;
      let paySkippedExcluded = 0;
      for (const line of period.lines) {
        const amounts = payrollLineAmounts(payrollState, period, line);
        const status = payrollLineStatus(line, amounts);
        if (status === "excluded") paySkippedExcluded += 1;
        else if (status === "uncomputed") paySkippedUncomputed += 1;
        else if (status === "pending") paySkippedUnapproved += 1;
        else if (status === "approved" && amounts !== null) {
          line.approval = "paid";
          // 🔴 Taşeron satırı bu toplama GİRMEZ (K2) — yukarıdaki dal onu
          // zaten `skipped_excluded`a yazdı. Girseydi aynı emek hem
          // hakedişten hem bordrodan ödenirdi.
          paidNetTotal += amounts.net;
          paidCount += 1;
        }
      }
      period.status = "paid";
      period.paid_at = new Date().toISOString();
      return send(200, {
        period_status: period.status,
        paid_at: period.paid_at,
        paid: paidCount,
        paid_net_total: payrollKurus(paidNetTotal),
        skipped_unapproved: paySkippedUnapproved,
        skipped_uncomputed: paySkippedUncomputed,
        skipped_excluded: paySkippedExcluded,
      });
    }

    const payrollSgkSummaryMatch = path.match(/^\/payroll\/periods\/([^/]+)\/sgk-summary$/);
    if (payrollSgkSummaryMatch && method === "GET") {
      const period = findPayrollPeriod(payrollSgkSummaryMatch[1]);
      if (period === undefined) return send(404, { detail: "Dönem bulunamadı." });
      return send(200, buildPayrollSgkSummary(payrollState, period));
    }

    const payrollSgkSubmitMatch = path.match(/^\/payroll\/periods\/([^/]+)\/sgk-submit$/);
    if (payrollSgkSubmitMatch && method === "POST") {
      const period = findPayrollPeriod(payrollSgkSubmitMatch[1]);
      if (period === undefined) return send(404, { detail: "Dönem bulunamadı." });
      // Uç DIŞ SİSTEME hiçbir şey göndermez; yalnız DAMGA basar. İkinci damga
      // 409'dur ⇒ tek-uçuş şart (K7).
      if (period.sgk_submitted_at !== null) {
        return send(409, { detail: "Bu dönem için SGK bildirimi zaten damgalandı." });
      }
      period.sgk_submitted_at = new Date().toISOString();
      return send(200, { period_id: period.id, sgk_submitted_at: period.sgk_submitted_at });
    }

    const payrollExportMatch = path.match(/^\/payroll\/periods\/([^/]+)\/export$/);
    if (payrollExportMatch && method === "GET") {
      const period = findPayrollPeriod(payrollExportMatch[1]);
      if (period === undefined) return send(404, { detail: "Dönem bulunamadı." });
      // 🔴 İKİLİ gövde — `send` JSON yazar, bu yüzden yanıt ELDE kurulur.
      // İçerik gerçek bir XLSX değildir (istemci yalnız `Blob` + dosya adı
      // görür); sözleşmenin sınanan yanı İÇERİK TİPİ ve `content-disposition`.
      const exportName = `bordro-${period.year}-${String(period.month).padStart(2, "0")}.xlsx`;
      res.writeHead(200, {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${exportName}"`,
      });
      res.end(Buffer.from("PK-fiil-bordro", "utf8"));
      return;
    }

    const payrollLineDecisionMatch = path.match(/^\/payroll\/lines\/([^/]+)\/(approve|reject)$/);
    if (payrollLineDecisionMatch && method === "POST") {
      const found = findPayrollLine(payrollLineDecisionMatch[1]);
      if (found === undefined) return send(404, { detail: "Bordro satırı bulunamadı." });
      const amounts = payrollLineAmounts(payrollState, found.period, found.line);
      const status = payrollLineStatus(found.line, amounts);
      if (status === "excluded") return send(409, { detail: PAYROLL_EXCLUDED_REASON });
      if (status === "uncomputed") {
        return send(409, { detail: "Brütü hesaplanmamış satır onaylanamaz." });
      }
      if (status === "paid") return send(409, { detail: "Ödenmiş satırın onayı değiştirilemez." });
      found.line.approval = payrollLineDecisionMatch[2] === "approve" ? "approved" : "pending";
      return send(200, buildPayrollLineResponse(payrollState, found.period, found.line));
    }

    const payrollLineMatch = path.match(/^\/payroll\/lines\/([^/]+)$/);
    if (payrollLineMatch && method === "PATCH") {
      const found = findPayrollLine(payrollLineMatch[1]);
      if (found === undefined) return send(404, { detail: "Bordro satırı bulunamadı." });
      const { period, line } = found;
      return withBody((body) => {
        const touchedFields = ["gross_amount", "bank_amount", "cash_amount"].filter(
          (key) => body[key] !== undefined,
        );
        // Boş gövde bir İŞLEM DEĞİLDİR; 200 dönmek "kaydettim" demek olurdu.
        if (touchedFields.length === 0) return send(422, { detail: "Boş gövde." });

        if (
          payrollLineStatus(line, payrollLineAmounts(payrollState, period, line)) === "excluded"
        ) {
          return send(409, { detail: PAYROLL_EXCLUDED_REASON });
        }

        if (body.gross_amount !== undefined && body.gross_amount !== null) {
          const overrideGross = payrollParseKurus(String(body.gross_amount));
          if (overrideGross === null) return send(422, { detail: "Geçersiz brüt tutar." });
          line.previousGrossKurus = line.grossKurus;
          line.grossKurus = overrideGross;
          line.isOverridden = true;
          line.overriddenAt = new Date().toISOString();
          // Brüt değişti ⇒ eski bölüşüm artık NETLE TUTMAZ; varsayılana
          // ("hepsi bankaya") düşer. Korunsaydı satır sessizce tutarsız kalırdı.
          line.bankKurus = null;
        }

        const amounts = payrollLineAmounts(payrollState, period, line);
        if (body.bank_amount !== undefined || body.cash_amount !== undefined) {
          // 🔴 İKİSİ BİRLİKTE gelir (şema kararı): yalnız biri gelip öteki
          // sunucuya tamamlatılsaydı bölüşüm bir DOĞRULAMA değil bir HESAP
          // olurdu ve "gerisi elden mi, yoksa yanlış mı yazdım?" ayrımı
          // kaybolurdu.
          if (body.bank_amount === undefined || body.cash_amount === undefined) {
            return send(422, { detail: "Banka ve elden tutarları birlikte gönderilmelidir." });
          }
          if (amounts === null) {
            return send(409, { detail: "Net tutarı hesaplanmamış satırda bölüşüm yapılamaz." });
          }
          const bankKurus = payrollParseKurus(String(body.bank_amount));
          const cashKurus = payrollParseKurus(String(body.cash_amount));
          if (bankKurus === null || cashKurus === null) {
            return send(422, { detail: "Geçersiz tutar." });
          }
          // 🔴 DOĞRULAMA: toplam NETE eşit olmalı. Sunucu farkı KAPATMAZ —
          // kapatsaydı kullanıcı yanlış yazdığını hiç öğrenemezdi.
          if (bankKurus + cashKurus !== amounts.net) {
            return send(422, {
              detail: `Banka + elden toplamı net tutara eşit olmalı (${payrollKurus(amounts.net)}).`,
            });
          }
          line.bankKurus = bankKurus;
        }

        return send(200, buildPayrollLineResponse(payrollState, period, line));
      });
    }

    const payrollPeriodMatch = path.match(/^\/payroll\/periods\/([^/]+)$/);
    if (payrollPeriodMatch && (method === "GET" || method === "PATCH")) {
      const period = findPayrollPeriod(payrollPeriodMatch[1]);
      if (period === undefined) return send(404, { detail: "Dönem bulunamadı." });
      if (method === "GET") return send(200, buildPayrollPeriodDetail(payrollState, period));
      return withBody((body) => {
        // YALNIZ ödeme tarihi değişir (T4b): `year`/`month` kimliktir,
        // `status` geçiş tablosunun işidir, damgalar kendi uçlarında basılır.
        if (body.payment_due_date === undefined) return send(422, { detail: "Boş gövde." });
        period.payment_due_date =
          body.payment_due_date === null ? null : String(body.payment_due_date);
        return send(200, buildPayrollPeriodDetail(payrollState, period));
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

// --- F-FAT2 T2 · Fatura fikstürleri --------------------------------------
// Bu blok dosyanın SONUNA eklendi (paralel dallarla birleştirme çakışmasını
// en aza indirmek için). Modül değerlendirmesi `startMockBackend` çağrısından
// ÖNCE biter, bu yüzden yukarıdaki istek işleyicisi bunlara güvenle erişir.

type MockInvoiceLine = components["schemas"]["InvoiceLineResponse"];
type MockInvoice = components["schemas"]["InvoiceDetailResponse"];
type MockPayment = components["schemas"]["PaymentResponse"];

/** Künye = detay eksi `lines` (gerçek sunucuda liste `InvoiceResponse` döner). */
function invoiceHeader(invoice: MockInvoice): components["schemas"]["InvoiceResponse"] {
  const { lines: _lines, ...header } = invoice;
  return header;
}

function mockLine(
  id: string,
  sortOrder: number,
  description: string,
  unit: string,
  quantity: string,
  unitPrice: string,
): MockInvoiceLine {
  return {
    id,
    sort_order: sortOrder,
    description,
    unit,
    quantity,
    unit_price: unitPrice,
    vat_rate: "20",
    line_total: (Number(quantity) * Number(unitPrice)).toFixed(2),
    detail_note: null,
  };
}

/** Her faturanın taşıdığı NULL alanların ortak tabanı (tekrar yazılmaz). */
const INVOICE_BASE = {
  payment_method: "transfer" as const,
  note: null,
  party_tax_office: "Kızılay",
  party_address: "Söğütözü Cad. No:14\nÇankaya / ANKARA",
  employer_id: null,
  customer_id: null,
  supplier_id: null,
  subcontractor_id: null,
  progress_payment_id: null,
  subcontractor_progress_payment_id: null,
  equipment_rental_invoice_id: null,
  purchase_order_id: null,
  project_id: null,
  site_id: null,
  advance_rate: null,
  advance_amount: "0.00",
  retention_rate: null,
  retention_amount: "0.00",
  withholding_rate: null,
  withholding_amount: "0.00",
  created_by_id: "11111111-1111-1111-1111-111111111111",
  created_at: "2026-07-18T09:14:00Z",
  updated_at: "2026-07-18T09:14:00Z",
};

/**
 * BEŞ fatura: iki yönün DÖRT durumu + dönem penceresi dışında kalan bir
 * taslak. Sonuncusu (2026-06) `date_from`/`date_to` süzgecinin gerçekten
 * uygulandığını kanıtlar — hepsi Temmuz olsaydı o dal hiç ölçülemezdi.
 */
const INVOICE_FIXTURES: MockInvoice[] = [
  {
    ...INVOICE_BASE,
    id: "inv-out-1",
    direction: "outgoing",
    invoice_no: "FIL2026000184",
    document_type: "einvoice",
    status: "sent",
    issue_date: "2026-07-18",
    due_date: "2026-08-18", // → "Vadeli" (K1)
    party_name: "Güneşkent Gayrimenkul A.Ş.",
    party_tax_number: "9876543210",
    progress_payment_id: "pp-1",
    advance_rate: "20",
    advance_amount: "984120.00",
    retention_rate: "5",
    retention_amount: "246030.00",
    subtotal: "5432040.00",
    tax_base: "4201890.00",
    vat_amount: "840378.00",
    total: "5042268.00",
    lines: [
      mockLine("li-1", 0, "Kat Döşemesi Betonu C25/30 (Poz 03.001)", "m³", "1320.000", "2113.00"),
      mockLine("li-2", 1, "Kolon Betonu C30/37 (Poz 03.002)", "m³", "300.000", "2398.00"),
    ],
  },
  {
    ...INVOICE_BASE,
    id: "inv-out-2",
    direction: "outgoing",
    invoice_no: "FIL2026000183",
    document_type: "einvoice",
    status: "collected",
    issue_date: "2026-07-15",
    due_date: null, // vadesiz → "Tahsil Edildi", "Vadeli" DEĞİL
    party_name: "Çelik Holding A.Ş.",
    party_tax_number: "5566778899",
    subtotal: "1840000.00",
    tax_base: "1840000.00",
    vat_amount: "368000.00",
    total: "2208000.00",
    lines: [mockLine("li-3", 0, "OSB Saha Betonu", "m³", "800.000", "2300.00")],
  },
  {
    ...INVOICE_BASE,
    id: "inv-in-1",
    direction: "incoming",
    invoice_no: "LT2026070184",
    document_type: "einvoice",
    status: "pending",
    issue_date: "2026-07-16",
    due_date: "2026-08-15",
    party_name: "Liebherr Türkiye A.Ş.",
    party_tax_number: "4455667788",
    party_tax_office: "Beykoz V.D.",
    party_address: "Organize Sanayi Bölgesi\nBeykoz / İSTANBUL",
    equipment_rental_invoice_id: "rental-1", // → eşleştirme kartı
    subtotal: "103760.00",
    tax_base: "103760.00",
    vat_amount: "20752.00",
    withholding_rate: "20",
    withholding_amount: "4150.00",
    total: "146995.00",
    lines: [
      mockLine("li-4", 0, "Tower Crane TC-48 Kiralama", "Saat", "186.000", "320.00"),
      mockLine("li-5", 1, "Ekskavatör CAT 320 Kiralama", "Saat", "158.000", "280.00"),
    ],
  },
  {
    ...INVOICE_BASE,
    id: "inv-in-2",
    direction: "incoming",
    invoice_no: "DMS2026001122",
    document_type: "einvoice",
    status: "pending",
    issue_date: "2026-07-15",
    due_date: null,
    party_name: "Demirsan A.Ş.",
    party_tax_number: "1122334455",
    purchase_order_id: "po-1", // rotası YOK → solgun çip
    subtotal: "322500.00",
    tax_base: "322500.00",
    vat_amount: "64500.00",
    total: "387000.00",
    lines: [mockLine("li-6", 0, "Nervürlü Demir Ø12", "Ton", "15.000", "21500.00")],
  },
  {
    // 🔒 MUTASYON ALANI (F-FAT2 T3 · `hiddenFromLists`/`p-2` emsaliyle AYNI
    // sınıf): "gelen fatura listeden ONAYLANIR" testi durum oynatır
    // (`pending → approved`). O test `inv-in-2`yi oynatırken İKİ ayrı yarış
    // doğuyordu ve ikisi de ÖLÇÜLDÜ:
    //   1. Fonksiyonel: "kaynak çipi" testi `inv-in-2`yi giden sekmesinin
    //      `status=pending` süzgeçli tablosunda arar. `fullyParallel: true`
    //      altında AYNI DOSYANIN testleri de paralel koşar (dosya içi sıra
    //      garanti DEĞİLDİR) — onay önce koşarsa satır kaybolur ve iddia
    //      düşer.
    //   2. Görsel: gelen tablosunu içeren İKİ kadraj (`faturalar-liste-giden`
    //      · `faturalar-liste-gelen`) kâh "Onay Bekliyor" kâh "Onaylandı"
    //      basardı; `playwright.config.ts`te eşik ayarı olmadığı için hangi
    //      varyant baseline'a girerse öbürü CI'da KIRMIZI olurdu.
    // Çözüm ZAMANLAMAYA DAYANMAZ: mutasyon KENDİ kaydına taşındı. Tohum
    // faturalar (inv-in-1/inv-in-2) artık HİÇBİR test tarafından oynatılmaz.
    // Kayıt liste uçlarından gizlenemez (onay LİSTE SATIRINDAN tıklanır), bu
    // yüzden görsel spec onu kimlik ön ekiyle kadraj dışında bırakır
    // (`dropCreatedSuppliers` deseni).
    ...INVOICE_BASE,
    id: "inv-in-mut",
    direction: "incoming",
    invoice_no: "MUT2026000001",
    document_type: "einvoice",
    status: "pending",
    issue_date: "2026-07-17",
    due_date: null,
    party_name: "Mutasyon Ölçüm A.Ş.",
    party_tax_number: "1010101010",
    subtotal: "10000.00",
    tax_base: "10000.00",
    vat_amount: "2000.00",
    total: "12000.00",
    lines: [mockLine("li-8", 0, "Onay akışı ölçüm kalemi", "Adet", "1.000", "10000.00")],
  },
  {
    ...INVOICE_BASE,
    id: "inv-out-old",
    direction: "outgoing",
    invoice_no: "FIL2026000150",
    document_type: "earchive",
    status: "draft",
    issue_date: "2026-06-10", // 🔴 Temmuz penceresinin DIŞINDA
    due_date: null,
    party_name: "Bursa Belediyesi",
    party_tax_number: "9988776655",
    subtotal: "620000.00",
    tax_base: "620000.00",
    vat_amount: "124000.00",
    total: "744000.00",
    lines: [mockLine("li-7", 0, "Yol Alt Temel", "m³", "2000.000", "310.00")],
  },
];

const INVOICE_PAYMENT_FIXTURES: MockPayment[] = [
  {
    id: "pay-1",
    invoice_id: "inv-out-2",
    bank_account_id: "ba-1",
    method: "transfer",
    amount: "2208000.00",
    paid_on: "2026-07-20",
    note: null,
    created_by_id: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-07-20T10:00:00Z",
    updated_at: "2026-07-20T10:00:00Z",
  },
];

const INVOICE_SUMMARY: components["schemas"]["InvoiceSummaryResponse"] = {
  issued_this_month: { amount: "4920600.00", count: 18 },
  received_this_month: { amount: "3840000.00", count: 34 },
  receivable: { amount: "2100000.00", count: 4 },
  // NEGATİF olabilir demiştik; fikstür pozitif bir değer taşır.
  vat_difference: "216000.00",
  pending_approval: 3, // ADET
};

/** FGE:116-129 — iki satır: biri eşleşen, biri FAZLA faturalanan. */
const RENTAL_MATCH_FIXTURE: components["schemas"]["RentalInvoiceDetailResponse"] = {
  id: "rental-1",
  supplier_id: "sup-1",
  supplier_name: "Liebherr Türkiye A.Ş.",
  invoice_no: "LT2026070184",
  invoice_amount: "103760.00",
  period_year: 2026,
  period_month: 7,
  site_id: null,
  site_name: null,
  rate_period: "hourly",
  vat_rate: "20",
  vat_amount: "20752.00",
  payable_total: "146995.00",
  status: "draft",
  approved_by_id: null,
  approved_at: null,
  paid_at: null,
  created_at: "2026-07-16T08:00:00Z",
  lines: [
    {
      id: "rl-1",
      equipment_id: "eq-1",
      equipment_name: "Tower Crane TC-48",
      equipment_brand: "Liebherr",
      equipment_plate_no: null,
      site_id: "site-1",
      site_name: "Güneşkent A-Blok",
      line_kind: "rented",
      worked_hours: "186.00",
      breakdown_hours: "0.00",
      rate_amount: "320.00",
      effective_rate_amount: "320.00",
      our_amount: "59520.00",
      breakdown_amount: "0.00",
      invoiced_hours: "186.00",
      hours_variance: "0.00",
      variance_status: "match",
    },
    {
      id: "rl-2",
      equipment_id: "eq-2",
      equipment_name: "Ekskavatör CAT 320",
      equipment_brand: "CAT",
      equipment_plate_no: null,
      site_id: "site-2",
      site_name: "Liman Altyapı",
      line_kind: "rented",
      worked_hours: "152.00",
      breakdown_hours: "0.00",
      rate_amount: "280.00",
      effective_rate_amount: "280.00",
      our_amount: "42560.00",
      breakdown_amount: "0.00",
      invoiced_hours: "158.00",
      hours_variance: "6.00",
      variance_status: "over",
    },
  ],
  totals: {
    our_total: "102080.00",
    our_total_unknown_count: 0,
    owned_total: "0.00",
    owned_total_unknown_count: 0,
    excluded_breakdown_amount: "0.00",
    excluded_breakdown_unknown_count: 0,
    invoice_amount: "103760.00",
    vat_rate: "20",
    vat_amount: "20752.00",
    payable_total: "146995.00",
  },
  site_distribution: [],
};

/**
 * ⚠️ Fatura durumu YAZILABİLİRDİR (approve/send/tahsilat uçları onu oynatır),
 * bu yüzden fikstürler KOPYALANARAK modül düzeyinde tutulur. `e2e/invoices.
 * spec.ts` her mutasyonu AYRI bir fatura üzerinde koşar; aynı faturayı iki
 * test oynatsaydı `fullyParallel` altında yarış doğardı.
 */
const invoiceState: {
  invoices: MockInvoice[];
  payments: MockPayment[];
  seq: number;
} = {
  invoices: INVOICE_FIXTURES.map((invoice) => ({ ...invoice })),
  payments: INVOICE_PAYMENT_FIXTURES.map((payment) => ({ ...payment })),
  seq: 0,
};

/** `POST /invoices` yanıtı — sunucu toplamları KENDİ hesaplar (K7). */
function buildMockInvoice(
  seq: number,
  body: Record<string, unknown>,
  rawLines: Record<string, unknown>[],
): MockInvoice {
  const lines = rawLines.map((line, index) =>
    mockLine(
      `li-new-${seq}-${index}`,
      index,
      String(line.description ?? ""),
      String(line.unit ?? ""),
      Number(line.quantity ?? 0).toFixed(3),
      Number(line.unit_price ?? 0).toFixed(2),
    ),
  );
  const subtotal = lines.reduce((sum, line) => sum + Number(line.line_total), 0);
  const advanceRate = Number(body.advance_rate ?? 0);
  const retentionRate = Number(body.retention_rate ?? 0);
  const advance = (subtotal * advanceRate) / 100;
  const retention = (subtotal * retentionRate) / 100;
  const taxBase = subtotal - advance - retention;
  const vat = taxBase * 0.2;
  return {
    ...INVOICE_BASE,
    id: `inv-new-${seq}`,
    direction: "outgoing",
    invoice_no: `FIL20260002${String(seq).padStart(2, "0")}`,
    document_type: (body.document_type as MockInvoice["document_type"]) ?? "einvoice",
    // Giden fatura `draft` doğar (K2); `status` gövdeden GELMEZ.
    status: "draft",
    issue_date: String(body.issue_date ?? "2026-07-25"),
    due_date: (body.due_date as string | undefined) ?? null,
    payment_method: (body.payment_method as MockInvoice["payment_method"]) ?? "transfer",
    note: (body.note as string | undefined) ?? null,
    party_name: String(body.party_name ?? ""),
    party_tax_number: (body.party_tax_number as string | undefined) ?? null,
    party_tax_office: (body.party_tax_office as string | undefined) ?? null,
    party_address: (body.party_address as string | undefined) ?? null,
    progress_payment_id: (body.progress_payment_id as string | undefined) ?? null,
    advance_rate: advanceRate > 0 ? String(advanceRate) : null,
    advance_amount: advance.toFixed(2),
    retention_rate: retentionRate > 0 ? String(retentionRate) : null,
    retention_amount: retention.toFixed(2),
    subtotal: subtotal.toFixed(2),
    tax_base: taxBase.toFixed(2),
    vat_amount: vat.toFixed(2),
    total: (taxBase + vat).toFixed(2),
    lines,
  };
}

// --- F-MU1 T5 · Muhasebe (MU-1) fikstürleri ------------------------------
//
// Bu blok da dosyanın SONUNA eklendi (F-FAT2 emsali): modül değerlendirmesi
// `startMockBackend` çağrısından ÖNCE biter, dolayısıyla yukarıdaki istek
// işleyicisi bunlara güvenle erişir.
//
// 🔴 TİP ANOTASYONU ZORUNLU (F-SA kanonu): her yanıt gövdesi `schema.d.ts`ten
// TÜREYEN tiple işaretlidir. Elle `interface` yazılmaz, `as any`/`@ts-ignore`
// kullanılmaz — backend şeması değişirse bu dosya DERLENMEZ ve kayma
// `pnpm typecheck`te patlar (sessizce yanlış bir ekranı beslemez).
//
// 🔴 DÖNEM SÜZGECİ GERÇEKTİR (ekipman fikstürlerinin emsali): defter ve özet
// uçları istenen ay fikstür ayı DEĞİLSE boş/sıfır döner. Bu, testlerin
// `page.clock.setFixedTime` ile hangi aya baktığını AÇIKÇA söylemesini
// zorunlu kılar — "bugün hangi aysa o" belirsizliği kalmaz.

type MockChartAccount = components["schemas"]["ChartAccountResponse"];
type MockChartAccountType = components["schemas"]["ChartAccountType"];
type MockJournalEntry = components["schemas"]["JournalEntryDetailResponse"];
type MockJournalLine = components["schemas"]["JournalLineResponse"];
type MockLedgerRow = components["schemas"]["LedgerRow"];

/**
 * 📅 OKUMA (T6 görsel turunun) DÖNEMİ — E8:74 `Temmuz 2026`. Defter/özet
 * fikstürleri YALNIZ bu aydadır.
 */
export const ACCOUNTING_PERIOD = { year: 2026, month: 7 } as const;

/**
 * 🔒 YAZMA DÖNEMİ — mutasyon adası. Fiş yazan HER e2e akışı burada koşar.
 *
 * İzolasyon ZAMANLAMAYA DAYANMAZ, YAPISALDIR (F-SD `SEPTEMBER_FREE_DAY`
 * emsali): defter/özet/fiş uçlarının hepsi DÖNEM süzgeçlidir, dolayısıyla
 * Haziran'da yaratılan/kayıtlaştırılan/silinen hiçbir kayıt Temmuz'un
 * kadrajına giremez — `fullyParallel` altında sıra garanti olmasa bile.
 */
export const ACCOUNTING_MUTATION_PERIOD = { year: 2026, month: 6 } as const;

const ACCOUNTING_STAMP = "2026-07-01T09:00:00Z";

/** `codes.py::level` BİREBİR: `NN`→1, `NNN`→2, `NNN.NN`→3. */
function chartAccountLevel(code: string): number {
  if (code.length === 2) return 1;
  return code.includes(".") ? 3 : 2;
}

/**
 * Hesap tohumu. `balance` YALNIZ YAPRAK hesapta verilir: üst hesabın bakiyesi
 * TORUNLARININ TOPLAMIDIR (`journal-entry-form.ts · isLeafChartAccount`
 * notunun kendi gerekçesi) ve elle yazılsaydı fikstür kendi içinde çelişirdi.
 */
interface ChartAccountSeed {
  readonly code: string;
  readonly name: string;
  readonly type: MockChartAccountType;
  /** Yaprak bakiyesi; üst hesapta YOKTUR (hesaplanır). */
  readonly leafBalance?: string;
  readonly isActive?: boolean;
  /** K5 · kontra hesap bayrağı (`is_contra`); varsayılan `false`. */
  readonly isContra?: boolean;
}

/**
 * HP:64-213'ün ÇİZDİĞİ küme + E8'in defterinde GEÇEN beş alt hesap.
 *
 * 🔴 Kod sırası SUNUCUNUN sırasıdır (`code ASC`, METİN sıralaması) — istemci
 * yeniden sıralamaz (`buildChartRows` notu), bu yüzden fikstür de o sırada
 * yazılır. `"100"` < `"12"` metin sıralamasında DOĞRUDUR.
 *
 * 🔴 Alt hesaplar (`120.01` · `153.01` · `320.04` · `391.01` · `730.01`)
 * UYDURMA DEĞİLDİR: E8:110-157 defterinin `Hesap Kodu` sütunu tam olarak bu
 * kodları basar. HP onları çizmez çünkü HP grup/ana hesap düzeyini gösterir;
 * iki mockup birlikte `level` 1/2/3 karışımını verir.
 *
 * 🔴 `108` PASİFtir (`is_active: false`) — HP hiçbir pasif hesap ÇİZMEZ ama
 * `is_active` şemada vardır ve kaldırma yolu odur (repo kanonu); gri noktanın
 * hiç ölçülmediği bir fikstür, o dalın kırık olduğunu gizlerdi.
 */
const ACCOUNTING_CHART_SEEDS: readonly ChartAccountSeed[] = [
  // SINIF 1 — HP:69
  { code: "10", name: "Hazır Değerler", type: "asset" }, // HP:72-73 (grup)
  { code: "100", name: "Kasa", type: "asset", leafBalance: "284800.00" }, // HP:76-80
  { code: "101", name: "Alınan Çekler", type: "asset", leafBalance: "3610000.00" },
  { code: "102", name: "Bankalar", type: "asset", leafBalance: "3964700.00" },
  // 🔴 Tek PASİF hesap; bakiyesi sıfırdır (kullanımdan kaldırılmıştır).
  { code: "108", name: "Diğer Hazır Değerler", type: "asset", leafBalance: "0.00", isActive: false },
  { code: "12", name: "Ticari Alacaklar", type: "asset" }, // HP:97-98 (grup)
  { code: "120", name: "Alıcılar", type: "asset" }, // HP:101 — çocuğu var, YAPRAK DEĞİL
  { code: "120.01", name: "Yurtiçi Alıcılar", type: "asset", leafBalance: "8400000.00" }, // E8:112
  { code: "127", name: "Diğer Ticari Alacaklar", type: "asset", leafBalance: "124200.00" },
  { code: "15", name: "Stoklar", type: "asset" }, // HP:115-116 (grup)
  { code: "150", name: "İlk Madde ve Malzeme", type: "asset", leafBalance: "3240000.00" },
  { code: "153.01", name: "Demir & Çelik", type: "asset", leafBalance: "328500.00" }, // E8:130
  { code: "191", name: "İndirilecek KDV", type: "asset", leafBalance: "768520.00" },
  // SINIF 2 — HP:135
  { code: "252", name: "Binalar", type: "asset", leafBalance: "2400000.00" },
  { code: "254", name: "Taşıt Araçları", type: "asset", leafBalance: "1840000.00" },
  // 🔴 TEK NEGATİF bakiye (HP:155 `(620.000)`), türü `Pasif` ama noktası YEŞİL.
  // 🔴 K5: TOHUMUN TEK KONTRA HESABI. Yeni satır EKLENMEDİ — var olan `257`
  // gerçek kontra yapıldı; böylece görsel spec'lerdeki satır/rozet SAYILARI
  // (`accounting-visual` 26/30/22… · `accounting-reports-visual` 9/4/3/2)
  // kırılmaz, yalnız bu satıra kontra rozeti gelir.
  {
    code: "257",
    name: "Birikmiş Amortismanlar (-)",
    type: "liability",
    leafBalance: "-620000.00",
    isContra: true,
  },
  // SINIF 3 — HP:161
  { code: "320", name: "Satıcılar", type: "liability" }, // HP:167 — çocuğu var
  { code: "320.04", name: "Taşeron Satıcılar", type: "liability", leafBalance: "2184000.00" }, // E8:121
  { code: "360", name: "Ödenecek Vergi ve Fonlar", type: "liability", leafBalance: "284000.00" },
  { code: "391", name: "Hesaplanan KDV", type: "liability" }, // HP:181 — çocuğu var
  { code: "391.01", name: "Hesaplanan KDV %20", type: "liability", leafBalance: "412000.00" }, // E8:157
  // HP:187 bandı `SINIF 5` yazar ama ALTINA `600`/`730`/`760` dizer.
  // 🔴 K15: SATIRLAR KAZANIR — `class_code` KODUN ilk hanesidir, bant etiketi
  // bir sunucu alanı DEĞİLDİR. Bu yüzden ekranda `SINIF 6` ve `SINIF 7`
  // bantları basılır (çizilmemiş sınıf → `classBandLabel` yedeği, nötr tema).
  { code: "600", name: "Yurt İçi Satışlar", type: "revenue", leafBalance: "24870500.00" },
  { code: "730", name: "Genel Üretim Giderleri", type: "expense" }, // HP:199 — çocuğu var
  { code: "730.01", name: "İşçilik Giderleri", type: "expense", leafBalance: "5840000.00" }, // E8:139
  { code: "760", name: "Pazarlama Giderleri", type: "expense", leafBalance: "42000.00" },
];

/**
 * Üst hesabın bakiyesi = TORUNLARININ toplamı; yaprakta tohumun kendi değeri.
 *
 * "Torun" tanımı sunucunun `has_child_accounts`ı ile aynıdır: kodun KENDİSİYLE
 * BAŞLAYAN başka kodlar (`parent_id` FK yoktur, hiyerarşi kodun içindedir).
 */
function chartSeedBalance(seed: ChartAccountSeed): string {
  const descendants = ACCOUNTING_CHART_SEEDS.filter(
    (other) => other.code !== seed.code && other.code.startsWith(seed.code),
  );
  if (descendants.length === 0) {
    if (seed.leafBalance === undefined) {
      throw new Error(`Yaprak hesabın bakiyesi eksik: ${seed.code}`);
    }
    return seed.leafBalance;
  }
  if (seed.leafBalance !== undefined) {
    throw new Error(`Üst hesaba elle bakiye yazılamaz (türevdir): ${seed.code}`);
  }
  const total = descendants
    .filter((other) => other.leafBalance !== undefined)
    .reduce((sum, other) => sum + Number(other.leafBalance), 0);
  return total.toFixed(2);
}

function buildChartAccount(seed: ChartAccountSeed): MockChartAccount {
  return {
    id: `coa-${seed.code}`,
    code: seed.code,
    name: seed.name,
    account_type: seed.type,
    is_active: seed.isActive ?? true,
    // 🔴 K10 — BAYAT YORUM DÜZELTİLDİ (eskisi "tohum hesaplarının hiçbiri
    // kontra DEĞİLDİR … `257` gibi bir kontra hesap YOKTUR" diyordu; `257`
    // tohumda BAŞTAN BERİ duruyordu, yalnız bayrağı sabit `false`tı).
    // MT-1/KK-1 devrinden sonra bayrak TOHUMDAN gelir: `257 Birikmiş
    // Amortismanlar (-)` gerçek kontradır. Değeri burada elle YAZILMAZ —
    // sabit `true` yazmak bütün tohumu sessizce yanlış bilançoya çevirirdi.
    is_contra: seed.isContra ?? false,
    created_at: ACCOUNTING_STAMP,
    updated_at: ACCOUNTING_STAMP,
    balance: chartSeedBalance(seed),
    // 🔴 İKİSİ DE KODDAN TÜRETİLİR (`codes.py::class_code` / `::level`) —
    // elle yazılsaydı fikstür sunucunun kuralıyla sessizce ayrışırdı.
    class_code: seed.code[0],
    level: chartAccountLevel(seed.code),
  };
}

const ACCOUNTING_CHART_FIXTURES: readonly MockChartAccount[] =
  ACCOUNTING_CHART_SEEDS.map(buildChartAccount);

function chartAccountByCode(code: string): MockChartAccount {
  const account = ACCOUNTING_CHART_FIXTURES.find((row) => row.code === code);
  if (account === undefined) throw new Error(`Fikstürde olmayan hesap kodu: ${code}`);
  return account;
}

// --- Defter (E8:110-157) -------------------------------------------------

/**
 * 🔴 DEVİR SIFIRDAN FARKLIDIR. Sıfır olsaydı ilk satırın bakiyesi ilk
 * hareketin kendisine eşit çıkar ve `carried_balance` şeridinin (T2
 * `mu-carried-balance`) hiç basılmadığı bir ekran dondurulurdu.
 */
const ACCOUNTING_CARRIED_BALANCE = "1250000.00";

/** Defter tohumu — 🔴 KRONOLOJİK (ASC) yazılır; yanıt DESC döner. */
interface LedgerSeed {
  readonly entryId: string;
  readonly status: components["schemas"]["JournalEntryStatus"];
  readonly date: string;
  readonly code: string;
  readonly description: string;
  readonly detailNote: string | null;
  readonly debit: string;
  readonly credit: string;
}

/**
 * E8:110-157'nin ALTI satırı, tarihe göre ESKİDEN YENİYE.
 *
 * 🔴 `running_balance` mockup'tan KOPYALANMAZ: E8'in `Bakiye` sütunu
 * göstermeliktir (tarih DESC iken artıp düşer, hiçbir aritmetiği tutmaz) ve
 * backend `ledger.py` bunu kendi docstring'inde yazar. Kural YAPIDAN okunur:
 *
 *     running = carried + Σ(debit − credit)   [ASC kümülatif]
 *
 * 🔴 Bir satır `reversed` fişindir (E8:120 · `320.04`): `reversed` DEFTERDE
 * KALIR (`POSTING_STATUSES`), yalnız `draft` girmez. Fikstürde hiç `reversed`
 * satır olmasaydı istemcinin "yeniden SÜZMÜYOR" iddiası hiç ölçülmezdi.
 */
const ACCOUNTING_LEDGER_SEEDS: readonly LedgerSeed[] = [
  {
    entryId: "je-2607-post-4", status: "posted", date: "2026-07-10", code: "391.01",
    description: "KDV Ödemesi – Q2 2026", detailNote: "Vergi Dairesi",
    debit: "605300.00", credit: "0.00",
  },
  {
    entryId: "je-2607-post-3", status: "posted", date: "2026-07-12", code: "120.01",
    description: "Avans Tahsilatı – Çelik OSB", detailNote: "İş Bank · TRF-20260712",
    debit: "0.00", credit: "580000.00",
  },
  {
    entryId: "je-2607-post-2", status: "posted", date: "2026-07-14", code: "730.01",
    description: "Bordro – Temmuz İşçilik", detailNote: "48 personel · SGK dahil",
    debit: "892000.00", credit: "0.00",
  },
  {
    entryId: "je-2607-post-5", status: "posted", date: "2026-07-15", code: "153.01",
    description: "Malzeme Satın Alma – Demir", detailNote: "Demirsan A.Ş · F-2026-1122",
    debit: "328500.00", credit: "0.00",
  },
  {
    entryId: "je-2607-rev-1", status: "reversed", date: "2026-07-16", code: "320.04",
    description: "Taşeron Ödemesi – Akın İnşaat", detailNote: "Fatura No: AKN-2026-047",
    debit: "1016800.00", credit: "0.00",
  },
  {
    entryId: "je-2607-post-1", status: "posted", date: "2026-07-17", code: "120.01",
    description: "Hakediş Tahsilatı – Güneşkent", detailNote: "Ziraat Bank · TRF-20260717",
    debit: "0.00", credit: "1240000.00",
  },
];

/** Kümülatif bakiyeyi KURARAK satırları üretir; yanıt DESC'tir (ledger.py R2). */
function buildAccountingLedgerRows(): MockLedgerRow[] {
  let running = Number(ACCOUNTING_CARRIED_BALANCE);
  const ascending = ACCOUNTING_LEDGER_SEEDS.map((seed) => {
    running += Number(seed.debit) - Number(seed.credit);
    const account = chartAccountByCode(seed.code);
    const row: MockLedgerRow = {
      entry_id: seed.entryId,
      entry_date: seed.date,
      entry_status: seed.status,
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      description: seed.description,
      detail_note: seed.detailNote,
      debit: seed.debit,
      credit: seed.credit,
      running_balance: running.toFixed(2),
    };
    return row;
  });
  return ascending.reverse();
}

const ACCOUNTING_LEDGER_ROWS: readonly MockLedgerRow[] = buildAccountingLedgerRows();

/**
 * 🔴 ÖZET DEFTERDEN TÜRETİLİR, mockup'tan KOPYALANMAZ.
 *
 * Gerekçe backend'dedir: `summary.py` ile `ledger.py` AYNI kümeyi sayar
 * (`POSTING_STATUSES` + aynı dönem). E8:80/84'ün rakamları (`3.842.600` /
 * `4.120.000`) çizilmemiş, daha büyük bir satır kümesine aittir ve altı
 * çizili satırla TUTMAZ — elle kopyalansaydı ekranın KPI'ları kendi
 * tablosuyla çelişirdi ve T6 o çelişkiyi baseline'a donduracaktı.
 *
 * Türetilen net NEGATİFtir (altı satır borç ağırlıklıdır) — bu, `netBalanceTone`'un
 * "negatif kırmızı" dalını (şef kararı) gerçekten ölçen tek hâldir.
 */
function buildAccountingSummary(): components["schemas"]["JournalSummaryResponse"] {
  const totalDebit = ACCOUNTING_LEDGER_SEEDS.reduce((sum, seed) => sum + Number(seed.debit), 0);
  const totalCredit = ACCOUNTING_LEDGER_SEEDS.reduce((sum, seed) => sum + Number(seed.credit), 0);
  return {
    year: ACCOUNTING_PERIOD.year,
    month: ACCOUNTING_PERIOD.month,
    total_debit: totalDebit.toFixed(2),
    total_credit: totalCredit.toFixed(2),
    // 🔴 `net_balance = ALACAK − BORÇ` (şema notu; E8:88 aritmetiğinin yönü).
    net_balance: (totalCredit - totalDebit).toFixed(2),
  };
}

const ACCOUNTING_SUMMARY = buildAccountingSummary();

// --- Fişler --------------------------------------------------------------

/** Fiş tohumu; toplamlar SUNUCU gibi bacaklardan TÜRETİLİR (elle yazılmaz). */
interface JournalEntrySeed {
  readonly id: string;
  readonly date: string;
  readonly status: components["schemas"]["JournalEntryStatus"];
  readonly description: string;
  readonly detailNote?: string | null;
  readonly reversalOfId?: string | null;
  /** `[hesap kodu, borç, alacak]` üçlüleri. */
  readonly legs: readonly (readonly [string, string, string])[];
}

function buildJournalEntry(seed: JournalEntrySeed): MockJournalEntry {
  const lines: MockJournalLine[] = seed.legs.map(([code, debit, credit], index) => {
    const account = chartAccountByCode(code);
    return {
      id: `${seed.id}-l${index}`,
      sort_order: index,
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      debit,
      credit,
    };
  });
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);
  // 🔴 K1: dengesiz bir fiş SUNUCUDA var olamaz — fikstür de olamaz.
  if (Math.abs(totalDebit - totalCredit) > 1e-9) {
    throw new Error(`Fikstür fişi dengesiz: ${seed.id}`);
  }
  const [year, month] = seed.date.split("-");
  return {
    id: seed.id,
    entry_date: seed.date,
    // 🔴 Dönem `entry_date`ten TÜRER (`ck_journal_entries_period_matches_date`).
    period_year: Number(year),
    period_month: Number(month),
    description: seed.description,
    detail_note: seed.detailNote ?? null,
    status: seed.status,
    total_debit: totalDebit.toFixed(2),
    total_credit: totalCredit.toFixed(2),
    reversal_of_id: seed.reversalOfId ?? null,
    created_by_id: ME.id,
    created_at: ACCOUNTING_STAMP,
    updated_at: ACCOUNTING_STAMP,
    lines,
  };
}

/**
 * TEMMUZ (okuma) fişleri — 🔴 HİÇBİR test bunları oynatmaz.
 *
 * Üç durumun HEPSİ temsil edilir: iki `draft` (panel dolsun), üç `posted`
 * (biri STORNO: `reversal_of_id` dolu) ve bir `reversed`. Yalnız `draft`
 * bulunsaydı `entryActions`ın posted/reversed dalları ekranda hiç ölçülmezdi.
 */
const ACCOUNTING_READ_ENTRY_SEEDS: readonly JournalEntrySeed[] = [
  {
    id: "je-2607-draft-2", date: "2026-07-19", status: "draft",
    description: "Ofis Kira Gideri – Temmuz",
    legs: [["760", "48000.00", "0.00"], ["102", "0.00", "48000.00"]],
  },
  {
    id: "je-2607-draft-1", date: "2026-07-18", status: "draft",
    description: "Kasa Sayım Farkı", detailNote: "Temmuz sayım tutanağı",
    legs: [["100", "12500.00", "0.00"], ["600", "0.00", "12500.00"]],
  },
  {
    id: "je-2607-post-1", date: "2026-07-17", status: "posted",
    description: "Hakediş Tahsilatı – Güneşkent", detailNote: "Ziraat Bank · TRF-20260717",
    legs: [["102", "1240000.00", "0.00"], ["120.01", "0.00", "1240000.00"]],
  },
  {
    // Stornonun KENDİSİ: `posted` doğar ve orijinali gösterir (K2).
    id: "je-2607-storno-1", date: "2026-07-16", status: "posted",
    description: "Storno: Taşeron Ödemesi – Akın İnşaat", reversalOfId: "je-2607-rev-1",
    legs: [["102", "1016800.00", "0.00"], ["320.04", "0.00", "1016800.00"]],
  },
  {
    // Terslenen ORİJİNAL — `reversed` TERMİNALDİR, hiçbir eylem sunulmaz.
    id: "je-2607-rev-1", date: "2026-07-16", status: "reversed",
    description: "Taşeron Ödemesi – Akın İnşaat", detailNote: "Fatura No: AKN-2026-047",
    legs: [["320.04", "1016800.00", "0.00"], ["102", "0.00", "1016800.00"]],
  },
];

/**
 * 🔒 HAZİRAN (yazma) fişleri — her mutasyon AKIŞI KENDİ kaydına sahiptir.
 *
 * Tek bir "mutasyon fişi" paylaşılsaydı `fullyParallel` altında iki test aynı
 * kaydın durumunu yarıştırırdı (F-FAT2'nin ÖLÇÜLMÜŞ `inv-in-2` yarışı).
 */
const ACCOUNTING_MUTATION_ENTRY_SEEDS: readonly JournalEntrySeed[] = [
  {
    id: "je-2606-mut-post", date: "2026-06-10", status: "draft",
    description: "MUT · kayıtlaştırma ölçümü",
    legs: [["100", "1000.00", "0.00"], ["600", "0.00", "1000.00"]],
  },
  {
    id: "je-2606-mut-delete", date: "2026-06-11", status: "draft",
    description: "MUT · silme ölçümü",
    legs: [["100", "2000.00", "0.00"], ["600", "0.00", "2000.00"]],
  },
  {
    id: "je-2606-mut-edit", date: "2026-06-12", status: "draft",
    description: "MUT · düzenleme ölçümü", detailNote: "İlk dayanak",
    legs: [["100", "3000.00", "0.00"], ["600", "0.00", "3000.00"]],
  },
  {
    id: "je-2606-mut-reverse", date: "2026-06-13", status: "posted",
    description: "MUT · storno ölçümü",
    legs: [["100", "4000.00", "0.00"], ["600", "0.00", "4000.00"]],
  },
];

/**
 * 🔴 MUHASEBE DURUMU YAZILABİLİRDİR → fikstürler KOPYALANARAK modül düzeyinde
 * tutulur (fatura emsali).
 *
 * `hiddenAccountIds`: e2e'de OLUŞTURULAN hesaplar katalog listesinden
 * DÜŞÜRÜLÜR (`dropCreatedSuppliers`/`hiddenFromLists` emsali). Gerekçe:
 * hesap planının dönem süzgeci YOKTUR, dolayısıyla fişlerdeki "ayrı ay"
 * kaçışı burada mümkün değildir — yeni satır T6'nın HP kadrajına ve E8'in
 * hesap açılırına sızardı. Kayıt yine de VARDIR: kimliğinden okunur ve
 * `q` araması onu BULUR (yaratma akışı böylece uçtan uca kanıtlanır).
 */
const accountingState: {
  accounts: MockChartAccount[];
  entries: MockJournalEntry[];
  hiddenAccountIds: Set<string>;
  seq: number;
} = {
  accounts: ACCOUNTING_CHART_FIXTURES.map((account) => ({ ...account })),
  entries: [...ACCOUNTING_READ_ENTRY_SEEDS, ...ACCOUNTING_MUTATION_ENTRY_SEEDS].map(
    buildJournalEntry,
  ),
  hiddenAccountIds: new Set<string>(),
  seq: 0,
};

/** `codes.py::ACCOUNT_CODE_PATTERN` BİREBİR. */
const ACCOUNTING_CODE_PATTERN = /^(?:[1-9][0-9]|[1-9][0-9]{2}(?:\.[0-9]{2})?)$/;

/**
 * Hesaba bağlı fiş satırı VAR MI? — kod kilidinin (409) ve silme engelinin
 * (409) TEK ölçütü. `draft` fişin satırı da sayılır: sunucu FK'ya bakar,
 * duruma değil.
 */
function accountingHasLines(accountId: string): boolean {
  return accountingState.entries.some((entry) =>
    entry.lines.some((line) => line.account_id === accountId),
  );
}

/** Fiş künyesi = detay eksi `lines` (liste ucu `JournalEntryResponse` döner). */
function journalEntryHeader(
  entry: MockJournalEntry,
): components["schemas"]["JournalEntryResponse"] {
  const { lines: _lines, ...header } = entry;
  return header;
}

/** Bacak gövdelerini yanıt satırlarına çevirir; toplamlar SUNUCUDA türer (K1). */
function applyJournalLines(
  entry: MockJournalEntry,
  rawLines: Record<string, unknown>[],
): { detail?: string } {
  if (rawLines.length < 2) return { detail: "Fişte en az iki satır olmalıdır." };
  const lines: MockJournalLine[] = [];
  for (const [index, raw] of rawLines.entries()) {
    if ("sort_order" in raw || "id" in raw) {
      return { detail: "`sort_order` gövdeden gönderilemez." };
    }
    const account = accountingState.accounts.find((row) => row.id === raw.account_id);
    if (account === undefined) return { detail: "Hesap bulunamadı." };
    const debit = Number(raw.debit);
    const credit = Number(raw.credit);
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
      return { detail: "Tutar geçerli bir sayı olmalıdır (negatif olamaz)." };
    }
    // 🔴 `ck_journal_lines_single_side`: bir bacak TEK TARAFLIDIR.
    if (debit > 0 === credit > 0) {
      return { detail: "Fiş satırı ya borç ya alacak taşır; ikisi birden ya da ikisi de boş olamaz." };
    }
    lines.push({
      id: `${entry.id}-l${index}`,
      sort_order: index,
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      debit: debit.toFixed(2),
      credit: credit.toFixed(2),
    });
  }
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit), 0);
  if (Math.abs(totalDebit - totalCredit) > 1e-9) {
    return { detail: "Fiş dengede değil: borç ve alacak toplamları eşit olmalıdır." };
  }
  entry.lines = lines;
  entry.total_debit = totalDebit.toFixed(2);
  entry.total_credit = totalCredit.toFixed(2);
  return {};
}

// --- F-MU2 T5 · Mizan + KDV fikstürleri ----------------------------------
// Bu blok dosyanın SONUNA eklendi (paralel dallarla birleştirme çakışmasını
// en aza indirmek için; F-FAT2 emsali). Modül değerlendirmesi
// `startMockBackend` çağrısından ÖNCE biter.
//
// 🔴 YANIT GÖVDELERİ ŞEMAYLA ANOTASYONLUDUR: mock ↔ `schema.d.ts` kayması
// `pnpm typecheck`te patlar (F-SA kanonu) — sessizce eskiyen bir fikstür,
// gerçek uçla uyuşmayan bir kareyi baseline'a sokardı.

type MockTrialBalance = components["schemas"]["TrialBalanceResponse"];
type MockTrialBalanceRow = components["schemas"]["TrialBalanceRow"];
type MockTrialBalanceTotals = components["schemas"]["TrialBalanceTotals"];
type MockVatReturn = components["schemas"]["VatReturnResponse"];

/** Satır tohumu — kapanış İKİLİSİ tohumdan TÜRETİLİR, elle yazılmaz. */
interface TrialBalanceSeed {
  readonly code: string;
  readonly name: string;
  readonly openingDebit?: number;
  readonly openingCredit?: number;
  readonly periodDebit?: number;
  readonly periodCredit?: number;
}

/**
 * 🔴 Kapanış NET'tir: `net = (açılış borç − açılış alacak) + (dönem borç −
 * dönem alacak)`; pozitifse BORÇ tarafı, negatifse ALACAK tarafı dolar, öbürü
 * `0.00` kalır. Elle yazılsaydı fikstür kendi içinde çelişebilir ve ekranın
 * "satır-içi aritmetik" iddiasını sahte kılardı.
 *
 * `period_*` BRÜT kalır (ikisi birden dolu olabilir) — mockup MZ:85-86'nın
 * kanıtladığı ayrım budur.
 */
function trialBalanceRow(seed: TrialBalanceSeed): MockTrialBalanceRow {
  const openingDebit = seed.openingDebit ?? 0;
  const openingCredit = seed.openingCredit ?? 0;
  const periodDebit = seed.periodDebit ?? 0;
  const periodCredit = seed.periodCredit ?? 0;
  const net = openingDebit - openingCredit + periodDebit - periodCredit;
  return {
    account_id: `tb-${seed.code}`,
    account_code: seed.code,
    account_name: seed.name,
    opening_debit: openingDebit.toFixed(2),
    opening_credit: openingCredit.toFixed(2),
    period_debit: periodDebit.toFixed(2),
    period_credit: periodCredit.toFixed(2),
    closing_debit: (net > 0 ? net : 0).toFixed(2),
    closing_credit: (net < 0 ? -net : 0).toFixed(2),
  };
}

/** Altı kolonun AYRI toplamı (MZ:161-171 `GENEL TOPLAM`). */
function trialBalanceTotals(rows: readonly MockTrialBalanceRow[]): MockTrialBalanceTotals {
  const sum = (pick: (row: MockTrialBalanceRow) => string) =>
    rows.reduce((total, row) => total + Number(pick(row)), 0).toFixed(2);
  return {
    opening_debit: sum((row) => row.opening_debit),
    opening_credit: sum((row) => row.opening_credit),
    period_debit: sum((row) => row.period_debit),
    period_credit: sum((row) => row.period_credit),
    closing_debit: sum((row) => row.closing_debit),
    closing_credit: sum((row) => row.closing_credit),
  };
}

function trialBalance(year: number, month: number, seeds: readonly TrialBalanceSeed[]): MockTrialBalance {
  const rows = seeds.map(trialBalanceRow);
  const totals = trialBalanceTotals(rows);
  return {
    year,
    month,
    // 🔴 Denge SUNUCUNUN kararıdır ve TOPLAMLARDAN türer — fikstür bunu elle
    // `true`ya sabitleseydi, ekranın dengesiz dalı hiç ölçülemezdi.
    is_balanced: totals.closing_debit === totals.closing_credit,
    rows,
    totals,
  };
}

/**
 * 📅 TEMMUZ 2026 — DENGELİ mizan (Mizan ekranının varsayılan dönemi,
 * `ACCOUNTING_READ_TIME` ile aynı ay).
 *
 * 🔴 K3: mockup'ın sekiz satırı DENGESİZDİR (ölçüldü: kapanış toplamları
 * 21.729.500 / 27.466.500 iken tfoot ikisine de 47.284.520 yazıyor; öbür dört
 * toplam ise satırlarla TUTUYOR). Yani mockup 8 hesaplık EKSİK BİR KESİTtir ve
 * tasarım niyeti — tfoot'un iki kapanışı EŞİT basması — DENGELİ mizandır.
 * Fikstür bu yüzden mockup'ın rakamlarını KOPYALAMAZ: yapı, sütun semantiği ve
 * satır sayısı mertebesi alınır, eksik kalan 5.737.000'lik borç tarafı
 * `253 Tesis, Makine ve Cihazlar` satırıyla tamamlanır.
 */
const TRIAL_BALANCE_JULY_SEEDS: readonly TrialBalanceSeed[] = [
  // Açılış NET borç + dönem BRÜT (İKİ taraf dolu) — MZ:80-89.
  { code: "100", name: "Kasa", openingDebit: 180_000, periodDebit: 2_640_000, periodCredit: 2_535_200 },
  { code: "102", name: "Bankalar", openingDebit: 1_200_000, periodDebit: 12_840_000, periodCredit: 10_075_300 },
  { code: "120", name: "Alıcılar", openingDebit: 3_200_000, periodDebit: 24_870_500, periodCredit: 19_670_500 },
  { code: "150", name: "İlk Madde ve Malzeme", openingDebit: 1_800_000, periodDebit: 8_440_000, periodCredit: 7_000_000 },
  // K3 — mockup'ın eksik bıraktığı borç tarafı.
  { code: "253", name: "Tesis, Makine ve Cihazlar", periodDebit: 5_737_000 },
  // Açılış NET alacak + dönem BRÜT + kapanış NET ALACAK — MZ:120-129.
  { code: "320", name: "Satıcılar", openingCredit: 840_000, periodDebit: 6_120_000, periodCredit: 7_464_000 },
  // Açılışı HİÇ olmayan hesap: dört hücre birden `—` — MZ:130-139.
  { code: "391", name: "Hesaplanan KDV", periodCredit: 412_000 },
  { code: "600", name: "Yurt İçi Satışlar", periodCredit: 24_870_500 },
  { code: "730", name: "Genel Üretim Giderleri", periodDebit: 5_840_000 },
];

/**
 * 📅 OCAK 2026 — DENGESİZ mizan (K2'nin çizilmemiş dalı; `ACCOUNTING_EMPTY_TIME`
 * ile aynı ay). Yevmiye defterinin BOŞ dönemiyle çakışmaz: o kare `/muhasebe`
 * kökündedir ve defter/özet/fiş uçlarına bakar, `/trial-balance`e DEĞİL.
 *
 * Kapanış toplamları 140.000 ↔ 280.000 ⇒ `is_balanced` YANLIŞ, fark 140.000.
 */
const TRIAL_BALANCE_JANUARY_SEEDS: readonly TrialBalanceSeed[] = [
  { code: "100", name: "Kasa", openingDebit: 50_000, periodDebit: 120_000, periodCredit: 30_000 },
  { code: "320", name: "Satıcılar", openingCredit: 20_000, periodCredit: 60_000 },
  { code: "600", name: "Yurt İçi Satışlar", periodCredit: 200_000 },
];

/** `(yıl, ay)` → mizan. Anahtar dışındaki her dönem BOŞ ve dengelidir. */
export function trialBalanceFixture(year: number, month: number): MockTrialBalance {
  if (year === 2026 && month === 7) return trialBalance(year, month, TRIAL_BALANCE_JULY_SEEDS);
  if (year === 2026 && month === 1) return trialBalance(year, month, TRIAL_BALANCE_JANUARY_SEEDS);
  return trialBalance(year, month, []);
}

/**
 * KDV beyanının vadesi: İZLEYEN ayın 28'i (mockup KDV:45 Haziran ↔ :68
 * `28.07.2026`). Fatura verisine DEĞİL takvime bağlıdır — boş dönemde bile
 * doludur (şema notu).
 */
function vatDueDate(year: number, month: number): string {
  const dueYear = month === 12 ? year + 1 : year;
  const dueMonth = month === 12 ? 1 : month + 1;
  return `${dueYear}-${String(dueMonth).padStart(2, "0")}-28`;
}

/**
 * 🔴 DONMUŞ HARİTA — `accountingState`ten TÜRETİLMEZ.
 *
 * Gerekçe ölçülmüştür: KDV ekranının varsayılan dönemi ÖNCEKİ AYDIR ve okuma
 * saatinde (Temmuz 2026) bu HAZİRAN'a düşer — yani tam da yazma akışlarının
 * koştuğu MUTASYON ADASINA. Fikstür fişlerden türetilseydi, bir "fiş oluştur"
 * testi `fullyParallel` altında KDV karesini oynatırdı ve kimse nedenini
 * bulamazdı. Bekçisi `accounting-reports.spec.ts`te: mutasyondan ÖNCE ve
 * SONRA alınan yanıt BİREBİR aynı olmalıdır.
 */
const VAT_RETURN_FIXTURES: readonly MockVatReturn[] = [
  // 📅 HAZİRAN 2026 — ÖDENECEK dalı (mockup dalı; okuma saatinin varsayılanı).
  {
    year: 2026,
    month: 6,
    due_date: "2026-07-28",
    // İki oran satırı: `Tablo 1` çok oranlı dönemi de basabilmeli.
    taxable_rows: [
      { rate: "20.00", base: "4120000.00", vat: "824000.00" },
      { rate: "10.00", base: "1000000.00", vat: "100000.00" },
    ],
    // 🔴 SIFIR DEĞİL: sıfırken "istisna matrahı toplama dâhil mi" sorusu
    // AYIRT EDİLEMEZ (iki okuma da aynı sayıyı verir). Matrah toplamı bu
    // fikstürde 4.120.000 + 1.000.000 + 500.000 = 5.620.000'dir.
    exempt_base: "500000.00",
    calculated_vat: "924000.00",
    // 🔴 Sunucu TEK satır döner (`vat_return.py:125`); mockup'ın Mal/Hizmet
    // ayrımının veri modelinde karşılığı YOKTUR — fikstür de uydurmaz.
    deductions: [{ source: "Alışlar", base: "2060500.00", vat: "412000.00" }],
    deductible_vat: "412000.00",
    payable: "512000.00", // 924.000 − 412.000
    carried_forward: "0.00",
  },
  // 📅 OCAK 2026 — DEVREDEN dalı (K1'in çizilmemiş dalı). Ekran bu dönemi
  // ŞUBAT saatinde gösterir (beyanname önceki ayındır).
  {
    year: 2026,
    month: 1,
    due_date: "2026-02-28",
    taxable_rows: [{ rate: "20.00", base: "900000.00", vat: "180000.00" }],
    // Burada SIFIRDIR: K7'nin "bu ekranda `0` yazılır" kuralı kadrajda ölçülür.
    exempt_base: "0.00",
    calculated_vat: "180000.00",
    deductions: [{ source: "Alışlar", base: "2600000.00", vat: "520000.00" }],
    deductible_vat: "520000.00",
    payable: "0.00",
    carried_forward: "340000.00", // 520.000 − 180.000
  },
];

/**
 * `(yıl, ay)` → beyanname. Haritada olmayan dönem her yeri `0` basar ama
 * `due_date` YİNE doludur (şema notu) — "boş dönem" bir hata değil, geçerli
 * bir beyandır.
 */
export function vatReturnFixture(year: number, month: number): MockVatReturn {
  const found = VAT_RETURN_FIXTURES.find(
    (fixture) => fixture.year === year && fixture.month === month,
  );
  if (found !== undefined) return found;
  return {
    year,
    month,
    due_date: vatDueDate(year, month),
    taxable_rows: [],
    exempt_base: "0.00",
    calculated_vat: "0.00",
    deductions: [],
    deductible_vat: "0.00",
    payable: "0.00",
    carried_forward: "0.00",
  };
}

// --- F-MT T5 · Bilanço + Nakit Akış Tablosu fikstürleri -------------------
// Bu blok dosyanın SONUNA eklendi (paralel dallarla birleştirme çakışmasını
// en aza indirmek için; F-FAT2/F-MU2 emsali). Modül değerlendirmesi
// `startMockBackend` çağrısından ÖNCE biter, bu yüzden yukarıdaki istek
// işleyicisi bunlara güvenle erişir.
//
// 🔴 DONMUŞ HARİTALAR — `accountingState`ten TÜRETİLMEZ. Gerekçe F-MU2 ile
// AYNI: yazma akışları HAZİRAN'da (mutasyon adası) koşar ve `fullyParallel`
// altında dosya içi sıra bile garanti değildir; türetilen bir fikstür bu iki
// ekranın karesini sessizce oynatırdı.
//
// 🔴 YANIT GÖVDELERİ ŞEMAYLA ANOTASYONLUDUR: mock ↔ `schema.d.ts` kayması
// `pnpm typecheck`te patlar (F-SA kanonu) — sessizce eskiyen bir fikstür,
// gerçek uçla uyuşmayan bir kareyi baseline'a sokardı.

type MockBalanceSheet = components["schemas"]["BalanceSheetResponse"];
type MockBalanceSheetSide = components["schemas"]["BalanceSheetSide"];
type MockBalanceSheetSection = components["schemas"]["BalanceSheetSection"];
type MockBalanceSheetLine = components["schemas"]["BalanceSheetLine"];
type MockCashFlowStatement = components["schemas"]["CashFlowStatementResponse"];
type MockCashFlowSection = components["schemas"]["CashFlowStatementSection"];
type MockCashFlowLine = components["schemas"]["CashFlowStatementLine"];
type MockMonthlyCashPoint = components["schemas"]["MonthlyCashPoint"];

/**
 * 🔴🔴 TEK KAYNAK KURALI (MT yönetim kararı K5/4 · ürün kararı KK-2).
 *
 * Bilanço'nun `Kasa ve Bankalar` kalemi ile Nakit Akış Tablosu'nun
 * `closing_cash`i ÜRÜNDE aynı hesap grubundan (10) türer — yani zorunlu olarak
 * EŞİTtirler. Mockup'lar burada BİRBİRİYLE ÇELİŞİYOR (BL:51 `4.249.500` ↔
 * NA:109 `6.249.500`); bu bir mockup artefaktıdır ve fikstüre TAŞINMAZ.
 *
 * Seçilen değer NA'nınkidir çünkü NA tablosu KENDİ İÇİNDE tutarlıdır
 * (`2.447.500 + 3.802.000 = 6.249.500`, NA:101/105/109) — BL'nin rakamını
 * seçmek NA'nın üç satırlık kapanışını bozardı. Bilanço tarafında karşılığı
 * `Dönem Net Kârı` kaleminde dengelenir (aşağıda ölçüsü yazılı).
 *
 * İki taraf da BU sabitten okur; ayrıca `financial-statements.spec.ts` eşitliği
 * İKİ EKRANIN BASILMIŞ HÂLİNDEN ölçer (tek taraflı bir düzenleme kırmızı olur).
 */
const GROUP_10_CASH_JULY = 6_249_500;

/** Aynı kural DENGESİZ (Ocak) dalında da geçerlidir. */
const GROUP_10_CASH_JANUARY = 1_200_000;

/* ---------------- Bilanço ---------------- */

interface BalanceSheetLineSeed {
  readonly key: string;
  readonly label: string;
  readonly amount: number;
  readonly accountCodes: readonly string[];
  readonly groupCodes: readonly string[];
}

interface BalanceSheetSectionSeed {
  readonly key: string;
  readonly title: string;
  readonly subtotalLabel: string;
  readonly lines: readonly BalanceSheetLineSeed[];
}

interface BalanceSheetSideSeed {
  readonly key: string;
  readonly title: string;
  readonly totalLabel: string;
  readonly sections: readonly BalanceSheetSectionSeed[];
}

function balanceSheetLine(seed: BalanceSheetLineSeed): MockBalanceSheetLine {
  return {
    key: seed.key,
    label: seed.label,
    amount: seed.amount.toFixed(2),
    account_codes: [...seed.accountCodes],
    group_codes: [...seed.groupCodes],
  };
}

/** 🔴 `subtotal` KALEMLERDEN toplanır (şema notu) — elle yazılmaz. */
function balanceSheetSection(seed: BalanceSheetSectionSeed): MockBalanceSheetSection {
  const lines = seed.lines.map(balanceSheetLine);
  return {
    key: seed.key,
    title: seed.title,
    subtotal_label: seed.subtotalLabel,
    subtotal: lines.reduce((total, line) => total + Number(line.amount), 0).toFixed(2),
    lines,
  };
}

/** 🔴 `total` ARA TOPLAMLARDAN toplanır. */
function balanceSheetSide(seed: BalanceSheetSideSeed): MockBalanceSheetSide {
  const sections = seed.sections.map(balanceSheetSection);
  return {
    key: seed.key,
    title: seed.title,
    total_label: seed.totalLabel,
    total: sections.reduce((total, section) => total + Number(section.subtotal), 0).toFixed(2),
    sections,
  };
}

function balanceSheet(
  asOf: string,
  assetsSeed: BalanceSheetSideSeed,
  liabilitiesSeed: BalanceSheetSideSeed,
): MockBalanceSheet {
  const assets = balanceSheetSide(assetsSeed);
  const liabilities = balanceSheetSide(liabilitiesSeed);
  return {
    as_of: asOf,
    // 🔴 ÖLÇÜLÜR, `true` SABİTLENMEZ (şema notu + `trialBalance()` emsali):
    // sabitlenseydi K3'ün dengesiz dalı YAPISAL olarak ölçülemez olurdu.
    is_balanced: assets.total === liabilities.total,
    assets,
    liabilities,
  };
}

// --- F-IZN T6 · İzin yönetimi fikstürleri ---------------------------------
// Yedi uç: `GET /leave-types` · `GET,POST /leave-requests` ·
// `GET,PATCH,DELETE /leave-requests/{id}` · `POST .../approve` ·
// `POST .../reject` · `GET,PUT /leave-balances/{personnel_id}/{year}` ·
// `GET /hr/leaves/summary`.
//
// 🔴 KADROYA DOKUNULMADI: izin kayıtları MEVCUT `per-1…per-6` personeline
// bağlanır. Yeni personel eklemek `personnel-list-visual.spec.ts`in "toplam
// TAM 6" iddiasını ve puantaj baseline'larını kırardı.

type MockLeaveType = components["schemas"]["LeaveTypeResponse"];
type MockLeaveRequest = components["schemas"]["LeaveRequestResponse"];
type MockLeaveBalance = components["schemas"]["LeaveBalanceResponse"];
type MockLeaveStatus = components["schemas"]["LeaveStatus"];

/** Bakiye/talep fikstürlerinin yılı — İZ ekranının varsayılan yılı. */
const LEAVE_YEAR = 2026;

/**
 * `GET /leave-types` — talep formunun tip seçeneği (T 110-119) ve rozetleri.
 *
 * Dizi `sort_order` sırasındadır (sunucu da böyle döner). `Hastalık İzni`
 * `requires_document: true`dur — formun KOŞULLU BELGE dalı (KARAR 3) ancak
 * böyle bir tip varsa ölçülebilir. Renkler DOLU: rozetin `--iz-type-color`
 * değişkeni sunucudan gelir, kodda çıplak hex durmaz.
 */
const LEAVE_TYPE_FIXTURES: readonly MockLeaveType[] = [
  { id: "lt-1", name: "Yıllık İzin", deducts_from_annual: true, is_paid: true, requires_document: false, color: "#3b82f6", sort_order: 1 },
  { id: "lt-2", name: "Hastalık İzni", deducts_from_annual: false, is_paid: true, requires_document: true, color: "#ef4444", sort_order: 2 },
  { id: "lt-3", name: "Ücretsiz İzin", deducts_from_annual: false, is_paid: false, requires_document: false, color: "#94a3b8", sort_order: 3 },
  { id: "lt-4", name: "Mazeret İzni", deducts_from_annual: true, is_paid: true, requires_document: false, color: "#f59e0b", sort_order: 4 },
];

function leaveTypeFixture(id: string): MockLeaveType | undefined {
  return LEAVE_TYPE_FIXTURES.find((type) => type.id === id);
}

function leavePersonnelFixture(id: string): MockPersonnel {
  const found = PERSONNEL_FIXTURES.find((person) => person.id === id);
  // Fikstür bütünlüğü DERLEME DEĞİL ÇALIŞMA zamanında kırılır: kimlik değişirse
  // sahte backend sessizce "bilinmeyen personel" basmasın.
  if (found === undefined) throw new Error(`İzin fikstürü bilinmeyen personele bağlı: ${id}`);
  return found;
}

const LEAVE_MS_PER_DAY = 86_400_000;

/** Sunucunun `calculate_leave_days` ikizi: takvim günü, iki uç DAHİL. */
function leaveDayCount(startDate: string, endDate: string): number | null {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return (end - start) / LEAVE_MS_PER_DAY + 1;
}

/**
 * 🔒 BAKİYE FİKSTÜRÜ SABİTTİR (`HR_DOCUMENTS_SUMMARY_FIXTURE` emsali).
 *
 * `used`/`remaining` onaylanan taleplerden TÜRETİLSEYDİ, bu dosyadaki onay
 * akışı `fullyParallel` altında bakiye tablosunun kadrajını sessizce
 * oynatırdı. Sunucuda türevdir; sahte backend'de DONDURULMUŞTUR ve gerekçe
 * budur.
 *
 * ⚠️ `hire_date` burada DOLUdur ama `PERSONNEL_FIXTURES`ta NULL'dır: personel
 * fikstürüne tarih eklemek personel detay/liste baseline'larını kırardı
 * (F-IZN T6 dokunma yasağı). Bilinçli, dilim-içi bir sapmadır.
 *
 * Kapsanan dallar (İZ 122-171):
 *  · per-1 — normal satır
 *  · per-2 — devreden > 0 ⇒ "yanma riski" (151-158)
 *  · per-3 — kalan 2 ⇒ lv-2'nin HAK AŞIMI satırını üretir (91-99)
 *  · per-4 — kalan 3 ⇒ lv-3'ün SINIR GÜNÜ satırını üretir (`<` ≠ `<=`)
 *  · per-5 — hak/kalan/yüzde NULL ⇒ "Hak yok" + "1 yıl dolunca..." (161-167)
 *  · per-6 — LİSTEDE YOK ⇒ lv-5'in "bilinmiyor" (—) hücresi (K4)
 */
const LEAVE_BALANCE_FIXTURES: readonly MockLeaveBalance[] = [
  { personnel_id: "per-1", personnel_name: leavePersonnelFixture("per-1").full_name, year: LEAVE_YEAR, hire_date: "2019-04-15", seniority_years: 7, seniority_months: 3, annual_entitlement: 20, carried_over: "0.00", used: 8, remaining: "12.00", usage_pct: 40 },
  { personnel_id: "per-2", personnel_name: leavePersonnelFixture("per-2").full_name, year: LEAVE_YEAR, hire_date: "2023-02-01", seniority_years: 3, seniority_months: 6, annual_entitlement: 14, carried_over: "6.00", used: 2, remaining: "18.00", usage_pct: 10 },
  { personnel_id: "per-3", personnel_name: leavePersonnelFixture("per-3").full_name, year: LEAVE_YEAR, hire_date: "2021-09-10", seniority_years: 4, seniority_months: 10, annual_entitlement: 14, carried_over: "0.00", used: 12, remaining: "2.00", usage_pct: 85.7 },
  { personnel_id: "per-4", personnel_name: leavePersonnelFixture("per-4").full_name, year: LEAVE_YEAR, hire_date: "2018-06-01", seniority_years: 8, seniority_months: 2, annual_entitlement: 20, carried_over: "2.00", used: 19, remaining: "3.00", usage_pct: 86.4 },
  // 🔴 Kıdemi 1 yılı DOLDURMADI: hak/kalan/yüzde ÜÇÜ DE NULL (İZ 161-167).
  { personnel_id: "per-5", personnel_name: leavePersonnelFixture("per-5").full_name, year: LEAVE_YEAR, hire_date: "2026-03-01", seniority_years: 0, seniority_months: 5, annual_entitlement: null, carried_over: "0.00", used: 0, remaining: null, usage_pct: null },
];

function leaveBalanceFixture(personnelId: string): MockLeaveBalance | undefined {
  return LEAVE_BALANCE_FIXTURES.find((balance) => balance.personnel_id === personnelId);
}

interface LeaveRequestSeed {
  readonly id: string;
  readonly personnelId: string;
  readonly leaveTypeId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly note?: string | null;
  readonly documentId?: string | null;
  readonly createdAt: string;
  readonly status?: MockLeaveStatus;
}

/** `days` SUNUCU hesabıdır — fikstürde de elle yazılmaz, tarihlerden türer. */
function buildLeaveRequest(seed: LeaveRequestSeed): MockLeaveRequest {
  const personnel = leavePersonnelFixture(seed.personnelId);
  const type = leaveTypeFixture(seed.leaveTypeId);
  if (type === undefined) throw new Error(`İzin fikstürü bilinmeyen tipe bağlı: ${seed.leaveTypeId}`);
  const days = leaveDayCount(seed.startDate, seed.endDate);
  if (days === null) throw new Error(`İzin fikstürünün tarihleri ters: ${seed.id}`);
  return {
    id: seed.id,
    personnel_id: personnel.id,
    personnel_name: personnel.full_name,
    personnel_trade: personnel.trade,
    leave_type_id: type.id,
    leave_type_name: type.name,
    leave_type_color: type.color,
    deducts_from_annual: type.deducts_from_annual,
    start_date: seed.startDate,
    end_date: seed.endDate,
    days,
    note: seed.note ?? null,
    document_id: seed.documentId ?? null,
    status: seed.status ?? "pending",
    decided_by: null,
    decided_at: null,
    reject_reason: null,
    created_at: seed.createdAt,
    updated_at: seed.createdAt,
  };
}

/**
 * 📅 31 TEMMUZ 2026 — DENGELİ bilanço (`ACCOUNTING_READ_TIME`in ürettiği
 * varsayılan gün: `defaultBalanceSheetAsOf` içinde bulunulan AYIN SON günüdür).
 *
 * Sayılar BL:44-63'ten gelir; TEK sapma `Kasa ve Bankalar` (tek kaynak kuralı,
 * yukarı bakınız): 4.249.500 → 6.249.500, yani +2.000.000. Aktif toplam bu
 * kadar büyüdüğü için pasif tarafta `Dönem Net Kârı` da +2.000.000 yapılır
 * (3.512.700 → 5.512.700) ve iki taraf 22.642.220'de buluşur — bilançoyu
 * dengede tutmanın tek dürüst yolu budur.
 */
const BALANCE_SHEET_JULY_ASSETS: BalanceSheetSideSeed = {
  key: "assets",
  title: "AKTİF (Varlıklar)",
  totalLabel: "AKTİF TOPLAM",
  sections: [
    {
      key: "current",
      title: "I. DÖNEN VARLIKLAR",
      subtotalLabel: "Dönen Varlıklar Toplamı",
      lines: [
        // 🔴 TEK KAYNAK — NA'nın `closing_cash`i ile AYNI sabitten okur.
        {
          key: "cash",
          label: "Kasa ve Bankalar",
          amount: GROUP_10_CASH_JULY,
          accountCodes: ["100", "102"],
          groupCodes: ["10"],
        },
        {
          key: "trade-receivables",
          label: "Ticari Alacaklar",
          amount: 8_524_200,
          accountCodes: ["120", "121"],
          groupCodes: ["12"],
        },
        { key: "inventory", label: "Stoklar", amount: 3_240_000, accountCodes: ["150", "153"], groupCodes: ["15"] },
        {
          key: "other-current",
          label: "Diğer Dönen Varlıklar",
          amount: 768_520,
          accountCodes: ["180", "190"],
          groupCodes: ["18", "19"],
        },
      ],
    },
    {
      key: "fixed",
      title: "II. DURAN VARLIKLAR",
      subtotalLabel: "Duran Varlıklar Toplamı",
      lines: [
        // 🔴 K4 — kontra hesap (257) SUNUCUDA netlenir; tek ve POZİTİF satır.
        {
          key: "tangible",
          label: "Maddi Duran Varlıklar (net)",
          amount: 3_620_000,
          accountCodes: ["252", "253", "257"],
          groupCodes: ["25"],
        },
        {
          key: "other-fixed",
          label: "Diğer Duran Varlıklar",
          amount: 240_000,
          accountCodes: ["260", "280"],
          groupCodes: ["26", "28"],
        },
      ],
    },
  ],
};

const BALANCE_SHEET_JULY_LIABILITIES: BalanceSheetSideSeed = {
  key: "liabilities",
  title: "PASİF (Kaynaklar)",
  totalLabel: "PASİF TOPLAM",
  sections: [
    {
      key: "short-term",
      title: "I. KISA VADELİ YÜKÜMLÜLÜKLER",
      subtotalLabel: "Kısa Vadeli Yük. Toplamı",
      lines: [
        { key: "trade-payables", label: "Ticari Borçlar", amount: 2_184_000, accountCodes: ["320"], groupCodes: ["32"] },
        {
          key: "tax-payables",
          label: "Vergi Borçları",
          amount: 696_000,
          accountCodes: ["360", "391"],
          groupCodes: ["36", "39"],
        },
        {
          key: "other-short",
          label: "Diğer Kısa Vadeli Borçlar",
          amount: 480_000,
          accountCodes: ["335", "381"],
          groupCodes: ["33", "38"],
        },
      ],
    },
    {
      key: "long-term",
      title: "II. UZUN VADELİ YÜKÜMLÜLÜKLER",
      subtotalLabel: "Uzun Vadeli Yük. Toplamı",
      lines: [
        { key: "long-loans", label: "Uzun Vadeli Krediler", amount: 2_400_000, accountCodes: ["400"], groupCodes: ["40"] },
      ],
    },
    {
      key: "equity",
      title: "III. ÖZKAYNAKLAR",
      subtotalLabel: "Özkaynaklar Toplamı",
      lines: [
        { key: "capital", label: "Sermaye", amount: 8_000_000, accountCodes: ["500"], groupCodes: ["50"] },
        { key: "retained", label: "Geçmiş Yıllar Kârları", amount: 3_369_520, accountCodes: ["570"], groupCodes: ["57"] },
        // 🔴 Tek kaynak kuralının bilanço tarafındaki KARŞILIĞI: BL:87'nin
        // 3.512.700'ü + 2.000.000 (bkz. `GROUP_10_CASH_JULY` gerekçesi).
        { key: "profit", label: "Dönem Net Kârı", amount: 5_512_700, accountCodes: ["590"], groupCodes: ["59"] },
      ],
    },
  ],
};

/**
 * 📅 31 OCAK 2026 — DENGESİZ bilanço (K3'ün mockup'ta ÇİZİLMEMİŞ dalı; T6
 * `mali-tablolar-bilanco-dengesiz` karesi buradan çekilir).
 *
 * `ACCOUNTING_EMPTY_TIME` (15 Ocak 2026) saatinde ekranın varsayılan günü
 * `2026-01-31`dir — mizanın dengesiz dalıyla AYNI ay, aynı gerekçe. Fark
 * bilerek 140.000'dir (mizanın dengesiz dalıyla aynı büyüklük):
 * `1.500.000 − 1.360.000`.
 */
const BALANCE_SHEET_JANUARY_ASSETS: BalanceSheetSideSeed = {
  key: "assets",
  title: "AKTİF (Varlıklar)",
  totalLabel: "AKTİF TOPLAM",
  sections: [
    {
      key: "current",
      title: "I. DÖNEN VARLIKLAR",
      subtotalLabel: "Dönen Varlıklar Toplamı",
      lines: [
        // 🔴 Tek kaynak kuralı bu dalda da geçerlidir (Ocak nakit akışıyla eşit).
        {
          key: "cash",
          label: "Kasa ve Bankalar",
          amount: GROUP_10_CASH_JANUARY,
          accountCodes: ["100", "102"],
          groupCodes: ["10"],
        },
        {
          key: "trade-receivables",
          label: "Ticari Alacaklar",
          amount: 300_000,
          accountCodes: ["120"],
          groupCodes: ["12"],
        },
      ],
    },
  ],
};

const BALANCE_SHEET_JANUARY_LIABILITIES: BalanceSheetSideSeed = {
  key: "liabilities",
  title: "PASİF (Kaynaklar)",
  totalLabel: "PASİF TOPLAM",
  sections: [
    {
      key: "short-term",
      title: "I. KISA VADELİ YÜKÜMLÜLÜKLER",
      subtotalLabel: "Kısa Vadeli Yük. Toplamı",
      lines: [
        { key: "trade-payables", label: "Ticari Borçlar", amount: 400_000, accountCodes: ["320"], groupCodes: ["32"] },
      ],
    },
    {
      key: "equity",
      title: "III. ÖZKAYNAKLAR",
      subtotalLabel: "Özkaynaklar Toplamı",
      lines: [
        { key: "capital", label: "Sermaye", amount: 800_000, accountCodes: ["500"], groupCodes: ["50"] },
        { key: "profit", label: "Dönem Net Kârı", amount: 160_000, accountCodes: ["590"], groupCodes: ["59"] },
      ],
    },
  ],
};

/** Bir tarafın kalemlerini SIFIRLAR — iskelet korunur, tutarlar `0.00` olur. */
function zeroBalanceSheetSide(seed: BalanceSheetSideSeed): BalanceSheetSideSeed {
  return {
    ...seed,
    sections: seed.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({ ...line, amount: 0 })),
    })),
  };
}

/**
 * `as_of` → bilanço.
 *
 * 🔴 TANINMAYAN GÜN 404 DEĞİLDİR (`vatReturnFixture` emsali): saat bir gün
 * kayarsa ekran BOŞ inmemeli, YAPISAL OLARAK GEÇERLİ ve tamamen SIFIR bir
 * bilanço basmalıdır. Sıfır bilanço dengededir ve bu doğrudur.
 */
export function balanceSheetFixture(asOf: string): MockBalanceSheet {
  if (asOf === "2026-07-31") {
    return balanceSheet(asOf, BALANCE_SHEET_JULY_ASSETS, BALANCE_SHEET_JULY_LIABILITIES);
  }
  if (asOf === "2026-01-31") {
    return balanceSheet(asOf, BALANCE_SHEET_JANUARY_ASSETS, BALANCE_SHEET_JANUARY_LIABILITIES);
  }
  return balanceSheet(
    asOf,
    zeroBalanceSheetSide(BALANCE_SHEET_JULY_ASSETS),
    zeroBalanceSheetSide(BALANCE_SHEET_JULY_LIABILITIES),
  );
}

/* ---------------- Nakit Akış Tablosu ---------------- */

interface CashFlowLineSeed {
  readonly key: string;
  readonly label: string;
  /** İŞARETLİ: `+` giriş, `−` çıkış (şema notu). */
  readonly amount: number;
  readonly accountCodes: readonly string[];
}

interface CashFlowSectionSeed {
  readonly key: string;
  readonly code: string;
  readonly title: string;
  readonly subtotalLabel: string;
  readonly lines: readonly CashFlowLineSeed[];
}

interface CashFlowSeed {
  readonly year: number;
  readonly month: number;
  readonly openingCash: number;
  readonly sections: readonly CashFlowSectionSeed[];
  /**
   * Ocak..`month` ay SONU BAKİYELERİ — bir AKIŞ serisi değil (şema notu).
   * SON eleman `closing_cash`e EŞİT olmak zorundadır; `cashFlowStatement()`
   * bunu kendisi yazar, tohum yalnız ÖNCEKİ ayları taşır.
   */
  readonly monthlyCashBefore: readonly number[];
}

function cashFlowLine(seed: CashFlowLineSeed): MockCashFlowLine {
  return {
    key: seed.key,
    label: seed.label,
    amount: seed.amount.toFixed(2),
    account_codes: [...seed.accountCodes],
  };
}

/** 🔴 `subtotal` KALEMLERDEN toplanır (K15: satırlar kazanır). */
function cashFlowSection(seed: CashFlowSectionSeed): MockCashFlowSection {
  const lines = seed.lines.map(cashFlowLine);
  return {
    key: seed.key,
    code: seed.code,
    title: seed.title,
    subtotal_label: seed.subtotalLabel,
    subtotal: lines.reduce((total, line) => total + Number(line.amount), 0).toFixed(2),
    lines,
  };
}

/**
 * 🔴 `net_change` = A+B+C (ARA TOPLAMLARDAN), `closing_cash` = açılış + net.
 *
 * K2: mockup'ın KPI kartı (NA:58 `+ 4.802.000`) tablosuyla ÇELİŞİYOR; ölçüm
 * `5.842.000 − 1.240.000 − 800.000 = 3.802.000` ve tablo kendi içinde tutarlı
 * (`2.447.500 + 3.802.000 = 6.249.500`). Fikstür ARİTMETİĞİ DOĞRU olanı döner;
 * ekran zaten iki yerde de SUNUCUNUN alanını basar.
 */
function cashFlowStatement(seed: CashFlowSeed): MockCashFlowStatement {
  const sections = seed.sections.map(cashFlowSection);
  const netChange = sections.reduce((total, section) => total + Number(section.subtotal), 0);
  const closingCash = seed.openingCash + netChange;

  // Seri Ocak..`month`; SON nokta `closing_cash`tir (ay sonu BAKİYESİ).
  const monthlyCash: MockMonthlyCashPoint[] = seed.monthlyCashBefore.map((value, index) => ({
    year: seed.year,
    month: index + 1,
    closing_cash: value.toFixed(2),
  }));
  monthlyCash.push({ year: seed.year, month: seed.month, closing_cash: closingCash.toFixed(2) });

  return {
    year: seed.year,
    month: seed.month,
    sections,
    net_change: netChange.toFixed(2),
    opening_cash: seed.openingCash.toFixed(2),
    closing_cash: closingCash.toFixed(2),
    monthly_cash: monthlyCash,
  };
}

/**
 * 📅 OCAK–TEMMUZ 2026 (`year=2026&month=7`) — `ACCOUNTING_READ_TIME`in
 * ürettiği varsayılan dönem (`defaultCashFlowPeriod` = içinde bulunulan ay).
 *
 * Kalemler ve tutarlar NA:71-97'den BİREBİR gelir; A ara toplamı satırlarla
 * TUTAR (5.842.000). Açılış NA:101'in `2.447.500`üdür ⇒ kapanış
 * `6.249.500 = GROUP_10_CASH_JULY` (tek kaynak kuralı).
 */
const CASH_FLOW_JULY_SEED: CashFlowSeed = {
  year: 2026,
  month: 7,
  openingCash: 2_447_500,
  monthlyCashBefore: [2_700_000, 3_150_000, 3_480_000, 4_260_000, 4_980_000, 5_640_000],
  sections: [
    {
      key: "operating",
      code: "A",
      title: "A. İŞLETME FAALİYETLERİNDEN NAKITLER",
      subtotalLabel: "İşletme Faaliyetleri Net Nakit",
      lines: [
        { key: "collections", label: "Müşterilerden Tahsilat", amount: 24_994_700, accountCodes: ["120"] },
        { key: "suppliers", label: "Tedarikçilere Ödeme", amount: -12_480_000, accountCodes: ["320"] },
        { key: "payroll", label: "Personele Ödeme", amount: -5_840_000, accountCodes: ["335", "770"] },
        { key: "tax", label: "Vergi Ödemesi", amount: -605_300, accountCodes: ["360", "391"] },
        { key: "other-out", label: "Diğer Nakit Çıkışları", amount: -227_400, accountCodes: ["180", "770"] },
      ],
    },
    {
      key: "investing",
      code: "B",
      title: "B. YATIRIM FAALİYETLERİNDEN NAKITLER",
      subtotalLabel: "Yatırım Faaliyetleri Net Nakit",
      lines: [{ key: "equipment", label: "Ekipman Alımı", amount: -1_240_000, accountCodes: ["253"] }],
    },
    {
      key: "financing",
      code: "C",
      title: "C. FİNANSMAN FAALİYETLERİNDEN NAKITLER",
      subtotalLabel: "Finansman Faaliyetleri Net Nakit",
      lines: [{ key: "loan-repayment", label: "Kredi Geri Ödemesi", amount: -800_000, accountCodes: ["300", "400"] }],
    },
  ],
};

/**
 * 📅 OCAK 2026 — dengesiz bilanço dalının KARDEŞİ. Kapanışı
 * `GROUP_10_CASH_JANUARY`dir; tek kaynak kuralı bu ayda da ölçülebilsin diye
 * vardır (bilanço dengesizken bile nakit TEK kaynaktan gelir).
 *
 * 🔴 `month === 1` ⇒ seri TEK noktalıdır ve o nokta `closing_cash`tir.
 */
const CASH_FLOW_JANUARY_SEED: CashFlowSeed = {
  year: 2026,
  month: 1,
  openingCash: 1_000_000,
  monthlyCashBefore: [],
  sections: [
    {
      key: "operating",
      code: "A",
      title: "A. İŞLETME FAALİYETLERİNDEN NAKITLER",
      subtotalLabel: "İşletme Faaliyetleri Net Nakit",
      lines: [
        { key: "collections", label: "Müşterilerden Tahsilat", amount: 500_000, accountCodes: ["120"] },
        { key: "suppliers", label: "Tedarikçilere Ödeme", amount: -200_000, accountCodes: ["320"] },
      ],
    },
    {
      key: "investing",
      code: "B",
      title: "B. YATIRIM FAALİYETLERİNDEN NAKITLER",
      subtotalLabel: "Yatırım Faaliyetleri Net Nakit",
      lines: [{ key: "equipment", label: "Ekipman Alımı", amount: -60_000, accountCodes: ["253"] }],
    },
    {
      key: "financing",
      code: "C",
      title: "C. FİNANSMAN FAALİYETLERİNDEN NAKITLER",
      subtotalLabel: "Finansman Faaliyetleri Net Nakit",
      lines: [{ key: "loan-repayment", label: "Kredi Geri Ödemesi", amount: -40_000, accountCodes: ["300", "400"] }],
    },
  ],
};

/** Bölümlerin kalemlerini SIFIRLAR — iskelet korunur. */
function zeroCashFlowSections(
  sections: readonly CashFlowSectionSeed[],
): readonly CashFlowSectionSeed[] {
  return sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => ({ ...line, amount: 0 })),
  }));
}

/**
 * `(yıl, ay)` → nakit akış tablosu.
 *
 * 🔴 TANINMAYAN DÖNEM 404 DEĞİLDİR (`vatReturnFixture` emsali): saat bir ay
 * kayarsa ekran BOŞ inmemeli, yapısal olarak geçerli ve tamamen SIFIR bir
 * tablo basmalıdır. Seri yine Ocak..`month` uzunluğundadır ki grafik bir
 * eğri çizebilsin.
 */
export function cashFlowStatementFixture(year: number, month: number): MockCashFlowStatement {
  if (year === CASH_FLOW_JULY_SEED.year && month === CASH_FLOW_JULY_SEED.month) {
    return cashFlowStatement(CASH_FLOW_JULY_SEED);
  }
  if (year === CASH_FLOW_JANUARY_SEED.year && month === CASH_FLOW_JANUARY_SEED.month) {
    return cashFlowStatement(CASH_FLOW_JANUARY_SEED);
  }
  const safeMonth = Number.isInteger(month) && month >= 1 && month <= 12 ? month : 1;
  return cashFlowStatement({
    year: Number.isInteger(year) ? year : CASH_FLOW_JULY_SEED.year,
    month: safeMonth,
    openingCash: 0,
    monthlyCashBefore: new Array(safeMonth - 1).fill(0) as number[],
    sections: zeroCashFlowSections(CASH_FLOW_JULY_SEED.sections),
  });
}

/**
 * 🔒 FİKSTÜR İZOLASYONU (F-PT2/F-MU2 dersi): `lv-1…lv-5` OKUMA adasıdır ve
 * hiçbir test onları KARARA BAĞLAMAZ; yazma akışları `lv-w1`/`lv-w2` üzerinde
 * koşar, yeni talepler `lv-new-*` doğar. `e2e/leaves-helpers.ts`in
 * `pinLeaveRequests`i kadrajı `/^lv-\d+$/` ile süzer ⇒ görsel kare bu dosyanın
 * yazma akışlarından YAPISAL olarak bağımsızdır.
 *
 * Sıra `created_at DESC`tir (sunucu da öyle sıralar): tabloda lv-1 en üsttedir
 * ve süzülen `lv-w*` en alttaki iki satırdır — süzgeç üst satırları KAYDIRMAZ.
 */
const LEAVE_REQUEST_SEEDS: readonly LeaveRequestSeed[] = [
  // NORMAL satır — kalan 12, talep 5 ⇒ onay serbest.
  { id: "lv-1", personnelId: "per-1", leaveTypeId: "lt-1", startDate: "2026-08-24", endDate: "2026-08-28", note: "Bayram öncesi aile ziyareti", createdAt: "2026-08-14T09:00:00Z" },
  // 🔴 HAK AŞIMI (İZ 91-99): kalan 2, talep 6 ⇒ onay PASİF, red AKTİF, satır
  // vurgulu, açıklama hücresi "Hak aşımı — 4 gün fazla" basar. `note` BOŞtur ki
  // aşım metni gerçekten görünsün.
  { id: "lv-2", personnelId: "per-3", leaveTypeId: "lt-1", startDate: "2026-09-07", endDate: "2026-09-12", createdAt: "2026-08-13T09:00:00Z" },
  // 🔴 SINIR GÜNÜ: talep 3 === kalan 3 ⇒ onay SERBEST. `days > remaining`
  // kapısı `>=` olarak mutasyona uğrarsa BU satır kırmızıya döner.
  { id: "lv-3", personnelId: "per-4", leaveTypeId: "lt-1", startDate: "2026-08-31", endDate: "2026-09-02", note: "Kalan hakka eşit talep", createdAt: "2026-08-12T09:00:00Z" },
  // 🔴 K9 + BELGE EKLİ (İZ 87-88): tip yıllık haktan DÜŞMEZ ⇒ "Düşmez";
  // `document_id` dolu ⇒ ataç ikonu + "belge ekli" erişilebilir adı.
  { id: "lv-4", personnelId: "per-2", leaveTypeId: "lt-2", startDate: "2026-08-19", endDate: "2026-08-21", note: "Rapor arşive yüklendi", documentId: "doc-p1-1", createdAt: "2026-08-11T09:00:00Z" },
  // 🔴 K4 "bilinmiyor": per-6'nın bakiye satırı YOKTUR ⇒ hücre `—` (0 DEĞİL).
  // Onay denendiğinde sunucu FAIL-CLOSED 409 verir (kalan hesaplanamıyor).
  { id: "lv-5", personnelId: "per-6", leaveTypeId: "lt-1", startDate: "2026-09-21", endDate: "2026-09-24", note: "Bakiye kaydı yok", createdAt: "2026-08-10T09:00:00Z" },
  // 🔒 YAZMA ADASI — kadrajdan süzülür.
  { id: "lv-w1", personnelId: "per-1", leaveTypeId: "lt-4", startDate: "2026-10-05", endDate: "2026-10-06", note: "ONAY akışı ölçümü", createdAt: "2026-08-09T09:00:00Z" },
  { id: "lv-w2", personnelId: "per-4", leaveTypeId: "lt-3", startDate: "2026-10-12", endDate: "2026-10-16", note: "RED akışı ölçümü", createdAt: "2026-08-08T09:00:00Z" },
];

/**
 * 🔴 KPI'lar SABİTtir ve BEŞİ DE sıfırdan ve birbirinden farklıdır — bir kart
 * yanlış alanı bassaydı ayırt edilemezdi. `unknown_entitlement_personnel`
 * DOLUdur ama ekran onu BASMAZ (fail-closed sayacı; kanıtı `leaves.spec.ts`).
 *
 * Sayaçlar bakiye fikstürüyle TUTARLIdır: `carryover_risk_personnel` = devreden
 * günü olan iki satır (per-2, per-4), `unknown_entitlement_personnel` = hakkı
 * hesaplanamayan tek satır (per-5).
 */
const HR_LEAVES_SUMMARY_KPIS = {
  pending_requests: 7,
  on_leave_today: 3,
  days_used_this_month: 46,
  total_leave_debt: "128.50",
  carryover_risk_personnel: 2,
  unknown_entitlement_personnel: 1,
} as const;

const LEAVE_LIMIT_DEFAULT = 50;
const LEAVE_LIMIT_MAX = 200;

const leaveState: { requests: MockLeaveRequest[]; seq: number } = {
  requests: LEAVE_REQUEST_SEEDS.map(buildLeaveRequest),
  seq: 0,
};

// --- F-BOR T6 · Bordro (İK-3) fikstürleri ---------------------------------
//
// 🔴 ON ÜÇ uç burada karşılanır:
//   `GET,POST /payroll/periods` · `GET,PATCH /payroll/periods/{id}` ·
//   `POST /payroll/periods/{id}/compute` · `PATCH /payroll/lines/{id}` ·
//   `POST /payroll/lines/{id}/approve` · `POST /payroll/lines/{id}/reject` ·
//   `POST /payroll/periods/{id}/approve` · `POST /payroll/periods/{id}/pay` ·
//   `GET /payroll/periods/{id}/sgk-summary` ·
//   `POST /payroll/periods/{id}/sgk-submit` · `GET /payroll/rates` ·
//   `PUT /payroll/rates/{year}/{source}` · `GET /payroll/periods/{id}/export`.
//
// 🔴🔴 YANITLAR DONMUŞ HARİTA DEĞİL, DURUMDAN TÜRER. Bu dilim MUTASYONLUDUR
// (onay/ödeme satır durumunu ve dönem damgalarını oynatır); donmuş bir yanıt
// haritası, onaydan sonra ekranın hâlâ "Beklemede" yazdığı bir sahte dünya
// üretir ve e2e hiçbir şey kanıtlamazdı. Tutulan şey YALNIZ çekirdek veridir
// (dönemler + satırlar + oran setleri); listeler, detaylar, KPI'lar, SGK
// özeti ve atlama sayaçlarının hepsi `buildX(state, …)` ile o çekirdekten
// HESAPLANIR.
//
// 🔴 K4 · MOCKUP ARİTMETİĞİ KOPYALANMAZ. BY/BG/SGK mockup'larının üçü de
// kendi içinde tutarsızdır (BY taşeron satırlarında 200 TL sapma · BG tfoot
// "7 Ay" derken 5 satır · SGK işveren toplamı kendi oranlarıyla 25.852
// tutmuyor). Buradaki HİÇBİR tutar elle yazılmaz: brütten ve ORAN SETİNDEN
// tam sayı kuruş aritmetiğiyle türetilir, böylece
//   `brüt − kesinti = net` ve `banka + elden = net`
// her satırda YAPISAL OLARAK doğrudur. Kör bekçisi
// `payroll-fixtures.test.ts` (tutarlılık bekçisi).
//
// 🔴 KADROYA DOKUNULMADI. Şirket/taşeron/genel satırları MEVCUT `per-1…per-5`
// personeline bağlanır; `personnel-list-visual.spec.ts`in "toplam TAM 6"
// iddiası ve puantaj baseline'ları korunur. Serbest meslek + stajyer
// satırları mockup'ın DÖRT bandını canlandırmak için gereklidir ve kadroya
// EKLENMEZ: `PayrollLineResponse` personel adını satırın İÇİNDE taşır
// (ekranda `/personel`e giden bir bağlantı yoktur), bu yüzden bu iki satır
// kartoteksi büyütmeden basılabilir. Alternatif — kadroya iki personel
// eklemek — dört ayrı baseline'ı oynatırdı.
//
// 🔴 YILLAR AYRILDI (F-PT `pinRoster` dersi: paylaşılan mock GLOBALDİR):
//   * **2026** — GÖRSEL yıl. Beş dönem; `bordro-aylik`, `bordro-gecmis` ve
//     `bordro-sgk` kareleri buradan çıkar. Hiçbir spec bu yılda MUTASYON
//     yapmaz, yoksa kareler koşu sırasına göre kâh şöyle kâh böyle üretilir.
//   * **2025** — MUTASYON alanı (onay/ödeme/SGK damgası). BG'nin varsayılan
//     yılı en YENİ yıldır (2026), bu yüzden 2025'teki durum değişiklikleri
//     hiçbir kadraja sızmaz.
//   * **2024** — ORAN SETİ OLMAYAN yıl (K3): tüm satırlar `uncomputed`,
//     `unknown_rate_count > 0`. `bordro-aylik-oransiz` karesi buradan çıkar.

type MockPayrollPeriodStatus = components["schemas"]["PayrollPeriodStatus"];
type MockPayrollLineStatus = components["schemas"]["PayrollLineStatus"];
type MockPayrollWorkerSource = components["schemas"]["WorkerSource"];
type MockPayrollRate = components["schemas"]["PayrollRateResponse"];

/** Satırın ONAY zinciri — ekrana çıkan `status` bundan TÜREMEZ, bkz. `payrollLineStatus`. */
type MockPayrollApproval = "pending" | "approved" | "paid";

interface MockPayrollLine {
  id: string;
  personnel_id: string;
  personnel_name: string;
  personnel_source: MockPayrollWorkerSource;
  days: number | null;
  /** Brüt KURUŞ. `null` = ücret verisi yok (S4) ⇒ satır `uncomputed`. */
  grossKurus: number | null;
  approval: MockPayrollApproval;
  /** Banka payı KURUŞ; `null` = "kalanın hepsi bankaya" varsayılanı. */
  bankKurus: number | null;
  isOverridden: boolean;
  overriddenAt: string | null;
  previousGrossKurus: number | null;
}

interface MockPayrollPeriod {
  id: string;
  year: number;
  month: number;
  status: MockPayrollPeriodStatus;
  payment_due_date: string | null;
  approved_at: string | null;
  paid_at: string | null;
  sgk_submitted_at: string | null;
  lines: MockPayrollLine[];
}

interface MockPayrollState {
  periods: MockPayrollPeriod[];
  rates: MockPayrollRate[];
  seq: number;
}

/* ------------------------------------------------------------ kuruş aritmetiği */

/**
 * Tam sayı kuruş → Decimal metin (`3045000` → `"30450.00"`).
 * Para ASLA kayan noktada tutulmaz; yalnız çıkışta metne çevrilir.
 */
function payrollKurus(value: number): string {
  const isNegative = value < 0;
  const digits = String(Math.abs(value)).padStart(3, "0");
  const whole = digits.slice(0, digits.length - 2);
  return `${isNegative ? "-" : ""}${whole}.${digits.slice(digits.length - 2)}`;
}

/** Decimal metin → tam sayı kuruş; ayrıştırılamayan girdi `null`. */
function payrollParseKurus(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2));
}

/**
 * Oranın kuruş karşılığı. 🔴 ORAN para DEĞİLDİR (`"20.50"` = yüzde), bu yüzden
 * `Number`a çevrilmesi güvenlidir; ÇARPIMIN SONUCU tam sayı kuruşa yuvarlanır
 * ve toplamlar hep bu yuvarlanmış parçalardan kurulur — böylece
 * `parçaların toplamı = toplam` her zaman TAM tutar.
 */
function payrollPctOf(baseKurus: number, pct: string): number {
  return Math.round((baseKurus * Number(pct)) / 100);
}

/* ------------------------------------------------------------------ oranlar */

interface PayrollRateSeed {
  source: MockPayrollWorkerSource;
  sgkEmployee: string;
  unemploymentEmployee: string;
  incomeTax: string;
  stampTax: string;
  sgkEmployer: string;
  unemploymentEmployer: string;
}

/**
 * 🔴 K2 · `short_work_pct` HER SETTE `"0.000"`. Kısa çalışma ödeneği (%1)
 * SGK ekranında ÇİZİLMEZ (KK-5) ve doğru düzeltme istemcinin toplamı
 * oynatması değil, oranın SIFIR tohumlanmasıdır (`IK3-SEED`). Sıfır olduğu
 * için `employer_burden_total` ile ekranda basılan İKİ satırın toplamı
 * BİREBİR tutar; istemcinin sunucuyu yalanlaması gerekmez.
 */
const PAYROLL_SHORT_WORK_PCT = "0.000";

const PAYROLL_RATE_SEEDS: readonly PayrollRateSeed[] = [
  // SGK 4a — şirket kadrosu ve genel işçi aynı sete tabidir.
  { source: "company", sgkEmployee: "14.000", unemploymentEmployee: "1.000", incomeTax: "15.000", stampTax: "0.759", sgkEmployer: "20.500", unemploymentEmployer: "2.000" },
  { source: "general", sgkEmployee: "14.000", unemploymentEmployee: "1.000", incomeTax: "15.000", stampTax: "0.759", sgkEmployer: "20.500", unemploymentEmployer: "2.000" },
  // Taşeron işçisinin seti VARDIR: satır ödenmez (K2) ama MALİYET tabanına
  // girer; set olmasaydı maliyet kartı sessizce eksik çıkardı.
  { source: "subcontractor", sgkEmployee: "14.000", unemploymentEmployee: "1.000", incomeTax: "15.000", stampTax: "0.759", sgkEmployer: "20.500", unemploymentEmployer: "2.000" },
  // BY:240 "Serbest Makbuz · %20 Stopaj" — SGK yok, yalnız stopaj + damga.
  { source: "freelance", sgkEmployee: "0.000", unemploymentEmployee: "0.000", incomeTax: "20.000", stampTax: "0.759", sgkEmployer: "0.000", unemploymentEmployer: "0.000" },
  // BY:268 "Staj ücreti" — kesintisiz.
  { source: "intern", sgkEmployee: "0.000", unemploymentEmployee: "0.000", incomeTax: "0.000", stampTax: "0.000", sgkEmployer: "0.000", unemploymentEmployer: "0.000" },
];

/** Oran seti TANIMLI yıllar. 2024 bilinçli olarak DIŞARIDADIR (K3). */
const PAYROLL_RATE_YEARS: readonly number[] = [2025, 2026];

function buildPayrollRates(): MockPayrollRate[] {
  return PAYROLL_RATE_YEARS.flatMap((year) =>
    PAYROLL_RATE_SEEDS.map((seed) => ({
      id: `pr-${year}-${seed.source}`,
      year,
      personnel_source: seed.source,
      sgk_employee_pct: seed.sgkEmployee,
      unemployment_employee_pct: seed.unemploymentEmployee,
      income_tax_pct: seed.incomeTax,
      stamp_tax_pct: seed.stampTax,
      sgk_employer_pct: seed.sgkEmployer,
      unemployment_employer_pct: seed.unemploymentEmployer,
      short_work_pct: PAYROLL_SHORT_WORK_PCT,
      is_active: true,
    })),
  );
}

function payrollRateFor(
  state: MockPayrollState,
  year: number,
  source: MockPayrollWorkerSource,
): MockPayrollRate | undefined {
  return state.rates.find((rate) => rate.year === year && rate.personnel_source === source);
}

/* --------------------------------------------------------- satır aritmetiği */

interface PayrollLineAmounts {
  gross: number;
  sgkEmployee: number;
  unemploymentEmployee: number;
  incomeTax: number;
  stampTax: number;
  deduction: number;
  net: number;
  sgkEmployer: number;
  unemploymentEmployer: number;
  shortWork: number;
  employerBurden: number;
}

/**
 * Satırın TÜM tutarları — brütten ve oran setinden türer. `null` dönmesinin
 * İKİ ayrı sebebi vardır ve ikisi de görünür sayaca dönüşür:
 *   * brüt yok (ücret verisi girilmemiş)  → `uncomputed_count`
 *   * oran seti yok (yıl tohumlanmamış)   → `unknown_rate_count` (fail-closed)
 *
 * 🔴 `deduction` dört parçanın TOPLAMIDIR, brütün yüzdesi değil: parçalar tek
 * tek yuvarlandığı için "yüzdeyi bir kez uygula" yaklaşımı ekrandaki dört
 * satırla toplamı 1-2 kuruş ayırırdı. `net = brüt − kesinti` de bu yüzden
 * TAM tutar.
 */
function payrollLineAmounts(
  state: MockPayrollState,
  period: MockPayrollPeriod,
  line: MockPayrollLine,
): PayrollLineAmounts | null {
  if (line.grossKurus === null) return null;
  const rate = payrollRateFor(state, period.year, line.personnel_source);
  if (rate === undefined) return null;

  // IK3-GV sonrası `income_tax_pct` nullable: sabit oran yerine dilimli motor devrede.
  // Oran yoksa satır HESAPLANAMAZ — 0 sayıp sessizce eksik kesinti üretmeyiz.
  if (rate.income_tax_pct === null) return null;

  const gross = line.grossKurus;
  const sgkEmployee = payrollPctOf(gross, rate.sgk_employee_pct);
  const unemploymentEmployee = payrollPctOf(gross, rate.unemployment_employee_pct);
  const incomeTax = payrollPctOf(gross, rate.income_tax_pct);
  const stampTax = payrollPctOf(gross, rate.stamp_tax_pct);
  const deduction = sgkEmployee + unemploymentEmployee + incomeTax + stampTax;

  const sgkEmployer = payrollPctOf(gross, rate.sgk_employer_pct);
  const unemploymentEmployer = payrollPctOf(gross, rate.unemployment_employer_pct);
  const shortWork = payrollPctOf(gross, rate.short_work_pct);

  return {
    gross,
    sgkEmployee,
    unemploymentEmployee,
    incomeTax,
    stampTax,
    deduction,
    net: gross - deduction,
    sgkEmployer,
    unemploymentEmployer,
    shortWork,
    employerBurden: sgkEmployer + unemploymentEmployer + shortWork,
  };
}

/** Taşeron satırı ödenmez (K2); tutarsız satır `uncomputed`; kalanı onay zinciri. */
function payrollLineStatus(
  line: MockPayrollLine,
  amounts: PayrollLineAmounts | null,
): MockPayrollLineStatus {
  if (line.personnel_source === "subcontractor") return "excluded";
  if (amounts === null) return "uncomputed";
  return line.approval;
}

/** Ödenebilir satır = ne taşeron ne hesaplanamamış. Ödeme tabanının tanımı. */
function isPayablePayrollLine(
  line: MockPayrollLine,
  amounts: PayrollLineAmounts | null,
): boolean {
  const status = payrollLineStatus(line, amounts);
  return status !== "excluded" && status !== "uncomputed";
}

const PAYROLL_EXCLUDED_REASON =
  "Taşeron işçisi bordrodan ödenmez; ödemesi taşeron hakedişi üzerinden yapılır.";

/** Banka/elden bölüşümü: kullanıcı dokunmadıysa NETİN TAMAMI bankadan. */
function payrollSplit(
  line: MockPayrollLine,
  amounts: PayrollLineAmounts | null,
): { bank: number; cash: number } | null {
  if (amounts === null) return null;
  if (line.personnel_source === "subcontractor") return null;
  const bank = line.bankKurus ?? amounts.net;
  return { bank, cash: amounts.net - bank };
}

function buildPayrollLineResponse(
  state: MockPayrollState,
  period: MockPayrollPeriod,
  line: MockPayrollLine,
) {
  const amounts = payrollLineAmounts(state, period, line);
  const split = payrollSplit(line, amounts);
  return {
    id: line.id,
    personnel_id: line.personnel_id,
    personnel_name: line.personnel_name,
    personnel_source: line.personnel_source,
    days: line.days,
    gross_amount: amounts === null ? null : payrollKurus(amounts.gross),
    deduction_amount: amounts === null ? null : payrollKurus(amounts.deduction),
    net_amount: amounts === null ? null : payrollKurus(amounts.net),
    bank_amount: split === null ? null : payrollKurus(split.bank),
    cash_amount: split === null ? null : payrollKurus(split.cash),
    status: payrollLineStatus(line, amounts),
    excluded_reason: line.personnel_source === "subcontractor" ? PAYROLL_EXCLUDED_REASON : null,
    is_overridden: line.isOverridden,
    overridden_at: line.overriddenAt,
    previous_gross_amount:
      line.previousGrossKurus === null ? null : payrollKurus(line.previousGrossKurus),
  };
}

/* -------------------------------------------------------------- özet + detay */

/** Bölümlerin çıkış sırası — `WorkerSource` enum sırası (ekran yine kendi sıralar). */
const PAYROLL_SOURCE_ORDER: readonly MockPayrollWorkerSource[] = [
  "company",
  "subcontractor",
  "general",
  "freelance",
  "intern",
];

function buildPayrollSections(state: MockPayrollState, period: MockPayrollPeriod) {
  return PAYROLL_SOURCE_ORDER.flatMap((source) => {
    const lines = period.lines.filter((line) => line.personnel_source === source);
    if (lines.length === 0) return [];
    return [
      {
        personnel_source: source,
        line_count: lines.length,
        lines: lines.map((line) => buildPayrollLineResponse(state, period, line)),
      },
    ];
  });
}

/** Yüzde metni (`"71.5"`); bölen sıfırsa `null` — istemci bölme YAPMAZ. */
function payrollPctString(part: number, whole: number): string | null {
  if (whole === 0) return null;
  return ((part / whole) * 100).toFixed(1);
}

/**
 * 🔴 İKİ TABAN AYRIDIR (şema kararı) ve bu fonksiyon onu görünür kılar:
 *   * `net/bank/cash` → ÖDEME tabanı (`excluded` ve `uncomputed` HARİÇ);
 *   * `gross/sgk_employer/total_employer_cost` → MALİYET tabanı (`excluded`
 *     DAHİL — taşeron işçisi ödenmez ama şirkete maliyettir).
 * İkisini birbirinden türetmek, mockup'ın yaptığı hatanın aynısı olurdu.
 */
function buildPayrollSummary(state: MockPayrollState, period: MockPayrollPeriod) {
  let netTotal = 0;
  let netCount = 0;
  let bankTotal = 0;
  let bankCount = 0;
  let cashTotal = 0;
  let cashCount = 0;
  let grossTotal = 0;
  let sgkEmployerTotal = 0;
  let uncomputedCount = 0;
  let excludedCount = 0;
  let unknownCostCount = 0;

  for (const line of period.lines) {
    const amounts = payrollLineAmounts(state, period, line);
    const status = payrollLineStatus(line, amounts);

    if (status === "uncomputed") uncomputedCount += 1;
    if (status === "excluded") excludedCount += 1;
    if (amounts === null) {
      // 🔴 İKİ SAYAÇ ÇAKIŞMAZ. Brütü hiç olmayan satırı `uncomputed_count`
      // zaten sayar; `unknown_cost_count` YALNIZ brütü BİLİNEN ama ORAN SETİ
      // olmadığı için maliyeti hesaplanamayan satırları sayar. İkisini aynı
      // satır için birden saymak, ekranda aynı eksiği iki ayrı bantla anlatıp
      // kullanıcıya iki ayrı sorun varmış gibi gösterirdi.
      if (line.grossKurus !== null) unknownCostCount += 1;
      continue;
    }

    grossTotal += amounts.gross;
    sgkEmployerTotal += amounts.employerBurden;

    if (!isPayablePayrollLine(line, amounts)) continue;
    const split = payrollSplit(line, amounts);
    if (split === null) continue;
    netTotal += amounts.net;
    netCount += 1;
    if (split.bank > 0) {
      bankTotal += split.bank;
      bankCount += 1;
    }
    if (split.cash > 0) {
      cashTotal += split.cash;
      cashCount += 1;
    }
  }

  return {
    line_count: period.lines.length,
    net_total: payrollKurus(netTotal),
    net_personnel_count: netCount,
    bank_total: payrollKurus(bankTotal),
    bank_personnel_count: bankCount,
    bank_pct: payrollPctString(bankTotal, netTotal),
    cash_total: payrollKurus(cashTotal),
    cash_personnel_count: cashCount,
    cash_pct: payrollPctString(cashTotal, netTotal),
    gross_total: payrollKurus(grossTotal),
    sgk_employer_total: payrollKurus(sgkEmployerTotal),
    total_employer_cost: payrollKurus(grossTotal + sgkEmployerTotal),
    uncomputed_count: uncomputedCount,
    excluded_count: excludedCount,
    unknown_cost_count: unknownCostCount,
  };
}

function buildPayrollPeriodDetail(state: MockPayrollState, period: MockPayrollPeriod) {
  return {
    id: period.id,
    year: period.year,
    month: period.month,
    status: period.status,
    payment_due_date: period.payment_due_date,
    approved_at: period.approved_at,
    paid_at: period.paid_at,
    sgk_submitted_at: period.sgk_submitted_at,
    summary: buildPayrollSummary(state, period),
    sections: buildPayrollSections(state, period),
  };
}

/**
 * BG satırı. 🔴 `personnel_count` dönemin TÜM satırlarını sayar; KPI'daki
 * "çalışan" ise ÖDENEBİLİR satırlardır. İkisi kasten farklıdır (şema
 * açıklaması) — tek alana indirgenseydi biri yalan söylerdi.
 */
function buildPayrollPeriodListRow(state: MockPayrollState, period: MockPayrollPeriod) {
  const summary = buildPayrollSummary(state, period);
  return {
    id: period.id,
    year: period.year,
    month: period.month,
    status: period.status,
    payment_due_date: period.payment_due_date,
    paid_at: period.paid_at,
    personnel_count: summary.line_count,
    gross_total: summary.gross_total,
    sgk_employer_total: summary.sgk_employer_total,
    net_total: summary.net_total,
    total_cost: summary.total_employer_cost,
  };
}

/* ---------------------------------------------------------------- SGK özeti */

/**
 * SGK 55-95. Bildirilen çalışan = SGK'ya BİZİM bildirdiğimiz satırlar; taşeron
 * işçisini kendi işvereni bildirir, bu yüzden matraha girmez.
 *
 * 🔴 `unknown_rate_count` TİP sayar (şema: "oran seti olmayan tipleri"), satır
 * değil: eksik olan şey bir satırın verisi değil, bir tipin oran setidir.
 */
function buildPayrollSgkSummary(state: MockPayrollState, period: MockPayrollPeriod) {
  let base = 0;
  let sgkEmployee = 0;
  let unemploymentEmployee = 0;
  let incomeTax = 0;
  let stampTax = 0;
  let sgkEmployer = 0;
  let unemploymentEmployer = 0;
  let shortWork = 0;
  let declared = 0;
  let uncomputed = 0;
  const missingRateSources = new Set<MockPayrollWorkerSource>();

  for (const line of period.lines) {
    if (payrollRateFor(state, period.year, line.personnel_source) === undefined) {
      missingRateSources.add(line.personnel_source);
    }
    const amounts = payrollLineAmounts(state, period, line);
    if (amounts === null) {
      uncomputed += 1;
      continue;
    }
    if (line.personnel_source === "subcontractor") continue;

    declared += 1;
    base += amounts.gross;
    sgkEmployee += amounts.sgkEmployee;
    unemploymentEmployee += amounts.unemploymentEmployee;
    incomeTax += amounts.incomeTax;
    stampTax += amounts.stampTax;
    sgkEmployer += amounts.sgkEmployer;
    unemploymentEmployer += amounts.unemploymentEmployer;
    shortWork += amounts.shortWork;
  }

  const sgkPremium = sgkEmployee + sgkEmployer;
  const unemployment = unemploymentEmployee + unemploymentEmployer;

  return {
    period_id: period.id,
    year: period.year,
    month: period.month,
    sgk_submitted_at: period.sgk_submitted_at,
    declared_personnel_count: declared,
    sgk_base_total: payrollKurus(base),
    sgk_premium_total: payrollKurus(sgkPremium),
    unemployment_total: payrollKurus(unemployment),
    sgk_employee_total: payrollKurus(sgkEmployee),
    unemployment_employee_total: payrollKurus(unemploymentEmployee),
    income_tax_total: payrollKurus(incomeTax),
    stamp_tax_total: payrollKurus(stampTax),
    // 🔴 Dört parçanın TOPLAMI — ekranda basılan dört satırla BİREBİR tutar.
    employee_deduction_total: payrollKurus(
      sgkEmployee + unemploymentEmployee + incomeTax + stampTax,
    ),
    sgk_employer_total: payrollKurus(sgkEmployer),
    unemployment_employer_total: payrollKurus(unemploymentEmployer),
    short_work_total: payrollKurus(shortWork),
    // 🔴 K2 — `short_work` SIFIR olduğu için bu toplam, ekranda çizilen İKİ
    // satırın toplamına EŞİTTİR. İstemcinin toplamı düzeltmesine gerek yok.
    employer_burden_total: payrollKurus(sgkEmployer + unemploymentEmployer + shortWork),
    // SGK'ya ödenecek = prim + işsizlik. Gelir/damga vergisi VERGİ DAİRESİNE
    // gider, bu kutuya girmez.
    sgk_payable_total: payrollKurus(sgkPremium + unemployment),
    uncomputed_count: uncomputed,
    unknown_rate_count: missingRateSources.size,
  };
}

/* ---------------------------------------------------------------- tohumlama */

interface PayrollLineSeed {
  personnelId: string;
  name: string;
  source: MockPayrollWorkerSource;
  /** Günlük/aylık taban brüt (kuruş); `null` = ücret verisi yok (S4). */
  baseGrossKurus: number | null;
  baseDays: number | null;
  /** Sabit banka payı (kuruş) — `null` ise netin tamamı bankaya gider. */
  bankKurus?: number;
}

/**
 * 🔴 `per-1…per-5` MEVCUT kadrodan gelir ve tipleri kartoteksle BİREBİR
 * uyuşur (`per-5 Osman Şahin`in ücreti kartotekste de BOŞTUR — `uncomputed`
 * satırı uydurma değil, kadronun gerçeğidir). Son iki satır kadroya
 * EKLENMEYEN serbest meslek + stajyer bantlarıdır (gerekçe blok başında).
 */
const PAYROLL_LINE_SEEDS: readonly PayrollLineSeed[] = [
  { personnelId: "per-1", name: "Mehmet Kılıç", source: "company", baseGrossKurus: 3_045_000, baseDays: 21 },
  { personnelId: "per-2", name: "Hasan Demirci", source: "company", baseGrossKurus: 4_200_000, baseDays: 30, bankKurus: 2_400_000 },
  { personnelId: "per-3", name: "Ramazan Yıldız", source: "subcontractor", baseGrossKurus: 3_264_800, baseDays: 22 },
  { personnelId: "per-4", name: "İsmail Aksoy", source: "subcontractor", baseGrossKurus: 3_168_000, baseDays: 24 },
  { personnelId: "per-5", name: "Osman Şahin", source: "general", baseGrossKurus: null, baseDays: 19 },
  { personnelId: "pay-fl-1", name: "Yusuf Ergin", source: "freelance", baseGrossKurus: 1_800_000, baseDays: null },
  { personnelId: "pay-int-1", name: "Elif Yalçın", source: "intern", baseGrossKurus: 900_000, baseDays: 20 },
];

/**
 * Aylar arası değişkenlik DETERMİNİSTİKTİR (`month`ten türer): BG tablosunun
 * beş satırı birbirinin kopyası olmasın diye, ama koşudan koşuya oynamasın
 * diye. Rastgelelik YOKTUR.
 */
function payrollSeedGross(seed: PayrollLineSeed, month: number): number | null {
  if (seed.baseGrossKurus === null) return null;
  // %5: 2026 kadrajının beş ayı (3-7) BEŞ AYRI değer üretir — %4 olsaydı
  // Mart ile Temmuz aynı tutara düşer ve BG tablosu iki satırı kopya basardı.
  return seed.baseGrossKurus + (month % 5) * 25_000;
}

interface PayrollPeriodSeed {
  year: number;
  month: number;
  status: MockPayrollPeriodStatus;
  isSgkSubmitted: boolean;
}

/**
 * 🔴 Dört `PayrollPeriodStatus` değerinin DÖRDÜ de temsil edilir (K3):
 * `paid` (2026-03…05) · `approved` (2026-06 ve 2025-11) ·
 * `pending_approval` (2026-07) · `draft` (2025-12 ve 2024-12).
 */
const PAYROLL_PERIOD_SEEDS: readonly PayrollPeriodSeed[] = [
  // ---- 2024: oran seti YOK (K3) — `bordro-aylik-oransiz` karesinin kaynağı.
  { year: 2024, month: 12, status: "draft", isSgkSubmitted: false },
  // ---- 2025: MUTASYON alanı (hiçbir kadraja girmez).
  // 🔴 HER MUTASYON TESTİNE AYRI DÖNEM. `playwright.config.ts` `fullyParallel`
  // olduğu için aynı dosyanın testleri BAŞKA worker'larda EŞZAMANLI koşabilir;
  // iki test aynı dönemi oynatsaydı sonuç koşu sırasına bağlı olurdu.
  { year: 2025, month: 9, status: "draft", isSgkSubmitted: false }, // satır PATCH
  { year: 2025, month: 10, status: "approved", isSgkSubmitted: false }, // ödeme
  { year: 2025, month: 11, status: "approved", isSgkSubmitted: false }, // SGK damgası
  { year: 2025, month: 12, status: "draft", isSgkSubmitted: false }, // dönem onayı
  // ---- 2026: GÖRSEL yıl (mutasyon YASAK).
  { year: 2026, month: 3, status: "paid", isSgkSubmitted: true },
  { year: 2026, month: 4, status: "paid", isSgkSubmitted: true },
  { year: 2026, month: 5, status: "paid", isSgkSubmitted: true },
  { year: 2026, month: 6, status: "approved", isSgkSubmitted: true },
  // Mockup'ın çizdiği hâl (BY:63 "onay bekliyor") — varsayılan dönem budur.
  { year: 2026, month: 7, status: "pending_approval", isSgkSubmitted: false },
];

/** Dönem durumundan satırın onay hâli — ikisi ASLA çelişmez. */
function payrollApprovalFor(status: MockPayrollPeriodStatus): MockPayrollApproval {
  if (status === "paid") return "paid";
  if (status === "approved") return "approved";
  return "pending";
}

function payrollPeriodId(year: number, month: number): string {
  return `pp-${year}-${String(month).padStart(2, "0")}`;
}

/** Ödeme vadesi: izleyen ayın 5'i. Damgalar SABİT — koşudan koşuya oynamaz. */
function payrollDueDate(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-05`;
}

function buildPayrollPeriod(seed: PayrollPeriodSeed): MockPayrollPeriod {
  const approval = payrollApprovalFor(seed.status);
  return {
    id: payrollPeriodId(seed.year, seed.month),
    year: seed.year,
    month: seed.month,
    status: seed.status,
    payment_due_date: payrollDueDate(seed.year, seed.month),
    approved_at:
      seed.status === "approved" || seed.status === "paid"
        ? `${payrollDueDate(seed.year, seed.month)}T09:00:00Z`
        : null,
    paid_at: seed.status === "paid" ? `${payrollDueDate(seed.year, seed.month)}T14:30:00Z` : null,
    sgk_submitted_at: seed.isSgkSubmitted
      ? `${payrollDueDate(seed.year, seed.month)}T11:15:00Z`
      : null,
    lines: PAYROLL_LINE_SEEDS.map((lineSeed, index) => ({
      id: `pl-${seed.year}-${String(seed.month).padStart(2, "0")}-${index + 1}`,
      personnel_id: lineSeed.personnelId,
      personnel_name: lineSeed.name,
      personnel_source: lineSeed.source,
      days: lineSeed.baseDays,
      grossKurus: payrollSeedGross(lineSeed, seed.month),
      approval,
      bankKurus: lineSeed.bankKurus ?? null,
      isOverridden: false,
      overriddenAt: null,
      previousGrossKurus: null,
    })),
  };
}

const payrollState: MockPayrollState = {
  periods: PAYROLL_PERIOD_SEEDS.map(buildPayrollPeriod),
  rates: buildPayrollRates(),
  seq: 0,
};

function findPayrollPeriod(periodId: string): MockPayrollPeriod | undefined {
  return payrollState.periods.find((period) => period.id === periodId);
}

function findPayrollLine(
  lineId: string,
): { period: MockPayrollPeriod; line: MockPayrollLine } | undefined {
  for (const period of payrollState.periods) {
    const line = period.lines.find((row) => row.id === lineId);
    if (line !== undefined) return { period, line };
  }
  return undefined;
}

/** Dönem zinciri TEK ADIM ilerler; atlama YOKTUR (S8). */
const PAYROLL_NEXT_STATUS: Record<MockPayrollPeriodStatus, MockPayrollPeriodStatus | null> = {
  draft: "pending_approval",
  pending_approval: "approved",
  approved: null,
  paid: null,
};

const PAYROLL_LIMIT_DEFAULT = 50;
const PAYROLL_LIMIT_MAX = 240;
