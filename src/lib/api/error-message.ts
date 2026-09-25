import { BackendError } from "@/lib/api/unwrap";

// Backend (FastAPI) hata govdesinden Turkce mesaj cikarir; yoksa fallback.
export function backendErrorMessage(err: unknown, fallback = "Beklenmeyen bir hata oluştu."): string {
  if (err instanceof BackendError && err.body && typeof err.body === "object") {
    const detail = (err.body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (first && typeof first.msg === "string") return first.msg;
    }
  }
  return fallback;
}

/** Gönder engelinin HTTP durumu (backend `DiarySubmitBlockedError`). */
const SUBMIT_BLOCKED_STATUS = 422;

/**
 * PLN-F2.1 · Günlük "Gönder" engelinin gerekçe listesi.
 *
 * EV'li şantiyede `POST /diary/{id}/submit` ön-koşul sağlanmazsa 422
 * `{detail, reasons[]}` döner; `detail` gerekçelerin "; " ile birleşimidir ve
 * bir gerekçenin KENDİSİ ";" içerebilir ("3 a-s dağıtılmamış; gerekçe
 * gerekli") — bu yüzden liste `detail` bölünerek DEĞİL `reasons`tan okunur.
 *
 * Yalnız 422 + en az bir metin gerekçe → dizi; aksi hâlde `null` (FastAPI
 * doğrulama 422'si, 409 kilit, ağ hatası): çağıran `backendErrorMessage`
 * dalına düşer. Gövde dış veridir — metin olmayan öğe atılır.
 */
export function submitBlockedReasons(err: unknown): string[] | null {
  if (!(err instanceof BackendError) || err.status !== SUBMIT_BLOCKED_STATUS) return null;
  if (!err.body || typeof err.body !== "object") return null;
  const raw = (err.body as { reasons?: unknown }).reasons;
  if (!Array.isArray(raw)) return null;
  const reasons = raw.filter(
    (reason): reason is string => typeof reason === "string" && reason.trim() !== "",
  );
  return reasons.length > 0 ? reasons : null;
}
