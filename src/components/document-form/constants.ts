/**
 * Belge yükleme formlarının metin/seçenek envanteri (F-BLG T2b).
 *
 * İKİ mockup, İKİ ayrı uç:
 *   EKP = `Form - Ekipman Belgesi.dc.html` → `POST /equipment/{id}/documents`
 *   ARŞ = `Form - Belge Ekle.dc.html`      → `POST /documents`
 * Parantez içindeki sayılar ilgili dosyanın SATIR numaralarıdır.
 *
 * ⚠️ ONAYLI SAPMA S-FRM: mockup'ların üst şeridi (EKP 37-50 · ARŞ 38-50),
 * breadcrumb'ı ve sol menüsü (EKP 53-67 · ARŞ 53-64) tasarım kütüphanesinin
 * HARNESS'ıdır, ürün kabuğu değildir — bu formlar diyalog olarak basılır.
 * Gövde/alan/etiket/ölçü BİREBİR kalır.
 */

/** openapi `maxLength` değerleri (mockup ipuçlarıyla da örtüşür). */
export const MAX_LENGTH = {
  /** `description` — ARŞ 133 "Maks 2000 karakter" */
  description: 2000,
} as const;

/* ── EKP · Ekipman Belgesi ─────────────────────────────────────────────── */

export const EQUIPMENT_DOCUMENT_TEXT = {
  title: "Ekipman Belgesi Ekle", // 71
  subtitle: "Ruhsat, sigorta, muayene raporu gibi ekipman belgelerini yükle", // 72
  documentCountSuffix: "belge kayıtlı", // 81
  fileCard: "📎 Dosya", // 86
  file: "Dosya", // 86
  fileAccept: ".pdf,image/*", // 88
  dropTitle: "Belgeyi buraya sürükleyin veya tıklayın", // 90
  dropHint: "PDF veya fotoğraf · Maks 20 MB", // 91
  infoCard: "📋 Belge Bilgileri", // 97
  type: "Belge Türü", // 100
  typePlaceholderOption: "Tür seçiniz...", // 102
  documentNo: "Belge No", // 112
  documentNoPlaceholder: "Örn. TC-48-MUA-2026", // 113
  issueDate: "Düzenlenme Tarihi", // 116
  validUntil: "Geçerlilik Bitiş Tarihi", // 120
  validUntilHint: "Boş bırakılırsa süre takibi yapılmaz", // 122
  badgePreviewTitle: "Süre takibi nasıl çalışır?", // 128
  noteCard: "📝 Not", // 148
  /** Kart başlığı emojiyi taşır; alan etiketi erişilebilir ad olarak sade kalır. */
  note: "Not", // 148
  notePlaceholder: "Belgeyle ilgili notlar, yenileme prosedürü, ilgili kurum...", // 149
  noteHint: "Maks 2000 karakter", // 150
  cancel: "İptal", // 154
  submit: "Belgeyi Kaydet", // 155
} as const;

export interface BadgeLegendRow {
  label: string;
  description: string;
  tone: "ok" | "warn" | "danger";
}

/**
 * 126-143 · Rozet önizleme kutusu — SALT-GÖRSEL bir açıklamadır, forma
 * GİRMEZ. Rozet SUNUCU tarafından üretilir (mockup'ın kendi tasarım notu,
 * 34); burada yalnız kuralın anlatımı basılır.
 */
export const EQUIPMENT_BADGE_LEGEND: readonly BadgeLegendRow[] = [
  { label: "Geçerli", description: "Bitiş tarihine 30 günden fazla var", tone: "ok" }, // 131-132
  {
    label: "Yakında Doluyor",
    description: "30 gün kaldı — sorumluya bildirim gider",
    tone: "warn",
  }, // 135-136
  { label: "Süresi Doldu", description: "Ekipman kullanım uyarısı verilir", tone: "danger" }, // 139-140
];

/**
 * 🔴 EKP 111-114 · "Belge No" — KARŞILIĞI YOK.
 * `Body_create_equipment_document_...` gövdesi YALNIZ `file`, `type_id` ve
 * `valid_until` taşır. Alan SİLİNMEZ (F-TH kanonu), devre-dışı basılır ve
 * gerekçe GÖRÜNÜR durur.
 */
export const EQUIPMENT_DOCUMENT_NO_REASON =
  "Belge No sunucuda saklanmıyor — ekipman belgesi ucu yalnız dosya, belge türü ve geçerlilik tarihi alıyor. Alan, karşılığı açılana kadar devre dışı.";

/** 🔴 EKP 115-118 · "Düzenlenme Tarihi" — aynı gerekçe ailesi. */
export const EQUIPMENT_ISSUE_DATE_REASON =
  "Düzenlenme Tarihi sunucuda saklanmıyor — yalnız Geçerlilik Bitiş Tarihi (valid_until) kaydediliyor. Alan, karşılığı açılana kadar devre dışı.";

/**
 * 🔴 EKP 147-151 · "📝 Not" kartı — şemada `note` alanı YOKTUR.
 * Kart SİLİNMEZ; metin kutusu devre-dışı basılır ve gerekçe kartın altında
 * GÖRÜNÜR durur.
 */
export const EQUIPMENT_NOTE_REASON =
  "Not alanı sunucuda yok — ekipman belgesi ucunda serbest metin taşınmıyor. Yazılan not hiçbir yere kaydedilemeyeceği için alan devre dışı bırakıldı.";

/* ── ARŞ · Belge Ekle (genel arşiv) ────────────────────────────────────── */

export const ARCHIVE_DOCUMENT_TEXT = {
  title: "Belge Ekle", // 68
  subtitle: "Genel arşive belge yükle — proje ve şantiye ile ilişkilendir", // 69
  fileCard: "📎 Dosya", // 73
  file: "Dosya", // 73
  dropTitle: "Dosyayı buraya sürükleyin veya tıklayın", // 77
  dropHint: "PDF, DOCX, XLSX, JPG, PNG, DWG · Maks 50 MB", // 78
  relationCard: "🔗 İlişkilendirme", // 84
  project: "Proje", // 87
  projectPlaceholderOption: "Proje seçiniz...", // 89
  projectHint: "Şantiye listesi seçilen projeye göre gelir", // 96
  site: "Şantiye", // 99
  siteEmptyOption: "— Proje geneli (şantiye yok)", // 101
  siteHint: "Boş bırakılırsa belge proje köküne kaydedilir", // 105
  folder: "Klasör", // 108
  folderEmptyOption: "— Klasörsüz", // 110
  documentName: "Belge Adı", // 122
  documentNamePlaceholder: "Dosya adı kullanılır", // 123
  documentNameHint: "Boş bırakılırsa yüklenen dosyanın adı alınır", // 124
  descriptionCard: "📝 Açıklama", // 131
  /** Kart başlığı emojiyi taşır; alan etiketi erişilebilir ad olarak sade kalır. */
  description: "Açıklama", // 131
  descriptionPlaceholder:
    "Belgenin içeriği, hangi işe ait olduğu, dikkat edilmesi gerekenler...", // 132
  descriptionHint: "Maks 2000 karakter · Arama sonuçlarında bu metin de taranır", // 133
  keepOpen: "Yükledikten sonra başka belge ekle", // 139
  cancel: "İptal", // 142
  submit: "Belgeyi Yükle", // 143
} as const;

/**
 * 🔴 ARŞ 121-125 · "Belge Adı" — KARŞILIĞI YOK.
 * `Body_upload_document_endpoint_documents_post` böyle bir alan tanımlamaz;
 * `filename` YALNIZ `PATCH /documents/{id}` ile değiştirilebilir. Alan
 * SİLİNMEZ, devre-dışı basılır; mockup'ın kendi hint'i (124) KORUNUR ve
 * gerekçe ayrıca GÖRÜNÜR basılır.
 */
export const ARCHIVE_DOCUMENT_NAME_REASON =
  "Belge Adı yükleme sırasında belirlenemiyor — sunucu dosyanın kendi adını alıyor; ad değişikliği belge yüklendikten sonra düzenlenerek yapılıyor. Alan bu yüzden devre dışı.";

/** Şantiye seçicisinin proje seçilene kadar kapalı olma gerekçesi (ARŞ 34). */
export const ARCHIVE_SITE_NEEDS_PROJECT_REASON =
  "Şantiye listesi seçilen projeye göre gelir — önce proje seçin.";

/** Klasör seçicisinin proje seçilene kadar kapalı olma gerekçesi (ARŞ 107-120). */
export const ARCHIVE_FOLDER_NEEDS_PROJECT_REASON =
  "Klasör listesi seçilen projeye göre gelir — önce proje seçin.";

/** Boş (seçilmemiş) seçenek değeri — proje/şantiye/klasör seçicileri için. */
export const EMPTY_OPTION_VALUE = "";
