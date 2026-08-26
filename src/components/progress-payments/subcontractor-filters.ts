import type { SubcontractorPaymentStatus } from "@/lib/api/hooks/useSubcontractorProgressPayments";

// F-TH T2 · Ekran 2 filtre çubuğu (brief §Filtreler): dördü de URL query
// parametresine yazılır (paylaşılabilir/geri-ileri çalışır) — `ProjectsView`
// (`tab` parametresi) ile aynı desen. Bu dosya SAF okuma/URL-üretme
// mantığını taşır; component'ler yalnız router çağırır, ayrıştırmayı
// KOPYALAMAZ.

export interface SubcontractorFiltersState {
  projectId: string | null;
  periodYear: number | null;
  periodMonth: number | null;
  status: SubcontractorPaymentStatus | null;
  q: string;
}

/**
 * Mockup'ın Durum seçicisi dört seçenek taşır: Tüm Durumlar + ÜÇ durum
 * (Onay Bekliyor/Onaylandı/Ödendi) — `draft` (Taslak) seçici LİSTESİNDE YOK
 * (mockup satır 92-97 birebir). Bilinmeyen/`draft` değeri URL'de bulunursa
 * "Tüm Durumlar"a düşer (sessizce kırılmaz).
 */
export const SUBCONTRACTOR_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: SubcontractorPaymentStatus;
  label: string;
}> = [
  { value: "pending_approval", label: "Onay Bekliyor" },
  { value: "approved", label: "Onaylandı" },
  { value: "paid", label: "Ödendi" },
];

function isFilterableStatus(value: string): value is SubcontractorPaymentStatus {
  return SUBCONTRACTOR_STATUS_FILTER_OPTIONS.some((option) => option.value === value);
}

/**
 * 🔴 `GET /subcontractor-progress-payments` `period_month` tavanı **12**dir
 * (ölçüldü); istemci yalnız "pozitif tam sayı" arıyordu. Kullanıcı URL'i elle
 * yazabildiği için `?period_month=13` sunucuya gidiyor ve 422 dönüyordu.
 * `rental-filters.ts` deseni: aralık dışı değer GÖNDERİLMEZ, sessizce
 * "süzgeç yok" dalına düşer.
 *
 * ⚠️ `period_year` bu uçta sözleşmede sınır TAŞIMAZ (kira uçlarının aksine,
 * orada 2000..2200'dür) — bu yüzden yıla aralık UYDURULMAZ, yalnız pozitif
 * tam sayı denetimi kalır.
 */
const PERIOD_MONTH_MIN = 1;
const PERIOD_MONTH_MAX = 12;

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseBoundedInt(value: string | null, min: number, max: number): number | null {
  const parsed = parsePositiveInt(value);
  if (parsed === null) return null;
  return parsed >= min && parsed <= max ? parsed : null;
}

/** URL query → tipli filtre durumu. Geçersiz/eksik alanlar sessizce `null`a düşer. */
export function parseSubcontractorFilters(searchParams: URLSearchParams): SubcontractorFiltersState {
  const status = searchParams.get("status");
  return {
    projectId: searchParams.get("project_id") || null,
    periodYear: parsePositiveInt(searchParams.get("period_year")),
    periodMonth: parseBoundedInt(
      searchParams.get("period_month"),
      PERIOD_MONTH_MIN,
      PERIOD_MONTH_MAX,
    ),
    status: status && isFilterableStatus(status) ? status : null,
    q: searchParams.get("q") ?? "",
  };
}

export type SubcontractorFilterPatch = Partial<{
  project_id: string | null;
  period_year: number | null;
  period_month: number | null;
  status: string | null;
  q: string | null;
}>;

/**
 * Mevcut URL parametrelerinin ÜSTÜNE bir yama uygular, YENİ bir
 * `URLSearchParams` döner (immutability — mevcut nesne mutate edilmez).
 * `null`/boş değer alanı SİLER (`ProjectsView.handleTabChange` deseni).
 */
export function withSubcontractorFilterParams(
  current: URLSearchParams,
  patch: SubcontractorFilterPatch,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  return next;
}

/**
 * Dönem seçicinin seçenek listesi (brief: "Temmuz 2026"/"Haziran 2026"
 * biçimi). Backend bir dönem LİSTESİ ucu sunmuyor — bu bir backend alanı
 * TÜRETMESİ değil, saf takvim aritmetiğidir (bugünden geriye `count` ay).
 */
export function recentPeriods(
  referenceDate: Date,
  count: number,
): ReadonlyArray<{ year: number; month: number }> {
  const periods: { year: number; month: number }[] = [];
  let year = referenceDate.getFullYear();
  let month = referenceDate.getMonth() + 1;
  for (let i = 0; i < count; i += 1) {
    periods.push({ year, month });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return periods;
}
