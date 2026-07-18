import type { NextRequest } from "next/server";

// Hafif CSRF savunmasi: durum-degistiren POST'larda Origin host'u Host'a esit mi?
// Tarayici same-origin POST'larda Origin gonderir; eksik/uyumsuz → reddet.
export function assertSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
