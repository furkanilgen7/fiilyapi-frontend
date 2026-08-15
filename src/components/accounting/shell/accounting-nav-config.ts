import { isActivePath } from "@/lib/shell/isActive";

/**
 * F-MU1 T3 · Muhasebe drill-in sidebar'ı (HP:29-38 birebir).
 *
 * Desen `SettingsSidebar`/`DrillSidebar` emsalidir: grup başlığı → üst öğe →
 * girintili alt sekmeler. Bu dosya SAF yapılandırmadır; DOM'u
 * `MuhasebeSidebar.tsx` basar.
 *
 * 🔴 KABUK NAV'INA HİÇBİR ÖĞE EKLENMEZ (`nav-config.ts` dokunulmadı):
 * "Muhasebe" girdisi F3 kabuk canon'undan beri duruyor (F-SA/F-MK emsali).
 */

/** HP:29 — grup başlığı. */
export const ACCOUNTING_NAV_HEADING = "Sözleşme & Mali";

/** HP:30 — üst öğe. Bir BAĞLANTI DEĞİLDİR; bkz. `ACCOUNTING_SUB_NAV` notu. */
export const ACCOUNTING_NAV_PARENT = "Muhasebe";

export type AccountingNavItem =
  | {
      readonly kind: "link";
      readonly label: string;
      readonly href: string;
      /**
       * `true` ⇒ yalnız TAM eşleşmede aktif.
       *
       * 🔴 F-SD T7 DERSİ: `/muhasebe` kök sekmesi `exact` DEĞİLSE
       * `isActivePath` onu `/muhasebe/hesap-plani`de de aktif sayar (prefix
       * kuralı) ve sidebar'da İKİ öğe birden mavi yanar. Kullanıcı hangi
       * ekranda olduğunu okuyamaz.
       */
      readonly exact: boolean;
    }
  | {
      readonly kind: "disabled";
      readonly label: string;
      /**
       * 🔴 EKRANDA GÖRÜNÜR gerekçe. `title`da SAKLANMAZ (kanon: devre dışı
       * basılan her öğe görünür ve GERÇEK bir gerekçe taşır) ve "bu ekran
       * henüz açılmadı" gibi içi boş bir metin OLAMAZ — hangi dilimde/hangi
       * kararla geleceğini söyler.
       */
      readonly reason: string;
    };

/** HP:31-36 — `Muhasebe` üst öğesinin altındaki ALTI girintili alt sekme. */
export const ACCOUNTING_SUB_NAV: readonly AccountingNavItem[] = [
  // HP:31 — E8 (Yevmiye Defteri) `/muhasebe` KÖKÜNDE yaşar; kök sekmesi bu
  // yüzden `exact`tir (yukarıdaki F-SD T7 notu).
  { kind: "link", label: "Yevmiye Defteri", href: "/muhasebe", exact: true },
  // HP:32
  { kind: "link", label: "Hesap Planı", href: "/muhasebe/hesap-plani", exact: false },
  // HP:33 — MU-2 canlıda (2026-08-15): `GET /trial-balance` ucu HAZIR ve BFF
  // kökü açıldı; eksik olan yalnız EKRAN. Gerekçe bu yüzden "backend yok"
  // DEMEZ — kullanıcıya doğru bilgiyi verir.
  {
    kind: "disabled",
    label: "Mizan",
    reason: "Mizan backend'i MU-2 ile canlıda; ekranı sonraki dilimde açılacak.",
  },
  // HP:34
  {
    kind: "disabled",
    label: "Banka Mutabakatı",
    reason: "Banka Mutabakatı'nın backend ucu henüz yok.",
  },
  // HP:35
  {
    kind: "disabled",
    label: "e-Fatura",
    reason: "e-Fatura/GİB entegrasyonu ertelendi (kullanıcı kararı).",
  },
  // HP:36 — MU-2 canlıda: `GET /vat-return` ucu HAZIR ve BFF kökü açıldı;
  // eksik olan yalnız EKRAN (Mizan ile aynı gerekçe).
  {
    kind: "disabled",
    label: "KDV Beyanı",
    reason: "KDV Beyanı backend'i MU-2 ile canlıda; ekranı sonraki dilimde açılacak.",
  },
];

/**
 * HP:37-38 — alt sekmelerin ALTINDAKİ, girintisiz iki kardeş modül. İkisi de
 * kabuk nav'ında zaten vardır; burada mockup'ın çizdiği yerde tekrarlanırlar.
 */
export const ACCOUNTING_SIBLING_NAV: readonly AccountingNavItem[] = [
  { kind: "link", label: "Hazine", href: "/hazine", exact: false }, // HP:37
  { kind: "link", label: "Mali Tablolar", href: "/mali-tablolar", exact: false }, // HP:38
];

/** Aktiflik kararı — `exact` bayrağı `isActivePath`in prefix kuralını EZER. */
export function isAccountingNavItemActive(
  pathname: string,
  item: AccountingNavItem,
): boolean {
  if (item.kind !== "link") return false;
  return item.exact ? pathname === item.href : isActivePath(pathname, item.href);
}

/**
 * Verili yolda aktif görünen öğelerin etiketleri. Testin "AYNI ANDA KAÇ öğe
 * aktif" sorusunu sorabilmesi için vardır (çift aktiflik bekçisi).
 */
export function activeAccountingNavLabels(pathname: string): readonly string[] {
  return [...ACCOUNTING_SUB_NAV, ...ACCOUNTING_SIBLING_NAV]
    .filter((item) => isAccountingNavItemActive(pathname, item))
    .map((item) => item.label);
}
