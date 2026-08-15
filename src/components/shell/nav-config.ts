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
} from "@/components/ui/icons";

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
      { label: "Onay Kutusu", href: "/onay-kutusu", Icon: InboxIcon },
      { label: "Raporlar", href: "/raporlar", Icon: BarChartIcon },
      { label: "Projeler", href: "/projeler", Icon: BuildingIcon },
    ],
  },
  {
    heading: "Saha & İK",
    items: [
      { label: "Puantaj", href: "/puantaj", Icon: CalendarCheckIcon },
      { label: "Personel", href: "/personel", Icon: UserIcon },
      { label: "Makine & Ekipman", href: "/makine", Icon: TruckIcon },
    ],
  },
  {
    heading: "Stok & Satınalma",
    items: [
      { label: "Stok & Depo", href: "/stok", Icon: BoxIcon },
      { label: "Satınalma & Teklif", href: "/satinalma", Icon: CartIcon },
    ],
  },
  {
    heading: "Sözleşme & Mali",
    items: [
      { label: "Sözleşmeler", href: "/sozlesmeler", Icon: FileTextIcon },
      // F-P8 T2: SY (`Satış Yönetimi.dc.html` 40) mockup'ın PROJE bloğunda
      // çizilir; kabuk canon'unda karşılığı YOKTU — ünite satışı/tahsilatı
      // mali bir yüzey olduğu için "Sözleşme & Mali" grubuna, sözleşmelerin
      // hemen ardına eklendi. Rota GERÇEKTİR (`/satis`), ComingSoon DEĞİL;
      // nav href guard testi bunu ayrıca doğrular.
      { label: "Satış Yönetimi", href: "/satis", Icon: BuildingIcon },
      { label: "Muhasebe", href: "/muhasebe", Icon: BankIcon },
      // F-FAT2 T2: FY (`Fatura Yönetimi.dc.html` 39) mockup'ın "Mali" bloğunda
      // Muhasebe'nin hemen ardında durur; rota GERÇEKTİR (`/faturalar`),
      // ComingSoon DEĞİL.
      { label: "Fatura Yönetimi", href: "/faturalar", Icon: FileTextIcon },
      { label: "Hazine", href: "/hazine", Icon: WalletIcon },
      { label: "Hakedişler", href: "/hakedisler", Icon: ClockIcon },
      { label: "Mali Tablolar", href: "/mali-tablolar", Icon: TrendingUpIcon },
      { label: "Bordro", href: "/bordro", Icon: ListIcon },
      { label: "Şirket Varlıkları", href: "/sirket-varliklari", Icon: BuildingIcon },
      // F-BC T4: Ekran 12 gerçek rotasıdır (`/belgeler`) — ComingSoon'dan çıktı.
      // Eski `/belge-arsivi` href'i hiç yazılmamış bir rotaydı; nav href guard
      // testi bu öğenin gerçek bir sayfaya düştüğünü ayrıca doğrular.
      { label: "Belge Arşivi", href: "/belgeler", Icon: FolderIcon },
    ],
  },
];

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
