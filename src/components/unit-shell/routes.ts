/**
 * F-UNIT1 T2 · Blok/Ünite form AİLESİNİN ortak rota ve sekme sabitleri.
 *
 * İki mockup da (BE 47-53 · UE 49-55) AYNI beş sekmelik şeridi çizer. Şerit tek
 * yerde tanımlanır: iki kopya, biri güncellenip öteki unutulduğunda sessizce
 * ayrışır (`PersonnelTabsStrip` emsali — o da üç ekran tarafından paylaşılır).
 */

/** BE 38/112 · UE 40/125 "İptal" hedefi ve başarılı kaydın dönüş yeri. */
export const SALES_LIST_HREF = "/satis";

/** BE'nin kendi rotası (`Form - Blok Ekle.dc.html`). */
export const BLOCK_FORM_HREF = "/satis/blok-ekle";

/** UE'nin kendi rotası (`Form - Unite Ekle.dc.html`). */
export const UNIT_FORM_HREF = "/satis/unite-ekle";

export type UnitFormTabLabel = "Blok Ekle" | "Ünite Ekle";

export interface UnitFormTabDef {
  readonly label: string;
  /** Rotası YAZILMIŞ sekmenin hedefi; yazılmamışta `undefined`. */
  readonly href?: string;
  /** Devre-dışı sekmenin kullanıcıya GÖRÜNEN gerekçesi. */
  readonly pendingReason?: string;
}

/**
 * 🔴 ÜÇ SEKME F-UNIT2 KAPSAMINDADIR ve rotaları HENÜZ YOKTUR. Kanon (F-TH):
 * rotası olmayan mockup öğesi SİLİNMEZ — devre dışı + GÖRÜNÜR gerekçeyle
 * basılır; gerekçe `title`da SAKLANMAZ. Rotalar yazıldığında `href` eklenir ve
 * gerekçe KENDİLİĞİNDEN kalkar (`ProjectDetailTabs` deseni).
 */
export const UNIT_FORM_TABS_PENDING_REASON =
  "Toplu üretim, Excel içe aktarma ve paylaşım girişi ekranları henüz açılmadı — üniteleri şimdilik tek tek ekleyin";

export const UNIT_FORM_TABS: readonly UnitFormTabDef[] = [
  { label: "Blok Ekle", href: BLOCK_FORM_HREF }, // BE 48 / UE 50
  { label: "Ünite Ekle", href: UNIT_FORM_HREF }, // BE 49 / UE 51
  { label: "Toplu Üretim", pendingReason: UNIT_FORM_TABS_PENDING_REASON }, // BE 50 / UE 52
  { label: "Excel İçe Aktar", pendingReason: UNIT_FORM_TABS_PENDING_REASON }, // BE 51 / UE 53
  { label: "Paylaşım Girişi", pendingReason: UNIT_FORM_TABS_PENDING_REASON }, // BE 52 / UE 54
];
