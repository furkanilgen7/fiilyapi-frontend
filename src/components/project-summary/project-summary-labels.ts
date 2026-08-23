import { UNIT_KIND_LABELS } from "@/components/sales/unit-occupancy";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { ProjectType } from "@/lib/api/hooks/useProjects";
import type {
  UnitKind,
  UnitKindBreakdown,
  UnitOwnerSide,
  UnitSalesStatus,
} from "@/lib/api/hooks/useProjectUnits";

/**
 * F-PKK T1 · Proje Özeti (`/projeler/[projectId]/ozet`) ve Paylaşım Tablosu
 * (`/projeler/[projectId]/paylasim`) ekranlarının SAF katmanı: etiket
 * eşlemeleri, türev etiket işlevleri ve devre-dışı gerekçeleri.
 *
 * Kanonik mockup'lar ve yorumlardaki kısaltmalar:
 *   KY  = `Proje - Kendi Yatırım.dc.html`
 *   KK  = `Proje - Kat Karşılığı.dc.html`
 *   KKP = `Kat Karşılığı - Paylaşım.dc.html`
 *   UE  = `Form - Unite Ekle.dc.html`
 * Parantez içi sayılar O dosyaların SATIR numaralarıdır (bu turda `grep -n`
 * ile ÖLÇÜLDÜ).
 *
 * ⚠️ K5: backend Türkçe DÖNDÜRMEZ — enum değerleri İngilizcedir ve ekranın
 * gördüğü her sözcük burada üretilir.
 *
 * ⚠️ Bu modülde AĞ, DOM ve PARA/YÜZDE HESABI YOKTUR. Sayaçlar tamsayıdır ve
 * sunucudan gelir; bir oran/tutar türevi gerekirse `src/lib/decimal.ts`e
 * gider, buraya DEĞİL (spec §6). Yasak `project-summary-labels.test.ts`te
 * yapısal olarak çakılıdır.
 */

// --- Proje türü (KY 67 · KK 69 hero üst satırı) --------------------------

/**
 * 🔴 `PROJECT_TABS` (`components/projects/tabs.ts`) AYNI ÜÇ DİZEYİ taşır ama
 * ONUN tipi `ProjectTab`tır ve iki üye FAZLASI vardır (`all`, `completed`) —
 * liste süzgecinin sözlüğüdür. Burada gereken TAM (`Record<ProjectType,…>`)
 * bir eşlemedir: şemaya dördüncü bir proje türü eklenirse bu dosya DERLENMEZ,
 * sekme dizisi ise sessizce eksik kalırdı. İki sözlük ayrı yaşar, metinleri
 * ayrışmasın diye testte karşılaştırılır.
 */
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  taahhut: "Taahhüt",
  kendi_yatirim: "Kendi Yatırım", // KY 67 "Kendi Yatırım · Konut Geliştirme"
  kat_karsiligi: "Kat Karşılığı", // KK 68 "Kat Karşılığı · Arsa Sahibi: …"
};

// --- Ünite türü (KY 71 · KK 72/121/155 · KKP kırılımları) ----------------

/**
 * 🔴 YENİ SÖZLÜK YAZILMADI. `sales/unit-occupancy.ts` (F-P8) beş üyeyi zaten
 * eşliyor ve metinleri mockup'a dayalı; ikinci bir kopya blok haritasıyla
 * proje özeti arasında sessiz bir ayrışma kapısı olurdu. AYNI NESNE yeniden
 * dışa açılır (`timesheet-codes.ts` emsali).
 */
export { UNIT_KIND_LABELS };

/**
 * Kırılım metninin sırası — `UnitKind` enum'unun BİLDİRİM SIRASI. Şema
 * açıklaması: *"uc yeni deger yalniz sayaclara eklenir ve sifirsa gorunmez"*,
 * yani `office`/`warehouse`/`parking` listenin SONUNDADIR ve sıfırsa hiç
 * görünmez.
 */
const UNIT_KIND_ORDER: readonly UnitKind[] = [
  "apartment",
  "shop",
  "office",
  "warehouse",
  "parking",
];

/**
 * KY 71 "48 Daire + 4 Dükkan" · KK 72/121/155 · KKP başlıkları.
 *
 * Girdi SUNUCUNUN sayacıdır (`UnitTotals.counts` / `UnitSideSummary.counts`),
 * istemcide sayılmış bir dizi DEĞİL — `GET /projects/{id}/units` SAYFASIZDIR
 * ama kırılımı yine de sunucu verir ve türev tek yerde kalır.
 *
 * `counts.total` METNE GİRMEZ: o sunucuda türevdir (iki sayacın toplamı
 * saklanmaz) ve metne katılsaydı çift sayım olurdu.
 *
 * Boş kırılım BOŞ DİZE döndürür — "0 ünite" gibi bir cümle UYDURULMAZ,
 * kararı çağıran verir.
 */
export function unitKindBreakdownText(counts: UnitKindBreakdown): string {
  return UNIT_KIND_ORDER.filter((kind) => counts[kind] > 0)
    .map((kind) => `${counts[kind]} ${UNIT_KIND_LABELS[kind]}`)
    .join(" + ");
}

// --- Sahip tarafı (KKP 90 "Sahip" sütunu) --------------------------------

/** KKP 100 `BİZ` (`#0f766e` zemin) · KKP 109 `ARSA` (`#94a3b8` zemin). */
export const OWNER_SIDE_LABELS: Record<UnitOwnerSide, string> = {
  contractor: "BİZ",
  landowner: "ARSA",
};

// --- Satış durumu: TEK ENUM YETMEZ ---------------------------------------

/**
 * `UnitSalesStatus` enum'unun Türkçe karşılıkları — UE 94 KAPALI kümesi
 * birebir ("Satışta (Boş) · Rezerve · Satıldı · Satışa Kapalı"). Tablo
 * rozetinde KKP'nin kısa hâli kullanılır (KKP 120 "Satışta").
 */
export const UNIT_SALES_STATUS_LABELS: Record<UnitSalesStatus, string> = {
  listed: "Satışta", // KKP 120
  reserved: "Rezerve", // KKP 129
  sold: "Satıldı", // KKP 102
  closed: "Satışa Kapalı", // UE 94
};

/** KKP 111/138/156 — arsa sahibinin ünitesinde satış durumu yerine bu basılır. */
export const LANDOWNER_UNIT_LABEL = "Arsa Sahibinde";

/**
 * KKP 92 "Satış Durumu" sütununun GERÇEK etiketi.
 *
 * 🔴 NAİF `Record<UnitSalesStatus,string>` EŞLEMESİ YANLIŞTIR ve şema
 * açıklaması gerekçeyi kendi yazıyor: *"'Arsa Sahibinde' (KKP 92) bu kumeye
 * GIRMEZ: o `owner_side='landowner'` turevidir ve zaten `is_landowner_share`
 * olarak doner."* Yani sütunun bir değeri ENUM'DA YOKTUR — ikinci alandan
 * türer.
 *
 * Sıra ÖNEMLİDİR: arsa kontrolü ÖNCE gelir. Sunucu arsa satırına `listed`
 * damgalasa bile mockup "Satışta" BASMAZ — o ünite bizim satış sistemimize
 * dahil değildir (KK 170: *"Arsa sahibi ünitelerini kendisi satar"*).
 *
 * Damgası olmayan (ve arsaya ait olmayan) ünite için `null` döner: uydurma
 * bir durum basmak yerine kararı çağıran verir.
 */
export function unitSalesStatusLabel(
  salesStatus: UnitSalesStatus | null,
  ownerSide: UnitOwnerSide | null,
): string | null {
  if (ownerSide === "landowner") return LANDOWNER_UNIT_LABEL;
  if (salesStatus === null) return null;
  return UNIT_SALES_STATUS_LABELS[salesStatus];
}

// --- Devre-dışı gerekçeleri (F-TH kanonu: SİLİNMEZ, gerekçesi GÖRÜNÜR) ---

/**
 * Bu ekranların okuduğu `pending_module` anahtarları. Metinler BURADA
 * YAZILMAZ — tek kaynak `src/lib/pending-modules.ts`tir; kopyalansaydı iki
 * dosya ayrışır ve oradaki çürüme bekçisi buradaki kopyayı GÖRMEZDİ.
 */
export const PROJECT_SUMMARY_PENDING_KEYS = {
  /** KY 83 · KK 89 · KKP 183 "İnşaat İlerlemesi". */
  constructionProgress: "construction_progress",
  /** KY 103 "Nakit Durumu". */
  cashPosition: "project_cash_position",
  /** KY 193 "Başabaş noktası: 32 ünite". */
  salesBreakeven: "sales_breakeven",
  /** KKP 176-197 "Arsa Sahibi Teslim Takibi" kartı. */
  landownerDelivery: "landowner_delivery_tracking",
  /** KK 218 "Durum" sütunu (227/235 "Aktif" · 243 "Başlamadı"). */
  subcontractorStatus: "subcontractor_contract_status",
} as const;

export const REASONS = {
  constructionProgress: pendingModuleLabel(PROJECT_SUMMARY_PENDING_KEYS.constructionProgress),
  cashPosition: pendingModuleLabel(PROJECT_SUMMARY_PENDING_KEYS.cashPosition),
  salesBreakeven: pendingModuleLabel(PROJECT_SUMMARY_PENDING_KEYS.salesBreakeven),
  landownerDelivery: pendingModuleLabel(PROJECT_SUMMARY_PENDING_KEYS.landownerDelivery),
  subcontractorStatus: pendingModuleLabel(PROJECT_SUMMARY_PENDING_KEYS.subcontractorStatus),
  /**
   * KY taşeron tablosunda taşeron ADININ ALTINDAKİ kategori rozeti.
   * `pending_module` anahtarı YOKTUR — alan (`work_category`) GELİYOR ama
   * KULLANICI KARARIYLA (2026-08-09) "İş Kalemi" sütununa tahsislidir. Aynı
   * değeri iki hücreye basmak sahte bir ayrım üretirdi.
   */
  subcontractorCategoryBadge:
    "İş kategorisi tabloda kendi sütununda gösteriliyor; ad altında tekrarlanmaz.",
  /**
   * KKP 197 gecikme bandındaki risk yüzdesi. Günlük ceza TUTARI GERÇEKTİR
   * (`land_share.daily_penalty`) ve basılır; "gecikme riski %8" ise hiçbir
   * uçtan gelmez ve tahmin algoritmasını mockup SÖYLEMİYOR.
   */
  landownerDelayRisk: "Gecikme riski hesaplanmıyor; yalnız sözleşmedeki günlük ceza gösteriliyor.",
} as const;
