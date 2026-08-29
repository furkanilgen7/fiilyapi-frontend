import { routes } from "@/lib/routes";
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
      { label: "Şirket Bilgileri", href: routes.settings.company(), emoji: "🏢" },
      { label: "Bildirimler", href: routes.settings.notifications(), emoji: "🔔" },
      { label: "Görünüm", href: routes.settings.appearance(), emoji: "🎨" },
    ],
  },
  {
    heading: "KULLANICI & ERİŞİM",
    items: [
      { label: "Kullanıcılar", href: routes.settings.users(), emoji: "👤" },
      { label: "Rol Yönetimi", href: routes.settings.roles(), emoji: "🔐" },
      { label: "İzin Matrisi", href: routes.settings.permissionMatrix(), emoji: "📋" },
      // F-OKROL — mockup `Ayarlar - Onay Rolleri.dc.html:82` bu bağlantıyı
      // "Kullanıcı & Erişim" grubunun SONUNA koyar. Rotası olmayan ekran
      // kullanıcıya görünmez: bağlantı ekranla AYNI dilimde iner.
      //
      // ⚠️ ONAYLI SAPMA — mockup `✅` (U+2705) çiziyor; o kod noktası
      // `src/styles/fonts.css`in HİÇBİR `unicode-range` kümesinde YOK
      // (kapsanan emoji aralığı `u+1f??`). Kapsanmayan glif sistem yedeğine
      // düşer ve kare `ubuntu-latest`te turdan tura oynar (F-MU2 kanonu).
      // Diğer dokuz öğenin hepsi gibi `u+1f??` içinden bir emoji seçildi.
      { label: "Onay Rolleri ve Eşik", href: routes.settings.approvalRoles(), emoji: "\u{1F44D}" },
    ],
  },
  {
    heading: "SİSTEM",
    items: [
      // F-BORORAN — mockup `Ayarlar - Bordro Oranları.dc.html:75` bu bağlantıyı
      // "Sistem" grubunun BAŞINA koyar. Rotası olmayan ekran kullanıcıya
      // görünmez: bağlantı ekranla AYNI dilimde iner.
      // 💰 (U+1F4B0) `src/styles/fonts.css`in `u+1f??` kümesindedir (ölçüldü).
      { label: "Bordro Oranları", href: routes.settings.payrollRates(), emoji: "\u{1F4B0}" },
      { label: "Entegrasyonlar", href: routes.settings.integrations(), emoji: "🔗" },
      { label: "Yedekleme", href: routes.settings.backup(), emoji: "📦" },
      { label: "Denetim Günlüğü", href: routes.settings.auditLog(), emoji: "📜" },
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
