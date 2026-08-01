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

/** Portfoy tutari: mockup'taki "24.870.500" gosterimi. */
export function formatCurrency(value: string | number): string {
  const formatted = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 }).format(
    toNumber(value),
  );
  return `₺ ${formatted}`;
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

/** Türkçe ay adları — yalnız bu dosyada kullanılır, dışa aktarılmaz. */
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
 * Hakediş dönemi (P7 T2 brief): "Mayıs 2026". `month` 1-12 aralığında
 * beklenir; `Intl.DateTimeFormat`/`toLocaleString("tr-TR")` kullanılmaz —
 * jsdom/CI'da ICU verisi eksik olabilir, ortam-bağımsız sabit dizi tercih
 * edilir.
 */
export function formatPeriod(year: number, month: number): string {
  const name = TR_MONTHS[month - 1];
  return name ? `${name} ${year}` : `${month}/${year}`;
}
