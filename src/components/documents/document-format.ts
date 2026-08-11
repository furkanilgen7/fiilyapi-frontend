// F-BC T2 · Belge Arşivi biçimleyicileri (SAF modül — React/DOM bağı YOK).
// Kanon: `projedesign/Şantiye - Belgeler.dc.html` (ŞB). Parantez içi sayılar o
// dosyanın SATIR numaralarıdır.

const LOCALE = "tr-TR";

/**
 * Saat dilimi SABİTLENİR: "Bugün"/"Dün" hesabı ve "15:30" saati (ŞB 146)
 * kullanıcının şantiyesinin yerel gününe göre anlamlıdır; CI Linux koşucusu
 * UTC'dedir ve sabitlenmezse gün sınırındaki her belge bir gün kayar.
 */
const TIME_ZONE = "Europe/Istanbul";

/** Uzantı → emoji eşlemesi (spec §3). Uzantılar KÜÇÜK HARF anahtarlıdır. */
const TYPE_ICONS: Readonly<Record<string, string>> = {
  pdf: "📄",
  xlsx: "📊",
  xls: "📊",
  jpg: "🖼",
  jpeg: "🖼",
  png: "🖼",
  dwg: "📐",
  zip: "🗂",
};

/** Bilinmeyen/uzantısız dosya (spec §3). */
const FALLBACK_ICON = "📄";

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;

/**
 * Belge kartının 36px'lik tip ikonu (ŞB 96, 101, 106, 111, 116, 121, 126) ve
 * "Son Eklenenler" satırının 20px'lik ikonu (ŞB 143, 150, 157).
 *
 * ⚠️ Mockup KENDİ İÇİNDE tutarsızdır: ŞB 150'de `.zip` satırı 🖼 taşır.
 * Spec §3'ün eşlemesi kazanır (zip 🗂) — bilinçli sapma.
 *
 * Kaynak `mime_type` DEĞİL uzantıdır: backend `mime_type`i tarayıcının
 * gönderdiği değerden alır ve `.dwg` gibi tiplerde ortama göre değişir
 * (fikstürde `image/vnd.dwg`); dosya adı ise kullanıcının gördüğü gerçektir.
 */
export function documentTypeIcon(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === filename.length - 1) return FALLBACK_ICON;
  const extension = filename.slice(lastDot + 1).toLowerCase();
  return TYPE_ICONS[extension] ?? FALLBACK_ICON;
}

/**
 * Dosya boyutu (ŞB 98 "1,2 MB" · 103 "840 KB" · 118 "18 MB").
 * 1 MB altı tam sayı KB, üstü en fazla bir ondalıklı MB — ondalık ayırıcı
 * Türkçe virgüldür (`Intl`, ortam-bağımsız `toLocaleString` DEĞİL).
 *
 * F-P10 rötuşu: 1 KB ALTI boyut tam sayıya yuvarlandığında "0 KB" diye YALAN
 * söylüyordu (240 baytlık gerçek bir dosya boş görünüyordu). Eşiğin altında
 * artık sayı değil DURUM basılır. `0` bayt istisnadır: boş dosya gerçek bir
 * değerdir ve "0 KB" onu doğru anlatır.
 */
export const SIZE_BELOW_KB_LABEL = "1 KB'den küçük";

export function formatDocumentSize(bytes: number): string {
  if (bytes > 0 && bytes < BYTES_PER_KB) return SIZE_BELOW_KB_LABEL;
  if (bytes >= BYTES_PER_MB) {
    const megabytes = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(
      bytes / BYTES_PER_MB,
    );
    return `${megabytes} MB`;
  }
  const kilobytes = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(
    bytes / BYTES_PER_KB,
  );
  return `${kilobytes} KB`;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

/** Tarihin SABİT saat dilimindeki takvim parçaları (yerel TZ'den bağımsız). */
function zonedParts(date: Date): DateParts {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

/** İki takvim günü arasındaki farkı gün olarak verir (saat dilimi duyarsız). */
function dayDifference(a: DateParts, b: DateParts): number {
  const toUtc = (p: DateParts) => Date.UTC(p.year, p.month - 1, p.day);
  return Math.round((toUtc(a) - toUtc(b)) / (24 * 60 * 60 * 1000));
}

export interface DocumentDateOptions {
  /** "Bugün" dalına saat ekler — yalnız "Son Eklenenler" listesi (ŞB 146). */
  withTime?: boolean;
}

/**
 * Belge tarihi — mockup'ın DÖRT dalı (ŞB 98-128, 146-160):
 *   bugün → "Bugün" (listede "Bugün 15:30")
 *   dün   → "Dün"
 *   aynı ay → "10 Tem"
 *   daha eski → "Oca 2026" / "Mar 2025"
 *
 * `now` ZORUNLU parametredir (gizli `new Date()` yok): ekran onu tek yerden
 * verir, testler sabitler.
 */
export function formatDocumentDate(
  iso: string,
  now: Date,
  options: DocumentDateOptions = {},
): string {
  const date = new Date(iso);
  const parts = zonedParts(date);
  const today = zonedParts(now);
  const difference = dayDifference(today, parts);

  if (difference === 0) {
    if (!options.withTime) return "Bugün";
    const time = new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
    return `Bugün ${time}`;
  }
  if (difference === 1) return "Dün";

  if (parts.year === today.year && parts.month === today.month) {
    return new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    month: "short",
    year: "numeric",
  }).format(date);
}
