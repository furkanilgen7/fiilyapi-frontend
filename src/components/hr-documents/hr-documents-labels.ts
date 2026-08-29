import type { BadgeVariant } from "@/components/ui/badge/Badge";
import { formatDateDots } from "@/lib/format";
import type {
  HrDocumentTypeBreakdown,
  HrDocumentsSummaryResponse,
} from "@/lib/api/hooks/useHrDocuments";
import { routes } from "@/lib/routes";

/**
 * F-İK T5 · BT — `/personel/belgeler` (Belge & Sertifika) ekranının etiket /
 * pending-gerekçe / sunum sabitleri. Yorumlardaki sayılar
 * `İK - Belge Takibi.dc.html`in SATIR numaralarıdır.
 *
 * Biçimlendirici tek kaynağı `lib/format.ts`tir — yeni tarih biçimlendirici
 * YAZILMAZ (görev emri kuralı), mevcut `formatDateDots` ithal edilir.
 */
export { formatDateDots };

/** Değer basılamayan hücre için ortak yer tutucu (liste ekranıyla AYNI). */
export const PENDING_VALUE = "—";

/** BT 19 · sekme şeridinde bu ekranın aktif sekmesi. */
export const HR_DOCUMENTS_TAB_LABEL = "Belge & Sertifika";

/** `/personel` liste rotası — sekme şeridinin "Personel Listesi" bağlantısı. */
export const PERSONNEL_LIST_ROUTE = routes.personnel.list();

/** BT 181 · "Ayarla →" — `/ayarlar/bildirimler` rotası REPODA VARDIR (grep'le
 *  doğrulandı: `src/app/(app)/ayarlar/bildirimler`), bağlantı GERÇEKTİR. */
export const NOTIFICATION_SETTINGS_ROUTE = routes.settings.notifications();

/* ── Devre-dışı öğelerin GÖRÜNÜR gerekçeleri ───────────────────────────────
   Kalıcı kural: rotası/ucu olmayan mockup öğesi SİLİNMEZ, devre-dışı basılır
   ve gerekçesi görünür olur. */

/** BT 22 · 54 · 102/111/120/129 — randevu/kurs/eğitim atama ucu YOK. */
export const APPOINTMENT_PENDING_REASON =
  "Randevu ve eğitim planlama ucu backend'de henüz yok — bu düğme bir işlem başlatmaz.";

/**
 * BT 102/111/120/129 · satır aksiyonu. Mockup satıra göre "Randevu" /
 * "Kurs Kaydı" / "Eğitim Ata" basar; bu ayrımın kaynağı BELGE TİPİDİR ve
 * sunucu böyle bir alan VERMEZ — metni tipe göre değiştirmek İCAT olurdu,
 * bu yüzden tek NÖTR metin basılır.
 */
export const ROW_ACTION_LABEL = "Aksiyon Al";

/**
 * BT 23 · "+ Belge Yükle".
 *
 * F-BLG T2c personel belge FORMUNU yazdı (`Form - Personel Belgesi.dc.html`)
 * ama o form BİR PERSONELE bağlıdır: uç `POST /personnel/{id}/documents`tir.
 * BT ekranı personel bağlamı TAŞIMAZ (`GET /hr/documents/summary` sunucunun
 * TÜM dünyasını özetler), dolayısıyla burada çalışması için önce bir "personel
 * seç" adımı gerekir ve ONUN mockup'ı YOKTUR — eksik yüzey İCAT EDİLMEZ
 * (WORKFLOW §3), mockup istenir.
 *
 * Bu yüzden düğme devre-dışı KALIR, ama gerekçe kullanıcıyı MEVCUT ve GERÇEK
 * girişe yönlendirir: Personel Detay'daki "Belgeler" kartının "+ Ekle"
 * düğmesi (`PersonnelDocumentsSummaryCard`, PD 131) T2c'den beri bu formu
 * açar. Metin `title` özniteliğinde SAKLANMAZ, ekranda basılır.
 */
export const UPLOAD_PENDING_REASON =
  "Belge yükleme personel seçilerek yapılır: personel listesinden ilgili kişinin " +
  "detayını açıp “Belgeler” kartındaki “+ Ekle” düğmesini kullanın. " +
  "Bu ekrandan toplu yükleme, personel seçim adımının tasarımı gelince açılacak.";

/**
 * BT 67-76 · süzgeç şeridi. ŞEF KARARI: `GET /hr/documents/summary` SORGU
 * PARAMETRESİ ALMAZ — sunucu tarafı süzgeç YOKTUR. İstemci tarafı süzgeç de
 * İCAT EDİLMEZ: 5 KPI ve tip dağılımı sunucunun TÜM dünyasını anlatır,
 * listeler süzülürse KPI'larla tutarsızlaşırdı (spec K6).
 *
 * Çipler yine de GERÇEK sayaç basar — devre-dışı olan yalnız süzme davranışı.
 */
export const FILTER_PENDING_REASON =
  "Belge özeti ucu süzgeç parametresi almıyor; süzmek KPI sayaçlarıyla tutarsızlık yaratacağı için bu sürümde kapalı.";

/**
 * BT 91 · "Durum" sütunu. Mockup türe özgü etiket basar ("Çalışamaz",
 * "Vinç Kullanamaz"); `HrExpiredDocument` böyle bir alan TAŞIMAZ. Kalıcı
 * kural (F-PT2 K1): sütun SİLİNMEZ — hücre pending "—" + gerekçe basar.
 */
export const STATUS_COLUMN_PENDING_REASON =
  "Belgenin çalışma kısıtı (ör. \"Çalışamaz\") sunucuda ayrı bir alan değil; uydurulmadan gösterilemiyor.";

/**
 * BT 96/105/114/123 · personel adının ALTINDAKİ meslek satırı. `HrExpiredDocument`
 * meslek TAŞIMAZ (yalnız `personnel_name`) — alt satır hiç BASILMAZ; uydurma
 * veri yerine yokluk (F-PT2 K6 emsali).
 */

/**
 * BT 63 · "Eksik Belge" kartının tanımı — tanım SUNUCUNUNDUR, ekran onu
 * yeniden yorumlamaz. Diğer dört KPI BELGE sayarken bu KİŞİ sayar; fark
 * görünür olmalı ama kart mockup'ın kompakt yüksekliğini korumalı, bu yüzden
 * kısa satır kartta, tam tanım ipucunda (`title`) durur.
 */
export const MISSING_KPI_HINT = "Zorunlu tip başına eksik personel";
export const MISSING_KPI_HINT_FULL =
  "Yalnız aktif ve yayında personel sayılır; her zorunlu belge tipi için kaydı olmayan kişi bu sayıya girer. Diğer dört kart BELGE sayar.";

/** Personel detayına gidiş — ad hücresi GERÇEK bağlantıdır. */
export function personnelDetailHref(personnelId: string): string {
  return routes.personnel.detail({ personnelId });
}

/** BT 100/109/118/127 · "Gecikme" ve BT 147-150 · "Kalan" hücreleri. */
export function formatDayCount(days: number): string {
  return `${days} gün`;
}

/** BT 98 · Proje hücresi — sunucu `null` verirse GERÇEK boşluktur ("—"). */
export function formatProjectName(projectName: string | null): string {
  return projectName ?? PENDING_VALUE;
}

/* ── "Belge Tipi Dağılımı" kartı (155-186) ─────────────────────────────────── */

/** Oran çubuğunun bir dilimi — genişlik YÜZDEdir (yalnız SUNUM, KPI değil). */
export interface BreakdownSegment {
  key: "valid" | "expiring" | "expired" | "missing";
  count: number;
  /** `width: N%` — çubuğun görsel payı; ekranda SAYI olarak basılmaz. */
  percent: number;
}

export interface BreakdownRow {
  typeId: string;
  typeName: string;
  /** BT 159 · "142 / 142" — pay = valid+expiring+expired, payda = total_documents+missing. */
  ratioLabel: string;
  segments: BreakdownSegment[];
  /** BT 161 · "132 geçerli · 6 yaklaşan · 4 süresi dolmuş · 2 eksik". */
  detailLabel: string;
}

/** BT 160 · dilim etiketleri — alt satırdaki (161) kelimelerle AYNI kaynak. */
const SEGMENT_LABEL: Record<BreakdownSegment["key"], string> = {
  valid: "geçerli",
  expiring: "yaklaşan",
  expired: "süresi dolmuş",
  missing: "eksik",
};

/**
 * BT 158-177 · tek bir tip satırının SUNUM modeli.
 *
 * ⚠️ Yüzdeler yalnız çubuğun GENİŞLİĞİdir — yeni bir KPI DEĞİLDİR ve ekranda
 * sayı olarak basılmaz (spec K6: istemci KPI hesaplamaz).
 *
 * ⚠️ İki taban ayrıdır (şema notu): `valid/expiring/expired` BELGE sayısı,
 * `missing` PERSONEL sayısıdır. Çubuk ikisini yan yana koyar çünkü mockup
 * (170, 175) tam olarak bunu çizer — ama oran ETİKETİ (159) yalnız belge
 * tabanını gösterir.
 *
 * Toplam 0 ise çubuk ÇÖKMEZ: dilim üretilmez, boş kanal basılır (bölme hatası
 * yok).
 */
export function buildBreakdownRow(type: HrDocumentTypeBreakdown): BreakdownRow {
  const documentCount = type.valid + type.expiring + type.expired;
  const barTotal = documentCount + type.missing;

  const rawSegments: ReadonlyArray<readonly [BreakdownSegment["key"], number]> = [
    ["valid", type.valid],
    ["expiring", type.expiring],
    ["expired", type.expired],
    ["missing", type.missing],
  ];

  const segments = rawSegments
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      key,
      count,
      // barTotal > 0 garantidir: en az bir sayaç pozitifse toplam da pozitiftir.
      percent: (count / barTotal) * 100,
    }));

  const detailLabel = segments
    .map((segment) => `${segment.count} ${SEGMENT_LABEL[segment.key]}`)
    .join(" · ");

  return {
    typeId: type.type_id,
    typeName: type.type_name,
    // BT 159 — mockup "142 / 142" biçimi: kayıtlı belge / olması gereken.
    ratioLabel: `${documentCount} / ${barTotal}`,
    segments,
    detailLabel: detailLabel.length > 0 ? detailLabel : "Kayıt yok",
  };
}

export function buildBreakdownRows(
  summary: HrDocumentsSummaryResponse | undefined,
): BreakdownRow[] {
  return (summary?.by_type ?? []).map(buildBreakdownRow);
}

/* ── Kritik uyarı bandı (48-55) ────────────────────────────────────────────── */

/**
 * BT 51-52 · bant metni. ŞEF KARARI: mockup "6 personel … çalışamaz" der ama
 * PERSONEL sayısı sunucuda YOKTUR — `expired_documents` listesinden türetmek
 * o listenin TAM olduğunu varsayardı (sunucu onu kırpabilir), bu yüzden
 * TÜRETİLMEZ. Cümle BELGE sayaçlarından kurulur.
 *
 * `expired === 0` ⇒ `null`: bant HİÇ basılmaz.
 */
export function buildCriticalAlert(counts: {
  expired: number;
  expiring: number;
}): { title: string; detail: string | null } | null {
  if (counts.expired <= 0) return null;
  return {
    title: `${counts.expired} belgenin süresi doldu — İSG mevzuatı gereği yenilenmeden sahada çalışılamaz`,
    detail:
      counts.expiring > 0
        ? `${counts.expiring} belge de 30 gün içinde bitiyor — denetim riski var`
        : null,
  };
}

/* ── Personel Detay "Belgeler" kartı (PD 130-141) ──────────────────────────── */

/**
 * `PersonnelDocumentResponse.status` şemada SERBEST STRING'dir (enum DEĞİL) —
 * sunucu yeni bir durum eklediğinde ekran ÇÖKMEMELİDİR. Arama tek fonksiyondan
 * geçer (`resolveWorkerSourceLabel` deseni, T2); `as any` ile susturulmaz.
 */
export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  valid: "Geçerli",
  expiring: "Yakında bitiyor",
  expired: "Süresi doldu",
  missing: "Eksik",
};

export const DOCUMENT_STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  valid: "success",
  expiring: "warning",
  expired: "danger",
  missing: "neutral",
};

/** Bilinmeyen durum ⇒ "—" (ham anahtar basılmaz: kullanıcıya anlam taşımaz). */
export function resolveDocumentStatusLabel(status: string): string {
  return DOCUMENT_STATUS_LABEL[status] ?? PENDING_VALUE;
}

/** Bilinmeyen durum ⇒ nötr rozet. */
export function resolveDocumentStatusVariant(status: string): BadgeVariant {
  return DOCUMENT_STATUS_BADGE_VARIANT[status] ?? "neutral";
}

/**
 * PD 132-140 · belge satırının ADI. Katalog tipi varsa `type_name`, serbest
 * etiketli kayıtta `free_label`; ikisi de yoksa "—" (uydurma yok).
 */
export function resolveDocumentName(document: {
  type_name: string | null;
  free_label: string | null;
}): string {
  return document.type_name ?? document.free_label ?? PENDING_VALUE;
}

/**
 * PD 135-140 · belge satırının ALT SATIRI. Mockup "PDF · 2.4 MB" ya da
 * "Geçerli · Haz 2027'ye kadar" gösterir; DOSYA UZANTISI/BOYUTU sunucuda
 * YOKTUR (`PersonnelDocumentResponse` taşımaz) — basılmaz.
 *
 * Kurulan metin: durum etiketi + (varsa) geçerlilik tarihi; geçerlilik yoksa
 * (süresiz belge) veriliş tarihine düşer; o da yoksa yalnız durum kalır.
 */
export function buildDocumentMetaLine(document: {
  status: string;
  valid_until: string | null;
  issued_at: string | null;
}): string {
  const parts = [resolveDocumentStatusLabel(document.status)];
  if (document.valid_until !== null) {
    parts.push(`${formatDateDots(document.valid_until)} tarihine kadar`);
  } else if (document.issued_at !== null) {
    parts.push(`${formatDateDots(document.issued_at)} tarihinde verildi`);
  }
  return parts.join(" · ");
}

/*
 * PD 131 · "+ Ekle" düğmesi ARTIK GERÇEK (F-BLG T2c). Buradaki
 * `DOCUMENT_ADD_PENDING_REASON` gerekçesi "form mockup'ı yok" diyordu;
 * `Form - Personel Belgesi.dc.html` geldi ve düğme
 * `PersonnelDocumentFormModal`ı açıyor — gerekçe geçersiz kaldığı için sabit
 * KALDIRILDI (ölü metin bırakılmaz). BT ekranının kendi "+ Belge Yükle"
 * düğmesi (`UPLOAD_PENDING_REASON`) AYRI kalır: o ekran personel bağlamı
 * TAŞIMAZ, bu form ise bir personele bağlıdır.
 */

/**
 * PD 141 · "İndir" düğmesi. ŞEF KARARI: `document_id` bir Belge Arşivi
 * kaydına işaret eder ve indirme `GET /documents/{id}/download` üzerinden
 * olur — ikili indirme AYRI bir sözleşmedir (`Content-Type` tabanlı çözümleme
 * + `status >= 400` JSON dalı) ve mockup'ta indirme akışı ÇİZİLMEMİŞTİR.
 * Bu dilimde BAĞLANMAZ.
 */
export const DOCUMENT_DOWNLOAD_PENDING_REASON =
  "Belge indirme akışı bu dilimde bağlanmadı; ikili indirme ayrı bir sözleşmedir.";

/** `document_id` null ⇒ arşivde dosya YOK; indirilecek bir şey de yok. */
export const DOCUMENT_NO_FILE_REASON = "Bu kayda bağlı bir arşiv dosyası yok.";
