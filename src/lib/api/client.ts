import createClient from "openapi-fetch";

import type { paths } from "./schema";

/**
 * Backend API'sine tip-güvenli istemci.
 *
 * baseUrl BFF katmanına (Next.js Route Handler'ları) işaret eder — tarayıcı
 * doğrudan backend'e gitmez, F2'de kurulacak /api proxy'sinden geçer.
 * F0'da yalnızca istemci örneği ve tipleri hazırlanır; kullanımı F2'de başlar.
 */
export const apiClient = createClient<paths>({
  baseUrl: "/api",
});

/**
 * F4 kaynak istemcisi — genel BFF catch-all proxy'sine (/api/backend/[...path])
 * gider; JWT cookie + refresh BFF'te eklenir.
 */
export const backendClient = createClient<paths>({
  baseUrl: "/api/backend",
});
