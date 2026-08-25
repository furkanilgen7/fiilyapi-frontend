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
      // F-OKROL — mockup `Ayarlar - Onay Rolleri.dc.html:82` bu bağlantıyı
      // "Kullanıcı & Erişim" grubunun SONUNA koyar. Rotası olmayan ekran
      // kullanıcıya görünmez: bağlantı ekranla AYNI dilimde iner.
      //
      // ⚠️ ONAYLI SAPMA — mockup `✅` (U+2705) çiziyor; o kod noktası
      // `src/styles/fonts.css`in HİÇBİR `unicode-range` kümesinde YOK
      // (kapsanan emoji aralığı `u+1f??`). Kapsanmayan glif sistem yedeğine
      // düşer ve kare `ubuntu-latest`te turdan tura oynar (F-MU2 kanonu).
      // Diğer dokuz öğenin hepsi gibi `u+1f??` içinden bir emoji seçildi.
      { label: "Onay Rolleri ve Eşik", href: "/ayarlar/onay-rolleri", emoji: "\u{1F44D}" },
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
