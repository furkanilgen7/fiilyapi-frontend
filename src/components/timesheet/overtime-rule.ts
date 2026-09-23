/**
 * Fazla mesai çarpanının TEK KAYNAĞI (PUAN-SAAT).
 *
 * 🔴 Sözleşmede bu çarpanı taşıyan bir alan YOKTUR (`openapi.json`da
 * `overtime_multiplier` benzeri bir alan yok) — istemci sabitidir. Kusur
 * (triyaj #350): `TimesheetPayrollPanel.tsx` ("× 1,5") ve
 * `TimesheetWeekScreen.tsx` ("%50 zamlı") aynı kuralı BAĞIMSIZ iki dize
 * olarak yazıyordu; biri değişip diğeri unutulursa ekranlar birbirini
 * YALANLARDI. Artık İKİSİ DE bu TEK sayısal sabitten TÜRER.
 */
export const OVERTIME_MULTIPLIER = 1.5;

/** E5 341-345 notu — "× saatlik ücret × 1,5". */
export const OVERTIME_MULTIPLIER_TEXT = formatTrDecimal(OVERTIME_MULTIPLIER);

/**
 * E5 76-81 giriş cümlesi — "%50 zamlı". `OVERTIME_MULTIPLIER`den TÜRER,
 * ikinci bir sabit olarak YAZILMAZ.
 */
export const OVERTIME_SURCHARGE_PERCENT_TEXT = `%${Math.round((OVERTIME_MULTIPLIER - 1) * 100)}`;

function formatTrDecimal(value: number): string {
  return value.toString().replace(".", ",");
}
