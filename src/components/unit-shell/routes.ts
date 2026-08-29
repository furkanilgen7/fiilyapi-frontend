import { routes } from "@/lib/routes";
/**
 * F-UNIT1 T2 · Blok/Ünite form AİLESİNİN ortak rota ve sekme sabitleri.
 *
 * Üç mockup da (BE 47-53 · UE 49-55 · TU 47-53) AYNI beş sekmelik şeridi
 * çizer. Şerit tek yerde tanımlanır: iki kopya, biri güncellenip öteki
 * unutulduğunda sessizce ayrışır (`PersonnelTabsStrip` emsali — o da üç ekran
 * tarafından paylaşılır).
 */

/** BE 38/112 · UE 40/125 · TU 39/181 "İptal" hedefi ve başarılı kaydın dönüş yeri. */
export const SALES_LIST_HREF = routes.sales.root();

/** BE'nin kendi rotası (`Form - Blok Ekle.dc.html`). */
export const BLOCK_FORM_HREF = routes.sales.addBlock();

/** UE'nin kendi rotası (`Form - Unite Ekle.dc.html`). */
export const UNIT_FORM_HREF = routes.sales.addUnit();

/** TU'nun kendi rotası (`Form - Toplu Unite.dc.html`, F-UNIT2 T2a). */
export const BULK_UNIT_FORM_HREF = routes.sales.bulkUnits();

/** EI'nin kendi rotası (`Form - Unite Excel Import.dc.html`, F-UNIT2 T2b). */
export const UNIT_IMPORT_FORM_HREF = routes.sales.importUnits();

/** PG'nin kendi rotası (`Form - Paylasim Girisi.dc.html`, F-UNIT2 T2c). */
export const LAND_SHARE_ALLOCATION_FORM_HREF = routes.sales.landShareAllocation();

export type UnitFormTabLabel =
  | "Blok Ekle"
  | "Ünite Ekle"
  | "Toplu Üretim"
  | "Excel İçe Aktar"
  | "Paylaşım Girişi";

export interface UnitFormTabDef {
  readonly label: UnitFormTabLabel;
  /** Rotası YAZILMIŞ sekmenin hedefi; yazılmamışta `undefined`. */
  readonly href?: string;
}

export const UNIT_FORM_TABS: readonly UnitFormTabDef[] = [
  { label: "Blok Ekle", href: BLOCK_FORM_HREF }, // BE 48 / UE 50 / TU 48
  { label: "Ünite Ekle", href: UNIT_FORM_HREF }, // BE 49 / UE 51 / TU 49
  { label: "Toplu Üretim", href: BULK_UNIT_FORM_HREF }, // BE 50 / UE 52 / TU 50
  { label: "Excel İçe Aktar", href: UNIT_IMPORT_FORM_HREF }, // BE 51 / UE 53 / TU 51
  { label: "Paylaşım Girişi", href: LAND_SHARE_ALLOCATION_FORM_HREF }, // BE 52 / UE 54 / TU 52
];

/** "A, B ve C" — gerekçe cümlesinin Türkçe listesi. */
function joinTurkish(labels: readonly string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} ve ${labels[labels.length - 1]}`;
}

/**
 * 🔴 GEREKÇE SABİT DEĞİL, TÜREVDİR — ve bu yükü taşır.
 *
 * Bu sabit önce DONMUŞ tek bir cümleydi ve ÜÇ ekranı adıyla sayıyordu
 * ("Toplu üretim, Excel içe aktarma ve paylaşım girişi ekranları henüz
 * açılmadı"). F-UNIT2 T2a "Toplu Üretim"i GERÇEK rotaya bağladığı anda o
 * cümle YALAN olurdu: ekran canlıdayken kullanıcıya "henüz açılmadı" diye
 * bakan bir paragraf kalırdı. `ProjectDetailTabs`in düzelttiği çürüme sınıfı
 * tam olarak budur.
 *
 * Bu yüzden gerekçe artık `href`i OLMAYAN sekmelerin ETİKETLERİNDEN üretilir:
 * her yeni rota ile cümle KENDİLİĞİNDEN kısalır ve sonuncusu bağlandığında
 * `null` dönerek paragraf kendiliğinden kaybolur (`UnitFormTabs` `null`ı
 * basmaz). Ayrı bir temizlik adımı GEREKMEZ, dolayısıyla unutulamaz.
 *
 * 🔴 F-UNIT2 T2c İTİBARIYLA BEŞ SEKMENİN BEŞİ DE ROTALIDIR ve bu işlev
 * `UNIT_FORM_TABS` için artık `null` döner — paragraf EKRANDAN KALKTI.
 * Mekanizma SİLİNMEZ: tam olarak bu kendiliğinden kalkma, sabit bir cümlenin
 * ekranda çürümesini engelleyen davranıştır ve aile altıncı bir sekme
 * kazandığında yine çalışması gerekir. `UnitFormTabs.test.tsx` hem "hiç
 * bekleyen sekme yokken paragraf BASILMAZ" hem de "rotasız sekme verilince
 * cümle kurulur" iddialarını ayrı ayrı ölçer.
 */
export function unitFormTabsPendingReason(
  tabs: readonly UnitFormTabDef[] = UNIT_FORM_TABS,
): string | null {
  const pending = tabs.filter((tab) => tab.href === undefined).map((tab) => tab.label);
  if (pending.length === 0) return null;
  return pending.length === 1
    ? `${pending[0]} ekranı henüz açılmadı — bu sekme şimdilik tıklanamaz`
    : `${joinTurkish(pending)} ekranları henüz açılmadı — bu sekmeler şimdilik tıklanamaz`;
}
