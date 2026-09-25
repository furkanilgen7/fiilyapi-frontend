import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  APP_BUILD_HEADER,
  STALE_BUILD_MESSAGE,
  StaleBuildError,
  isStaleBuild,
  resetStaleBuildForTests,
  subscribeStaleBuild,
} from "@/lib/api/app-build";
import { backendClient } from "@/lib/api/client";
import { uploadDocument } from "@/lib/api/documents-client";
import { downloadExport } from "@/lib/api/download";
import { uploadEquipmentDocument } from "@/lib/api/equipment-documents-client";
import { backendErrorMessage } from "@/lib/api/error-message";
import { stubExportDownload, xlsxResponse } from "@/lib/api/export-test-stub";
import { importUnits } from "@/lib/api/units-import-client";
import { BackendError } from "@/lib/api/unwrap";

/**
 * PLN-F2.0 — istemci tarafı sürüm bandı.
 *
 * Kural: BFF yanıtındaki `x-app-build` istemcinin kendi build kimliğinden
 * FARKLIYSA global "eski sürüm" durumu kurulur; o andan sonra YAZMA istekleri
 * (POST/PUT/PATCH/DELETE) ağa HİÇ çıkmadan `StaleBuildError` ile reddedilir,
 * GET'ler serbesttir. Başlık yoksa uyumsuzluk SAYILMAZ (fail-open).
 *
 * Aynı kural HEM `backendClient` (openapi-fetch middleware) HEM ham `fetch`
 * kullanan ikili istemciler (`download.ts`, `*-client.ts` multipart
 * yüklemeleri) için geçerlidir — ikisi de burada ölçülür.
 */

const OWN_BUILD = "build-istemci-1";
const OTHER_BUILD = "build-sunucu-2";

function jsonResponse(body: unknown, status = 200, build?: string | null): Response {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (build) headers[APP_BUILD_HEADER] = build;
  return new Response(JSON.stringify(body), { status, headers });
}

function stubFetch(...responses: Response[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  for (const r of responses) fetchMock.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Bir `fetch` çağrısının gerçek HTTP metodunu okur (Request ya da init). */
function calledMethod(call: unknown[]): string {
  const [input, init] = call as [unknown, RequestInit | undefined];
  if (input instanceof Request) return input.method;
  return (init?.method ?? "GET").toUpperCase();
}

/** Bir `fetch` çağrısının taşıdığı `x-app-build` istek başlığı. */
function calledBuildHeader(call: unknown[]): string | null {
  const [input, init] = call as [unknown, RequestInit | undefined];
  if (input instanceof Request) return input.headers.get(APP_BUILD_HEADER);
  return new Headers(init?.headers).get(APP_BUILD_HEADER);
}

function fakeFile(): File {
  return new File(["x"], "belge.pdf", { type: "application/pdf" });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BUILD_ID", OWN_BUILD);
  resetStaleBuildForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetStaleBuildForTests();
});

describe("backendClient — surum bandi middleware'i", () => {
  it("ayni build kimligi: GET gecer, ardindan POST backend'e gider, durum kurulmaz", async () => {
    const fetchMock = stubFetch(jsonResponse({ items: [] }, 200, OWN_BUILD), jsonResponse({ id: "p-1" }, 201, OWN_BUILD));

    await backendClient.GET("/projects", {});
    const created = await backendClient.POST("/projects", { body: {} as never });

    expect(created.response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(isStaleBuild()).toBe(false);
  });

  it("her istek istemcinin KENDI build kimligini x-app-build basligiyla tasir", async () => {
    const fetchMock = stubFetch(jsonResponse({ items: [] }, 200, OWN_BUILD));
    await backendClient.GET("/projects", {});
    expect(calledBuildHeader(fetchMock.mock.calls[0])).toBe(OWN_BUILD);
  });

  it("FARKLI build kimligi: durum kurulur, sonraki PUT aga HIC cikmadan StaleBuildError ile reddedilir", async () => {
    const fetchMock = stubFetch(jsonResponse({ items: [] }, 200, OTHER_BUILD));

    await backendClient.GET("/projects", {});
    expect(isStaleBuild()).toBe(true);

    const attempt = backendClient.PUT("/diary/{entry_id}/lines", {
      params: { path: { entry_id: "d-1" } },
      body: {} as never,
    });
    await expect(attempt).rejects.toBeInstanceOf(StaleBuildError);
    // 🔒 Asil iddia: DEGISTIRME yazmasi aga HIC cikmadi.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)(
    "eski surum durumunda %s reddedilir; hata ekranin okudugu Turkce mesaji tasir",
    async (method) => {
      const fetchMock = stubFetch(jsonResponse({ items: [] }, 200, OTHER_BUILD));
      await backendClient.GET("/projects", {});

      const call = (backendClient as unknown as Record<string, (p: string, o: object) => Promise<unknown>>)[method](
        "/projects/{project_id}",
        { params: { path: { project_id: "p-1" } }, body: {} },
      );
      const error = await call.then(
        () => null,
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(BackendError);
      expect((error as BackendError).status).toBe(412);
      expect(backendErrorMessage(error)).toBe(STALE_BUILD_MESSAGE);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("eski surum durumunda GET serbesttir (okuma veri kaybettirmez)", async () => {
    const fetchMock = stubFetch(jsonResponse({ items: [] }, 200, OTHER_BUILD), jsonResponse({ items: [] }, 200, OTHER_BUILD));
    await backendClient.GET("/projects", {});
    const second = await backendClient.GET("/projects", {});
    expect(second.response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(calledMethod(fetchMock.mock.calls[1])).toBe("GET");
  });

  it("FAIL-OPEN: yanitta x-app-build YOKSA uyumsuzluk sayilmaz, yazma gider", async () => {
    const fetchMock = stubFetch(jsonResponse({ items: [] }, 200, null), jsonResponse({ id: "p-1" }, 201, null));
    await backendClient.GET("/projects", {});
    expect(isStaleBuild()).toBe(false);
    const created = await backendClient.POST("/projects", { body: {} as never });
    expect(created.response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("FAIL-OPEN: istemcinin kendi kimligi YOKSA (build disi ortam) farkli baslik durum kurmaz", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "");
    stubFetch(jsonResponse({ items: [] }, 200, OTHER_BUILD));
    await backendClient.GET("/projects", {});
    expect(isStaleBuild()).toBe(false);
  });

  it("BFF'in 412 stale_build reddi de (yanit basligi uzerinden) durumu kurar", async () => {
    stubFetch(
      jsonResponse({ ok: false, code: "stale_build", detail: STALE_BUILD_MESSAGE }, 412, OTHER_BUILD),
    );
    const result = await backendClient.POST("/projects", { body: {} as never });
    expect(result.response.status).toBe(412);
    expect(isStaleBuild()).toBe(true);
  });

  it("durum kurulunca aboneler bir kez haberdar edilir", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeStaleBuild(listener);
    stubFetch(jsonResponse({}, 200, OTHER_BUILD), jsonResponse({}, 200, OTHER_BUILD));
    await backendClient.GET("/projects", {});
    await backendClient.GET("/projects", {});
    unsubscribe();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("ham fetch kullanan ikili istemciler — ayni kural", () => {
  async function becomeStale(): Promise<void> {
    stubFetch(jsonResponse({ items: [] }, 200, OTHER_BUILD));
    await backendClient.GET("/projects", {});
    expect(isStaleBuild()).toBe(true);
  }

  it("uploadDocument (multipart POST) eski surumde reddedilir, fetch cagrilmaz", async () => {
    await becomeStale();
    const fetchMock = stubFetch();
    await expect(uploadDocument({ file: fakeFile(), projectId: "p-1" })).rejects.toBeInstanceOf(StaleBuildError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploadEquipmentDocument (multipart POST) eski surumde reddedilir, fetch cagrilmaz", async () => {
    await becomeStale();
    const fetchMock = stubFetch();
    await expect(
      uploadEquipmentDocument({ equipmentId: "e-1", file: fakeFile(), typeId: "t-1" }),
    ).rejects.toBeInstanceOf(StaleBuildError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("importUnits (multipart POST) eski surumde reddedilir, fetch cagrilmaz", async () => {
    await becomeStale();
    const fetchMock = stubFetch();
    await expect(importUnits("p-1", { file: fakeFile(), includeWarnings: true })).rejects.toBeInstanceOf(
      StaleBuildError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploadDocument ayni surumde gider ve kendi kimligini basligla tasir", async () => {
    const fetchMock = stubFetch(jsonResponse({ id: "doc-1" }, 201, OWN_BUILD));
    await uploadDocument({ file: fakeFile(), projectId: "p-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calledMethod(fetchMock.mock.calls[0])).toBe("POST");
    expect(calledBuildHeader(fetchMock.mock.calls[0])).toBe(OWN_BUILD);
    expect(isStaleBuild()).toBe(false);
  });

  it("uploadDocument yanitinda FARKLI kimlik durum kurar", async () => {
    stubFetch(jsonResponse({ id: "doc-1" }, 201, OTHER_BUILD));
    await uploadDocument({ file: fakeFile(), projectId: "p-1" });
    expect(isStaleBuild()).toBe(true);
  });

  it("indirme (GET) eski surumde de calisir", async () => {
    await becomeStale();
    const stub = stubExportDownload();
    await downloadExport("/api/backend/audit-log/export.xlsx", "x.xlsx");
    expect(stub.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("indirme yanitindaki FARKLI kimlik durum kurar", async () => {
    const response = xlsxResponse();
    response.headers.set(APP_BUILD_HEADER, OTHER_BUILD);
    stubExportDownload(response);
    await downloadExport("/api/backend/audit-log/export.xlsx", "x.xlsx");
    expect(isStaleBuild()).toBe(true);
  });
});

/**
 * 🔴 YAPISAL BEKÇİ — yeni bir `*-client.ts` BFF'e ham `fetch` ile yazarsa
 * sürüm bandının DIŞINDA kalır ve hiçbir davranış testi bunu görmez (testi
 * yazılmamış istemci ölçülemez). Kural: ürün kodunda `fetch` DOĞRUDAN
 * çağrılamaz — BFF'e ya `backendClient` (middleware) ya `guardedFetch` ile
 * gidilir. İstisnalar AŞAĞIDA gerekçeleriyle SAYILIDIR; listeye ekleme
 * yapan, o dosyanın `/api/backend`e GİTMEDİĞİNİ göstermek zorundadır.
 *
 * (Tarama "dosya `/api/backend` dizesini taşıyor mu" diye SÜZÜLMEZ:
 * `download.ts` yolu ÇAĞIRANDAN alır, dizeyi hiç taşımaz — öyle bir süzgeç
 * tam da ikili indirmenin tek kaynağını görmezdi.)
 */
describe("yapisal bekci — urun kodunda korumasiz ham fetch yok", () => {
  const SRC_DIR = join(process.cwd(), "src");
  const RAW_FETCH = /(?<![\w.])fetch\s*\(|globalThis\.fetch\s*\(/;
  const EXEMPT: Record<string, string> = {
    "src/lib/api/app-build.ts": "korumanin KENDISI (guardedFetch govdesi)",
    "src/lib/api/client.ts": "backendClient — surum bandi middleware'i ile sarili",
    "src/app/login/LoginForm.tsx": "/api/auth/login — catch-all BFF DEGIL, oturum yok",
    "src/components/shell/SessionProvider.tsx": "/api/auth/me — salt okuma",
    "src/lib/shell/useLogout.ts": "/api/auth/logout — veri yazmaz",
    "src/lib/auth/backend.ts": "SUNUCU tarafi (BFF -> backend); tarayici paketine girmez, kimligi BFF basar",
    "src/lib/api/ai-chat-client.ts": "/api/ai/chat — ayri SSE rotasi (catch-all DEGIL); PLN-F2.0 acik kalan",
  };

  function collect(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return collect(full);
      if (!/\.(ts|tsx)$/.test(name) || /\.test\.|\.testkit\.|test-stub|\.d\.ts$/.test(name)) return [];
      return [relative(process.cwd(), full)];
    });
  }

  function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  }

  const productFiles = collect(SRC_DIR).filter((file) => !file.startsWith("src/app/api/"));

  it("istisna listesi disinda hicbir urun dosyasi fetch'i dogrudan cagirmaz", () => {
    const offenders = productFiles
      .filter((file) => !(file in EXEMPT))
      .filter((file) => RAW_FETCH.test(stripComments(readFileSync(file, "utf8"))));
    expect(offenders, `Surum bandi DISINDA ham fetch: ${offenders.join(", ")}`).toEqual([]);
  });

  it("bekci kor degil: tarayici istisnalardaki gercek ham fetch'leri GORUR", () => {
    for (const file of Object.keys(EXEMPT)) {
      expect(productFiles, file).toContain(file);
      expect(RAW_FETCH.test(stripComments(readFileSync(file, "utf8"))), file).toBe(true);
    }
  });
});
