import type { components } from "@/lib/api/schema";
import { pendingModuleLabel } from "@/lib/pending-modules";

/**
 * "Form - Personel Ekle.dc.html" (FP) sabitleri. Yorumlardaki sayılar o
 * dosyanın SATIR numaralarıdır.
 *
 * ÜST KURAL: mockup'ta ne varsa aynısı basılır. Backend karşılığı olmayan
 * alan SİLİNMEZ — devre-dışı basılır, gerekçesi GÖRÜNÜR yazılır ve gövdeye
 * ASLA sızmaz (`build-body.ts`).
 */

export type WorkerSource = components["schemas"]["WorkerSource"];

/** Seçicilerin ilk (boş) seçeneği — mockup "Seçiniz..." (67, 68, 91, 99, 104, 108). */
export const SELECT_PLACEHOLDER = "Seçiniz...";

/** "Bağlı Taşeron" seçicisinin ilk seçeneği (95) — boş değer korunur. */
export const NO_SUBCONTRACTOR_LABEL = "— (Şirket kadrosu)";

/**
 * Çalışan Tipi seçenekleri (91) — mockup'ın DÖRDÜ de basılır.
 *
 * `source` DOLU olan iki seçenek etkindir; `source: null` olan ikisi
 * (Serbest Meslek · Stajyer) `WorkerSource` enum'unda KARŞILIKSIZDIR ve
 * devre-dışı basılır. Sessizce `general`'a eşlemek VERİ KAYBIDIR: kullanıcı
 * "stajyer" seçer, sunucuya "genel işçi" gider ve kimse fark etmez.
 */
export interface EmployeeTypeOption {
  label: string;
  source: WorkerSource | null;
}

export const EMPLOYEE_TYPE_OPTIONS: readonly EmployeeTypeOption[] = [
  { label: "Şirket Kadrosu (4a)", source: "company" },
  { label: "Taşeron İşçisi", source: "subcontractor" },
  { label: "Serbest Meslek", source: null },
  { label: "Stajyer", source: null },
];

/** Meslek / Görev seçenekleri (99) — mockup'ın SEKİZİ AYNEN, sırası korunur. */
export const TRADE_OPTIONS: readonly string[] = [
  "Kalıpçı Usta",
  "Demir Ustası",
  "Elektrikçi",
  "Sıhhi Tesisatçı",
  "Vinç Operatörü",
  "Şantiye Şefi",
  "Büro Personeli",
  "Amele / Yardımcı",
];

/** Cinsiyet (67) — devre-dışı, yalnız mockup sadakati için basılır. */
export const GENDER_OPTIONS: readonly string[] = ["Erkek", "Kadın"];

/** Medeni Durum (68) — devre-dışı. */
export const MARITAL_STATUS_OPTIONS: readonly string[] = ["Bekar", "Evli"];

/** Ücret Tipi (113) — devre-dışı; mockup'ta "Seçiniz..." YOKTUR. */
export const WAGE_TYPE_OPTIONS: readonly string[] = ["Günlük", "Aylık", "Saatlik"];

/** Ödeme Şekli (115) — devre-dışı; mockup'ta "Seçiniz..." YOKTUR. */
export const PAYMENT_METHOD_OPTIONS: readonly string[] = [
  "Banka Havalesi",
  "Elden (Nakit)",
  "Karma",
];

/** Atandığı Proje (104) — devre-dışı; mockup'ın örnek adları AYNEN. */
export const ASSIGNED_PROJECT_OPTIONS: readonly string[] = [
  "Güneşkent A-Blok",
  "Çelik OSB Fabrika",
  "Liman Altyapı",
  "Yeşilvadi Rezidans",
  "Merkez Ofis",
];

/** Bölüm (108) — devre-dışı; mockup'ın örnek adları AYNEN. */
export const ASSIGNED_SECTION_OPTIONS: readonly string[] = [
  "Kat 6–10 Kaba İnşaat",
  "İnce İşler",
  "Merkez",
];

/**
 * `PersonnelCreate`'in metin alanları için SUNUCU sözleşmesindeki uzunluk
 * sınırları (`openapi/openapi.json`). Sayılar burada elle "uydurulamaz":
 * `field-limits.test.ts` bu haritayı üretilen sözleşmeyle karşılaştırır.
 */
export const PERSONNEL_FIELD_MAX_LENGTH = {
  full_name: 200,
  trade: 100,
  // F-İK T2 · İK-1 sözleşmesiyle gelen sınırlar. Harita SÖZLEŞMENİN AYNASIDIR
  // (`field-limits.test.ts` iki yönlü kapı): alanlar forma bağlandığında
  // (ayrı task) `maxLength` korkuluğu HAZIR olsun — sınırsız bir input'un
  // sessiz 422'si bu haritanın eksik kalmasıyla doğar.
  tc_no: 11,
  phone: 30,
  email: 255,
  emergency_contact_name: 200,
  emergency_contact_phone: 30,
  iban: 34,
  sgk_no: 20,
} as const satisfies Record<string, number>;

/**
 * Ad ve Soyad TEK `full_name` alanına birleşir (şef kararı). Tek tek sınır
 * `full_name`in YARISIDIR — böylece iki alan da tavana çarpsa bile birleşik
 * dize sunucu sınırını ancak bir boşluk kadar aşabilir, onu da doğrulama
 * yakalar (`validate.ts`).
 */
export const NAME_PART_MAX_LENGTH = PERSONNEL_FIELD_MAX_LENGTH.full_name / 2;

/** TC Kimlik No (65) — mockup `maxlength="11"`; alan devre-dışı olsa da korunur. */
export const NATIONAL_ID_MAX_LENGTH = 11;

/* ── Devre-dışı yüzeylerin GÖRÜNÜR Türkçe gerekçeleri ───────────────────── */

/** Foto (55-59) + belge alanları (126-193) — BC form-slot mekanizması bekliyor. */
export const PENDING_DOCUMENTS = pendingModuleLabel("documents");

/** Sunucu sözleşmesinde karşılığı olmayan alanlar (kimlik/iletişim/ücret/görev). */
export const PENDING_NO_CONTRACT_FIELD =
  "Personel kaydının bugünkü sunucu sözleşmesinde bu alanın karşılığı yok";

/** Karşılıksız iki çalışan tipi (Serbest Meslek · Stajyer). */
export const PENDING_EMPLOYEE_TYPE =
  "Sunucu bu çalışan tipini henüz tanımıyor — seçilemez";

/** "Taslak Kaydet" (39, 211). */
export const PENDING_DRAFT = "Personel kaydında taslak desteği yok";

/** SGK bildirge kutucuğu (205-208). */
export const PENDING_SGK = "SGK bildirim modülü henüz eklenmedi";

/**
 * Belge kartındaki "Belge Takibi" bağlantısı (198) — BC-2 form-slot bekliyor.
 * ⚠️ Üst şeritteki "İnsan Kaynakları" kırıntısı ARTIK PENDING DEĞİL: F-PT2 T2
 * `/personel` listesini açtı, kırıntı GERÇEK linke döndü (`PERSONNEL_LIST_HREF`).
 */
export const PENDING_HR_SCREEN = "Belge takibi ekranı henüz eklenmedi";

/** F-PT2 T2 · `/personel` gerçek liste rotası — kırıntı yolu bunu kullanır. */
export const PERSONNEL_LIST_HREF = "/personel";

/** Düzenleme kipinde formdan seçilemeyen ama SEED edilebilen kaynak (K2). */
export const PENDING_GENERAL_SOURCE =
  "Bu çalışan tipi formdan seçilemez — mevcut kayıt değiştirilmeden bırakılabilir.";

/**
 * Ekranın üstünde tek blok hâlinde basılan gerekçe listesi. Her alanın yanında
 * ayrı ayrı tekrarlamak ekranı boğuyor; repo deseni (bölüm başına tek açıklama
 * + alanda `disabled`) izlenir, ama gerekçe `title` içinde SAKLI KALMAZ.
 */
export const PENDING_NOTICES: readonly string[] = [
  "Fotoğraf ve belge yükleme alanları devre dışı — belge modülünün form eklentisi sonraki dilimde gelir.",
  "Kimlik, iletişim, görev atama ve ücret alanları devre dışı — personel kaydının bugünkü sunucu sözleşmesi yalnız ad-soyad, meslek/görev, çalışan tipi ve bağlı taşeron bilgisini saklıyor.",
  "Devre dışı alanlardaki zorunluluk (*) işaretleri mockup'tan olduğu gibi korunmuştur ama kaydı ENGELLEMEZ — doğrulama yalnız doldurulabilen alanlara uygulanır.",
  "“Serbest Meslek” ve “Stajyer” çalışan tipleri seçilemez — sunucu bugün yalnız şirket kadrosu, taşeron işçisi ve genel işçi kaynaklarını tanıyor; bu ikisi sessizce başka bir kaynağa YAZILMAZ.",
  "“Taslak Kaydet” devre dışı — personel kaydında taslak desteği yok.",
  "“Kayıt sonrası SGK işe giriş bildirgesi” kutucuğu devre dışı — SGK bildirim modülü henüz eklenmedi.",
  "Belge kartındaki “Belge Takibi” bağlantısı edilgen — belge takibi ekranı henüz eklenmedi.",
];

/* ── Metin envanteri (mockup birebir) ───────────────────────────────────── */

export const PAGE_TITLE = "Yeni Personel Kaydı"; // 47
export const PAGE_SUBTITLE_PREFIX = "Zorunlu alanlar "; // 48
export const PAGE_SUBTITLE_SUFFIX = " ile işaretlidir · SGK bildirimi otomatik oluşturulur"; // 48
export const BREADCRUMB_HR = "İnsan Kaynakları"; // 35
export const BREADCRUMB_CURRENT = "Yeni Personel"; // 35
export const SUBMIT_LABEL = "Personeli Kaydet"; // 40, 212
export const TOPBAR_DRAFT_LABEL = "Taslak"; // 39
export const PHOTO_LABEL = "Fotoğraf Yükle"; // 58
export const PHOTO_HINT = "Vesikalık · JPG"; // 60

/* ── F-PT2 T3 · Düzenleme kipi (mockup'ta karşılığı yok — SectionForm deseni) ── */
export const PAGE_TITLE_EDIT = "Personeli Düzenle";
export const PAGE_SUBTITLE_EDIT_SUFFIX = " ile işaretlidir";
export const BREADCRUMB_CURRENT_EDIT = "Personeli Düzenle";
export const SUBMIT_LABEL_EDIT = "Kaydet";
export const ACTIVE_TOGGLE_LABEL = "Aktif personel";
