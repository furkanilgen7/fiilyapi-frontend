const LOCALE = "tr-TR";
const MILLION = 1_000_000;
const THOUSAND = 1_000;

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

/** Sondaki sifirlari atarak en fazla bir ondalik basar: 1,5 · 8 · 42,5 */
function short(value: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(value);
}

/** Kart tutarlari: mockup'taki "₺ 8,4M" gosterimi. */
export function formatCompactCurrency(value: string | number): string {
  const n = toNumber(value);
  if (Math.abs(n) >= MILLION) return `₺ ${short(n / MILLION)}M`;
  if (Math.abs(n) >= THOUSAND) return `₺ ${short(n / THOUSAND)}B`;
  return `₺ ${short(n)}`;
}

/** `formatCompactCurrencyTight` ondalik tavani — E9:103-104 IKI basamak yazar. */
const COMPACT_TIGHT_FRACTION_DIGITS = 2;

/** En fazla IKI ondalik, sondaki sifirlar atilir: 4,12 · 3,84 · 4 */
function shortTight(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: COMPACT_TIGHT_FRACTION_DIGITS,
  }).format(value);
}

/**
 * Nakit akisi aciklama seridi (F-HZ T3.0 · E9:103 `₺4,12M` · E9:104 `₺3,84M`).
 *
 * `formatCompactCurrency`den IKI farki vardir: `₺` ile sayi arasinda BOSLUK
 * YOKTUR ve ondalik tavani BIR degil IKIdir. E9 kendi icinde tutarlidir —
 * BOSLUKLU bicim yalniz kart bakiyelerinindir (E9:72/77/82 `₺ 2.840.500`),
 * geri kalan her para BOSLUKSUZ yazilir (E9:103/104/114/118/122). Ayni okuma
 * `formatCurrencyTight`i (E9:114) da dogurmustu.
 *
 * 🔴 `formatCompactCurrency` DEGISTIRILMEZ: `/makine` KPI'i ("₺ 144,2B") ve 20+
 * cagiran ona baglidir; tek ondalikli/bosluklu bicimi oynatmak o ekranlarin
 * baseline'larini sessizce kirardi. Bu yuzden AYRI bir varyant acildi.
 */
export function formatCompactCurrencyTight(value: string | number): string {
  const n = toNumber(value);
  if (Math.abs(n) >= MILLION) return `₺${shortTight(n / MILLION)}M`;
  if (Math.abs(n) >= THOUSAND) return `₺${shortTight(n / THOUSAND)}B`;
  return `₺${shortTight(n)}`;
}

/** Portfoy tutari: mockup'taki "24.870.500" gosterimi. */
export function formatCurrency(value: string | number): string {
  const formatted = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(
    toNumber(value),
  );
  return `₺ ${formatted}`;
}

/**
 * Yaklasan odeme satirinin tutari (F-HZ T2 · E9:114 `₺1.016.800`).
 * `formatCurrency`den TEK farki: `₺` ile sayi arasinda BOSLUK YOKTUR. Mockup
 * ayni ekranda iki farkli bicim kullanir — kart bakiyesi bosluklu (E9:72
 * `₺ 2.840.500`), odeme satiri bosluksuz (E9:114) — ikisi de birebir uygulanir.
 */
export function formatCurrencyTight(value: string | number): string {
  return `₺${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(toNumber(value))}`;
}

/** Ilerleme yuzdesi: "%42,5" · "%75" */
export function formatPercent(value: string | number): string {
  return `%${short(toNumber(value))}`;
}

/**
 * Ekran 13 · Is Kalemleri (BOQ) tablo sayilari (spec §3.4).
 * ₺ YOK — mockup 114–116 ve 176'da sembol basilmiyor; `formatCurrency` bastigi
 * icin bu ekranda kullanilamaz. tr-TR binlik ayrac, sondaki sifirlar atilir.
 * Backend Decimal alanlari string gonderir (`quantity: "1240.000"`).
 */
export function formatDecimal(value: string | number, maxFractionDigits: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: maxFractionDigits }).format(
    toNumber(value),
  );
}

/** Miktar sutunu: en fazla 3 ondalik — numeric(14,3) (mockup 114). */
export function formatQuantity(value: string | number): string {
  return formatDecimal(value, 3);
}

/** Birim fiyat / tutar / genel toplam: en fazla 2 ondalik (mockup 115, 116, 176). */
export function formatAmount(value: string | number): string {
  return formatDecimal(value, 2);
}

/** Kart tarihleri: mockup'taki "Mar 2025" gosterimi. */
export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

/**
 * Hakediş liste tutarı (P7 T2, spec §S6: `gross_total` — brüt). Kuruş
 * hassasiyetli: `formatAmount` gibi en fazla 2 ondalık basar, sondaki
 * sıfırlar atılır — ama burada `₺` öneki de vardır (mockup 99, 103'te tutar
 * `₺` ile başlar). `toLocaleString("tr-TR")` gibi ortam-bağımlı bir çağrı
 * DEĞİL; `Intl.NumberFormat` ile aynı desen (`formatCurrency`/`formatAmount`).
 */
export function formatCurrencyPrecise(value: string | number): string {
  return `₺ ${formatDecimal(value, 2)}`;
}

/** Türkçe ay adları. */
const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/**
 * Dönem seçici seçenekleri (P7 T5): hakediş oluştur/düzenle formunun ay
 * `Select`i BUNU kullanır — `TR_MONTHS`i KOPYALAMAZ, aynı diziden türetir
 * (brief §Form üst bölümü: "T2'de yazılmış ay yardımcısını YENİDEN KULLAN").
 */
export const PERIOD_MONTHS: readonly { value: number; label: string }[] = TR_MONTHS.map(
  (label, index) => ({ value: index + 1, label }),
);

/**
 * Hakediş dönemi (P7 T2 brief): "Mayıs 2026". `month` 1-12 aralığında
 * beklenir; `Intl.DateTimeFormat`/`toLocaleString("tr-TR")` kullanılmaz —
 * jsdom/CI'da ICU verisi eksik olabilir, ortam-bağımsız sabit dizi tercih
 * edilir.
 */
export function formatPeriod(year: number, month: number): string {
  const name = TR_MONTHS[month - 1];
  return name ? `${name} ${year}` : `${month}/${year}`;
}

/** `TR_MONTHS`in standart 3 harfli kısaltmaları — `formatPeriodShort` bundan türer. */
const TR_MONTHS_SHORT = TR_MONTHS.map((name) => name.slice(0, 3));

/**
 * Hakediş listesi dönem hücresi (F-TH T2, Ekran 2 satır 143: "Tem 2026",
 * "Haz 2026", "May 2026"). `formatPeriod`in kısaltılmış hâli — `Intl.
 * DateTimeFormat`/`toLocaleString` KULLANMAZ (aynı ortam-bağımsızlık
 * gerekçesi: `formatPeriod`'un üstündeki not).
 */
export function formatPeriodShort(year: number, month: number): string {
  const name = TR_MONTHS_SHORT[month - 1];
  return name ? `${name} ${year}` : `${month}/${year}`;
}

/**
 * Ay adı tek başına (F-SD T3, GK388: "💰 Temmuz Hakediş Birikimi"). `month`
 * 1-12; aralık dışında sayı basılır. `formatPeriod` ile AYNI diziden türer —
 * ay adları kopyalanmaz.
 */
export function formatMonthName(month: number): string {
  return TR_MONTHS[month - 1] ?? String(month);
}

/**
 * Ay KISALTMASI tek başına, yılsız (F-TKV T3, Proje Takvimi mockup 123-146:
 * ızgara başlığında "Oca"/"Şub"… yazar, yıl AYRI bir sütundadır — 121).
 * `formatPeriodShort`in yılsız kardeşi; ay adları `TR_MONTHS_SHORT` tek
 * kaynağından gelir, kopyalanmaz.
 */
export function formatMonthShort(month: number): string {
  return TR_MONTHS_SHORT[month - 1] ?? String(month);
}

/**
 * Gün + ay (F-SD T3, GK360: "16 Temmuz"). Girdi `YYYY-MM-DD` ISO tarihidir ve
 * STRING olarak ayrıştırılır — `new Date(iso)` UTC yorumlar, TR saatinde bir
 * gün geri kayardı (`derive.ts/isoDate`in aynı gerekçesi). ICU'ya da bağlı
 * değildir (`formatPeriod` notu).
 */
export function formatDayMonth(iso: string): string {
  const [year, month, day] = iso.split("-");
  const name = TR_MONTHS[Number(month) - 1];
  if (year === undefined || day === undefined || name === undefined) return iso;
  return `${Number(day)} ${name}`;
}

/**
 * Gün + ay + yıl (F-MK T2, M1 112/149: "19 Temmuz 2026"). `formatDayMonth`in
 * yıl eklenmiş hâli — aynı gerekçeyle `new Date(iso)` KULLANILMAZ (UTC
 * yorumlanır, TR saatinde bir gün geri kayardı).
 */
export function formatDateLong(iso: string): string {
  const [year, month, day] = iso.split("-");
  const name = TR_MONTHS[Number(month) - 1];
  if (year === undefined || day === undefined || name === undefined) return iso;
  return `${Number(day)} ${name} ${year}`;
}

/**
 * Gün + KISA ay (F-PL T2, Planlama ızgarasının gün başlıkları — P111-117:
 * "21 Tem"). `formatDayMonth`in kısaltılmış hâli; ay adları `TR_MONTHS_SHORT`
 * tek kaynağından gelir (`formatPeriodShort` ile AYNI dizi).
 *
 * `new Date(iso)` KULLANILMAZ — UTC yorumlanır, TR saatinde bir gün geri
 * kayardı (`derive.ts/isoDate`in aynı gerekçesi).
 */
export function formatDayMonthShort(iso: string): string {
  const [year, month, day] = iso.split("-");
  const name = TR_MONTHS_SHORT[Number(month) - 1];
  if (year === undefined || day === undefined || name === undefined) return iso;
  return `${Number(day)} ${name}`;
}

/**
 * `YYYY-MM-DD` → "01.04.2025" (F-P5 T2 · SZL 58-59 Başlangıç/Bitiş hücreleri).
 *
 * `new Date(iso)` KULLANILMAZ — UTC yorumlanır, TR saatinde bir gün geri
 * kayardı (`formatDayMonth`in aynı gerekçesi). Ayrıştırılamayan girdi olduğu
 * gibi geri döner.
 */
export function formatDateDots(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (year === undefined || month === undefined || day === undefined) return iso;
  return `${day}.${month}.${year}`;
}

/** Haftanın günleri — dizinin sırası `Date.getUTCDay()` ile aynıdır (0 = Pazar). */
const TR_WEEKDAYS_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

/**
 * `YYYY-MM-DD` → "Pzt" (F-SD GK327 · F-PL P111-117). TEK KAYNAK: hem günlük
 * kaydın gömülü planlama bloğu hem Planlama ızgarası bunu kullanır.
 *
 * `Date` YALNIZ haftanın gününü vermek üzere UTC olarak kurulur — yerel saat
 * kullanılsaydı DST/gece yarısı kayması gün adını bir gün kaydırabilirdi.
 * `Intl.DateTimeFormat` kullanılmaz (jsdom/CI'da ICU verisi eksik olabilir).
 */
export function formatWeekdayShort(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  return TR_WEEKDAYS_SHORT[date.getUTCDay()] ?? "";
}
