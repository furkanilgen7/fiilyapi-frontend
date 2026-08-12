import { sumDecimalStrings } from "@/lib/decimal";
import type { UnitSaleTotals } from "@/lib/api/hooks/useSales";

import type { SaleRow } from "./sales-labels";

/**
 * F-P8 T2 · SY tablosunun `tfoot` toplamı (205-215) — İKİ KAYNAKLI.
 *
 * ⚠️ SUNUCUNUN `totals` ALANI SÜZÜLMEMİŞ KÜMENİN TOPLAMIDIR. Durum süzgeci
 * (146) İSTEMCİDE çalıştığı için (uç query parametresi almaz — T1 notu),
 * süzgeç açıkken sunucu toplamını basmak GÖRÜNEN SATIRLARLA TUTMAZ: kullanıcı
 * 1 satır görür, altında 5 satışın toplamını okur. Bu yüzden:
 *
 *   · süzgeç KAPALI ("Tüm Durumlar") ⇒ SUNUCUNUN `totals`ı olduğu gibi basılır
 *     (istemci yeniden toplamaz),
 *   · süzgeç AÇIK ⇒ toplam GÖRÜNEN satırlardan türetilir ve bu türetildiği
 *     ekranda görünür kılınır (`isDerived`).
 *
 * Para toplamı `Number` ile YAPILMAZ: kuruş hassasiyeti `sumDecimalStrings`
 * (BigInt) ile korunur.
 */
export interface SalesTotals {
  count: number;
  salePriceTotal: string;
  paidTotal: string;
  remainingTotal: string;
  /** `true` ⇒ toplam GÖRÜNEN satırlardan türetildi (süzgeç açık). */
  isDerived: boolean;
}

/** Görünen satırlardan kuruş-hassas toplam. */
export function deriveSalesTotals(rows: readonly SaleRow[]): SalesTotals {
  return {
    count: rows.length,
    salePriceTotal: sumDecimalStrings(rows.map((row) => row.sale_price)),
    paidTotal: sumDecimalStrings(rows.map((row) => row.paid_amount)),
    remainingTotal: sumDecimalStrings(rows.map((row) => row.remaining_amount)),
    isDerived: true,
  };
}

export interface ResolveSalesTotalsInput {
  /** Süzgeç UYGULANMIŞ satırlar (ekranda görünenler). */
  visibleRows: readonly SaleRow[];
  /** Sunucunun `UnitSaleListResponse.totals` alanı; yükleniyorken `undefined`. */
  serverTotals: UnitSaleTotals | undefined;
  /** Durum süzgeci açık mı (146). */
  isFiltered: boolean;
}

export function resolveSalesTotals({
  visibleRows,
  serverTotals,
  isFiltered,
}: ResolveSalesTotalsInput): SalesTotals | undefined {
  if (isFiltered) return deriveSalesTotals(visibleRows);
  if (serverTotals === undefined) return undefined;
  return {
    count: serverTotals.count,
    salePriceTotal: serverTotals.sale_price_total,
    paidTotal: serverTotals.paid_total,
    remainingTotal: serverTotals.remaining_total,
    isDerived: false,
  };
}
