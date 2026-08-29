/**
 * URL-1 · Uygulama içi rotaların TEK üreticisi.
 *
 * KÖK OLAY: `/projeler/<uuid>` biçimi kullanıcıya ham UUID gösteriyordu ve
 * ad slug'ına geçirilmesi istendi. Ölçüm: bu yol kodda TEK BİR yerde değil,
 * ONLARCA yerde elle birleştirilmiş string olarak kuruluyordu — biçimi
 * değiştirmek her birini tek tek elden geçirmek demekti ve ATLANAN bir
 * nokta SESSİZCE bozuk link üretirdi (kusur ancak tıklanınca görülür).
 *
 * 🔴 BU MODÜL BUGÜNKÜ URL'LERİ BİREBİR ÜRETİR. URL-1 dilimi görünürde
 * hiçbir şeyi değiştirmez; kazanç, bir sonraki biçim değişikliğinin
 * BURADA ve yalnız burada olmasıdır.
 *
 * ─── Tip güvenliği ───────────────────────────────────────────────────────
 * Parametreli rotalar ADLANDIRILMIŞ nesne alır, sırayla değil. Bu tercih
 * bilinçlidir: bu uygulamadaki her kimlik `string`tir, dolayısıyla konumsal
 * imzada `detail(siteId, projectId)` gibi bir SIRA HATASI derleyiciden
 * SESSİZCE geçerdi ve çalışma anında 404 üretirdi. Adlandırılmış alanlarla
 * eksik/yanlış/fazla anahtar `pnpm typecheck`te patlar.
 *
 * ─── UUID → slug göçü (URL-2/URL-3 için hazırlık) ────────────────────────
 * Kimlik tipi `RouteId = string`tir ve her segment `seg()`ten geçer
 * (`encodeURIComponent`). UUID de slug de bir `string`tir; bu yüzden
 * imzaların HİÇBİRİ değişmeden `/projeler/<uuid>` → `/projeler/<slug>`
 * geçişi yapılabilir: çağıran taraf `projectId` yerine `project.slug ??
 * project.id` geçirir, üretici aynı kalır. Eski UUID linklerinin çalışmaya
 * devam etmesi ise ÜRETİCİNİN değil ÇÖZÜCÜNÜN (sayfa/backend) işidir —
 * bu modül kimliği yorumlamaz, yalnız güvenle kodlar.
 */

/** URL'ye giren kaynak kimliği — bugün UUID, yarın slug; ikisi de `string`. */
export type RouteId = string;

/** Tek bir yol segmentini güvenle kodlar (slug'da Türkçe karakter olabilir). */
function seg(value: RouteId): string {
  return encodeURIComponent(value);
}

/**
 * Sorgu dizesini kurar; `undefined`/boş değerli anahtarlar ATLANIR ve hiç
 * anahtar kalmazsa "?" bile eklenmez — böylece süzgeçsiz çağrı bugünkü
 * çıplak yolla BİREBİR aynı string'i üretir.
 */
function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const rendered = search.toString();
  return rendered === "" ? "" : `?${rendered}`;
}

/* ─── Parametre nesneleri ──────────────────────────────────────────────── */

export interface ProjectParams {
  projectId: RouteId;
}
export interface SiteParams extends ProjectParams {
  siteId: RouteId;
}
export interface SectionParams extends SiteParams {
  sectionId: RouteId;
}

/** Şantiye puantajı bölüm süzgecini OKUR (`SiteTimesheetView` `?section=`). */
export interface SiteTimesheetParams extends SiteParams {
  /** Verilmezse süzgeçsiz şantiye görünümü — `?section=` EKLENMEZ. */
  section?: RouteId;
}

const PROJECTS = "/projeler";
const SITES_SEGMENT = "santiyeler";
const SECTIONS_SEGMENT = "bolumler";

/** `/projeler/<id>` — proje kimliğinin URL'deki TEK gövdesi. */
function projectBase(p: ProjectParams): string {
  return `${PROJECTS}/${seg(p.projectId)}`;
}

/** `/projeler/<id>/santiyeler/<id>` — şantiye alt ağacının TEK gövdesi. */
function siteBase(p: SiteParams): string {
  return `${projectBase(p)}/${SITES_SEGMENT}/${seg(p.siteId)}`;
}

function sectionBase(p: SectionParams): string {
  return `${siteBase(p)}/${SECTIONS_SEGMENT}/${seg(p.sectionId)}`;
}

/* ─── Rota ağacı ───────────────────────────────────────────────────────── */

export const routes = {
  home: () => "/",
  login: () => "/login",
  designSystem: () => "/design-system",
  /** Kabuk nav'ında var, rotası henüz YAZILMADI — `[...slug]` ComingSoon'a düşer. */
  reports: () => "/raporlar",
  /** Kabuk nav'ında var, rotası henüz YAZILMADI — `[...slug]` ComingSoon'a düşer. */
  companyAssets: () => "/sirket-varliklari",
  approvalInbox: () => "/onay-kutusu",

  projects: {
    list: () => PROJECTS,
    new: () => `${PROJECTS}/yeni`,
    calendar: () => `${PROJECTS}/takvim`,
    detail: (p: ProjectParams) => projectBase(p),
    summary: (p: ProjectParams) => `${projectBase(p)}/ozet`,
    sharing: (p: ProjectParams) => `${projectBase(p)}/paylasim`,

    sites: {
      new: (p: ProjectParams) => `${projectBase(p)}/${SITES_SEGMENT}/yeni`,
      detail: (p: SiteParams) => siteBase(p),
      boq: (p: SiteParams) => `${siteBase(p)}/is-kalemleri`,
      documents: (p: SiteParams) => `${siteBase(p)}/belgeler`,
      progressPayments: (p: SiteParams) => `${siteBase(p)}/hakedisler`,
      stock: (p: SiteParams) => `${siteBase(p)}/stok`,
      stockEntry: (p: SiteParams) => `${siteBase(p)}/stok/giris`,
      timesheet: ({ section, ...p }: SiteTimesheetParams) =>
        `${siteBase(p)}/puantaj${qs({ section })}`,
      diary: (p: SiteParams) => `${siteBase(p)}/gunluk-kayit`,
      diarySummary: (p: SiteParams) => `${siteBase(p)}/gunluk-kayit/ozet`,
      diaryPlanning: (p: SiteParams) => `${siteBase(p)}/gunluk-kayit/planlama`,

      sections: {
        new: (p: SiteParams) => `${siteBase(p)}/${SECTIONS_SEGMENT}/yeni`,
        detail: (p: SectionParams) => sectionBase(p),
        edit: (p: SectionParams) => `${sectionBase(p)}/duzenle`,
      },
    },
  },

  settings: {
    root: () => "/ayarlar",
    company: () => "/ayarlar/sirket-bilgileri",
    users: () => "/ayarlar/kullanicilar",
    roles: () => "/ayarlar/roller",
    permissionMatrix: () => "/ayarlar/izin-matrisi",
    approvalRoles: () => "/ayarlar/onay-rolleri",
    notifications: () => "/ayarlar/bildirimler",
    appearance: () => "/ayarlar/gorunum",
    integrations: () => "/ayarlar/entegrasyonlar",
    backup: () => "/ayarlar/yedekleme",
    auditLog: () => "/ayarlar/denetim-gunlugu",
    payrollRates: () => "/ayarlar/bordro-oranlari",
  },

  /** Belge arşivi; proje süzgeci ekran tarafından OKUNUR (`?proje=`). */
  documents: (params: { projectId?: RouteId } = {}) =>
    `/belgeler${qs({ proje: params.projectId })}`,

  payroll: {
    root: () => "/bordro",
    history: () => "/bordro/gecmis",
    sgk: () => "/bordro/sgk",
  },

  invoices: {
    list: () => "/faturalar",
    new: () => "/faturalar/kes",
    detail: (p: { invoiceId: RouteId }) => `/faturalar/${seg(p.invoiceId)}`,
  },

  progressPayments: {
    /** İşveren hakedişleri; liste ekranı `?project_id=` süzgecini OKUR. */
    list: (params: { projectId?: RouteId } = {}) =>
      `/hakedisler${qs({ project_id: params.projectId })}`,
    /** Yeni işveren hakedişi; sihirbaz `?project=` ile ön seçim YAPAR. */
    new: (params: { projectId?: RouteId } = {}) =>
      `/hakedisler/yeni${qs({ project: params.projectId })}`,
    detail: (p: { paymentId: RouteId }) => `/hakedisler/${seg(p.paymentId)}`,
    edit: (p: { paymentId: RouteId }) => `/hakedisler/${seg(p.paymentId)}/duzenle`,

    subcontractor: {
      list: (params: { projectId?: RouteId } = {}) =>
        `/hakedisler/taseron${qs({ project_id: params.projectId })}`,
      /** Yeni taşeron hakedişi; sihirbaz `?contract=` ile ön seçim YAPAR. */
      new: (params: { contractId?: RouteId } = {}) =>
        `/hakedisler/taseron/yeni${qs({ contract: params.contractId })}`,
      detail: (p: { paymentId: RouteId }) => `/hakedisler/taseron/${seg(p.paymentId)}`,
      edit: (p: { paymentId: RouteId }) => `/hakedisler/taseron/${seg(p.paymentId)}/duzenle`,
    },
  },

  treasury: {
    root: () => "/hazine",
    financialInstruments: () => "/hazine/cek-senet",
  },

  equipment: {
    list: () => "/makine",
    new: () => "/makine/yeni",
    work: () => "/makine/calisma",
    fuel: () => "/makine/yakit",
    detail: (p: { equipmentId: RouteId }) => `/makine/${seg(p.equipmentId)}`,
    edit: (p: { equipmentId: RouteId }) => `/makine/${seg(p.equipmentId)}/duzenle`,
    /**
     * Kira faturaları listesi. Ekran kendi süzgeçlerini OKUR; anahtar kümesi
     * ekranın kendi sabitlerinde yaşadığı için hazır bir `URLSearchParams`
     * kabul edilir (anahtarları burada İKİNCİ KEZ tanımlamak, ekranla
     * ayrışabilecek bir kopya yaratırdı).
     */
    rentalInvoices: (params?: URLSearchParams | string) => {
      const rendered = params === undefined ? "" : String(params);
      return `/makine/kira${rendered === "" ? "" : `?${rendered}`}`;
    },
    rentalInvoiceDetail: (p: { invoiceId: RouteId }) => `/makine/kira/${seg(p.invoiceId)}`,
  },

  financialStatements: {
    root: () => "/mali-tablolar",
    balanceSheet: () => "/mali-tablolar/bilanco",
    cashFlow: () => "/mali-tablolar/nakit-akisi",
  },

  accounting: {
    root: () => "/muhasebe",
    chartOfAccounts: () => "/muhasebe/hesap-plani",
    trialBalance: () => "/muhasebe/mizan",
    vatReturn: () => "/muhasebe/kdv-beyani",
    bankReconciliation: () => "/muhasebe/banka-mutabakati",
    periodClosing: () => "/muhasebe/donem-kapanisi",
  },

  personnel: {
    list: () => "/personel",
    /** Kayıt sonrası dönüş hedefi `?donus=` ile taşınır (`RETURN_PARAM`). */
    new: (params: { returnTo?: string } = {}) =>
      `/personel/yeni${qs({ donus: params.returnTo })}`,
    documents: () => "/personel/belgeler",
    leaves: () => "/personel/izinler",
    detail: (p: { personnelId: RouteId }) => `/personel/${seg(p.personnelId)}`,
    edit: (p: { personnelId: RouteId }) => `/personel/${seg(p.personnelId)}/duzenle`,
  },

  timesheet: () => "/puantaj",

  purchasing: {
    root: () => "/satinalma",
    orders: () => "/satinalma/siparisler",
    suppliers: () => "/satinalma/tedarikciler",
    newRequest: () => "/satinalma/talep/yeni",
    requestQuotes: (p: { requestId: RouteId }) =>
      `/satinalma/talepler/${seg(p.requestId)}/teklifler`,
  },

  sales: {
    root: () => "/satis",
    new: () => "/satis/yeni",
    addBlock: () => "/satis/blok-ekle",
    addUnit: () => "/satis/unite-ekle",
    bulkUnits: () => "/satis/toplu-uretim",
    importUnits: () => "/satis/excel-ice-aktar",
    landShareAllocation: () => "/satis/paylasim-girisi",
  },

  contracts: {
    /** Sözleşme listesi; sekme seçimi ekranın kendi sorgu anahtarını taşır. */
    list: (params: { tabParam?: string; tab?: string } = {}) =>
      `/sozlesmeler${
        params.tabParam === undefined || params.tab === undefined
          ? ""
          : qs({ [params.tabParam]: params.tab })
      }`,
    subcontractorList: () => "/sozlesmeler/taseronlar",
    employerDetail: (p: ProjectParams) => `/sozlesmeler/isveren/${seg(p.projectId)}`,
    employerItemDistribution: (p: ProjectParams) =>
      `/sozlesmeler/isveren/${seg(p.projectId)}/poz-dagilimi`,
    newSubcontractor: () => "/sozlesmeler/taseron/yeni",
    subcontractorDetail: (p: { contractId: RouteId }) =>
      `/sozlesmeler/taseron/${seg(p.contractId)}`,
  },

  stock: () => "/stok",
} as const;
