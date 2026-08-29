import "@/components/project-detail/project-detail.css";
import "@/components/site-detail/site-detail.css";

/**
 * Proje/Şantiye rota grubunun kabuğu.
 *
 * 🔴 DRILL-IN KENAR ÇUBUĞU BASILMAZ — 🔴 ONAYLI SAPMA (kullanıcı kararı
 * 2026-08-29). Proje/Şantiye mockup'ları bu menüyü ÇİZER; kullanıcı birebir
 * şunu söyledi: «bu projenin içinde şantiyeye tıkladığımız zaman ekstra bir
 * side bar oluyor ya onu öyle yapmayalım». Yani bu mockup-birebir kuralından
 * BİLİNÇLİ, ONAYLI bir sapmadır — SONRAKİ TUR "mockup çiziyor" DİYE GERİ
 * ALMASIN. `DrillSidebar` global kabuk sidebar'ıyla BİREBİR aynı konumdaydı
 * (`fixed; top: 52px; left: 0; z-index: 90`) ve onu ÖRTÜYORDU: bu ekranlara
 * girince ana menü kayboluyordu. Kullanıcı bunu kusur olarak bildirdi. Aynı
 * kusur Mali Tablolar'da da yaşanmış ve aynı kararla kapanmıştı (`7f3a8ae`;
 * bkz. `BalanceSheetView` / `CashFlowStatementView` docstring'leri) — bu,
 * kararın İKİNCİ uygulanışıdır.
 *
 * 🔴 GEZİNME KAYBI YOKTUR (ölçüldü):
 * - Çubuğun ŞANTİYE grubu (7 öğe) `SiteDetailTabs` ile BİREBİR aynıdır ve o
 *   şerit şantiyenin bütün alt ekranlarında zaten basılır.
 * - Çubuğun global modül kısayolları (Puantaj · Personel · Makine · Bordro ·
 *   Stok · Satınalma · Sözleşmeler · Satış · Muhasebe · Hazine · Mali
 *   Tablolar · İşveren Hakediş) kabuk nav'ında (`nav-config.ts`) zaten
 *   vardır; çubuk kalkınca ana menü GERİ GÖRÜNÜR olur. "Taşeron Hakediş"
 *   kabuk nav'ında ayrı öğe değildir ama `/hakedisler` içindeki
 *   `ProgressPaymentsTabs` şeridinden bir tıkla açılır.
 * - Çubuğun "Tüm Projeler" öğesi = kabuk nav'ındaki "Projeler".
 * - Çubuğun TEK karşılıksız kalan öğesi ŞANTİYEDEN PROJEYE ÇIKIŞ'tı
 *   (`backHref` + bağlam grubundaki proje adı). Sessizce kaybedilmedi:
 *   `SiteHeroBar` üst satırındaki proje adı artık Proje Detay'a giden bir
 *   BAĞLANTIDIR (ürünün kendi kırıntı deseni; yeni tasarım icat edilmedi).
 *
 * 🔴 `.drill-content` sarmalayıcısı da KALKTI. Ofset çubukla birlikte
 * yaşıyordu; kalsaydı içerik 260px'lik olmayan bir çubuğun yerini boş
 * bırakıp sağa kaymış görünürdü. İçerik artık global `.app-content`
 * ofsetini (margin-left: 220px; padding: 28px 32px) kullanır.
 *
 * Dosya SİLİNMEZ: iki stylesheet'in rota grubu genelinde yüklenmesini bu
 * layout sağlar. `ozet` / `paylasim` sayfaları `ProjectDetailTabs` basar ama
 * `project-detail.css`i kendileri import ETMEZ (ölçüldü) — import buradan
 * düşerse o iki ekranın sekme şeridi stilsiz kalır.
 */
export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
