/**
 * "Yeni Depo Ekle" diyaloğunun metin envanteri (F-BLG T2c).
 *
 * Kanon: `Form - Depo Ekle.dc.html` (DP). Yorumlardaki sayılar O DOSYANIN
 * satır numaralarıdır.
 *
 * ⚠️ Bu form ONAYLI SAPMA S-FRM'in DIŞINDADIR: mockup'ında "Form Kütüphanesi"
 * harness'ı YOKTUR ve zaten DİYALOG olarak çizilmiştir (tasarım notu 31-33:
 * "stok girişi akışının ORTASINDA açılıyor").
 *
 * ⚠️ ESKİ SAPMA S3 GEÇERSİZ: bu diyalog "hiçbir mockup'ta yok" gerekçesiyle
 * türetilmişti; mockup geldi → MOCKUP KAZANIR (yönetim kararı). En görünür
 * fark: eski form İKİ adımlıydı (Proje → Şantiye), mockup TEK "Bağlı Şantiye"
 * seçicisi çizer (86-96) ve seçenek metni "Şantiye · Proje" biçimindedir.
 */

/** `WarehouseCreate.name` — mockup 83 "Maks 100 karakter". */
export const MAX_LENGTH = {
  name: 100,
} as const;

/** Boş (seçilmemiş) seçenek değeri = MERKEZ DEPO. */
export const EMPTY_OPTION_VALUE = "";

export const WAREHOUSE_TEXT = {
  title: "Yeni Depo Ekle", // 72
  subtitle: "Stok kalemleri bu depoya kaydedilir", // 73
  name: "Depo Adı", // 81
  namePlaceholder: "Örn. D-4 Kapalı Ambar", // 82
  nameHint: "Maks 100 karakter", // 83
  site: "Bağlı Şantiye", // 87
  siteEmptyOption: "— Merkez Depo (şantiyeye bağlı değil)", // 89
  siteHintPrefix: "Boş bırakılırsa ", // 95
  siteHintStrong: "Merkez Depo", // 95
  siteHintSuffix: " olarak kaydedilir — tüm projeler kullanabilir", // 95
  previewTitle: "Önizleme", // 100
  previewIcon: "🏢", // 102
  previewNamePlaceholder: "Depo adı girilmedi", // 104
  previewCentralLabel: "Merkez Depo", // 105
  centralBadge: "MERKEZ", // 107
  keepFlow: "Kaydettikten sonra stok girişine dön", // 123
  cancel: "İptal", // 125
  submit: "Depoyu Oluştur", // 126
} as const;

/**
 * 111-116 · merkez/şantiye farkını anlatan mavi bilgi kutusu. `<strong>`
 * parçaları ayrı taşınır ki metin kopyalanmadan basılabilsin.
 */
export const CENTRAL_INFO = {
  leadStrong: "Merkez depo", // 113
  middle: " ile ",
  secondStrong: "şantiye deposu", // 113
  tail:
    " farkı: merkez depodan tüm şantiyelere malzeme transferi yapılabilir; şantiye deposu yalnızca kendi şantiyesinin stoğunu tutar.", // 113-114
} as const;

/** 90-93 · seçenek metni: "A-Blok Şantiyesi · Güneşkent Konut". */
export function buildSiteOptionLabel(siteName: string, projectName: string): string {
  return `${siteName} · ${projectName}`;
}

/** Zorunlu ad kapısı — mockup 81 `*`. */
export const NAME_REQUIRED_MESSAGE = "Depo adı zorunludur.";

/**
 * 🔴 119-127 · "Kaydettikten sonra stok girişine dön" onay kutusu. Stok
 * girişi ekranı ŞANTİYE KAPSAMLIdır
 * (`/projeler/{projectId}/santiyeler/{siteId}/stok/giris` — proje ve şantiye
 * ROTADAN gelir, kapsamsız bir stok giriş rotası YOKTUR). Merkez depo
 * seçiliyken dönülecek bir ekran olmadığından kutu devre-dışı kalır; öğe
 * SİLİNMEZ ve gerekçe GÖRÜNÜR durur.
 */
export const KEEP_FLOW_NEEDS_SITE_REASON =
  "Stok girişi ekranı şantiye kapsamındadır; merkez depo için açılacak bir stok giriş ekranı yok. Şantiye seçerseniz kayıttan sonra oraya dönülür.";

/** Alt istekleri düşen projeler için GÖRÜNÜR bant (sessiz atlama yasak). */
export function buildSiteFanOutErrorMessage(projectNames: readonly string[]): string {
  return `${projectNames.join(", ")} projesinin şantiyeleri yüklenemedi — bu projelerin şantiyeleri aşağıdaki listede YOK. Sayfayı yenileyip tekrar deneyin.`;
}
