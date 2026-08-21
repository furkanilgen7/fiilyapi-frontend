import "./icons.css";

type IconProps = React.SVGProps<SVGSVGElement>;

// Ortak SVG nitelikleri (mockup inline SVG kalibi)
const base = (props: IconProps) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const EyeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.06 6.06A13.16 13.16 0 0 0 2 12s3.5 7 10 7a9.12 9.12 0 0 0 5.94-2.06" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

// Buyutec — mockup'taki arama kutusu ikonu (daire + sap, 1.4 kalinlik)
export const SearchIcon = (p: IconProps) => (
  <svg {...base({ viewBox: "0 0 13 13", strokeWidth: 1.4, width: 13, height: 13, ...p })}>
    <circle cx="5.5" cy="5.5" r="4" />
    <path d="M9 9l2 2" />
  </svg>
);

// Dairesel onay ikonu — mockup'taki "tam erisim" banner ikonu (daire 1.4, tik 1.6 kalinlik).
export const CheckCircleIcon = (p: IconProps) => (
  <svg {...base({ viewBox: "0 0 16 16", strokeWidth: 1.4, width: 16, height: 16, ...p })}>
    <circle cx="8" cy="8" r="7" />
    <path d="M5 8l2 2 4-4" strokeWidth={1.6} />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * Uyarı üçgeni — metin akışındaki `⚠` (U+26A0) yerine geçer (F-SEM).
 *
 * `AlertIcon` (daire + ünlem) BU DEĞİLDİR: mockup'ların uyarı işareti ÜÇGENdir
 * ve `⚠`nin biçimi odur; daireli varyant başka yüzeylerde kullanımda olduğu
 * için ayrı bir ikon açıldı, mevcut olan DEĞİŞTİRİLMEDİ.
 */
export const WarningTriangleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const XIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const DashboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
export const InboxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
  </svg>
);
export const BarChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <line x1="6" y1="20" x2="6" y2="12" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="18" y1="20" x2="18" y2="14" />
  </svg>
);
export const BuildingIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="2" width="16" height="20" rx="1" />
    <path d="M9 6h1M14 6h1M9 10h1M14 10h1M9 14h1M14 14h1" />
    <path d="M10 22v-4h4v4" />
  </svg>
);
export const CalendarCheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="m9 16 2 2 4-4" />
  </svg>
);
export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
export const TruckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M1 3h15v13H1z" />
    <path d="M16 8h4l3 3v5h-7V8Z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
export const BoxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
    <path d="m3 8 9 5 9-5M12 13v8" />
  </svg>
);
export const CartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
export const FileTextIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
  </svg>
);
export const BankIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10 12 3l9 7" />
    <path d="M4 10v10h16V10M8 14v4M12 14v4M16 14v4M3 20h18" />
  </svg>
);
export const WalletIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);
export const TrendingUpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
export const ListIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
export const FolderIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z" />
  </svg>
);
export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
/**
 * Yukari ok + taban cizgisi — dosya birakma alaninin ikonu.
 * Kanon: `Form - Unite Excel Import.dc.html` satir 77'nin inline SVG'si
 * (viewBox 30, stroke 1.8, yuvarlak uclar) BIREBIR tasinmistir.
 */
export const UploadIcon = (p: IconProps) => (
  <svg {...base({ viewBox: "0 0 30 30", strokeWidth: 1.8, width: 30, height: 30, ...p })}>
    <path d="M15 4v16M8 12l7-8 7 8" />
    <path d="M4 25h22" />
  </svg>
);

// Asma kilit — kabuk sidebar'indaki kullanici kartinin sag ucundaki ikon
export const LockIcon = (p: IconProps) => (
  <svg {...base({ viewBox: "0 0 14 14", strokeWidth: 1.2, width: 14, height: 14, ...p })}>
    <path d="M5 5a2 2 0 014 0v1H5V5zM3 8h8v4H3z" />
  </svg>
);

/**
 * Metin akışındaki sembolleri basmak için ORTAK nitelikler (F-SEM):
 * `<WarningTriangleIcon {...inlineSymbolProps} /> Kritik stok`.
 *
 * NEDEN VAR — ÖLÇÜM: `⚠` (U+26A0), `✓` (U+2713) ve `✗` (U+2717) glifleri
 * `public/fonts/` altındaki 13 woff2 dosyasının HİÇBİRİNİN cmap'inde YOKTUR
 * (fonttools ile tarandı). Alt-küme `unicode-range`ini genişletmek bu yüzden
 * İMKÂNSIZ bir çözümdür: kapsanacak glif dosyada yok. Tarayıcı `Inter
 * Fallback`e (`local("Arial")`) düşer, `ubuntu-latest`te Arial YOKTUR ve
 * fontconfig ikamesi turdan tura değişebilir. Inline SVG tek deterministik
 * yoldur.
 *
 * 🔴 DÜRÜST KAYIT — BU ÇEVRİM `makine-yakit` OYNAKLIĞINI ÇÖZMEDİ. Çevrimden
 * sonraki tur (run 31886457731) kareyi yine kırmızı verdi (242px). Başarısız
 * turun `test-results/` artifact'i indirilip beklenen/gerçek karşılaştırıldı:
 * fark bir yeniden çizim değil KAYMAYDI (dx=-3px farkın %93'ünü açıklıyor),
 * ve yalnız SVG taşıyan satırlar kaymıştı. Gerçek neden yanındaki `{" "}`
 * yalnız-boşluk metin düğümüydü; U+00A0'ya çevrilerek kapatıldı
 * (`EquipmentFuelConsumptionList.tsx`, commit 45392bd).
 * Bu çevrim yine de KALIR: ayrı ve gerçek bir riski (çıplak sembolün sistem
 * yedeğine düşmesi) kapatır. Ama o karenin nedeni O DEĞİLDİ — bir sonraki
 * okuyucu bu ikisini KARIŞTIRMASIN.
 *
 * 🔴 KAPSAM — YALNIZ ÇIPLAK SEMBOL. Ayrım MEKANİKTİR, keyfî değil:
 *   · Çıplak `⚠` (U+26A0, VS'siz) `Emoji_Presentation=No` ama emoji-yetenekli
 *     ⇒ ÇİFT ADAY: metin sembol yazı tipi VEYA renkli emoji yazı tipi. İkame
 *     turdan tura FLIP EDEBİLİR. Dönüştürülür.
 *   · `⚠️` (U+26A0 + U+FE0F) emoji sunumunu ZORUNLU kılar ⇒ TEK ADAY (Noto
 *     Color Emoji), deterministik. DÖNÜŞTÜRÜLMEZ — ayrıca monokrom üçgene
 *     çevirmek GÖRÜNÜR bir tasarım değişikliğidir (mockup sadakati kanonu).
 *     Bu yüzden `ContractDistributionView` ve `PersonnelDocumentAlertBanner`
 *     bandları `⚠️` OLARAK KALIR.
 * Aynı gerekçeyle `←`/`→` ve ~70 emoji de yerinde bırakıldı: alt-küme dışı
 * olmak OYNAK olmak DEĞİLDİR (son 100 turun 42'si tam yeşil, hepsi 292 karenin
 * hepsini geçti ve hepsi `Sidebar.tsx`in `⚙️ 🚪`sını taşıyordu).
 *
 * `✗` (U+2717) bu dilimde HİÇBİR yerde ikona çevrilemedi: tek render yeri
 * `STOCK_QUALITY_OPTIONS` ve orası NATIVE `<option>`dır — `<option>` yalnız
 * metin taşır, içine SVG konulamaz (HTML kısıtı). Orada glif KASITLI kaldı:
 * içerik kaybı kesin, oynaklık riski teorik (`stok-giris-formu` 42 yeşil turda
 * hiç oynamadı) — riski alıp kaybı almama kararı.
 *
 * Boyut `1em`: ikon çevresindeki metnin `font-size`ına oturur, sabit px'e
 * DEĞİL. Dikey hiza `.icon-inline` sınıfından (`icons.css`). Renk `base()`in
 * `stroke: currentColor`undan, yani çağıran sınıfın tonundan gelir.
 */
export const inlineSymbolProps = {
  width: "1em",
  height: "1em",
  className: "icon-inline",
} as const satisfies IconProps;

export const SettingsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);
