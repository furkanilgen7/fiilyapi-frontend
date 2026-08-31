import { vi } from "vitest";

/**
 * EXPORT-XLSX · ikili indirme testlerinin ORTAK kurulumu.
 *
 * `audit-client.test.ts` / `timesheet-client.test.ts` kanonundaki blok altı
 * yeni istemci testinde ve ALTI EKRAN testinde tekrar edecekti; tek yerde
 * durur. Ürün kodu bu modülü ASLA import etmez (yalnız testler) ve içinde
 * `/api/backend/...` dizesi YOKTUR — BFF kök bekçisinin taramasını kirletmez.
 */
export interface ExportFetchStub {
  /** `globalThis.fetch` yerine geçen casus. */
  fetchMock: ReturnType<typeof vi.fn>;
  createObjectURL: ReturnType<typeof vi.fn>;
  revokeObjectURL: ReturnType<typeof vi.fn>;
  /** Son (ya da tek) indirme isteğinin URL'i. */
  lastUrl(): string;
  /** Son isteğin sorgu parametreleri — sıra bağımsız karşılaştırma için. */
  lastQuery(): Record<string, string>;
  /** `<a download>` üzerine yazılan dosya adı. */
  filename(): string;
}

/** 200 + xlsx içerik tipi; `disposition` verilirse `content-disposition` da. */
export function xlsxResponse(disposition?: string): Response {
  return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ...(disposition ? { "content-disposition": disposition } : {}),
    },
  });
}

/** 2xx DIŞI JSON yanıtı — BFF `status >= 400`ta HER ZAMAN JSON dalına gider. */
export function errorResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * `fetch` + `URL.createObjectURL/revokeObjectURL` + `<a>` çapasını sahteler.
 *
 * 🔴 Çapa GERÇEK bir `<a>` elemanıdır (sahte nesne değil): `download` alanının
 * sunucu adını mı yoksa varsayılanı mı taşıdığı ancak gerçek DOM özelliğinden
 * okunabilir. `click` bastırılır — jsdom indirme başlatamaz.
 */
export function stubExportDownload(response: Response = xlsxResponse()): ExportFetchStub {
  const fetchMock = vi.fn().mockResolvedValue(response);
  const createObjectURL = vi.fn(() => "blob:fake");
  const revokeObjectURL = vi.fn();

  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });

  const anchor = document.createElement("a");
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string, options?: unknown) =>
    tag === "a" ? anchor : originalCreateElement(tag, options as ElementCreationOptions),
  );
  vi.spyOn(anchor, "click").mockImplementation(() => {});

  function lastUrl(): string {
    const calls = fetchMock.mock.calls;
    if (calls.length === 0) throw new Error("indirme isteği HİÇ atılmadı");
    return String(calls[calls.length - 1][0]);
  }

  return {
    fetchMock,
    createObjectURL,
    revokeObjectURL,
    lastUrl,
    lastQuery: () =>
      Object.fromEntries(new URL(lastUrl(), "http://localhost").searchParams.entries()),
    filename: () => anchor.download,
  };
}
