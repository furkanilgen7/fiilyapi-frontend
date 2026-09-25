import type { Middleware } from "openapi-fetch";

import { BackendError } from "@/lib/api/unwrap";

/**
 * PLN-F2.0 — SÜRÜM BANDI: eski istemcinin yazmasını durdurma.
 *
 * ## Neden
 *
 * Bazı uçlar DEĞİŞTİRME semantiğindedir (`PUT /diary/{id}/lines`,
 * `worker_counts`): gövdede OLMAYAN satır silinir. Yeni sürüm canlıya çıktıktan
 * sonra sekmesinde ESKİ JS açık kalan kullanıcı kaydederse, eski paket yeni
 * alanları (bölümlü/firma satırları) hiç tanımadığı için onları SİLEREK yazar.
 *
 * ## Nasıl (iki katman)
 *
 * 1. Build kimliği `next.config.ts`te TEK yerde üretilir ve derleme anında hem
 *    istemci paketine hem sunucu paketine `process.env.NEXT_PUBLIC_BUILD_ID`
 *    olarak AYNI değerle gömülür.
 * 2. İstemci her isteğe kendi kimliğini `x-app-build` başlığıyla koyar; BFF
 *    YAZMA isteğinde kimlik kendisininkinden FARKLIYSA isteği backend'e hiç
 *    iletmeden 412 döner. Bu katman olmasaydı sürümden sonraki İLK yazma
 *    geçerdi: yanıt başlığı ancak o yazmanın YANITINDA görülür.
 * 3. BFF her yanıta kendi kimliğini koyar; istemci farkı görünce global
 *    "eski sürüm" durumuna geçer, kabuk bandı açılır ve o andan sonra yazmalar
 *    AĞA ÇIKMADAN `StaleBuildError` ile reddedilir (form açık kalır, girilen
 *    veri kaybolmaz). GET'ler serbesttir — okuma veri kaybettirmez.
 *
 * ## Fail-open
 *
 * Başlık iki uçtan birinde YOKSA uyumsuzluk SAYILMAZ:
 *   · Yanıtta yok → yanıt bu sürümden önceki bir BFF'ten, BFF dışı bir yoldan
 *     (e2e `page.route` taklidi) ya da ağ katmanından geliyor; kimliği
 *     bilinmeyen bir sunucuyu "farklı" saymak, eski BFF'le konuşan YENİ
 *     istemcinin bütün yazmalarını kilitlerdi.
 *   · İstekte yok → bu sürümden önce yüklenmiş sekme ya da tarayıcı dışı
 *     çağıran (Playwright `page.request`, curl smoke). İlki bir kereliktir
 *     (bu PR'ı getiren deploy'un kendisi); sonrakilerin hepsi başlığı taşır.
 *   · Kendi kimliği yok → build dışı ortam (Vitest); karşılaştıracak bir şey
 *     yoktur.
 * Koruma yanlış-pozitifte KULLANICININ İŞİNİ durdurur, yanlış-negatifte bugünkü
 * duruma (korumasız) döner; belirsizlikte ikincisi seçilir.
 */

export const APP_BUILD_HEADER = "x-app-build";

/** Hem kabuk bandının hem reddedilen yazmanın gösterdiği TEK metin. */
export const STALE_BUILD_MESSAGE = "Uygulama güncellendi — kaydetmeden önce sayfayı yenileyin.";

/** Reddin durum kodu. 409 DEĞİL: ekranlar 409'u "çakışma" diye dallandırır. */
export const STALE_BUILD_STATUS = 412;

export const STALE_BUILD_CODE = "stale_build";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Bu paketin build kimliği. `process.env.NEXT_PUBLIC_BUILD_ID` ifadesi
 * derlemede METİN olarak değiştirilir (destructure EDİLMEZ, yoksa gömülmez);
 * çağrı anında okunur ki testler `vi.stubEnv` ile değiştirebilsin.
 */
export function currentBuildId(): string | undefined {
  return process.env.NEXT_PUBLIC_BUILD_ID || undefined;
}

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

/**
 * İki kimlik ANCAK ikisi de biliniyorsa ve farklıysa uyumsuzdur (fail-open;
 * gerekçe modül başında). BFF de istemci de bu TEK fonksiyonu kullanır.
 */
export function isBuildMismatch(remote: string | null | undefined, own: string | undefined): boolean {
  if (!remote || !own) return false;
  return remote !== own;
}

// ── Global "eski sürüm" durumu (useSyncExternalStore uyumlu) ────────────────

let stale = false;
const listeners = new Set<() => void>();

export function isStaleBuild(): boolean {
  return stale;
}

export function subscribeStaleBuild(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Durum TEK YÖNLÜDÜR: yalnız sayfa yenilemesi (yeni paket) sıfırlar. */
export function markStaleBuild(): void {
  if (stale) return;
  stale = true;
  for (const listener of [...listeners]) listener();
}

/** Yalnız testler — modül durumu dosyalar arası sızmasın. */
export function resetStaleBuildForTests(): void {
  stale = false;
}

/** Yanıttaki sunucu kimliği kendi kimliğimizden farklıysa durumu kurar. */
export function observeBuildHeader(response: Response): void {
  if (isBuildMismatch(response.headers.get(APP_BUILD_HEADER), currentBuildId())) {
    markStaleBuild();
  }
}

/**
 * Eski sürümde reddedilen yazma. `BackendError` alt sınıfıdır: ekranlar hatayı
 * zaten `backendErrorMessage` ile basar, `detail` o yoldan Türkçe görünür.
 */
export class StaleBuildError extends BackendError {
  constructor() {
    super(STALE_BUILD_STATUS, { ok: false, code: STALE_BUILD_CODE, detail: STALE_BUILD_MESSAGE });
    this.name = "StaleBuildError";
  }
}

/** Eski sürümde YAZMA ağa çıkmadan reddedilir; GET serbesttir. */
export function assertWritable(method: string): void {
  if (isWriteMethod(method) && isStaleBuild()) throw new StaleBuildError();
}

/** `backendClient` (openapi-fetch) için aynı kural. */
export const buildGuardMiddleware: Middleware = {
  onRequest({ request }) {
    assertWritable(request.method);
    const own = currentBuildId();
    if (own) request.headers.set(APP_BUILD_HEADER, own);
    return request;
  },
  onResponse({ response }) {
    observeBuildHeader(response);
    return response;
  },
};

/**
 * Ham `fetch` kullanan istemcilerin (ikili indirme, multipart yükleme) TEK
 * kapısı. Kimlik yoksa `init` DEĞİŞTİRİLMEDEN geçer.
 */
export async function guardedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  assertWritable(init.method ?? "GET");
  const own = currentBuildId();
  let finalInit = init;
  if (own) {
    const headers = new Headers(init.headers);
    headers.set(APP_BUILD_HEADER, own);
    finalInit = { ...init, headers };
  }
  const response = await globalThis.fetch(input, finalInit);
  observeBuildHeader(response);
  return response;
}
