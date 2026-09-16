import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  nextFanOutWindow,
  SITE_FAN_OUT_CONCURRENCY,
  useSiteFanOutOptions,
} from "./useSiteFanOutOptions";
import { backendClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ backendClient: { GET: vi.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// Hook'un ağ davranışı `WarehouseModal.test.tsx`te (çağıran taraf) doğrulanır;
// burada SINIRLI EŞZAMANLILIĞIN saf çekirdeği sınanır.
describe("nextFanOutWindow — kayar pencere", () => {
  it("ilk turda en çok eşzamanlılık sınırı kadar istek uçar", () => {
    expect(nextFanOutWindow(0, 40, SITE_FAN_OUT_CONCURRENCY)).toBe(SITE_FAN_OUT_CONCURRENCY);
  });

  it("bir istek sonuçlandıkça pencere BİRER kayar", () => {
    expect(nextFanOutWindow(1, 40, 4)).toBe(5);
    expect(nextFanOutWindow(2, 40, 5)).toBe(6);
  });

  it("proje sayısını AŞMAZ", () => {
    expect(nextFanOutWindow(3, 5, 4)).toBe(5);
    expect(nextFanOutWindow(5, 5, 5)).toBe(5);
  });

  it("🔴 pencere KÜÇÜLMEZ — küçülmek uçan bir isteği iptal ederdi", () => {
    expect(nextFanOutWindow(0, 40, 12)).toBe(12);
  });

  it("proje yoksa pencere sıfırdır", () => {
    expect(nextFanOutWindow(0, 0, 0)).toBe(0);
  });
});

// KAYIT 360 — `GET /projects` yanıtı GERÇEKTEN `total` taşır (schema.d.ts
// `ProjectListResponse.total`); hook bunu kullanmak yerine `buildListTruncation`e
// sabit `undefined` geçiyordu, yani proje listesi kırpılsa bile `isPartial`
// hiçbir zaman `true` olmuyordu.
describe("useSiteFanOutOptions — proje listesi kırpılma bandı", () => {
  beforeEach(() => vi.clearAllMocks());

  it("projeler sayfa sınırına takılınca (total > items.length) isPartial true olur", async () => {
    vi.mocked(backendClient.GET).mockResolvedValue({
      data: {
        counts: { all: 1, taahhut: 1, kendi_yatirim: 0, kat_karsiligi: 0, completed: 0 },
        items: [{ id: "p-1", name: "Proje 1" }],
        limit: 200,
        offset: 0,
        total: 250,
      },
      error: undefined,
      response: new Response(),
    } as never);

    const { result } = renderHook(() => useSiteFanOutOptions(), { wrapper });

    await waitFor(() => expect(result.current.isPartial).toBe(true));
    expect(result.current.truncation.totalCount).toBe(250);
  });
});
