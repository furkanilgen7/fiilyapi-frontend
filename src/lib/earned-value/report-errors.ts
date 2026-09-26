/**
 * PLN-F3.1 · QURR (haftalık rapor) hata sınıflandırması.
 *
 * `GET /sites/{id}/earned-value/reports/weekly` iki özel durumda 4xx döner
 * (PLANLAMA-SPEC.md §3.15 S6 — NO_BASELINE, ölçüldü main'de):
 *  - **409** aktif (dondurulmuş) baseline yoksa — backend metni sabittir
 *    (kaynak: `app/modules/earned_value/diary_adapter.py NO_BASELINE`).
 *  - **404** istenen hafta proje takviminde yoksa — backend metni sabittir
 *    (kaynak: `report_router.py NO_WEEK`).
 *
 * Yalnız DURUM KODUNA bakmak yeterli DEĞİLDİR: aynı uç başka 409/404
 * nedenleriyle de dönebilir (ör. şantiye bulunamadı). Metin de eşleşmezse
 * `"other"` — çağıran genel `backendErrorMessage` dalına düşer.
 */
import { BackendError } from "@/lib/api/unwrap";

export type WeeklyReportFailure = "no_baseline" | "no_week" | "forbidden" | "other";

const NO_BASELINE_TEXT = "Şantiyede aktif (dondurulmuş) baseline yok";
const NO_WEEK_TEXT = "Hafta proje takviminde yok";

function detailOf(err: BackendError): string | null {
  if (!err.body || typeof err.body !== "object") return null;
  const detail = (err.body as { detail?: unknown }).detail;
  return typeof detail === "string" ? detail : null;
}

export function weeklyReportFailure(err: unknown): WeeklyReportFailure {
  if (!(err instanceof BackendError)) return "other";
  if (err.status === 403) return "forbidden";
  const detail = detailOf(err);
  if (err.status === 409 && detail === NO_BASELINE_TEXT) return "no_baseline";
  if (err.status === 404 && detail === NO_WEEK_TEXT) return "no_week";
  return "other";
}
