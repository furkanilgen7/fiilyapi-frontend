/**
 * F-BOR T4 · `/bordro/sgk` ekranının METİN TEK KAYNAĞI. Yorumlardaki sayılar
 * `SGK Bildirimi.dc.html` ("SGK") dosyasının SATIR numaralarıdır.
 */

/* ------------------------------------------------------------------ başlık */

export const SGK_PAGE_TITLE = "SGK e-Bildirge"; // SGK:35
export const SGK_SUBTITLE_SUFFIX = "Aylık Prim Hizmet Belgesi"; // SGK:35
export const SGK_PREV_PERIOD_LABEL = "Önceki dönem"; // SGK:37 `‹`
export const SGK_NEXT_PERIOD_LABEL = "Sonraki dönem"; // SGK:39 `›`

/* ------------------------------------------------------------ XML (K11) */

export const SGK_XML_LABEL = "XML İndir"; // SGK:22

/**
 * 🔴 K11 — uçsuz öğe SİLİNMEZ; devre dışı basılır ve gerekçe ÖĞENİN KENDİ
 * `disabledReason` alanından okunur. Bordro modülünün TEK dışa aktarım ucu
 * `GET /payroll/periods/{id}/export` (XLSX); e-Bildirge XML'i üreten bir uç
 * YOKTUR ve istemcide üretilemez (biçim SGK'nın şemasıdır, uydurulmaz).
 */
export const SGK_XML_DISABLED_REASON =
  "e-Bildirge XML üreten bir uç yok: bordro modülünün tek dışa aktarımı dönem Excel'idir (Aylık Bordro ekranında). XML biçimi SGK'nın şemasıdır, istemcide uydurulmaz.";

/* --------------------------------------------------------- durum bandı (44-51) */

export const SGK_SUBMIT_LABEL = "SGK'ya Gönder"; // SGK:50

/**
 * 🔴 Uç YALNIZ bir DAMGA basar (şema: "Dış sistem entegrasyonu YOKTUR. Bu uç
 * hiçbir yere istek atmaz."). Metin dosya/kuyruk/gönderim İMA ETMEZ.
 */
export const SGK_SUBMIT_NOTE =
  "Bu işlem yalnızca dönemin bildirim damgasını basar; sistemden SGK'ya dosya ya da istek gönderilmez.";

/**
 * 🔴 SGK:46 "Son bildirim tarihi: 23 Temmuz 2026 (6 gün kaldı)" BASILMAZ:
 * bildirim son tarihi ne SGK özetinde ne dönem satırında vardır. Dönemin
 * `payment_due_date` alanı BORDRO ÖDEME vadesidir — onu buraya yazmak iki
 * farklı yükümlülüğü tek tarihmiş gibi gösterirdi. Eksiklik SÖYLENİR.
 */
export const SGK_DEADLINE_UNKNOWN =
  "Bildirim son tarihi sistemde tutulmuyor; yasal süreyi ekran hesaplamaz.";

export const SGK_NOT_SUBMITTED_SUFFIX = "SGK Bildirimi Gönderilmedi"; // SGK:47
export const SGK_NOT_SUBMITTED_BADGE = "Gönderilmedi";

/**
 * 🔴 K3 — mockup YALNIZ gönderilmemiş hâli çiziyor (SGK:44-51). Damga basılmış
 * dönem de gerçek bir sonuçtur; ekran onu SESSİZCE aynı uyarı bandıyla
 * göstermez, ayrı ve dürüst bir hâli vardır.
 */
export const SGK_SUBMITTED_SUFFIX = "SGK Bildirimi damgalandı";
export const SGK_SUBMITTED_BADGE = "Gönderildi";
export const SGK_SUBMITTED_PREFIX = "Bildirim damgası:";
export const SGK_SUBMITTED_NOTE =
  "Damga bir kez basılır; ikinci gönderim reddedilir (geç bir bildirim yeniden damgalanıp zamanında yapılmış görünemez).";

export const SGK_SUBMIT_ERROR_FALLBACK = "SGK bildirim damgası basılamadı.";
export const SGK_SUBMIT_NO_WRITE_REASON = "Bordro yazma izniniz yok.";

/* --------------------------------------------------------- KPI kartları (54-59) */

export const SGK_KPI_PERSONNEL_LABEL = "Bildirilen Çalışan"; // SGK:55
export const SGK_KPI_PERSONNEL_HINT = "4a + 4b"; // SGK:55
export const SGK_KPI_BASE_LABEL = "SGK Matrahı"; // SGK:56
export const SGK_KPI_PREMIUM_LABEL = "SGK Primi Toplam"; // SGK:57
export const SGK_KPI_PREMIUM_HINT = "İşçi + İşveren"; // SGK:57
export const SGK_KPI_UNEMPLOYMENT_LABEL = "İşsizlik Sigortası"; // SGK:58

/* ------------------------------------------------------ prim tablosu (62-93) */

export const SGK_TABLE_TITLE_PREFIX = "Prim Hesaplama"; // SGK:64
export const SGK_EMPLOYEE_COLUMN_TITLE = "İşçi Payları"; // SGK:68
export const SGK_EMPLOYER_COLUMN_TITLE = "İşveren Payları"; // SGK:77

/**
 * 🔴 ORAN YÜZDELERİ ETİKETTEN ÇIKARILDI. Mockup etiketleri "%14" · "%20,5" ·
 * "%0,759" gibi yüzdelerle yazar (SGK:70-73 · 80-82) ama `sgk-summary` ucu
 * TUTAR döndürür, ORAN döndürmez. Oranlar ayrı bir uçtadır
 * (`GET /payroll/rates?year`) ve o uç bu dilimin işi DEĞİLDİR (IK3-SEED);
 * dahası oranlar yıla ve personel tipine göre DEĞİŞİR — tek bir sabit yüzde
 * ekranda basılsa, oran seti değiştiğinde tutarla çelişen bir etiket kalırdı.
 * Türetilemeyen sayı YAZILMAZ.
 */
export const SGK_ROW_SGK_EMPLOYEE = "SGK İşçi Payı"; // SGK:70
export const SGK_ROW_UNEMPLOYMENT_EMPLOYEE = "İşsizlik Sigortası İşçi"; // SGK:71
export const SGK_ROW_INCOME_TAX = "Gelir Vergisi Stopajı"; // SGK:72
export const SGK_ROW_STAMP_TAX = "Damga Vergisi"; // SGK:73
export const SGK_ROW_EMPLOYEE_TOTAL = "Toplam İşçi Kesintisi"; // SGK:74

export const SGK_ROW_SGK_EMPLOYER = "SGK İşveren Payı"; // SGK:80
export const SGK_ROW_UNEMPLOYMENT_EMPLOYER = "İşsizlik Sigortası İşveren"; // SGK:81
export const SGK_ROW_EMPLOYER_TOTAL = "Toplam İşveren Maliyeti"; // SGK:83

/* --------------------------------------------------- ödenecek prim (86-91) */

export const SGK_PAYABLE_LABEL = "SGK'ya Ödenecek Toplam Prim"; // SGK:88

/**
 * SGK:89 alt satırı "İşçi + İşveren SGK + İşsizlik · Vade: 26 Temmuz 2026"
 * yazar. Vade BASILMAZ (veri yok, bkz. `SGK_DEADLINE_UNKNOWN`); kapsam ise
 * genişletilir: gelir vergisi ve damga vergisi bu tutara GİRMEZ — onlar
 * vergi dairesine ödenir. Kullanıcı "toplam işçi kesintisi" ile bu kutuyu
 * karşılaştırdığında farkı açıklayan tek şey budur.
 */
export const SGK_PAYABLE_HINT =
  "İşçi + İşveren SGK + İşsizlik · Gelir vergisi stopajı ve damga vergisi bu tutara DAHİL DEĞİLDİR (onlar vergi dairesine ödenir).";

/* -------------------------------------------- çalışan listesi (96-118, K11) */

export const SGK_PERSONNEL_LIST_TITLE = "Bildirilecek Çalışanlar";

/**
 * 🔴 K11 — SGK:96-118 çalışan listesi HİÇ BASILMAZ. `sgk-summary` ucu satır
 * döndürmez ve şema açıklaması gerekçeyi kendi yazar: *"`sgk_no` diye bir
 * kolon İK-1'de yoktur (uydurulmaz)"*. Boş bir tablo çizmek kolonun var olup
 * verinin gelmediğini ima ederdi; kartın YERİNE görünür gerekçe basılır.
 */
export const SGK_PERSONNEL_LIST_REASON =
  "Bildirilecek çalışan listesi gösterilemiyor: personel kaydında SGK sicil numarası kolonu yok ve SGK özeti uç noktası kişi bazlı satır döndürmüyor — kişi başına matrah/prim üretilemez.";

/* ------------------------------------------------------- dürüst boş hâller */

export const SGK_LOADING_MESSAGE = "SGK özeti yükleniyor…";
export const SGK_ERROR_FALLBACK = "SGK bildirim özeti yüklenemedi.";
export const SGK_PERIODS_ERROR_FALLBACK = "Bordro dönemleri yüklenemedi.";

/**
 * 🔴 K3 — hiç dönem yoksa AÇIKLAYICI boş durum basılır.
 *
 * 🔴 F-BORDRO T2 — dönem açma düğmesi BU ekranda çizilmez (SGK mockup'ı da
 * çizmez); tek giriş noktası `Aylık Bordro` başlığıdır. Gövde metni zaten
 * "ekran yok" demiyordu, bu yüzden DEĞİŞMEDİ — yalnız bu not tazelendi.
 */
export const SGK_EMPTY_TITLE = "Henüz bordro dönemi yok";
export const SGK_EMPTY_BODY =
  "Bu şirkette açılmış bir bordro dönemi bulunmuyor. SGK bildirimi bir bordro dönemi üzerinden hesaplanır; dönemler açıldığında prim tablosu burada görünür.";

/* --------------------------------------------------- fail-closed sayaçlar */

/**
 * 🔴 K3 — SGK özetinin İKİ fail-closed sayacı. İkisi de matraha GİRMEYEN
 * satırları sayar: sıfır olmayan sayaç, aşağıdaki tutarların EKSİK olduğu
 * anlamına gelir. `unknown_rate_count` özellikle IK3-SEED bağımlılığının
 * yüzeye çıktığı yerdir — oran seti tohumlanmamışken sunucu SIFIR döndürür ve
 * bu bant olmasa kullanıcı sıfırları GERÇEK sanardı.
 */
export const SGK_UNCOMPUTED_BAND_TITLE = "Bazı satırlar matraha girmedi";
export const SGK_UNKNOWN_RATE_BAND_TITLE = "Bazı personel tipinin oran seti tanımsız";

export function sgkUncomputedBandBody(count: number): string {
  return `${count} satırın ücret verisi tanımsız olduğu için brüt tutarı hesaplanamadı; bu satırlar SGK matrahına GİRMEDİ ve aşağıdaki tutarlar onlar OLMADAN hesaplandı.`;
}

export function sgkUnknownRateBandBody(count: number): string {
  return `${count} satırın personel tipi için ilgili yıla tanımlı bir prim oranı seti yok; bu satırlar matraha GİRMEDİ. Oran seti tanımlanana kadar aşağıdaki prim tutarları eksiktir (oran seti tanımsızken sıfır görünebilir).`;
}

/* ------------------------------------------------------------ yardımcılar */

/** SGK:35 alt başlığı — "Temmuz 2026 · Aylık Prim Hizmet Belgesi". */
export function sgkSubtitle(period: string): string {
  return `${period} · ${SGK_SUBTITLE_SUFFIX}`;
}

/** SGK:64 — "Prim Hesaplama — Temmuz 2026". `—` glif kapsamındadır (K5). */
export function sgkTableTitle(period: string): string {
  return `${SGK_TABLE_TITLE_PREFIX} — ${period}`;
}

/** SGK:47 — "Temmuz 2026 SGK Bildirimi Gönderilmedi". */
export function sgkNotSubmittedTitle(period: string): string {
  return `${period} ${SGK_NOT_SUBMITTED_SUFFIX}`;
}

export function sgkSubmittedTitle(period: string): string {
  return `${period} ${SGK_SUBMITTED_SUFFIX}`;
}
