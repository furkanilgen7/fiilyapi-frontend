import {
  DashboardIcon,
  InboxIcon,
  BarChartIcon,
  BuildingIcon,
  CalendarCheckIcon,
  UserIcon,
  TruckIcon,
  BoxIcon,
  CartIcon,
  FileTextIcon,
  BankIcon,
  WalletIcon,
  ClockIcon,
  TrendingUpIcon,
  ListIcon,
  FolderIcon,
  SparkleIcon,
} from "@/components/ui/icons";
import { isActivePath } from "@/lib/shell/isActive";
import { routes } from "@/lib/routes";

export type NavItem = {
  label: string;
  href: string;
  Icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
};
export type NavGroup = { heading: string; items: NavItem[] };

// Kabuk sol menusu — canon: Ekran 1 (4 duz grup). Cogu modul henuz yok;
// yapilmamis rotalar [...slug] catch-all ile ComingSoon'a duser.
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Genel",
    items: [
      { label: "Gösterge Paneli", href: "/", Icon: DashboardIcon },
      { label: "Onay Kutusu", href: routes.approvalInbox(), Icon: InboxIcon },
      // AI-1 · FİİL AI Asistanı. Mockup (`AI Chat.dc.html`) kabuk sol menüsünü
      // ÇİZMEZ (kendi sohbet-geçmişi sütununu çizer), bu yüzden konum kabuk
      // canon'undan seçildi: "Genel" grubu tek bir modüle ait olmayan çapraz
      // yüzeylerin yeridir (Gösterge Paneli · Onay Kutusu · Raporlar) ve asistan
      // da tam olarak öyledir. Rota GERÇEKTİR (`/asistan`), ComingSoon DEĞİL.
      { label: "FİİL AI", href: routes.assistant(), Icon: SparkleIcon },
      { label: "Raporlar", href: routes.reports(), Icon: BarChartIcon },
      { label: "Projeler", href: routes.projects.list(), Icon: BuildingIcon },
    ],
  },
  {
    heading: "Saha & İK",
    items: [
      { label: "Puantaj", href: routes.timesheet(), Icon: CalendarCheckIcon },
      { label: "Personel", href: routes.personnel.list(), Icon: UserIcon },
      { label: "Makine & Ekipman", href: routes.equipment.list(), Icon: TruckIcon },
    ],
  },
  {
    heading: "Stok & Satınalma",
    items: [
      { label: "Stok & Depo", href: routes.stock(), Icon: BoxIcon },
      { label: "Satınalma & Teklif", href: routes.purchasing.root(), Icon: CartIcon },
    ],
  },
  {
    heading: "Sözleşme & Mali",
    items: [
      { label: "Sözleşmeler", href: routes.contracts.list(), Icon: FileTextIcon },
      // F-P8 T2: SY (`Satış Yönetimi.dc.html` 40) mockup'ın PROJE bloğunda
      // çizilir; kabuk canon'unda karşılığı YOKTU — ünite satışı/tahsilatı
      // mali bir yüzey olduğu için "Sözleşme & Mali" grubuna, sözleşmelerin
      // hemen ardına eklendi. Rota GERÇEKTİR (`/satis`), ComingSoon DEĞİL;
      // nav href guard testi bunu ayrıca doğrular.
      { label: "Satış Yönetimi", href: routes.sales.root(), Icon: BuildingIcon },
      { label: "Muhasebe", href: routes.accounting.root(), Icon: BankIcon },
      // F-FAT2 T2: FY (`Fatura Yönetimi.dc.html` 39) mockup'ın "Mali" bloğunda
      // Muhasebe'nin hemen ardında durur; rota GERÇEKTİR (`/faturalar`),
      // ComingSoon DEĞİL.
      { label: "Fatura Yönetimi", href: routes.invoices.list(), Icon: FileTextIcon },
      { label: "Hazine", href: routes.treasury.root(), Icon: WalletIcon },
      // 🔴 F-UNIT1 T4 · ÖLÜ EKRAN DÜZELTMESİ. `/hazine/cek-senet` (E10 · Çek &
      // Ödeme) sayfası, görünümü, 401 satırlık testi ve 2 görsel karesiyle
      // AYLARDIR duruyordu ama repoda ona giden TEK BİR `Link`/`push` YOKTU:
      // ekran yalnız elle URL yazılarak açılabiliyordu.
      //
      // Konumu mockup ölçüldü: DÖRT fatura mockup'ının da sol menüsünde
      // `💳 Çek & Ödeme` bir NAV ÖĞESİDİR, başka ekrandaki bir düğme değil
      // (`Fatura Yönetimi.dc.html` 44 · `Fatura - Gelen Detay` 39 ·
      // `Fatura - Kes` 39 · `Fatura - Giden Detay` 40). Komşuları da oradan
      // gelir: FY 43 `🏦 Hazine`, FY 45 `📊 Mali Tablolar` — yani Hazine'nin
      // HEMEN ARDINDA. Ekranın kendi breadcrumb'ı da bunu doğruluyor
      // ("Hazine · Çek & Senet Yönetimi", E10:62) ve rota zaten `/hazine`
      // altında yaşıyor.
      //
      // Simge `WalletIcon`: mockup'ın emojisi 💳 bir karttır ve settedeki tek
      // kart/cüzdan glifi budur (üçüncü path yuvasına sokulmuş kartı çizer).
      // Paylaşılan simge burada BİLGİ de taşır — bu ekran Hazine'nin alt
      // yüzeyidir. Simge tekrarı kabuk canonunda zaten var (`BuildingIcon` ×3,
      // `FileTextIcon` ×2); yeni glif İCAT EDİLMEDİ.
      { label: "Çek & Ödeme", href: routes.treasury.financialInstruments(), Icon: WalletIcon },
      { label: "Hakedişler", href: routes.progressPayments.list(), Icon: ClockIcon },
      { label: "Mali Tablolar", href: routes.financialStatements.root(), Icon: TrendingUpIcon },
      { label: "Bordro", href: routes.payroll.root(), Icon: ListIcon },
      { label: "Şirket Varlıkları", href: routes.companyAssets(), Icon: BuildingIcon },
      // F-BC T4: Ekran 12 gerçek rotasıdır (`/belgeler`) — ComingSoon'dan çıktı.
      // Eski `/belge-arsivi` href'i hiç yazılmamış bir rotaydı; nav href guard
      // testi bu öğenin gerçek bir sayfaya düştüğünü ayrıca doğrular.
      { label: "Belge Arşivi", href: routes.documents(), Icon: FolderIcon },
    ],
  },
];

/**
 * 🔴 F-UNIT1 T4 · ÇİFT AKTİFLİK BEKÇİSİ. `Çek & Ödeme` kabuk nav'ındaki İLK
 * iç içe href'tir (`/hazine/cek-senet`, `/hazine`in altı). `isActivePath` bir
 * PREFİX kuralıdır: `/hazine/cek-senet` yolunda hem `Hazine` hem `Çek & Ödeme`
 * eşleşir, yani sidebar'da İKİ öğe birden mavi yanar ve aynı `<nav>` içinde
 * İKİ `aria-current="page"` basılır. Muhasebe drill-in nav'ı aynı tuzağa
 * `exact` bayrağıyla çözüm bulmuştu (F-SD T7 dersi); kabukta bayak yerine
 * EN UZUN EŞLEŞME seçilir — bayrak unutulabilir, uzunluk kuralı yeni iç içe
 * rotalarda kendiliğinden doğru davranır ve nav'da karşılığı OLMAYAN bir alt
 * rotada (`/hazine/baska-sey`) üst öğeyi aktif tutmaya devam eder.
 *
 * Bugünkü davranış DEĞİŞMEZ: `Çek & Ödeme` dışında hiçbir nav href'i bir
 * başkasının öneki değildir, yani her yolda eşleşme kümesi en fazla tektir.
 */
export function activeNavHref(pathname: string): string | undefined {
  let best: string | undefined;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (!isActivePath(pathname, item.href)) continue;
      if (best === undefined || item.href.length > best.length) best = item.href;
    }
  }
  return best;
}

// Slug'dan modul adi: once nav'da ara, yoksa baslik-case fallback.
export function moduleNameForSlug(slug: string): string {
  const href = "/" + slug;
  for (const group of NAV_GROUPS) {
    const found = group.items.find((i) => i.href === href);
    if (found) return found.label;
  }
  return slug
    .split("-")
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join(" ");
}
