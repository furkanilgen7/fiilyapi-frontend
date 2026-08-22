import type { RentalInvoiceStatus } from "@/lib/api/hooks/useEquipmentRentalInvoices";
import { RENTAL_STATUS_BADGE } from "./rental-labels";

/*
 * F-KIRA · liste ekranının süzgeç çubuğu. Süzgeçler URL query parametresine
 * yazılır (paylaşılabilir/geri-ileri çalışır) — `subcontractor-filters.ts`
 * deseni. Bu dosya SAF okuma/URL-üretme mantığını taşır; bileşen yalnız router
 * çağırır, ayrıştırmayı KOPYALAMAZ.
 *
 * 🔴 ARAMA KUTUSU YOKTUR. `GET /equipment/rental-invoices` yedi parametre
 * tanır (`supplier_id` `site_id` `status` `period_year` `period_month`
 * `limit` `offset`) ve bunların arasında `q` YOKTUR. Emsal
 * `SubcontractorProgressPaymentsView` bir arama kutusu basar; buraya
 * kopyalansaydı yazdığı metnin hiçbir etkisi olmayan bir kutu doğardı.
 */

export interface RentalFiltersState {
  supplierId: string | null;
  siteId: string | null;
  status: RentalInvoiceStatus | null;
  periodYear: number | null;
  periodMonth: number | null;
}

/**
 * Durum seçeneği listesi — DÖRT durumun HEPSİ süzülebilir.
 *
 * Taşeron hakedişinden FARKLI: orada `draft` seçici listesinde yoktu (mockup
 * öyle çiziyordu). Kira listesinin mockup'ı YOKTUR (onaylı sapma), bu yüzden
 * ölçüt sunucudur: uç dördünü de kabul eder ve `draft` gerçek bir çalışma
 * hâlidir — listeden gizlenseydi kullanıcı kendi taslağını bulamazdı.
 * Etiketler `RENTAL_STATUS_BADGE`ten TÜRER, kopyalanmaz.
 */
export const RENTAL_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: RentalInvoiceStatus;
  label: string;
}> = (["draft", "pending_verification", "approved", "paid"] as const).map((value) => ({
  value,
  label: RENTAL_STATUS_BADGE[value].label,
}));

function isRentalStatus(value: string): value is RentalInvoiceStatus {
  return RENTAL_STATUS_FILTER_OPTIONS.some((option) => option.value === value);
}

/**
 * Sunucunun kabul ettiği aralık (openapi): yıl 2000-2200, ay 1-12. Aralık
 * dışındaki bir URL değeri sunucuya GÖNDERİLMEZ (422 yerine sessizce "süzgeç
 * yok" dalına düşer) — kullanıcı elle URL yazabilir.
 */
const PERIOD_YEAR_MIN = 2000;
const PERIOD_YEAR_MAX = 2200;
const PERIOD_MONTH_MIN = 1;
const PERIOD_MONTH_MAX = 12;

function parseBoundedInt(value: string | null, min: number, max: number): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed >= min && parsed <= max ? parsed : null;
}

/** URL query → tipli süzgeç durumu. Geçersiz/eksik alan sessizce `null`a düşer. */
export function parseRentalFilters(searchParams: URLSearchParams): RentalFiltersState {
  const status = searchParams.get("status");
  return {
    supplierId: searchParams.get("supplier_id") || null,
    siteId: searchParams.get("site_id") || null,
    status: status && isRentalStatus(status) ? status : null,
    periodYear: parseBoundedInt(searchParams.get("period_year"), PERIOD_YEAR_MIN, PERIOD_YEAR_MAX),
    periodMonth: parseBoundedInt(
      searchParams.get("period_month"),
      PERIOD_MONTH_MIN,
      PERIOD_MONTH_MAX,
    ),
  };
}

export type RentalFilterPatch = Partial<{
  supplier_id: string | null;
  site_id: string | null;
  status: string | null;
  period_year: number | null;
  period_month: number | null;
}>;

/**
 * Mevcut parametrelerin ÜSTÜNE yama uygular ve YENİ bir `URLSearchParams`
 * döner (mevcut nesne mutate EDİLMEZ). `null`/boş değer alanı SİLER.
 */
export function withRentalFilterParams(
  current: URLSearchParams,
  patch: RentalFilterPatch,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  return next;
}
