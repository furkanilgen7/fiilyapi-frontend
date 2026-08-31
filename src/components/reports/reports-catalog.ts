import { routes } from "@/lib/routes";
import { pendingModuleLabel } from "@/lib/pending-modules";

/**
 * F-RAPOR T1 · `/raporlar` KATALOĞUNUN SAF VERİSİ (React YOK, DOM YOK).
 * Yorumlardaki `R<n>` sayıları `projedesign/Raporlar.dc.html`in SATIR
 * numaralarıdır.
 *
 * ─── EKRANIN NE OLDUĞU ───────────────────────────────────────────────────
 * 🔴 BU BİR KATALOG/BAŞLATICI SAYFASIDIR, RAPOR MOTORU DEĞİL. Mockup dört
 * kategori kartı ve 14 rapor satırı çizer; satırların hepsi `cursor:pointer`
 * taşır (R75/R82/…) ama hiçbiri nereye gittiğini SÖYLEMEZ. Bu dosya her satırı
 * ürünün GERÇEK ekranlarıyla eşleştirir ve eşleşmeyeni DEVRE DIŞI basar.
 *
 * ─── 🔴 MOCKUP'IN EN ÖNEMLİ ÖLÇÜMÜ: XLS/PDF DÜĞMELERİ ────────────────────
 * Mockup'ın her satırında bir/iki BİÇİM düğmesi vardır (R78-79 …). Dışa
 * aktarma ucu bu üründe HİÇ AÇILMADI (`pendingModuleLabel("pdf_export")`),
 * bu yüzden düğmeler SİLİNMEZ — F-TH kanonu: *rotası olmayan mockup öğesi
 * silinmez, devre dışı basılır*. Emsali aynı depoda canlıdır
 * (`FinancialStatementsHomeView` "PDF İndir"i devre dışı basar ve gerekçesini
 * METNE yazar; `StockView` "Stok Hareketi"nde aynısını yapar).
 *
 * ─── SATIRIN İKİ HÂLİ ────────────────────────────────────────────────────
 * `href` VARSA satır bir bağlantıdır ve hedef GERÇEK bir `page.tsx`tir.
 * `reason` VARSA satır bağlantı DEĞİLDİR ve gerekçe GÖRÜNÜR basılır
 * (K11 kanonu: "neden tıklayamıyorum" `title`da saklanmaz). İki alan BİRLİKTE
 * bulunamaz — tip bunu ayırır, bekçi ayrıca iddia eder.
 *
 * 🔴 URL-1: her `href` `@/lib/routes` ÜRETİCİSİNDEN gelir. Bu dosyada elle
 * birleştirilmiş yol string'i YOKTUR (bekçi metin taramasıyla iddia eder).
 *
 * ─── 🔴 UYDURMA RAPOR ÜRETİLMEDİ ─────────────────────────────────────────
 * 14 satırın 5'i etkin, 9'u devre dışıdır. Var olmayan bir rapora çalışır gibi
 * bir bağlantı basmak sahada yanlış karar verdirir; "en yakın ekran"a
 * yönlendirmek de aynı yalanın yumuşak hâlidir (kullanıcı "İş Güvenliği
 * Raporu"na basıp bir günlük giriş formunda uyanır). Her devre dışı satırın
 * gerekçesi ÖLÇÜLDÜ ve satırın yanında yazılıdır.
 */

/** Mockup'ın biçim çipleri (R78-79 · R123 · R165). */
export type ReportFormat = "XLS" | "PDF";

interface ReportRowBase {
  /** `data-testid` gövdesi ve React anahtarı. */
  key: string;
  /** R76 vb. — satır başlığı, mockup'tan BİREBİR. */
  title: string;
  /** R76 alt satırı — mockup'tan BİREBİR. */
  subtitle: string;
  /** R77-80 — mockup hangi biçim çiplerini çiziyorsa o sırada. */
  formats: readonly ReportFormat[];
}

export interface LinkedReportRow extends ReportRowBase {
  /** `routes.*` üreticisinden gelen uygulama içi yol. */
  href: string;
  reason?: never;
}

export interface PendingReportRow extends ReportRowBase {
  href?: never;
  /** GÖRÜNÜR gerekçe — `title`da saklanmaz. */
  reason: string;
}

export type ReportRow = LinkedReportRow | PendingReportRow;

export interface ReportCategory {
  key: string;
  /** R71 · R109 · R145 · R174 — kart başlığındaki simge karosu. */
  icon: string;
  /** R72 · R110 · R146 · R175. */
  title: string;
  subtitle: string;
  rows: readonly ReportRow[];
}

export function isLinkedRow(row: ReportRow): row is LinkedReportRow {
  return row.href !== undefined;
}

/* ─── Devre dışı satırların gerekçeleri ──────────────────────────────────
 *
 * İkisi `pending-modules`tan TÜRER: o kayıtlar tam olarak bu iki boşluğun
 * ÖLÇÜLMÜŞ cümlesidir ve mali tablolar ekranında da aynı gerekçeyle basılırlar
 * — cümleyi burada İKİNCİ KEZ yazmak, biri düzeltildiğinde ötekini yalancı
 * bırakırdı. Kalanlar bu ekrana özgüdür (kaynakları `pending_module`
 * anahtarı OLAN sunucu yer tutucuları değil, YAZILMAMIŞ ekranlardır) ve
 * `MODULE_LABELS`a EKLENMEZLER: o harita backend'in `pending_module` alanının
 * sözlüğüdür, katalog metinleri oraya ait değildir.
 */

/** R82-88 — şirket geneli proje karlılığı. */
const PROJECT_PROFITABILITY_REASON = pendingModuleLabel("project_profitability");
/** R96-102 — ileriye dönük nakit projeksiyonu. */
const CASH_PROJECTION_REASON = pendingModuleLabel("cash_flow_projection");

/**
 * R89-95 — ÖLÇÜLDÜ: "bütçe sapması" diye bir ekran/uç YOK. En yakın yüzey
 * proje özetindeki harcanan/bütçe çubuğudur (`CostBreakdownCard`) ve o da
 * PROJEYE bağlıdır; katalog proje seçimi taşımaz.
 */
const BUDGET_VARIANCE_REASON =
  "Plan–gerçekleşen karşılaştırması ayrı bir ekran olarak çizilmedi (bütçe sapması yalnız proje özetinde, tek proje için okunur)";

/**
 * R113-119 — fiziksel ilerleme yalnız ŞANTİYE/BÖLÜM başlığındaki bir KPI'dır
 * (`SiteHeroBar` · `SectionHeroCard`); haftalık toplayan bir rapor yüzeyi yok.
 */
const WEEKLY_PROGRESS_REASON =
  "Fiziksel ilerleme yalnız şantiye ve bölüm başlığında okunur; haftalık toplayan bir rapor yüzeyi henüz yok";

/**
 * R120-125 — ekran VAR (`SiteDiarySummaryView`, aylık) ama `projectId` +
 * `siteId` İSTER. Katalog şantiye seçimi taşımaz ve bir şantiyeyi VARSAYMAK
 * (ilk kayıt, en son kayıt…) kullanıcıya yanlış şantiyenin günlüğünü açardı.
 */
const SITE_DIARY_REASON =
  "Şantiye günlüğü özeti bir şantiyeye bağlıdır; katalogda proje/şantiye seçimi yok — özet, şantiyenin Günlük Kayıt sekmesinden açılır";

/**
 * R126-131 — iş güvenliği verisi GÜNLÜK GİRİŞ FORMUNUN dört alanıdır
 * (`DiarySafetyCard`: toplantı · KKD · kaza/ramak kala · not). Toplayan hiçbir
 * liste/uç yok — kaza kayıtlarını sayan bir yüzey İCAT EDİLMEZ.
 */
const SAFETY_REPORT_REASON =
  "Kaza/ramak kala kayıtları yalnız günlük kayıt formunun alanlarıdır; toplayan bir liste ya da uç henüz yok";

/**
 * R132-138 — `StockView` bunu KENDİSİ söylüyor: "Stok Hareketi" listesi ekranı
 * henüz tasarlanmadı. Stok ekranı BAKİYE gösterir, TÜKETİM değil.
 */
const MATERIAL_USAGE_REASON =
  "Stok ekranı bakiye gösterir; tüketim (stok hareketi) listesi ekranı henüz tasarlanmadı";

/**
 * R162-167 — şirket geneli "İşçilik Giderleri" gelir tablosunda TEK satırdır;
 * mockup'ın istediği "proje bazlı dağılım" tam olarak `project_profitability`
 * boşluğudur (muhasebe kayıtları proje kırılımı tutmaz).
 */
const LABOR_COST_REASON = PROJECT_PROFITABILITY_REASON;

/**
 * R191-196 — teklif karşılaştırma ekranı VAR (`QuoteComparisonView`) ama bir
 * SATINALMA TALEBİNE bağlıdır (`requestId`). Katalog talep seçemez; bir talebi
 * varsaymak rastgele bir karşılaştırma açardı.
 */
const QUOTE_COMPARISON_REASON =
  "Teklif karşılaştırması bir satınalma talebine bağlıdır; katalogda talep seçimi yok — karşılaştırma, talebin Teklifler ekranından açılır";

/** R78-79 vb. — biçim çiplerinin ORTAK gerekçesi (tek cümle, 14 kez değil). */
export const EXPORT_DISABLED_REASON = pendingModuleLabel("pdf_export");

/* ─── Katalog ───────────────────────────────────────────────────────────── */

const XLS_PDF: readonly ReportFormat[] = ["XLS", "PDF"];

export const REPORT_CATEGORIES: readonly ReportCategory[] = [
  {
    key: "mali",
    icon: "💰", // R71
    title: "Mali Raporlar", // R72
    subtitle: "Gelir, gider, karlılık", // R72
    rows: [
      {
        // R76 — GELİR TABLOSU ekranının ta kendisi (`/mali-tablolar` KÖKÜ;
        // `FinancialStatementsHomeView`in `h1`i "Gelir Tablosu"dur).
        // ⚠️ Hedef ekran `accounting` izin modülüyle korunur — kabuk nav'ıyla
        // AYNI davranış: bağlantı görünür, yetkisiz kullanıcı hedefte
        // `AccessDenied` görür (katalog izin süzgeci UYGULAMAZ, yoksa nav ile
        // katalog aynı yolda iki farklı şey söylerdi).
        key: "gelir-gider",
        title: "Aylık Gelir-Gider Raporu",
        subtitle: "Proje bazlı · Excel/PDF",
        formats: XLS_PDF,
        href: routes.financialStatements.root(),
      },
      {
        key: "proje-karlilik",
        title: "Proje Karlılık Analizi",
        subtitle: "Marj karşılaştırma",
        formats: XLS_PDF,
        reason: PROJECT_PROFITABILITY_REASON,
      },
      {
        key: "butce-sapma",
        title: "Bütçe Sapma Raporu",
        subtitle: "Plan vs gerçekleşen",
        formats: XLS_PDF,
        reason: BUDGET_VARIANCE_REASON,
      },
      {
        key: "nakit-tahmin",
        title: "Nakit Akış Tahmini",
        subtitle: "3 aylık projeksiyon",
        formats: XLS_PDF,
        reason: CASH_PROJECTION_REASON,
      },
    ],
  },
  {
    key: "saha",
    icon: "🏗", // R109
    title: "Saha Raporları", // R110
    subtitle: "İlerleme, günlük kayıtlar",
    rows: [
      {
        key: "haftalik-ilerleme",
        title: "Haftalık İlerleme Raporu",
        subtitle: "Fiziksel tamamlanma",
        formats: XLS_PDF,
        reason: WEEKLY_PROGRESS_REASON,
      },
      {
        key: "santiye-gunlugu",
        title: "Aylık Şantiye Günlüğü",
        subtitle: "Tüm günlük kayıtlar",
        formats: ["PDF"], // R123 — mockup bu satırda YALNIZ PDF çizer.
        reason: SITE_DIARY_REASON,
      },
      {
        key: "is-guvenligi",
        title: "İş Güvenliği Raporu",
        subtitle: "Kaza/ramak kala kayıtları",
        formats: ["PDF"], // R129
        reason: SAFETY_REPORT_REASON,
      },
      {
        key: "malzeme-kullanim",
        title: "Malzeme Kullanım Raporu",
        subtitle: "Saha bazlı tüketim",
        formats: XLS_PDF,
        reason: MATERIAL_USAGE_REASON,
      },
    ],
  },
  {
    key: "ik",
    icon: "👷", // R145
    title: "İK Raporları", // R146
    subtitle: "Puantaj, bordro, SGK",
    rows: [
      {
        // R150 — devam/devamsızlık verisinin tek yüzeyi genel puantaj ekranıdır.
        // ⚠️ ÖLÇÜLDÜ: ekran PUAN-SAAT'ten sonra HAFTALIKtır, mockup'ın başlığı
        // "Aylık" der. Başlık mockup'ındır ve DEĞİŞTİRİLMEZ; aylık toplam
        // bordroda okunur. Hedefin izin modülleri: `timesheet` + `personnel`.
        key: "puantaj",
        title: "Aylık Puantaj Raporu",
        subtitle: "Devam / devamsızlık",
        formats: XLS_PDF,
        href: routes.timesheet(),
      },
      {
        // R157 — SGK Bildirimi ekranı (`/bordro/sgk`). İzin modülü: `payroll`.
        key: "sgk",
        title: "SGK Bildirgesi",
        subtitle: "4a/4b bildirimi",
        formats: ["PDF"], // R159
        href: routes.payroll.sgk(),
      },
      {
        key: "iscilik-maliyet",
        title: "İşçilik Maliyet Analizi",
        subtitle: "Proje bazlı dağılım",
        formats: ["XLS"], // R165
        reason: LABOR_COST_REASON,
      },
    ],
  },
  {
    key: "stok",
    icon: "📦", // R174
    title: "Stok & Satınalma", // R175 — mockup başlığı "Stok Raporları" DEĞİL.
    subtitle: "Envanter, tedarik",
    rows: [
      {
        // R179 — `StockView` "Kritik Stok" KPI'ı ve `critical` durum süzgecini
        // taşır; mockup'ın istediği liste odur. İzin modülü: `stock`.
        key: "stok-durum",
        title: "Stok Durum Raporu",
        subtitle: "Kritik malzeme listesi",
        formats: XLS_PDF,
        href: routes.stock(),
      },
      {
        // R186 — "Tedarikçi bazlı" özet = Tedarikçiler ekranı.
        // İzin modülü: `procurement`.
        key: "satinalma-ozeti",
        title: "Satın Alma Özeti",
        subtitle: "Tedarikçi bazlı",
        formats: ["XLS"], // R188
        href: routes.purchasing.suppliers(),
      },
      {
        key: "fiyat-karsilastirma",
        title: "Malzeme Fiyat Karşılaştırma",
        subtitle: "Tedarikçi teklif analizi",
        formats: ["XLS"], // R194
        reason: QUOTE_COMPARISON_REASON,
      },
    ],
  },
];

/** Bekçilerin ve görünümün tek düzleştirme noktası. */
export function allReportRows(): readonly ReportRow[] {
  return REPORT_CATEGORIES.flatMap((category) => category.rows);
}
