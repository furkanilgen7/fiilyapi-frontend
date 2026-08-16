/**
 * F-IZN T3 · İZ — `/personel/izinler` (İzin Yönetimi) ekranının METİN sabitleri.
 * Yorumlardaki sayılar `İK - İzin Yönetimi.dc.html`in SATIR numaralarıdır.
 *
 * Türetme YOKTUR (o `leaves-derive.ts`tedir); burada yalnız sabit metin durur.
 */

/** Sekme şeridindeki bu ekranın adı (34). */
export const LEAVES_TAB_LABEL = "İzin Yönetimi";

/** Sayfa başlığı (19 breadcrumb'ın son parçası). */
export const LEAVES_PAGE_TITLE = "İzin Yönetimi";
export const LEAVES_EYEBROW = "İnsan Kaynakları";

/**
 * 🔴 K4/K9 AYRIMI — "—" bu dilimde YALNIZ "BİLİNMİYOR" demektir.
 *
 * Bakiyesi bulunamayan ya da `remaining` NULL olan talep satırında basılır
 * (77). `0` BASILMAZ: 0 "hakkı bitti" der, "bilinmiyor" demez — bu, NULL-EŞİK
 * kanonunun görüntü hâlidir.
 */
export const UNKNOWN_VALUE = "—";

/**
 * 🔴 K9 (ŞEF KARARI · onaylı sapma) — `deducts_from_annual === false` satırın
 * "Kalan Hak" hücresi.
 *
 * Mockup 87'de "Rapor" yazar; ama o sözcük YALNIZ hastalık iznine özgüdür ve
 * aynı hücreye "Ücretsiz İzin" satırında basılsa YANLIŞ olurdu (ücretsiz izin
 * rapor değildir). Tipten BAĞIMSIZ, anlamı koruyan sözcük seçildi: yıllık
 * bakiye bu satır için "düşmez". `—` ile KARIŞMAZ — o "bilinmiyor"a ayrıldı.
 */
export const NOT_DEDUCTED_LABEL = "Düşmez";

/** 166 · `remaining` NULL — hak HESAPLANAMAZ (kıdem<1 ya da `hire_date` yok). */
export const NO_ENTITLEMENT_LABEL = "Hak yok";

/** 167 · aynı satırın "Kullanım" sütunu (`usage_pct` NULL). */
export const NO_ENTITLEMENT_HINT = "1 yıl dolunca hak kazanır";

/** 158 · devreden günü yıl sonunda yanma riski taşıyan satır. */
export const CARRYOVER_RISK_LABEL = "Devreden yanma riski";

/* ── KPI şeridi (45-51) ─────────────────────────────────────────────────── */
export const KPI_PENDING_LABEL = "Bekleyen Talep";
export const KPI_ON_LEAVE_LABEL = "Bugün İzinli";
export const KPI_USED_LABEL = "Bu Ay Kullanılan";
export const KPI_DEBT_LABEL = "Toplam İzin Borcu";
export const KPI_CARRYOVER_RISK_LABEL = "Devreden Risk";
/** 50 · risk kartının alt satırı. */
export const KPI_CARRYOVER_RISK_HINT = "Yıl sonu yanacak";
/** 48-50 · sayıların birimi ("82 gün" · "8 kişi"). */
export const UNIT_DAYS = "gün";
export const UNIT_PEOPLE = "kişi";

/* ── Tablo 1 — onay bekleyen talepler (54-113) ──────────────────────────── */
export const PENDING_TABLE_TITLE = "Onay Bekleyen İzin Talepleri";
/**
 * 57 · ipucu. 🔴 K7: mockup'taki `→` (U+2192) yazı tipi alt kümesinin DIŞINDA
 * kalır (28 `@font-face` kuralı ayrıştırıldı) — ok GLİF olarak basılmaz,
 * anlamı sözcüğe çevrilir.
 */
export const PENDING_TABLE_HINT = "Şantiye şefi ardından İK onayı";
/** 98 · hak aşan satırın açıklama hücresi. */
export const OVERRUN_NOTE_PREFIX = "Hak aşımı";
/** 88 · `document_id` dolu satırın eki (📎 yerine ikon + bu erişilebilir ad). */
export const ATTACHMENT_LABEL = "belge ekli";

/** 79 · satır eylemleri — erişilebilir adlar ZORUNLU (ikonun tek metni budur). */
export const APPROVE_ACTION_LABEL = "Onayla";
export const REJECT_ACTION_LABEL = "Reddet";

/** 99 · hak aşımında onay PASİFtir; red HER ZAMAN aktiftir (şema kanonu). */
export const APPROVE_BLOCKED_REASON =
  "Talep yıllık hakkı aşıyor — onaylanamaz, ancak reddedilebilir.";

/**
 * 🔴 K3 İSTİSNASI (onaylı sapma) — mockup boş durumu ÇİZMEZ ama bekleyen talep
 * olmaması NORMAL işletme hâlidir; boş kart kullanıcıya hata gibi görünürdü.
 * Emsal: `muhasebe-bos-donem` karesindeki `mu-ledger-empty` / `mu-drafts-empty`.
 */
export const PENDING_EMPTY_TEXT = "Onay bekleyen izin talebi yok.";
export const PENDING_LOADING_TEXT = "İzin talepleri yükleniyor...";

/* ── Tablo 2 — izin bakiyeleri (116-171) ────────────────────────────────── */
export const BALANCES_TABLE_TITLE = "İzin Bakiyeleri";
/** 119 · `·` (U+00B7) alt küme İÇİNDEdir, glif kısıtına takılmaz. */
export const BALANCES_TABLE_HINT = "4857 sayılı İş Kanunu · Kıdeme göre hesaplanır";
export const BALANCES_EMPTY_TEXT = "Bu yıl için bakiye kaydı yok.";
export const BALANCES_LOADING_TEXT = "İzin bakiyeleri yükleniyor...";
/** 120 · yıl seçici. */
export const YEAR_SELECT_LABEL = "Bakiye yılı";

/** Ekranın iki ucundan biri düştüğünde basılan önek. */
export const SUMMARY_ERROR_PREFIX = "İzin özeti yüklenemedi";
export const REQUESTS_ERROR_PREFIX = "İzin talepleri yüklenemedi";

/**
 * 🔴 T4 devri — karar diyalogları (onay/red) T4'ün işidir. Bu ekran düğmeleri
 * BASAR ve erişilebilir kılar; karar akışı `onApproveRequest`/`onRejectRequest`
 * geri çağrılarıyla dışarıdan bağlanır. Bağlanmadığı sürece düğmeler devre-dışı
 * kalır ve gerekçe EKRANDA okunur (`title`da saklanmaz) — "hiçbir şey yapmayan
 * düğme" bırakılmaz.
 */
export const DECISION_PENDING_REASON =
  "Onay ve red diyalogları henüz bağlanmadı — düğmeler bir işlem başlatmaz.";
