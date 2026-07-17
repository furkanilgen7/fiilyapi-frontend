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
