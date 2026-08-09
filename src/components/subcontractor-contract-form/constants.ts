/**
 * FSO (`Form - Sözleşme Oluştur.dc.html`) sabitleri.
 *
 * ⚠️ Bu mockup **TAŞERON** sözleşmesi formudur (işveren sözleşmesi proje
 * formunda kurulur). Parantez içindeki sayılar o dosyanın SATIR numaralarıdır.
 * Uzunluk sınırları openapi `SubcontractorContractCreate` şemasından alınır —
 * ezberden yazılmaz.
 */

/** openapi `SubcontractorContractCreate` `maxLength` değerleri. */
export const MAX_LENGTH = {
  /** `contract_no` (90 "Sözleşme No"). */
  contractNo: 100,
  /** `work_category` (82 "İş Kategorisi"). */
  workCategory: 100,
} as const;

/** `advance_pct` / `retainage_pct` şema sınırı (0 ≤ x ≤ 100). */
export const PCT_MIN = 0;
export const PCT_MAX = 100;

/**
 * 82 · "İş Kategorisi" açılırının seçenekleri — mockup'taki ALTI seçenek
 * BİREBİR. Backend'de karşılık serbest metindir (`work_category`, ≤100);
 * enum YOKTUR, bu yüzden seçenek listesi mockup'ın kendisidir ve TL'deki
 * kategori rozetiyle aynı serbest metin havuzuna yazar.
 */
export const WORK_CATEGORY_OPTIONS: readonly string[] = [
  "Betonarme",
  "Elektrik",
  "Mekanik Tesisat",
  "Sıhhi Tesisat",
  "Doğrama",
  "Boya & Kaplama",
];

/** 76 · taşeron seçicisinin son seçeneği; seçilince modal açılır. */
export const NEW_SUBCONTRACTOR_OPTION = "__new__";

/** Metin envanteri — testlerin ve ekranın TEK kaynağı. */
export const FSO_TEXT = {
  title: "Yeni Taşeron Sözleşmesi", // 47
  subtitle:
    "Poz listesi işveren sözleşmesinden yüklenir — taşeron birim fiyatlarını siz belirlersiniz", // 48
  breadcrumbRoot: "Taşeronlar", // 36
  breadcrumbCurrent: "Yeni Taşeron Sözleşmesi", // 36
  submit: "Sözleşmeyi Oluştur", // 40, 235
  projectCard: "🔗 Proje Bağlantısı", // 52
  subcontractorCard: "🏗 Taşeron Bilgileri", // 72
  termsCard: "📝 Sözleşme Şartları", // 88
  itemsCard: "⭐ Poz Listesi & Taşeron Fiyatları", // 114
  documentsCard: "📎 Sözleşme Belgeleri", // 191
  employerContractHint: "Poz listesi buradan gelir", // 65
  itemsBanner:
    "Poz isimleri işveren sözleşmesinden geldi. Sarı alanlara taşerona ödeyeceğiniz birim fiyatları girin — bu fiyatlar tüm hakedişlerde otomatik kullanılır.", // 118-120
  itemsTotal: "TOPLAM SÖZLEŞME BEDELİ", // 181
  loadFromEmployer: "İşveren Sözleşmesinden Yükle",
  addItem: "+ Poz Ekle", // 116
  addItemRow: "Poz listesinden seç veya yeni poz ekle", // 174
  missingPriceLabel: "girilmedi",
} as const;

/**
 * 116 / 172-175 · elle poz ekleme. Backend ucu VAR
 * (`POST /subcontractor-contracts/{id}/items`) ama mockup satır/alan formunu
 * ÇİZMEMİŞTİR (kod/ad/birim hücreleri salt metindir, yazılabilir değildir).
 * WORKFLOW §3: mockup'ta olmayan FORM icat edilmez — buton SİLİNMEZ, yerinde
 * devre-dışı + görünür gerekçeyle basılır ve mockup istenir.
 */
export const ADD_ITEM_PENDING_REASON =
  "Elle poz ekleme formu mockup'ta çizili değil — form geldiğinde açılacak";

/** Sözleşme kurulmadan poz listesi çalıştırılamaz (uç sözleşme kimliği ister). */
export const ITEMS_NEED_PROJECT_REASON =
  "Poz listesi için önce proje seçilmelidir — poz uçları sözleşme kimliğiyle çalışır";
