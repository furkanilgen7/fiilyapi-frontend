export interface SettingsNavItem {
  label: string;
  href: string;
  emoji: string;
}
export interface SettingsNavGroup {
  heading: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    heading: "GENEL",
    items: [
      { label: "Şirket Bilgileri", href: "/ayarlar/sirket-bilgileri", emoji: "🏢" },
      { label: "Bildirimler", href: "/ayarlar/bildirimler", emoji: "🔔" },
      { label: "Görünüm", href: "/ayarlar/gorunum", emoji: "🎨" },
    ],
  },
  {
    heading: "KULLANICI & ERİŞİM",
    items: [
      { label: "Kullanıcılar", href: "/ayarlar/kullanicilar", emoji: "👤" },
      { label: "Rol Yönetimi", href: "/ayarlar/roller", emoji: "🔐" },
      { label: "İzin Matrisi", href: "/ayarlar/izin-matrisi", emoji: "📋" },
    ],
  },
  {
    heading: "SİSTEM",
    items: [
      { label: "Entegrasyonlar", href: "/ayarlar/entegrasyonlar", emoji: "🔗" },
      { label: "Yedekleme", href: "/ayarlar/yedekleme", emoji: "📦" },
      { label: "Denetim Günlüğü", href: "/ayarlar/denetim-gunlugu", emoji: "📜" },
    ],
  },
];

export function settingsLabelForPath(pathname: string): string {
  for (const group of SETTINGS_NAV) {
    const found = group.items.find((i) => pathname.startsWith(i.href));
    if (found) return found.label;
  }
  return "Ayarlar";
}
