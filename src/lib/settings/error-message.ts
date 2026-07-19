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
