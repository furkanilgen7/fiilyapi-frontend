import { isActivePath } from "@/lib/shell/isActive";

/**
 * F-MT T2 · Mali Tablolar drill-in sidebar'ı (BL:24-31 birebir).
 *
 * Desen `accounting-nav-config.ts` emsalidir: grup başlığı → kardeş modül →
 * üst öğe → girintili alt sekmeler. Bu dosya SAF yapılandırmadır; DOM'u
 * `FinancialStatementsSidebar.tsx` basar.
 *
 * 🔴 KABUK NAV'INA HİÇBİR ÖĞE EKLENMEZ (`nav-config.ts` dokunulmadı):
 * "Mali Tablolar" girdisi kabuk canon'undan beri duruyor.
 */

/** BL:25 — grup başlığı. */
export const FINANCIAL_NAV_HEADING = "Sözleşme & Mali";

export const FINANCIAL_STATEMENTS_URL = "/mali-tablolar";

export type FinancialNavItem =
  | {
      readonly kind: "link";
      readonly label: string;
      readonly href: string;
      /**
       * `true` ⇒ yalnız TAM eşleşmede CURRENT.
       *
       * 🔴 Muhasebe emsalinden FARKI: burada ÜST ÖĞE de bir bağlantıdır
       * (BL:27 `/mali-tablolar` kök ekranına gider). `exact` olmasaydı
       * `isActivePath`in prefix kuralı onu `/mali-tablolar/bilanco`da da
       * CURRENT sayardı ve sayfada İKİ `aria-current="page"` doğardı.
       */
      readonly exact: boolean;
    }
  | {
      /**
       * 🔴 F-MT2 K3 — ÜST ÖĞEYLE AYNI HEDEFİ gösteren, BAĞLANTI OLMAYAN satır.
       *
       * `Gelir Tablosu` ekranı KÖKTE yaşar (E11 mockup'ı onu `/mali-tablolar`
       * olarak çiziyor; ayrı bir `/mali-tablolar/gelir-tablosu` rotası AÇILMAZ
       * — mockup'a aykırı olurdu). Satır bir `Link` yapılsaydı kökte hem üst
       * öğe hem bu satır CURRENT olur ve sayfada İKİ `aria-current="page"`
       * doğardı (K7 bekçisi kırmızı, ekran okuyucu "iki ayrı sayfadasınız").
       *
       * Bu yüzden satır bir İŞARETÇİdir: hedefini `mirrorsHref` ile SÖYLER ama
       * gezinmeyi üst öğeye bırakır ve `aria-current` ASLA sürmez.
       */
      readonly kind: "mirror";
      readonly label: string;
      readonly mirrorsHref: string;
    };

/**
 * BL:26 — alt sekmelerin DIŞINDA, girintisiz kardeş modül. Kabuk nav'ında
 * zaten vardır; burada mockup'ın çizdiği yerde tekrarlanır.
 *
 * `exact: false`: `/muhasebe/mizan` gibi alt yollarda da modül vurgulu kalır
 * (mali tablo sekmelerinin hiçbiri o yolda yanmaz).
 */
export const FINANCIAL_SIBLING_NAV: readonly FinancialNavItem[] = [
  { kind: "link", label: "Muhasebe", href: "/muhasebe", exact: false },
];

/** BL:27 — üst öğe. Muhasebe emsalinin aksine BİR BAĞLANTIDIR (kök ekran var). */
export const FINANCIAL_NAV_PARENT: FinancialNavItem = {
  kind: "link",
  label: "Mali Tablolar",
  href: FINANCIAL_STATEMENTS_URL,
  exact: true,
};

/** BL:28-30 — üst öğenin altındaki ÜÇ girintili alt sekme. */
export const FINANCIAL_SUB_NAV: readonly FinancialNavItem[] = [
  // BL:28 — 🔴 F-MT2 K3 (yönetim kararı A): uç AÇILDI (`GET /income-statement`)
  // ve ekran KÖKTE (`/mali-tablolar`) yaşıyor. Satır artık devre dışı DEĞİL,
  // üst öğenin hedefini yansıtan bir İŞARETÇİdir; gezinme üst öğededir.
  { kind: "mirror", label: "Gelir Tablosu", mirrorsHref: FINANCIAL_STATEMENTS_URL },
  // BL:29 — bu dilimin ekranı. `exact: true`: alt yolu yoktur ama kural
  // kardeşleriyle aynıdır ve üst öğeyle çift yanmayı yapısal olarak keser.
  { kind: "link", label: "Bilanço", href: "/mali-tablolar/bilanco", exact: true },
  // BL:30 — kardeş görev (T3); backend ucu MT-1 ile canlıdadır.
  { kind: "link", label: "Nakit Akışı", href: "/mali-tablolar/nakit-akisi", exact: true },
];

/**
 * 🔴 1. KATMAN — BULUNULAN ekran. `aria-current="page"`i YALNIZ bu sürer ve
 * sayfada TAM BİR tane doğru çıkması gerekir (a11y + reponun nav bekçisi).
 */
export function isFinancialNavItemCurrent(
  pathname: string,
  item: FinancialNavItem,
): boolean {
  if (item.kind !== "link") return false;
  return item.exact ? pathname === item.href : isActivePath(pathname, item.href);
}

/**
 * 🔴 K3 · 3. KATMAN — YANSITICI satırın SALT GÖRSEL vurgusu.
 *
 * Kökte `Mali Tablolar` (üst öğe) `aria-current="page"` sürerken alt satır da
 * aynı sayfayı gösterdiğini KULLANICIYA söylemelidir; ama `aria-current`
 * SÜRMEZ — sayfada tam bir tane olmalıdır (K7). Yani bu yüklem
 * `isFinancialNavItemCurrent`in yerine geçmez, ONUN YANINDA yaşar.
 */
export function isFinancialNavItemMirrorCurrent(
  pathname: string,
  item: FinancialNavItem,
): boolean {
  return item.kind === "mirror" && pathname === item.mirrorsHref;
}

/**
 * 🔴 2. KATMAN — SALT GÖRSEL ata vurgusu (BL:27 + BL:29 AYNI ANDA vurguludur,
 * farklı tonlarda). Bu yüklem `aria-current` SÜRMEZ: iki `aria-current="page"`
 * ekran okuyucuya "iki ayrı sayfadasınız" derdi.
 *
 * CURRENT olan öğe ATA sayılmaz — ikisi karşılıklı DIŞLAYICIdır, böylece bir
 * satır aynı anda hem koyu (bulunulan) hem soluk (ata) tonuna düşemez.
 */
export function isFinancialNavItemAncestor(
  pathname: string,
  item: FinancialNavItem,
): boolean {
  if (item.kind !== "link") return false;
  if (isFinancialNavItemCurrent(pathname, item)) return false;
  return pathname.startsWith(`${item.href}/`);
}

/**
 * Verili yolda CURRENT görünen öğelerin etiketleri. Testin "AYNI ANDA KAÇ öğe
 * `aria-current` alır" sorusunu sorabilmesi için vardır (K7 bekçisi).
 */
export function activeFinancialNavLabels(pathname: string): readonly string[] {
  return [FINANCIAL_NAV_PARENT, ...FINANCIAL_SUB_NAV, ...FINANCIAL_SIBLING_NAV]
    .filter((item) => isFinancialNavItemCurrent(pathname, item))
    .map((item) => item.label);
}
